import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { WindowId, WindowIdGenerator } from "./ids";
import { checkInvariants } from "./invariants";
import {
  after,
  app,
  bounds,
  emptyManager,
  position,
  sequentialWindowIds,
  viewport,
  windowId,
} from "./testSupport";
import { WindowManager, type CommandResult } from "./WindowManager";

// A property test does not check one example. It generates long random command sequences and
// checks that the rules hold after every step. On failure, fast-check shrinks the sequence to
// the shortest one that still fails, and prints a seed to replay it.

const apps = [app("settings", true), app("mail", true), app("documents"), app("terminal")];

/** An index picks one of the current windows; "unknown" tries an id that does not exist. */
type Target = number | "unknown";
type WindowAction = "focus" | "minimise" | "maximise" | "restore" | "close";

type Command =
  | { readonly kind: "open"; readonly app: number }
  | { readonly kind: WindowAction; readonly target: Target }
  | { readonly kind: "move"; readonly target: Target; readonly x: number; readonly y: number }
  | {
      readonly kind: "resize";
      readonly target: Target;
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    }
  | { readonly kind: "viewport"; readonly width: number; readonly height: number };

const target: fc.Arbitrary<Target> = fc.oneof(
  { weight: 19, arbitrary: fc.nat(50) },
  { weight: 1, arbitrary: fc.constant("unknown" as const) },
);

