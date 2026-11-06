import { describe, expect, it } from "vitest";
import type { WindowId, WindowIdGenerator } from "./ids";
import { checkInvariants } from "./invariants";
import { Size } from "./Size";
import {
  after,
  app,
  bounds,
  emptyManager,
  position,
  sequentialWindowIds,
  unwrap,
  viewport,
  windowId,
} from "./testSupport";
import { WindowManager } from "./WindowManager";

// One test per invariant, named exactly as in docs/DOMAIN.md.

const single = app("settings", true);
const multi = app("documents");

/** Opens windows named a, b, c… in order, so the last one is focused and on top. */
const desktopWith = (...names: string[]): WindowManager =>
  names.reduce(
    (manager, name) => after(manager.openApp(app(`app-${name}`), () => windowId(name))),
    emptyManager(),
  );

const id = windowId;

const windowOf = (manager: WindowManager, target: WindowId) => {
  const found = manager.windows.find((window) => window.id === target);
  if (found === undefined) throw new Error(`No window ${target}`);
  return found;
};

const violations = (manager: WindowManager) => checkInvariants(manager.toSnapshot());

describe("state invariants", () => {
  it("INV-01: at most one window is focused, and the focus points to an existing window", () => {
    const manager = after(desktopWith("a", "b", "c").focusWindow(id("a")));

    expect(manager.focusedWindowId).toBe("a");
    expect(manager.windows.map((window) => window.id)).toContain(manager.focusedWindowId);
    expect(after(manager.closeWindow(id("a"))).focusedWindowId).not.toBe("a");
    expect(emptyManager().focusedWindowId).toBeNull();
  });

  it("INV-02: the focused window is the topmost visible window", () => {
    const manager = after(desktopWith("a", "b", "c").focusWindow(id("a")));
    const highest = Math.max(...manager.windows.map((window) => window.zOrder));
    expect(windowOf(manager, id("a")).zOrder).toBe(highest);

    // c keeps a higher z-order while minimised, and that must not count against b.
    const minimised = after(desktopWith("a", "b", "c").minimiseWindow(id("c")));
    expect(minimised.focusedWindowId).toBe("b");
    expect(violations(minimised)).toEqual([]);
  });

  it("INV-03: a minimised window is never focused", () => {
    const manager = after(desktopWith("a", "b").minimiseWindow(id("b")));

    expect(manager.focusedWindowId).not.toBe("b");
    expect(manager.focusWindow(id("b"))).toEqual({
      ok: false,
      error: { code: "WindowIsMinimised", windowId: "b" },
    });
  });

  it("INV-04: if any window is visible, exactly one is focused", () => {
    const oneLeft = after(desktopWith("a", "b").minimiseWindow(id("b")));
    expect(oneLeft.focusedWindowId).toBe("a");

    const noneLeft = after(oneLeft.minimiseWindow(id("a")));
    expect(noneLeft.focusedWindowId).toBeNull();

    expect(after(noneLeft.restoreWindow(id("a"))).focusedWindowId).toBe("a");
  });

  it("INV-05: z-order values are unique non-negative integers", () => {
    let manager = desktopWith("a", "b", "c");
    for (const name of ["a", "b", "a", "c", "b"]) {
      manager = after(manager.focusWindow(id(name)));
    }
    manager = after(manager.closeWindow(id("c")));
    manager = after(manager.openApp(multi, () => id("d")));

    const zOrders = manager.windows.map((window) => window.zOrder);
    expect(new Set(zOrders).size).toBe(zOrders.length);
    expect(zOrders.every((zOrder) => Number.isInteger(zOrder) && zOrder >= 0)).toBe(true);
  });

  it("INV-06: window ids are unique", () => {
    const manager = desktopWith("a");
    const repeatingGenerator: WindowIdGenerator = () => id("a");

    expect(manager.openApp(multi, repeatingGenerator)).toEqual({
      ok: false,
      error: { code: "DuplicateWindowId", windowId: "a" },
    });
  });

  it("INV-07: every window keeps its grab strip inside the viewport", () => {
    const manager = desktopWith("a");
    const moveTo = (x: number, y: number) => {
      const moved = after(manager.moveWindow(id("a"), position(x, y)));
      return windowOf(moved, id("a")).bounds;
    };

    // The window is 640 × 480 in a 1280 × 720 viewport.
    expect(moveTo(99_999, 99_999)).toMatchObject({ x: 1216, y: 688 });
    // Left limit: the right edge stops at 184, so the controls (120) and a grab strip (64) stay.
    expect(moveTo(-99_999, -99_999)).toMatchObject({ x: -456, y: 0 });

    const resized = after(manager.resizeWindow(id("a"), bounds(5000, 5000, 400, 300)));
    expect(windowOf(resized, id("a")).bounds).toMatchObject({ x: 1216, y: 688 });
  });

  it("INV-08: every window is at least the minimum size", () => {
    const manager = desktopWith("a");
    const resized = after(manager.resizeWindow(id("a"), bounds(10, 10, 1, 1)));
    expect(windowOf(resized, id("a")).bounds.size).toMatchObject({ width: 320, height: 200 });

    const tiny = { ...multi, defaultSize: unwrap(Size.create(10, 10)) };
    const opened = after(emptyManager().openApp(tiny, () => id("t")));
    expect(windowOf(opened, id("t")).bounds.size).toMatchObject({ width: 320, height: 200 });
  });

  it("INV-09: a single-instance app has at most one window", () => {
    const ids = sequentialWindowIds();
    const once = after(emptyManager().openApp(single, ids));
    const twice = after(once.openApp(single, ids));

    expect(twice.windows).toHaveLength(1);
  });
});

