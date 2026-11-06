import type { InvariantViolation } from "./invariants";
import type { WindowId } from "./ids";

/**
 * Everything the domain can refuse. Errors carry a code and data, not English text, so the UI
 * can translate them into any of the site's languages.
 */
export type DomainError =
  | { readonly code: "InvalidId"; readonly value: string }
  | { readonly code: "InvalidPosition"; readonly x: number; readonly y: number }
  | { readonly code: "InvalidSize"; readonly width: number; readonly height: number }
  | { readonly code: "ViewportTooSmall"; readonly width: number; readonly height: number }
  | { readonly code: "UnknownWindow"; readonly windowId: WindowId }
  | { readonly code: "DuplicateWindowId"; readonly windowId: WindowId }
  | { readonly code: "WindowIsMinimised"; readonly windowId: WindowId }
  | { readonly code: "WindowNotNormal"; readonly windowId: WindowId }
  | { readonly code: "ViewportIsCompact"; readonly windowId: WindowId }
  | { readonly code: "MalformedSnapshot" }
  | { readonly code: "SnapshotBreaksInvariants"; readonly violations: readonly InvariantViolation[] };