const coordinate = fc.oneof(
  { weight: 19, arbitrary: fc.integer({ min: -3000, max: 3000 }) },
  {
    weight: 1,
    arbitrary: fc.constantFrom(Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
  },
);

const length = fc.oneof(
  { weight: 19, arbitrary: fc.integer({ min: 1, max: 4000 }) },
  { weight: 1, arbitrary: fc.constant(Number.MAX_SAFE_INTEGER) },
);

const windowAction = (kind: WindowAction): fc.Arbitrary<Command> =>
  target.map((chosen) => ({ kind, target: chosen }));

const command: fc.Arbitrary<Command> = fc.oneof(
  { weight: 5, arbitrary: fc.nat(apps.length - 1).map((index) => ({ kind: "open" as const, app: index })) },
  { weight: 3, arbitrary: windowAction("focus") },
  { weight: 2, arbitrary: windowAction("minimise") },
  { weight: 2, arbitrary: windowAction("maximise") },
  { weight: 3, arbitrary: windowAction("restore") },
  { weight: 3, arbitrary: windowAction("close") },
  {
    weight: 2,
    arbitrary: fc
      .record({ target, x: coordinate, y: coordinate })
      .map((fields) => ({ kind: "move" as const, ...fields })),
  },
  {
    weight: 2,
    arbitrary: fc
      .record({ target, x: coordinate, y: coordinate, width: length, height: length })
      .map((fields) => ({ kind: "resize" as const, ...fields })),
  },
  {
    weight: 1,
    arbitrary: fc
      .record({
        width: fc.integer({ min: 64, max: 3000 }),
        height: fc.integer({ min: 32, max: 2000 }),
      })
      .map((fields) => ({ kind: "viewport" as const, ...fields })),
  },
);

const resolve = (manager: WindowManager, chosen: Target): WindowId => {
  const { windows } = manager;
  return chosen === "unknown" || windows.length === 0
    ? windowId("no-such-window")
    : windows[chosen % windows.length].id;
};

const run = (
  manager: WindowManager,
  step: Command,
  generateId: WindowIdGenerator,
): CommandResult => {
  switch (step.kind) {
    case "open":
      return manager.openApp(apps[step.app], generateId);
    case "focus":
      return manager.focusWindow(resolve(manager, step.target));
    case "minimise":
      return manager.minimiseWindow(resolve(manager, step.target));
    case "maximise":
      return manager.maximiseWindow(resolve(manager, step.target));
    case "restore":
      return manager.restoreWindow(resolve(manager, step.target));
    case "close":
      return manager.closeWindow(resolve(manager, step.target));
    case "move":
      return manager.moveWindow(resolve(manager, step.target), position(step.x, step.y));
    case "resize":
      return manager.resizeWindow(
        resolve(manager, step.target),
        bounds(step.x, step.y, step.width, step.height),
      );
    case "viewport":
      return manager.resizeViewport(viewport(step.width, step.height));
  }
};

/** Worked out from the state alone, independently of the code that picks the next focus. */
const expectedTopmost = (manager: WindowManager): WindowId | null => {
  const visible = manager.windows
    .filter((window) => window.state !== "minimised")
    .toSorted((a, b) => b.zOrder - a.zOrder);
  return visible[0]?.id ?? null;
};

/** Counts what the run really exercised, so the test cannot quietly check nothing. */
const reached = new Map<string, number>();
const count = (scenario: string): void => {
  reached.set(scenario, (reached.get(scenario) ?? 0) + 1);
};

const checkTransitionRules = (
  step: Command,
  before: WindowManager,
  afterwards: WindowManager,
): void => {
  const target =
    "target" in step ? before.windows.find((w) => w.id === resolve(before, step.target)) : null;

  if (step.kind === "open") {
    const opened = afterwards.windows.length > before.windows.length;
    if (opened) {
      count("opened a new window");
      expect(afterwards.windows).toHaveLength(before.windows.length + 1);
      expect(afterwards.focusedWindowId).toBe(afterwards.windows.at(-1)?.id); // INV-10
    } else {
      const existing = before.windows.find((w) => w.appId === apps[step.app].id);
      count(`reopened a ${existing?.state} single-instance app`);
      expect(afterwards.focusedWindowId).toBe(existing?.id); // INV-11
      expect(afterwards.windows).toHaveLength(before.windows.length);
    }
  }

  if (step.kind === "close" && target?.id === before.focusedWindowId) {
    count(afterwards.focusedWindowId === null ? "closed the last visible" : "closed the focused");
    expect(afterwards.focusedWindowId).toBe(expectedTopmost(afterwards)); // INV-12
  }

  if (
    step.kind === "minimise" &&
    target?.id === before.focusedWindowId &&
    target?.state !== "minimised"
  ) {
    count(afterwards.focusedWindowId === null ? "minimised the last visible" : "minimised the focused");
    expect(afterwards.focusedWindowId).toBe(expectedTopmost(afterwards)); // INV-13
  }

  for (const window of afterwards.windows) {
    if (window.state === "maximised") {
      const displayed = window.displayBounds(afterwards.viewport);
      expect(displayed.equals(afterwards.viewport.toBounds())).toBe(true); // INV-14
    }
  }

  if (step.kind === "maximise" || step.kind === "minimise" || step.kind === "restore") {
    for (const window of afterwards.windows) {
      const previous = before.windows.find((w) => w.id === window.id);
      expect(previous !== undefined && previous.bounds.equals(window.bounds)).toBe(true); // INV-15
    }
  }

  if (step.kind === "restore" && target?.state === "minimised") {
    count(`restored from minimised to ${target.stateBeforeMinimise}`);
    const restored = afterwards.windows.find((w) => w.id === target.id);
    expect(restored?.state).toBe(target.stateBeforeMinimise); // INV-16
    expect(afterwards.focusedWindowId).toBe(target.id); // INV-16
  }
};

describe("WindowManager under random command sequences", () => {
  it("keeps every invariant after every step", () => {
    fc.assert(
      fc.property(fc.array(command, { maxLength: 200, size: "max" }), (commands) => {
        const generateId = sequentialWindowIds();
        let manager = emptyManager();

        for (const step of commands) {
          const before = manager;
          const snapshotBefore = before.toSnapshot();
          const result = run(before, step, generateId);

          // INV-18: whatever happened, the previous manager is exactly as it was.
          expect(before.toSnapshot()).toEqual(snapshotBefore);

          if (!result.ok) {
            count(`rejected: ${result.error.code}`);
            continue;
          }

          const { manager: next, events } = result.value;
          // INV-18: no change and no events always go together.
          expect(next === before).toBe(events.length === 0);
          if (next !== before) count(`changed: ${step.kind}`);

          expect(checkInvariants(next.toSnapshot())).toEqual([]); // INV-01 to 09, INV-17
          checkTransitionRules(step, before, next);

          // Anything the manager can reach must also be loadable after a page reload.
          const stored = JSON.parse(JSON.stringify(next.toSnapshot()));
          expect(WindowManager.fromSnapshot(stored).ok).toBe(true);

          manager = next;
        }
      }),
      { numRuns: 200 },
    );

    expect([...reached.keys()]).toEqual(
      expect.arrayContaining([
        "changed: open",
        "changed: focus",
        "changed: minimise",
        "changed: maximise",
        "changed: restore",
        "changed: close",
        "changed: move",
        "changed: resize",
        "changed: viewport",
        "opened a new window",
        "reopened a normal single-instance app",
        "reopened a minimised single-instance app",
        "reopened a maximised single-instance app",
        "closed the focused",
        "closed the last visible",
        "minimised the focused",
        "minimised the last visible",
        "restored from minimised to normal",
        "restored from minimised to maximised",
        "rejected: UnknownWindow",
        "rejected: WindowIsMinimised",
        "rejected: WindowNotNormal",
      ]),
    );
  }, 120_000);

  it("always keeps the bounds across maximise and restore", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -3000, max: 3000 }),
        fc.integer({ min: -3000, max: 3000 }),
        fc.boolean(),
        (x, y, minimiseInBetween) => {
          const id = windowId("a");
          const opened = after(emptyManager().openApp(apps[2], () => id));
          const start = after(opened.moveWindow(id, position(x, y)));

          let manager = after(start.maximiseWindow(id));
          if (minimiseInBetween) {
            manager = after(after(manager.minimiseWindow(id)).restoreWindow(id));
          }
          manager = after(manager.restoreWindow(id));

          expect(manager.windows[0].state).toBe("normal");
          expect(manager.windows[0].bounds.equals(start.windows[0].bounds)).toBe(true);
        },
      ),
    );
  });
});