describe("transition invariants", () => {
  it("INV-10: opening a new window focuses it", () => {
    const result = unwrap(desktopWith("a").openApp(multi, () => id("new")));

    expect(result.manager.focusedWindowId).toBe("new");
    expect(result.events).toEqual([
      { type: "WindowOpened", windowId: "new", appId: "documents" },
      { type: "WindowFocused", windowId: "new" },
    ]);
  });

  it("INV-11: opening an open single-instance app creates nothing and focuses its window", () => {
    let generated = 0;
    const counting: WindowIdGenerator = () => id(`generated-${++generated}`);
    const opened = after(emptyManager().openApp(single, counting));
    const covered = after(opened.openApp(multi, counting));

    const refocused = unwrap(covered.openApp(single, counting));
    expect(refocused.manager.focusedWindowId).toBe("generated-1");
    expect(refocused.manager.windows).toHaveLength(2);
    expect(refocused.events).toEqual([{ type: "WindowFocused", windowId: "generated-1" }]);
    expect(generated).toBe(2);

    // A minimised window has to be restored first, or focusing it would break INV-03.
    const hidden = after(covered.minimiseWindow(id("generated-1")));
    const restored = unwrap(hidden.openApp(single, counting));
    expect(restored.manager.focusedWindowId).toBe("generated-1");
    expect(windowOf(restored.manager, id("generated-1")).state).toBe("normal");
    expect(restored.events).toEqual([
      { type: "WindowRestored", windowId: "generated-1" },
      { type: "WindowFocused", windowId: "generated-1" },
    ]);
  });

  it("INV-12: closing the focused window focuses the next topmost visible window", () => {
    // a, b, c opened, then c minimised and a focused: z-order is now b < c(hidden) < a.
    const manager = after(
      after(desktopWith("a", "b", "c").minimiseWindow(id("c"))).focusWindow(id("a")),
    );

    const result = unwrap(manager.closeWindow(id("a")));
    expect(result.manager.focusedWindowId).toBe("b");
    expect(result.events).toEqual([
      { type: "WindowClosed", windowId: "a" },
      { type: "WindowFocused", windowId: "b" },
    ]);

    const nothingVisible = unwrap(result.manager.closeWindow(id("b")));
    expect(nothingVisible.manager.focusedWindowId).toBeNull();
    expect(nothingVisible.events).toEqual([{ type: "WindowClosed", windowId: "b" }]);

    const unfocused = after(desktopWith("a", "b").closeWindow(id("a")));
    expect(unfocused.focusedWindowId).toBe("b");
  });

  it("INV-13: minimising the focused window focuses the next topmost visible window", () => {
    const result = unwrap(desktopWith("a", "b", "c").minimiseWindow(id("c")));
    expect(result.manager.focusedWindowId).toBe("b");
    expect(result.events).toEqual([
      { type: "WindowMinimised", windowId: "c" },
      { type: "WindowFocused", windowId: "b" },
    ]);

    const nothingVisible = unwrap(desktopWith("a").minimiseWindow(id("a")));
    expect(nothingVisible.manager.focusedWindowId).toBeNull();

    const unfocused = after(desktopWith("a", "b").minimiseWindow(id("a")));
    expect(unfocused.focusedWindowId).toBe("b");
  });

  it("INV-14: a maximised window's display bounds equal the viewport", () => {
    const manager = after(desktopWith("a").maximiseWindow(id("a")));
    const displayed = (current: WindowManager) =>
      windowOf(current, id("a")).displayBounds(current.viewport);

    expect(displayed(manager).equals(manager.viewport.toBounds())).toBe(true);

    const resized = after(manager.resizeViewport(viewport(900, 500)));
    expect(displayed(resized).equals(bounds(0, 0, 900, 500))).toBe(true);
  });

  it("INV-15: maximise then restore returns the exact previous bounds", () => {
    const start = after(desktopWith("a").moveWindow(id("a"), position(123, 45)));
    const original = windowOf(start, id("a")).bounds;

    const maximised = after(start.maximiseWindow(id("a")));
    const restored = after(maximised.restoreWindow(id("a")));
    expect(windowOf(restored, id("a")).bounds.equals(original)).toBe(true);

    const hidden = after(maximised.minimiseWindow(id("a")));
    const stillMaximised = after(hidden.restoreWindow(id("a")));
    const normal = after(stillMaximised.restoreWindow(id("a")));
    expect(windowOf(stillMaximised, id("a")).state).toBe("maximised");
    expect(windowOf(normal, id("a")).state).toBe("normal");
    expect(windowOf(normal, id("a")).bounds.equals(original)).toBe(true);
  });

  it("INV-16: restoring a minimised window returns it to its previous state and focuses it", () => {
    const hiddenNormal = after(desktopWith("a", "b").minimiseWindow(id("a")));
    const restoredNormal = unwrap(hiddenNormal.restoreWindow(id("a")));
    expect(windowOf(restoredNormal.manager, id("a")).state).toBe("normal");
    expect(restoredNormal.manager.focusedWindowId).toBe("a");
    expect(violations(restoredNormal.manager)).toEqual([]);
    expect(restoredNormal.events).toEqual([
      { type: "WindowRestored", windowId: "a" },
      { type: "WindowFocused", windowId: "a" },
    ]);

    const maximised = after(desktopWith("a", "b").maximiseWindow(id("a")));
    const hiddenMaximised = after(maximised.minimiseWindow(id("a")));
    const restoredMaximised = after(hiddenMaximised.restoreWindow(id("a")));
    expect(windowOf(restoredMaximised, id("a")).state).toBe("maximised");
    expect(restoredMaximised.focusedWindowId).toBe("a");
  });

  it("INV-17: a viewport change keeps every window reachable", () => {
    const moved = after(desktopWith("a", "b").moveWindow(id("a"), position(1200, 680)));
    const hidden = after(moved.minimiseWindow(id("a")));

    const shrunk = unwrap(hidden.resizeViewport(viewport(800, 600)));

    expect(windowOf(shrunk.manager, id("a")).bounds).toMatchObject({ x: 736, y: 568 });
    expect(violations(shrunk.manager)).toEqual([]);
    expect(shrunk.events).toEqual([{ type: "ViewportResized", width: 800, height: 600 }]);
  });

  it("INV-18: a command never changes the previous manager, and a no-op changes nothing", () => {
    const manager = desktopWith("a", "b");
    const before = manager.toSnapshot();

    after(manager.moveWindow(id("a"), position(50, 50)));
    after(manager.focusWindow(id("a")));
    after(manager.closeWindow(id("b")));
    expect(manager.toSnapshot()).toEqual(before);

    const noOps = [
      manager.focusWindow(id("b")),
      manager.restoreWindow(id("a")),
      manager.moveWindow(id("b"), windowOf(manager, id("b")).bounds.position),
      manager.resizeWindow(id("b"), windowOf(manager, id("b")).bounds),
      manager.resizeViewport(manager.viewport),
      after(manager.minimiseWindow(id("a"))).minimiseWindow(id("a")),
    ];
    for (const noOp of noOps.slice(0, 5)) {
      expect(unwrap(noOp).manager).toBe(manager);
      expect(unwrap(noOp).events).toEqual([]);
    }
    expect(unwrap(noOps[5]).events).toEqual([]);

    const maximised = after(manager.maximiseWindow(id("b")));
    expect(unwrap(maximised.maximiseWindow(id("b"))).manager).toBe(maximised);

    expect(Object.isFrozen(manager)).toBe(true);
    expect(Object.isFrozen(manager.windows)).toBe(true);
    expect(Object.isFrozen(manager.windows[0])).toBe(true);
  });

  // The window starts at 100, 100 and is 640 × 480, so its right edge is 740 and its bottom 580.
  describe("INV-19: resizing from an edge never moves the opposite edge", () => {
    const start = bounds(100, 100, 640, 480);
    const manager = after(
      after(desktopWith("a").moveWindow(id("a"), start.position)).resizeWindow(id("a"), start),
    );
    const resize = (...gesture: [Parameters<WindowManager["resizeWindowFromEdge"]>[2], number, number]) =>
      windowOf(after(manager.resizeWindowFromEdge(id("a"), start, ...gesture)), id("a")).bounds;

    it("follows the pointer inside the limits", () => {
      expect(resize("e", 50, 999)).toMatchObject({ x: 100, y: 100, width: 690, height: 480 });
      expect(resize("s", 999, 50)).toMatchObject({ x: 100, y: 100, width: 640, height: 530 });
      expect(resize("w", -50, 999)).toMatchObject({ x: 50, y: 100, width: 690, height: 480 });
      expect(resize("n", 999, -50)).toMatchObject({ x: 100, y: 50, width: 640, height: 530 });
      expect(resize("nw", -10, -20)).toMatchObject({ x: 90, y: 80, width: 650, height: 500 });
      expect(resize("se", 10, 20)).toMatchObject({ x: 100, y: 100, width: 650, height: 500 });
    });

    it("stops the left edge at the minimum width instead of pushing the window right", () => {
      expect(resize("w", 9999, 0)).toMatchObject({ x: 420, width: 320 });
    });

    it("stops the top edge at the viewport instead of pushing the bottom down", () => {
      expect(resize("n", 0, -9999)).toMatchObject({ y: 0, height: 580 });
    });

    it("stops the top edge at the minimum height", () => {
      expect(resize("n", 0, 9999)).toMatchObject({ y: 380, height: 200 });
    });

    it("stops the right and bottom edges at the minimum size", () => {
      expect(resize("se", -9999, -9999)).toMatchObject({ x: 100, y: 100, width: 320, height: 200 });
    });

    it("stops the right edge at the left limit of a window pushed off screen", () => {
      const pushed = bounds(-400, 0, 640, 480);
      const moved = after(manager.moveWindow(id("a"), pushed.position));
      const shrunk = after(moved.resizeWindowFromEdge(id("a"), pushed, "e", -9999, 0));

      expect(windowOf(shrunk, id("a")).bounds).toMatchObject({ x: -400, width: 584 });
    });

    it("refuses distances that are not whole numbers", () => {
      expect(manager.resizeWindowFromEdge(id("a"), start, "e", 0.5, 0).ok).toBe(false);
    });
  });

  describe("INV-20: a compact viewport fills with every window and allows no moving", () => {
    const wide = after(desktopWith("a").moveWindow(id("a"), position(100, 100)));
    const compact = after(wide.resizeViewport(viewport(767, 600)));
    const window = windowOf(compact, id("a"));

    it("starts at 768 px, not above", () => {
      expect(viewport(767, 600).isCompact).toBe(true);
      expect(viewport(768, 600).isCompact).toBe(false);
    });

    it("displays a normal window over the whole viewport without storing that", () => {
      expect(window.state).toBe("normal");
      expect(window.displayBounds(compact.viewport).equals(compact.viewport.toBounds())).toBe(true);
    });

    it("gives a window opened in a compact viewport the same display", () => {
      const opened = after(
        WindowManager.create(viewport(375, 700)).openApp(multi, () => id("phone")),
      );
      const displayed = windowOf(opened, id("phone")).displayBounds(opened.viewport);

      expect(displayed).toMatchObject({ x: 0, y: 0, width: 375, height: 700 });
    });

    it("refuses move and resize", () => {
      const refused = { ok: false, error: { code: "ViewportIsCompact", windowId: "a" } };

      expect(compact.moveWindow(id("a"), position(1, 1))).toEqual(refused);
      expect(compact.resizeWindow(id("a"), bounds(1, 1, 400, 300))).toEqual(refused);
      expect(
        compact.resizeWindowFromEdge(id("a"), window.bounds, "e", 10, 0),
      ).toEqual(refused);
    });

    it("brings back the stored bounds when the viewport grows again", () => {
      const before = windowOf(wide, id("a")).bounds;
      const widened = after(compact.resizeViewport(viewport()));
      const restored = windowOf(widened, id("a"));

      expect(restored.displayBounds(widened.viewport).equals(before)).toBe(true);
    });
  });
});

