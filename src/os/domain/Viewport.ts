import { Bounds } from "./Bounds";
import {
  GRAB_STRIP_WIDTH,
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  TITLE_BAR_HEIGHT,
} from "./constants";
import type { DomainError } from "./errors";
import { Position } from "./Position";
import { err, ok, type Result } from "./result";
import { Size } from "./Size";

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
      minX: GRAB_STRIP_WIDTH - size.width,
      maxX: this.width - GRAB_STRIP_WIDTH,
      minY: 0,
      maxY: this.height - TITLE_BAR_HEIGHT,
    });
    return Bounds.of(position, size);
  }

  equals(other: Viewport): boolean {
    return this.size.equals(other.size);
  }
}
