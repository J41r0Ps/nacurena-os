import type { AppDefinition } from "./AppDefinition";
import { Bounds } from "./Bounds";
import { CASCADE_LENGTH, CASCADE_ORIGIN_X, CASCADE_ORIGIN_Y, CASCADE_STEP } from "./constants";
import type { DomainError } from "./errors";
import type { DomainEvent } from "./events";
import { createAppId, createWindowId, type WindowId, type WindowIdGenerator } from "./ids";
import { checkInvariants } from "./invariants";
import { Position } from "./Position";
import { err, ok, type Result } from "./result";
import { isWindowManagerSnapshot, type WindowManagerSnapshot } from "./snapshot";
import { Viewport, type ResizeEdge } from "./Viewport";
import { Window } from "./Window";

export interface CommandOutcome {
  readonly manager: WindowManager;
  readonly events: readonly DomainEvent[];
}

export type CommandResult = Result<CommandOutcome, DomainError>;

const topmostVisible = (windows: readonly Window[]): Window | null =>
  windows
    .filter((window) => window.isVisible)
    .reduce<Window | null>(
      (top, window) => (top === null || window.zOrder > top.zOrder ? window : top),
      null,
    );

const nextZOrder = (windows: readonly Window[]): number =>
  windows.reduce((highest, window) => Math.max(highest, window.zOrder + 1), 0);

const focusEvent = (windowId: WindowId | null): readonly DomainEvent[] =>
  windowId === null ? [] : [{ type: "WindowFocused", windowId }];

/**
 * The aggregate root: the one way to change windows, and the place every invariant is enforced.
 *
 * It is immutable. A command returns a new manager and leaves this one untouched, because Zustand
 * and React notice change by comparing references. A command that changes nothing returns this
 * same instance, so nothing re-renders.
 *
 * The constructor is private, so an invalid manager cannot be built from outside.
 */
export class WindowManager {
  private constructor(
    readonly viewport: Viewport,
    /** In opening order, which stays stable for the taskbar. Z-order is stored per window. */
    readonly windows: readonly Window[],
    readonly focusedWindowId: WindowId | null,
  ) {
    Object.freeze(windows);
    Object.freeze(this);
  }

  static create(viewport: Viewport): WindowManager {
    return new WindowManager(viewport, [], null);
  }

  /**
   * Rebuilds a manager from saved data. The input is `unknown` because storage is untrusted:
   * it can be stale, corrupted or edited by hand, so nothing passes without being validated.
   */
  static fromSnapshot(input: unknown): Result<WindowManager, DomainError> {
    if (!isWindowManagerSnapshot(input)) return err({ code: "MalformedSnapshot" });

    const violations = checkInvariants(input);
    if (violations.length > 0) return err({ code: "SnapshotBreaksInvariants", violations });

    const viewport = Viewport.create(input.viewport.width, input.viewport.height);
    if (!viewport.ok) return err(viewport.error);

    const windows: Window[] = [];
    for (const saved of input.windows) {
      const id = createWindowId(saved.id);
      if (!id.ok) return err(id.error);
      const appId = createAppId(saved.appId);
      if (!appId.ok) return err(appId.error);
      const bounds = Bounds.create(saved.x, saved.y, saved.width, saved.height);
      if (!bounds.ok) return err(bounds.error);
      windows.push(
        Window.fromValidated({
          ...saved,
          id: id.value,
          appId: appId.value,
          bounds: bounds.value,
        }),
      );
    }

    const focused = windows.find((window) => window.id === input.focusedWindowId);
    return ok(new WindowManager(viewport.value, windows, focused?.id ?? null));
  }

  toSnapshot(): WindowManagerSnapshot {
    return {
      viewport: { width: this.viewport.width, height: this.viewport.height },
      focusedWindowId: this.focusedWindowId,
      windows: this.windows.map((window) => window.toSnapshot()),
    };
  }

  /** `generateId` is only called when a new window is really created. */
  openApp(app: AppDefinition, generateId: WindowIdGenerator): CommandResult {
    const existing = this.windows.find(
      (window) => window.appId === app.id && (app.singleInstance || window.singleInstance),
    );
    if (existing !== undefined) {
      return existing.isVisible ? this.focusWindow(existing.id) : this.restoreWindow(existing.id);
    }

    const id = generateId();
    if (this.windows.some((window) => window.id === id)) {
      return err({ code: "DuplicateWindowId", windowId: id });
    }

    const offset = CASCADE_STEP * (this.windows.length % CASCADE_LENGTH);
    const size = app.defaultSize.atMost(this.viewport.width, this.viewport.height);
    const start = Position.ORIGIN.offsetBy(CASCADE_ORIGIN_X + offset, CASCADE_ORIGIN_Y + offset);
    const bounds = this.viewport.fit(Bounds.of(this.viewport.keepingOnScreen(start, size), size));
    const window = Window.open(id, app, bounds, nextZOrder(this.windows));

    return ok({
      manager: new WindowManager(this.viewport, [...this.windows, window], id),
      events: [{ type: "WindowOpened", windowId: id, appId: app.id }, ...focusEvent(id)],
    });
  }

  focusWindow(id: WindowId): CommandResult {
    const window = this.findWindow(id);
    if (!window.ok) return window;
    if (!window.value.isVisible) return err({ code: "WindowIsMinimised", windowId: id });
    if (this.focusedWindowId === id) return this.unchanged();

    return ok({ manager: this.withFocusOn(this.windows, id), events: focusEvent(id) });
  }