describe("commands the UI should never send", () => {
  const ghost = id("ghost");

  it.each([
    ["focusWindow", (m: WindowManager) => m.focusWindow(ghost)],
    ["moveWindow", (m: WindowManager) => m.moveWindow(ghost, position(0, 0))],
    ["resizeWindow", (m: WindowManager) => m.resizeWindow(ghost, bounds(0, 0, 400, 300))],
    [
      "resizeWindowFromEdge",
      (m: WindowManager) => m.resizeWindowFromEdge(ghost, bounds(0, 0, 400, 300), "e", 1, 0),
    ],
    ["minimiseWindow", (m: WindowManager) => m.minimiseWindow(ghost)],
    ["maximiseWindow", (m: WindowManager) => m.maximiseWindow(ghost)],
    ["restoreWindow", (m: WindowManager) => m.restoreWindow(ghost)],
    ["closeWindow", (m: WindowManager) => m.closeWindow(ghost)],
  ])("%s refuses an unknown window", (_name, command) => {
    expect(command(desktopWith("a"))).toEqual({
      ok: false,
      error: { code: "UnknownWindow", windowId: "ghost" },
    });
  });

  it("does not move or resize a window that is not normal", () => {
    const maximised = after(desktopWith("a").maximiseWindow(id("a")));
    const minimised = after(desktopWith("a").minimiseWindow(id("a")));
    const refused = { ok: false, error: { code: "WindowNotNormal", windowId: "a" } };

    expect(maximised.moveWindow(id("a"), position(1, 1))).toEqual(refused);
    expect(maximised.resizeWindow(id("a"), bounds(1, 1, 400, 300))).toEqual(refused);
    expect(minimised.moveWindow(id("a"), position(1, 1))).toEqual(refused);
  });

  it("does not maximise a minimised window", () => {
    const minimised = after(desktopWith("a").minimiseWindow(id("a")));

    expect(minimised.maximiseWindow(id("a"))).toEqual({
      ok: false,
      error: { code: "WindowIsMinimised", windowId: "a" },
    });
  });
});

