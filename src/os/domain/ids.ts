import type { DomainError } from "./errors";
import { err, ok, type Result } from "./result";

// A "brand" exists only for the compiler. Both ids are plain strings at runtime, but TypeScript
// now refuses an AppId where a WindowId is expected, and a raw string where either is expected.
declare const brand: unique symbol;
export type AppId = string & { readonly [brand]: "AppId" };
export type WindowId = string & { readonly [brand]: "WindowId" };

/** Injected, so the domain never needs randomness and tests stay deterministic. */
export type WindowIdGenerator = () => WindowId;

const isValidId = (value: string): boolean => value.trim().length > 0;

export const createAppId = (value: string): Result<AppId, DomainError> =>
  isValidId(value) ? ok(value as AppId) : err({ code: "InvalidId", value });

export const createWindowId = (value: string): Result<WindowId, DomainError> =>
  isValidId(value) ? ok(value as WindowId) : err({ code: "InvalidId", value });
