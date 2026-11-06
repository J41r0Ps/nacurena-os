import type { DomainError } from "./errors";
import { err, ok, type Result } from "./result";

/** A value object: it has no identity, so two positions with the same x and y are equal. */
export class Position {
  private constructor(
    readonly x: number,
    readonly y: number,
  ) {
    Object.freeze(this);
  }

  static create(x: number, y: number): Result<Position, DomainError> {
    return Number.isSafeInteger(x) && Number.isSafeInteger(y)
      ? ok(new Position(x, y))
      : err({ code: "InvalidPosition", x, y });
  }

  static readonly ORIGIN = new Position(0, 0);

  /** Moves down and right from here. Only for the small whole offsets of the cascade. */
  offsetBy(distance: number): Position {
    return new Position(this.x + distance, this.y + distance);
  }

  /** Clamping valid whole numbers to whole limits stays valid, so this cannot fail. */
  clampedTo(limits: {
    readonly minX: number;
    readonly maxX: number;
    readonly minY: number;
    readonly maxY: number;
  }): Position {
    return new Position(
      Math.min(Math.max(this.x, limits.minX), limits.maxX),
      Math.min(Math.max(this.y, limits.minY), limits.maxY),
    );
  }

  equals(other: Position): boolean {
    return this.x === other.x && this.y === other.y;
  }
}