describe("opening windows", () => {
  it("cascades new windows and wraps around", () => {
    const ids = sequentialWindowIds();
    let manager = emptyManager();
    for (let opened = 0; opened < 9; opened++) {
      manager = after(manager.openApp(multi, ids));
    }

    expect(manager.windows[0].bounds).toMatchObject({ x: 128, y: 16 });
    expect(manager.windows[1].bounds).toMatchObject({ x: 160, y: 48 });
    expect(manager.windows[8].bounds).toMatchObject({ x: 128, y: 16 });
  });

  it("INV-21: moves a new window back until all of it is on screen", () => {
    // 640 × 480 at the cascade start would end at x 768 in a 700 px wide viewport.
    const narrow = WindowManager.create(viewport(768, 500));
    const opened = after(narrow.openApp(multi, () => id("a")));

    expect(opened.windows[0].bounds).toMatchObject({ x: 128, y: 16 });

    const tight = WindowManager.create(viewport(700, 490));
    const moved = after(tight.openApp(multi, () => id("a")));

    expect(moved.windows[0].bounds).toMatchObject({ x: 60, y: 10 });
  });

  it("INV-21: opens at the corner when the window is as large as the viewport", () => {
    const exact = WindowManager.create(viewport(640, 480));
    const opened = after(exact.openApp(multi, () => id("a")));

    expect(opened.windows[0].bounds).toMatchObject({ x: 0, y: 0 });
  });

  it("shrinks a default size that does not fit the viewport", () => {
    const small = WindowManager.create(viewport(500, 400));
    const opened = after(small.openApp(multi, () => id("a")));

    expect(opened.windows[0].bounds.size).toMatchObject({ width: 500, height: 400 });
  });

  it("keeps windows in opening order, whatever the z-order", () => {
    const manager = after(desktopWith("a", "b").focusWindow(id("a")));

    expect(manager.windows.map((window) => window.id)).toEqual(["a", "b"]);
  });
});

