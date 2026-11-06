import { describe, expect, it } from "vitest";
import type { WindowManagerSnapshot } from "./snapshot";
import {
  after,
  app,
  emptyManager,
  sequentialWindowIds,
  unwrap,
  windowId,
} from "./testSupport";
import { WindowManager } from "./WindowManager";

const saved = (): WindowManagerSnapshot => {
  const ids = sequentialWindowIds();
  const one = after(emptyManager().openApp(app("files"), ids));
  const two = after(one.openApp(app("settings", true), ids));
  const three = after(two.openApp(app("mail"), ids));
  return after(three.minimiseWindow(windowId("window-1"))).toSnapshot();
};

/** What localStorage does to the data: it goes through a JSON string. */
const throughStorage = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

describe("snapshots", () => {
  it("survives a round trip through JSON", () => {
    const snapshot = saved();
    const restored = unwrap(WindowManager.fromSnapshot(throughStorage(snapshot)));

    expect(restored.toSnapshot()).toEqual(snapshot);
  });

  it("gives back a manager that still works", () => {
    const restored = unwrap(WindowManager.fromSnapshot(throughStorage(saved())));
    const closed = after(restored.closeWindow(windowId("window-3")));

    expect(closed.focusedWindowId).toBe("window-2");
  });

  it("refuses a generated id that a restored window already uses", () => {
    const restored = unwrap(WindowManager.fromSnapshot(throughStorage(saved())));

    // The Slice 3 bug this guards against: a counter that restarts after a page reload.
    expect(restored.openApp(app("files"), sequentialWindowIds())).toEqual({
      ok: false,
      error: { code: "DuplicateWindowId", windowId: "window-1" },
    });
  });

  it.each([
    ["null", null],
    ["a string", "windows"],
    ["an array", []],
    ["an empty object", {}],
    ["a missing viewport", { focusedWindowId: null, windows: [] }],
    ["windows that are not a list", { ...saved(), windows: "none" }],
    ["a window of the wrong shape", { ...saved(), windows: [{ id: "a" }] }],
    ["a numeric focus", { ...saved(), focusedWindowId: 1 }],
    [
      "an unknown window state",
      { ...saved(), windows: saved().windows.map((w) => ({ ...w, state: "hidden" })) },
    ],
  ])("rejects %s as malformed", (_name, input) => {
    expect(WindowManager.fromSnapshot(input)).toEqual({
      ok: false,
      error: { code: "MalformedSnapshot" },
    });
  });

  it("rejects data of the right shape that breaks an invariant", () => {
    const result = WindowManager.fromSnapshot({ ...saved(), focusedWindowId: "ghost" });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "SnapshotBreaksInvariants",
        violations: expect.arrayContaining([{ invariant: "INV-01", windowId: "ghost" }]),
      },
    });
  });

  it("rejects values that no value object accepts", () => {
    const snapshot = saved();
    const fractional = snapshot.windows.map((w) => ({ ...w, width: w.width + 0.5 }));

    expect(WindowManager.fromSnapshot({ ...snapshot, windows: fractional }).ok).toBe(false);
    expect(
      WindowManager.fromSnapshot({
        viewport: { width: 0, height: 0 },
        focusedWindowId: null,
        windows: [],
      }),
    ).toEqual({ ok: false, error: { code: "ViewportTooSmall", width: 0, height: 0 } });
    expect(
      WindowManager.fromSnapshot({
        ...snapshot,
        focusedWindowId: "  ",
        windows: snapshot.windows.map((w) =>
          w.id === snapshot.focusedWindowId ? { ...w, id: "  " } : w,
        ),
      }).ok,
    ).toBe(false);
  });
});