  /** Dragging past a limit is normal, so the window stops there instead of raising an error. */
  moveWindow(id: WindowId, position: Position): CommandResult {
    const window = this.findNormalWindow(id);
    if (!window.ok) return window;

    const { bounds } = window.value;
    const moved = this.viewport.fit(Bounds.of(position, bounds.size));
    if (moved.equals(bounds)) return this.unchanged();

    return ok({
      manager: this.withWindows(this.replace(window.value.withBounds(moved))),
      events: [{ type: "WindowMoved", windowId: id }],
    });
  }

  /** Takes full bounds, because dragging a top or left edge changes the position as well. */
  resizeWindow(id: WindowId, requested: Bounds): CommandResult {
    const window = this.findNormalWindow(id);
    if (!window.ok) return window;

    const resized = this.viewport.fit(requested);
    if (resized.equals(window.value.bounds)) return this.unchanged();

    return ok({
      manager: this.withWindows(this.replace(window.value.withBounds(resized))),
      events: [{ type: "WindowResized", windowId: id }],
    });
  }

  /**
   * Resizes from a held edge or corner. `start` is where the gesture began and `dx`, `dy` are the
   * total distance so far, so a pointer that goes past a limit and comes back rejoins the edge.
   */
  resizeWindowFromEdge(
    id: WindowId,
    start: Bounds,
    edge: ResizeEdge,
    dx: number,
    dy: number,
  ): CommandResult {
    const requested = this.viewport.resizedFromEdge(start, edge, dx, dy);
    return requested.ok ? this.resizeWindow(id, requested.value) : requested;
  }

  minimiseWindow(id: WindowId): CommandResult {
    const window = this.findWindow(id);
    if (!window.ok) return window;
    if (!window.value.isVisible) return this.unchanged();

    const windows = this.replace(window.value.asMinimised());
    const event: DomainEvent = { type: "WindowMinimised", windowId: id };
    if (this.focusedWindowId !== id) {
      return ok({ manager: this.withWindows(windows), events: [event] });
    }

    const next = topmostVisible(windows)?.id ?? null;
    return ok({
      manager: new WindowManager(this.viewport, windows, next),
      events: [event, ...focusEvent(next)],
    });
  }

  maximiseWindow(id: WindowId): CommandResult {
    const window = this.findWindow(id);
    if (!window.ok) return window;
    if (!window.value.isVisible) return err({ code: "WindowIsMinimised", windowId: id });
    if (window.value.state === "maximised") return this.unchanged();

    return ok({
      manager: this.withFocusOn(this.replace(window.value.asMaximised()), id),
      events: [
        { type: "WindowMaximised", windowId: id },
        ...focusEvent(this.focusedWindowId === id ? null : id),
      ],
    });
  }

  restoreWindow(id: WindowId): CommandResult {
    const window = this.findWindow(id);
    if (!window.ok) return window;
    if (window.value.state === "normal") return this.unchanged();

    return ok({
      manager: this.withFocusOn(this.replace(window.value.asRestored()), id),
      events: [
        { type: "WindowRestored", windowId: id },
        ...focusEvent(this.focusedWindowId === id ? null : id),
      ],
    });
  }

  closeWindow(id: WindowId): CommandResult {
    const window = this.findWindow(id);
    if (!window.ok) return window;

    const windows = this.windows.filter((other) => other.id !== id);
    const event: DomainEvent = { type: "WindowClosed", windowId: id };
    if (this.focusedWindowId !== id) {
      return ok({ manager: this.withWindows(windows), events: [event] });
    }

    const next = topmostVisible(windows)?.id ?? null;
    return ok({
      manager: new WindowManager(this.viewport, windows, next),
      events: [event, ...focusEvent(next)],
    });
  }

  /** Refits every window, also hidden ones, so a later restore cannot land out of reach. */
  resizeViewport(viewport: Viewport): CommandResult {
    if (viewport.equals(this.viewport)) return this.unchanged();

    const windows = this.windows.map((window) => {
      const fitted = viewport.fit(window.bounds);
      return fitted.equals(window.bounds) ? window : window.withBounds(fitted);
    });

    return ok({
      manager: new WindowManager(viewport, windows, this.focusedWindowId),
      events: [{ type: "ViewportResized", width: viewport.width, height: viewport.height }],
    });
  }

  private unchanged(): CommandResult {
    return ok({ manager: this, events: [] });
  }

  private findWindow(id: WindowId): Result<Window, DomainError> {
    const window = this.windows.find((candidate) => candidate.id === id);
    return window === undefined ? err({ code: "UnknownWindow", windowId: id }) : ok(window);
  }

  private findNormalWindow(id: WindowId): Result<Window, DomainError> {
    const window = this.findWindow(id);
    if (!window.ok) return window;
    if (this.viewport.isCompact) return err({ code: "ViewportIsCompact", windowId: id });
    return window.value.state === "normal"
      ? window
      : err({ code: "WindowNotNormal", windowId: id });
  }

  private replace(changed: Window): readonly Window[] {
    return this.windows.map((window) => (window.id === changed.id ? changed : window));
  }

  private withWindows(windows: readonly Window[]): WindowManager {
    return new WindowManager(this.viewport, windows, this.focusedWindowId);
  }

  /** Focuses a visible window, raising it above the others only if it is not already on top. */
  private withFocusOn(windows: readonly Window[], id: WindowId): WindowManager {
    if (topmostVisible(windows)?.id === id) {
      return new WindowManager(this.viewport, windows, id);
    }
    const zOrder = nextZOrder(windows);
    const raised = windows.map((window) =>
      window.id === id ? window.withZOrder(zOrder) : window,
    );
    return new WindowManager(this.viewport, raised, id);
  }
}