describe("showing an app", () => {
  it("INV-22: opens a window, focused, when the app has none", () => {
    const manager = after(emptyManager().showApp(multi, () => id("a")));

    expect(manager.windows).toHaveLength(1);
    expect(manager.focusedWindowId).toBe("a");
  });

  it("INV-22: creates nothing for a multi-instance app that already has a window", () => {
    const opened = after(emptyManager().openApp(multi, () => id("a")));
    const generator = sequentialWindowIds("unused");

    const shown = unwrap(opened.showApp(multi, generator));

    expect(shown.manager).toBe(opened);
    expect(shown.events).toEqual([]);
  });

  it("INV-22: focuses the topmost window of the app, not the first one opened", () => {
    const generator = sequentialWindowIds();
    const twoDocuments = after(
      after(emptyManager().openApp(multi, generator)).openApp(multi, generator),
    );
    const behind = after(twoDocuments.openApp(single, () => id("other")));

    const shown = after(behind.showApp(multi, generator));

    expect(shown.windows).toHaveLength(3);
    expect(shown.focusedWindowId).toBe("window-2");
  });

  it("INV-22: restores the app's window when all of them are minimised", () => {
    const opened = after(emptyManager().openApp(multi, () => id("a")));
    const minimised = after(opened.minimiseWindow(id("a")));

    const shown = after(minimised.showApp(multi, () => id("new")));

    expect(shown.windows).toHaveLength(1);
    expect(shown.focusedWindowId).toBe("a");
    expect(windowOf(shown, id("a")).state).toBe("normal");
  });

  it("INV-22: prefers a visible window over a minimised one that is higher", () => {
    const generator = sequentialWindowIds();
    const twoDocuments = after(
      after(emptyManager().openApp(multi, generator)).openApp(multi, generator),
    );
    const topMinimised = after(twoDocuments.minimiseWindow(id("window-2")));
    const behind = after(topMinimised.openApp(single, () => id("other")));

    const shown = after(behind.showApp(multi, generator));

    expect(shown.focusedWindowId).toBe("window-1");
    expect(windowOf(shown, id("window-2")).state).toBe("minimised");
  });
});

