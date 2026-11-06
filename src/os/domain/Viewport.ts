import { Bounds } from "./Bounds";
import {
  COMPACT_VIEWPORT_WIDTH,
  GRAB_STRIP_WIDTH,
  MIN_VISIBLE_TITLE_BAR_WIDTH,
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  TITLE_BAR_HEIGHT,
} from "./constants";
import type { DomainError } from "./errors";
import { Position } from "./Position";
import { err, ok, type Result } from "./result";
import { Size } from "./Size";

/** Which edge or corner a resize gesture holds, as compass points. */
export type ResizeEdge = "n" | "e" | "s" | "w" | "ne" | "se" | "sw" | "nw";

/**
 * The desktop work area. It must fit at least one grab strip, otherwise no window could stay
 * reachable. A hidden tab reporting 0 × 0 therefore gets an error instead of breaking the state.
 */
export class Viewport {
  private constructor(readonly size: Size) {
    Object.freeze(this);
  }

  static create(width: number, height: number): Result<Viewport, DomainError> {
    const size = Size.create(width, height);
    if (!size.ok || width < GRAB_STRIP_WIDTH || height < TITLE_BAR_HEIGHT) {
      return err({ code: "ViewportTooSmall", width, height });
    }
    return ok(new Viewport(size.value));
  }

  get width(): number {
    return this.size.width;
  }

  get height(): number {
    return this.size.height;
  }

  /** Too narrow for free windows, so every window fills it and none can be moved. */
  get isCompact(): boolean {
    return this.width < COMPACT_VIEWPORT_WIDTH;
  }

  toBounds(): Bounds {
    return Bounds.of(Position.ORIGIN, this.size);
  }

  /**
   * The closest bounds that satisfy INV-07 and INV-08. Size comes first, because the
   * allowed positions depend on the width.
   */
  fit(bounds: Bounds): Bounds {
    const size = bounds.size.atLeast(MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT);
    const position = bounds.position.clampedTo({
      minX: MIN_VISIBLE_TITLE_BAR_WIDTH - size.width,
      maxX: this.width - GRAB_STRIP_WIDTH,
      minY: 0,
      maxY: this.height - TITLE_BAR_HEIGHT,
    });
    return Bounds.of(position, size);
  }

  /**
   * Moves a new window back until all of it is on screen (INV-21). `fit` only guarantees a grab
   * strip, which is right for a window the visitor pushed away, but a window that has just opened
   * must show its controls. `size` must already fit this viewport.
   */
  keepingOnScreen(position: Position, size: Size): Position {
    return position.clampedTo({
      minX: 0,
      maxX: this.width - size.width,
      minY: 0,
      maxY: this.height - size.height,
    });
  }

  /**
   * Where a resize gesture ends up. Each held edge stops at its own limit, so the opposite edge
   * stays put (INV-19). `fit` cannot give that: it clamps position and size separately, so a left
   * edge dragged past the minimum width would push the whole window to the right.
   */
  resizedFromEdge(
    start: Bounds,
    edge: ResizeEdge,
    dx: number,
    dy: number,
  ): Result<Bounds, DomainError> {
    const right = start.x + start.width;
    const bottom = start.y + start.height;

    const newLeft = edge.includes("w")
      ? Math.min(start.x + dx, right - MIN_WINDOW_WIDTH, this.width - GRAB_STRIP_WIDTH)
      : start.x;
    const newRight = edge.includes("e")
      ? Math.max(right + dx, start.x + MIN_WINDOW_WIDTH, MIN_VISIBLE_TITLE_BAR_WIDTH)
      : right;
    const newTop = edge.includes("n")
      ? Math.min(
          Math.max(start.y + dy, 0),
          bottom - MIN_WINDOW_HEIGHT,
          this.height - TITLE_BAR_HEIGHT,
        )
      : start.y;
    const newBottom = edge.includes("s")
      ? Math.max(bottom + dy, start.y + MIN_WINDOW_HEIGHT)
      : bottom;

    return Bounds.create(newLeft, newTop, newRight - newLeft, newBottom - newTop);
  }

  equals(other: Viewport): boolean {
    return this.size.equals(other.size);
  }
}
