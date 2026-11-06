import type { DomainError } from "./errors";
import { Position } from "./Position";
import { err, ok, type Result } from "./result";
import { Size } from "./Size";

/** A value object built from two valid value objects, so `of` has nothing left to validate. */
export class Bounds {
  private constructor(
    readonly position: Position,
    readonly size: Size,
  ) {
    Object.freeze(this);
  }

  static of(position: Position, size: Size): Bounds {
    return new Bounds(position, size);
  }

  static create(
    x: number,
    y: number,
    width: number,
    height: number,
  ): Result<Bounds, DomainError> {
    const position = Position.create(x, y);
    if (!position.ok) return err(position.error);
    const size = Size.create(width, height);
    if (!size.ok) return err(size.error);
    return ok(new Bounds(position.value, size.value));
  }

  get x(): number {
    return this.position.x;
  }

  get y(): number {
    return this.position.y;
  }

  get width(): number {
    return this.size.width;
  }

  get height(): number {
    return this.size.height;
  }

  equals(other: Bounds): boolean {
    return this.position.equals(other.position) && this.size.equals(other.size);
  }
}
