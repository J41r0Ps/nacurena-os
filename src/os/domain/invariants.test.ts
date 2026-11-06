import { describe, expect, it } from "vitest";
import { checkInvariants, type StateInvariant } from "./invariants";
import type { WindowManagerSnapshot, WindowSnapshot } from "./snapshot";

// The property test trusts checkInvariants. These tests earn that trust: each rule gets a
// deliberately broken state, which must be reported. A checker that never finds anything
// would otherwise make every property test pass while proving nothing.

const window = (overrides: Partial<WindowSnapshot>): WindowSnapshot => ({
  id: "a",
  appId: "files",
  singleInstance: false,
  state: "normal",
  stateBeforeMinimise: "normal",
  x: 10,
  y: 10,
  width: 400,
  height: 300,
  zOrder: 0,
  ...overrides,
});

const valid: WindowManagerSnapshot = {
  viewport: { width: 1280, height: 720 },
  focusedWindowId: "b",
  windows: [window({ id: "a", zOrder: 0 }), window({ id: "b", zOrder: 1 })],
};

const broken: readonly [StateInvariant, string, WindowManagerSnapshot][] = [
  ["INV-01", "focus on a window that does not exist", { ...valid, focusedWindowId: "ghost" }],
  ["INV-02", "focus on a window that is not topmost", { ...valid, focusedWindowId: "a" }],
  [
    "INV-03",
    "focus on a minimised window",
    { ...valid, windows: [valid.windows[0], window({ id: "b", zOrder: 1, state: "minimised" })] },
  ],
  ["INV-04", "visible windows but no focus", { ...valid, focusedWindowId: null }],
  [
    "INV-05",
    "two windows with the same z-order",
    { ...valid, windows: [window({ id: "a", zOrder: 1 }), window({ id: "b", zOrder: 1 })] },
  ],
  [
    "INV-05",
    "a negative z-order",
    { ...valid, windows: [window({ id: "a", zOrder: -1 }), window({ id: "b", zOrder: 1 })] },
  ],
  [
    "INV-05",
    "a fractional z-order",
    { ...valid, windows: [window({ id: "a", zOrder: 0.5 }), window({ id: "b", zOrder: 1 })] },
  ],
  [
    "INV-06",
    "two windows with the same id",
    { ...valid, windows: [window({ id: "b", zOrder: 0 }), window({ id: "b", zOrder: 1 })] },
  ],
  [
    "INV-07",
    "a window past the right edge",
    { ...valid, windows: [valid.windows[0], window({ id: "b", zOrder: 1, x: 1217 })] },
  ],
  [
    "INV-07",
    "a window past the left edge",
    { ...valid, windows: [valid.windows[0], window({ id: "b", zOrder: 1, x: -337 })] },
  ],
  [
    "INV-07",
    "only the control cells and 63 px of title bar left on screen",
    { ...valid, windows: [valid.windows[0], window({ id: "b", zOrder: 1, x: -217 })] },
  ],
  [
    "INV-07",
    "a title bar above the viewport",
    { ...valid, windows: [valid.windows[0], window({ id: "b", zOrder: 1, y: -1 })] },
  ],
  [
    "INV-07",
    "a title bar below the viewport",
    { ...valid, windows: [valid.windows[0], window({ id: "b", zOrder: 1, y: 689 })] },
  ],
  [
    "INV-07",
    "a minimised window out of reach",
    {
      ...valid,
      windows: [window({ id: "a", state: "minimised", x: 5000 }), valid.windows[1]],
    },
  ],
  [
    "INV-08",
    "a window that is too narrow",
    { ...valid, windows: [valid.windows[0], window({ id: "b", zOrder: 1, width: 319 })] },
  ],
  [
    "INV-08",
    "a window that is too short",
    { ...valid, windows: [valid.windows[0], window({ id: "b", zOrder: 1, height: 199 })] },
  ],
  [
    "INV-09",
    "two windows of a single-instance app",
    {
      ...valid,
      windows: [
        window({ id: "a", zOrder: 0, singleInstance: true }),
        window({ id: "b", zOrder: 1, singleInstance: true }),
      ],
    },
  ],
];

describe("checkInvariants", () => {
  it("finds nothing wrong with a valid state", () => {
    expect(checkInvariants(valid)).toEqual([]);
  });

  it("accepts a window pushed exactly to the left limit", () => {
    const atLimit = window({ id: "b", zOrder: 1, x: 184 - 400 });
    expect(checkInvariants({ ...valid, windows: [valid.windows[0], atLimit] })).toEqual([]);
  });

  it("finds nothing wrong with an empty desktop", () => {
    expect(checkInvariants({ ...valid, focusedWindowId: null, windows: [] })).toEqual([]);
  });

  it("allows no focus when every window is minimised", () => {
    const snapshot = {
      ...valid,
      focusedWindowId: null,
      windows: [window({ state: "minimised" })],
    };
    expect(checkInvariants(snapshot)).toEqual([]);
  });

  it("ignores a minimised window with a higher z-order when judging the topmost", () => {
    const snapshot = {
      ...valid,
      focusedWindowId: "a",
      windows: [
        window({ id: "a", zOrder: 0 }),
        window({ id: "b", zOrder: 1, state: "minimised" }),
      ],
    };
    expect(checkInvariants(snapshot)).toEqual([]);
  });

  it.each(broken)("%s reports %s", (invariant, _description, snapshot) => {
    const reported = checkInvariants(snapshot).map((violation) => violation.invariant);
    expect(reported).toContain(invariant);
  });
});
