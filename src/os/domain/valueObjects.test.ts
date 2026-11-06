import { describe, expect, it } from "vitest";
import { Bounds } from "./Bounds";
import { createAppId, createWindowId } from "./ids";
import { Position } from "./Position";
import { Size } from "./Size";
import { bounds, position, unwrap, viewport } from "./testSupport";
import { Viewport } from "./Viewport";

describe("Position", () => {
  it("accepts whole numbers, including negative ones", () => {
    expect(Position.create(-20, 15).ok).toBe(true);
  });

  it.each([
    [Number.NaN, 0],
    [0, Number.POSITIVE_INFINITY],
    [1.5, 0],
    [0, Number.MAX_SAFE_INTEGER + 1],
  ])("rejects %s, %s", (x, y) => {
    expect(Position.create(x, y)).toEqual({
      ok: false,
      error: { code: "InvalidPosition", x, y },
    });
  });

  it("is equal by value", () => {
    expect(position(1, 2).equals(position(1, 2))).toBe(true);
    expect(position(1, 2).equals(position(2, 1))).toBe(false);
  });

  it("is frozen at runtime, not only readonly for the compiler", () => {
    expect(Object.isFrozen(position(1, 2))).toBe(true);
  });
});

describe("Size", () => {
  it("accepts positive whole numbers", () => {
    expect(Size.create(1, 1).ok).toBe(true);
  });

  it.each([
    [0, 10],
    [10, -1],
    [Number.NaN, 10],
    [10.5, 10],
  ])("rejects %s × %s", (width, height) => {
    expect(Size.create(width, height)).toEqual({
      ok: false,
      error: { code: "InvalidSize", width, height },
    });
  });

  it("is equal by value", () => {
    expect(unwrap(Size.create(3, 4)).equals(unwrap(Size.create(3, 4)))).toBe(true);
    expect(unwrap(Size.create(3, 4)).equals(unwrap(Size.create(4, 3)))).toBe(false);
  });

  it("limits itself without changing the original", () => {
    const size = unwrap(Size.create(100, 100));
    expect(size.atLeast(200, 50).width).toBe(200);
    expect(size.atMost(50, 200).width).toBe(50);
    expect(size.width).toBe(100);
  });
});

describe("Bounds", () => {
  it("reports the first invalid part", () => {
    expect(Bounds.create(Number.NaN, 0, 10, 10).ok).toBe(false);
    expect(Bounds.create(0, 0, 0, 10).ok).toBe(false);
  });

  it("exposes its position and size", () => {
    expect(bounds(1, 2, 3, 4)).toMatchObject({ x: 1, y: 2, width: 3, height: 4 });
  });

  it("is equal by value", () => {
    expect(bounds(1, 2, 3, 4).equals(bounds(1, 2, 3, 4))).toBe(true);
    expect(bounds(1, 2, 3, 4).equals(bounds(1, 2, 3, 5))).toBe(false);
    expect(bounds(1, 2, 3, 4).equals(bounds(0, 2, 3, 4))).toBe(false);
  });
});

describe("Viewport", () => {
  it("accepts the smallest area that fits a grab strip", () => {
    expect(Viewport.create(64, 32).ok).toBe(true);
  });

  it.each([
    [0, 0],
    [63, 32],
    [64, 31],
    [Number.NaN, 100],
  ])("rejects %s × %s", (width, height) => {
    expect(Viewport.create(width, height)).toEqual({
      ok: false,
      error: { code: "ViewportTooSmall", width, height },
    });
  });

  it("is equal by value", () => {
    expect(viewport(800, 600).equals(viewport(800, 600))).toBe(true);
    expect(viewport(800, 600).equals(viewport(800, 601))).toBe(false);
  });

  it("covers its whole area as bounds", () => {
    expect(viewport(800, 600).toBounds().equals(bounds(0, 0, 800, 600))).toBe(true);
  });
});

describe("ids", () => {
  it("rejects blank ids", () => {
    expect(createWindowId("  ").ok).toBe(false);
    expect(createAppId("").ok).toBe(false);
  });

  it("accepts any other text", () => {
    expect(createWindowId("window-1").ok).toBe(true);
    expect(createAppId("terminal").ok).toBe(true);
  });
});
