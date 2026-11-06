import {
  GRAB_STRIP_WIDTH,
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  TITLE_BAR_HEIGHT,
  WINDOW_CONTROLS_WIDTH,
} from "./constants";
import type { WindowManagerSnapshot, WindowSnapshot } from "./snapshot";

export type StateInvariant =
  | "INV-01"
  | "INV-02"
  | "INV-03"
  | "INV-04"
  | "INV-05"
  | "INV-06"
  | "INV-07"
  | "INV-08"
  | "INV-09";

export interface InvariantViolation {
  readonly invariant: StateInvariant;
  readonly windowId?: string;
}

/** Measures the part of the title bar that can start a drag, cut down to what the viewport shows. */
const hasGrabStripInside = (
  window: WindowSnapshot,
  viewport: WindowManagerSnapshot["viewport"],
): boolean => {
  const draggableEnd = window.x + window.width - WINDOW_CONTROLS_WIDTH;
  const visibleDraggableWidth = Math.min(draggableEnd, viewport.width) - Math.max(window.x, 0);
  return (
    visibleDraggableWidth >= GRAB_STRIP_WIDTH &&
    window.y >= 0 &&
    window.y + TITLE_BAR_HEIGHT <= viewport.height
  );
};

/**
 * Checks the state invariants of docs/DOMAIN.md against plain data. It deliberately shares no
 * logic with the commands: it works out each rule its own way, so a bug in a command cannot
 * hide itself by also being in the check.
 */
export const checkInvariants = (
  snapshot: WindowManagerSnapshot,
): readonly InvariantViolation[] => {
  const { windows, focusedWindowId, viewport } = snapshot;
  const violations: InvariantViolation[] = [];
  const visible = windows.filter((window) => window.state !== "minimised");
  const focused = windows.find((window) => window.id === focusedWindowId);

  if (focusedWindowId !== null && focused === undefined) {
    violations.push({ invariant: "INV-01", windowId: focusedWindowId });
  }

  if (focused !== undefined && focused.state !== "minimised") {
    const highest = Math.max(...visible.map((window) => window.zOrder));
    if (focused.zOrder !== highest) {
      violations.push({ invariant: "INV-02", windowId: focused.id });
    }
  }

  if (focused?.state === "minimised") {
    violations.push({ invariant: "INV-03", windowId: focused.id });
  }

  if (visible.length > 0 && focusedWindowId === null) {
    violations.push({ invariant: "INV-04" });
  }

  const zOrders = windows.map((window) => window.zOrder);
  const validZOrders = zOrders.every((zOrder) => Number.isSafeInteger(zOrder) && zOrder >= 0);
  if (!validZOrders || new Set(zOrders).size !== zOrders.length) {
    violations.push({ invariant: "INV-05" });
  }

  if (new Set(windows.map((window) => window.id)).size !== windows.length) {
    violations.push({ invariant: "INV-06" });
  }

  for (const window of windows) {
    if (!hasGrabStripInside(window, viewport)) {
      violations.push({ invariant: "INV-07", windowId: window.id });
    }
    if (window.width < MIN_WINDOW_WIDTH || window.height < MIN_WINDOW_HEIGHT) {
      violations.push({ invariant: "INV-08", windowId: window.id });
    }
    const sameApp = windows.filter((other) => other.appId === window.appId);
    if (window.singleInstance && sameApp.length > 1) {
      violations.push({ invariant: "INV-09", windowId: window.id });
    }
  }

  return violations;
};
