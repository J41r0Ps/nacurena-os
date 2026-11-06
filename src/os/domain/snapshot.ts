import type { WindowState } from "./Window";

/**
 * The manager as plain JSON-safe data: what gets saved, and what the invariant checker reads.
 * Ids are plain strings here on purpose. Nothing in a snapshot is trusted until it has been
 * validated by `WindowManager.fromSnapshot`.
 */
export interface WindowSnapshot {
  readonly id: string;
  readonly appId: string;
  readonly singleInstance: boolean;
  readonly state: WindowState;
  readonly stateBeforeMinimise: Exclude<WindowState, "minimised">;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly zOrder: number;
}

export interface WindowManagerSnapshot {
  readonly viewport: { readonly width: number; readonly height: number };
  readonly focusedWindowId: string | null;
  readonly windows: readonly WindowSnapshot[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isWindowSnapshot = (value: unknown): value is WindowSnapshot =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.appId === "string" &&
  typeof value.singleInstance === "boolean" &&
  (value.state === "normal" || value.state === "minimised" || value.state === "maximised") &&
  (value.stateBeforeMinimise === "normal" || value.stateBeforeMinimise === "maximised") &&
  typeof value.x === "number" &&
  typeof value.y === "number" &&
  typeof value.width === "number" &&
  typeof value.height === "number" &&
  typeof value.zOrder === "number";

/** Checks the shape only. Whether the values make sense is decided by the value objects. */
export const isWindowManagerSnapshot = (value: unknown): value is WindowManagerSnapshot =>
  isRecord(value) &&
  isRecord(value.viewport) &&
  typeof value.viewport.width === "number" &&
  typeof value.viewport.height === "number" &&
  (value.focusedWindowId === null || typeof value.focusedWindowId === "string") &&
  Array.isArray(value.windows) &&
  value.windows.every(isWindowSnapshot);
