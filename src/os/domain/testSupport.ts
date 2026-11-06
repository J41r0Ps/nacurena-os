import type { AppDefinition } from "./AppDefinition";
import { Bounds } from "./Bounds";
import { createAppId, createWindowId, type WindowId, type WindowIdGenerator } from "./ids";
import { Position } from "./Position";
import type { Result } from "./result";
import { Size } from "./Size";
import { Viewport } from "./Viewport";
import { WindowManager, type CommandResult } from "./WindowManager";

// Helpers for tests only. An architecture rule stops production code from importing this file.

/** In a test, a failed Result is a bug in the test, so throwing is the right response. */
export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (!result.ok) throw new Error(`Expected ok, got ${JSON.stringify(result.error)}`);
  return result.value;
};

/** The manager after a command that must succeed. */
export const after = (result: CommandResult): WindowManager => unwrap(result).manager;

export const sequentialWindowIds = (prefix = "window"): WindowIdGenerator => {
  let next = 1;
  return () => unwrap(createWindowId(`${prefix}-${next++}`));
};

export const windowId = (value: string): WindowId => unwrap(createWindowId(value));

export const position = (x: number, y: number): Position => unwrap(Position.create(x, y));

export const bounds = (x: number, y: number, width: number, height: number): Bounds =>
  unwrap(Bounds.create(x, y, width, height));

export const viewport = (width = 1280, height = 720): Viewport =>
  unwrap(Viewport.create(width, height));

export const app = (id: string, singleInstance = false): AppDefinition => ({
  id: unwrap(createAppId(id)),
  singleInstance,
  defaultSize: unwrap(Size.create(640, 480)),
});

export const emptyManager = (): WindowManager => WindowManager.create(viewport());