describe("showing the desktop", () => {
  it("INV-23: leaves no visible window and no focus", () => {
    const manager = after(desktopWith("a", "b", "c").showDesktop());

    expect(manager.windows.every((window) => !window.isVisible)).toBe(true);
    expect(manager.focusedWindowId).toBeNull();
    expect(violations(manager)).toEqual([]);
  });

  it("INV-23: keeps every window, so nothing is lost", () => {
    const manager = after(desktopWith("a", "b").showDesktop());

    expect(manager.windows.map((window) => window.id)).toEqual(["a", "b"]);
  });

  it("INV-23: a maximised window comes back maximised", () => {
    const maximised = after(desktopWith("a").maximiseWindow(id("a")));

    const shown = after(after(maximised.showDesktop()).restoreWindow(id("a")));

    expect(windowOf(shown, id("a")).state).toBe("maximised");
  });

  it("INV-23: repeating it is a no-op", () => {
    const hidden = after(desktopWith("a").showDesktop());

    const again = unwrap(hidden.showDesktop());

    expect(again.manager).toBe(hidden);
    expect(again.events).toEqual([]);
  });

  it("reports one WindowMinimised per window that was visible", () => {
    const manager = after(desktopWith("a", "b", "c").minimiseWindow(id("b")));

    const { events } = unwrap(manager.showDesktop());

    expect(events.filter((event) => event.type === "WindowMinimised")).toHaveLength(2);
    expect(events.filter((event) => event.type === "WindowFocused")).toHaveLength(0);
  });
});
