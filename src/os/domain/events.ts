import type { AppId, WindowId } from "./ids";

/** Facts that became true, named in the past tense. See "Event storming" in docs/DOMAIN.md. */
export type DomainEvent =
  | { readonly type: "WindowOpened"; readonly windowId: WindowId; readonly appId: AppId }
  | { readonly type: "WindowFocused"; readonly windowId: WindowId }
  | { readonly type: "WindowMoved"; readonly windowId: WindowId }
  | { readonly type: "WindowResized"; readonly windowId: WindowId }
  | { readonly type: "WindowMinimised"; readonly windowId: WindowId }
  | { readonly type: "WindowMaximised"; readonly windowId: WindowId }
  | { readonly type: "WindowRestored"; readonly windowId: WindowId }
  | { readonly type: "WindowClosed"; readonly windowId: WindowId }
  | { readonly type: "ViewportResized"; readonly width: number; readonly height: number };
