// The public API of the domain; outer layers import from here. `Window` is exported as a type
// only, so code outside the domain can read windows but never construct one.
export type { AppDefinition } from "./AppDefinition";
export { Bounds } from "./Bounds";
export {
  CASCADE_ORIGIN_X,
  COMPACT_VIEWPORT_WIDTH,
  GRAB_STRIP_WIDTH,
  MIN_VISIBLE_TITLE_BAR_WIDTH,
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  TITLE_BAR_HEIGHT,
  WINDOW_CONTROL_WIDTH,
  WINDOW_CONTROLS_WIDTH,
} from "./constants";
export type { DomainError } from "./errors";
export type { DomainEvent } from "./events";
export { createAppId, createWindowId } from "./ids";
export type { AppId, WindowId, WindowIdGenerator } from "./ids";
export { checkInvariants } from "./invariants";
export type { InvariantViolation, StateInvariant } from "./invariants";
export { Position } from "./Position";
export { err, ok } from "./result";
export type { Result } from "./result";
export { Size } from "./Size";
export type { WindowManagerSnapshot, WindowSnapshot } from "./snapshot";
export { Viewport } from "./Viewport";
export type { ResizeEdge } from "./Viewport";
export type { Window, WindowState } from "./Window";
export { WindowManager } from "./WindowManager";
export type { CommandOutcome, CommandResult } from "./WindowManager";
