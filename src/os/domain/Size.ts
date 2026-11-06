import type { DomainError } from "./errors";
import { err, ok, type Result } from "./result";

const isValidLength = (value: number): boolean => Number.isSafeInteger(value) && value > 0;

/** A value object. The minimum window size is a rule about windows, so it is not checked here. */
export class Size {
  private constructor(
    readonly width: number,
    readonly height: number,
  ) {
    Object.freeze(this);
  }

  static create(width: number, height: number): Result<Size, DomainError> {
    return isValidLength(width) && isValidLength(height)
      ? ok(new Size(width, height))
      : err({ code: "InvalidSize", width, height });
  }

  atLeast(minWidth: number, minHeight: number): Size {
    return new Size(Math.max(this.width, minWidth), Math.max(this.height, minHeight));
  }

  atMost(maxWidth: number, maxHeight: number): Size {
    return new Size(Math.min(this.width, maxWidth), Math.min(this.height, maxHeight));
  }

  equals(other: Size): boolean {
    return this.width === other.width && this.height === other.height;
  }
}
