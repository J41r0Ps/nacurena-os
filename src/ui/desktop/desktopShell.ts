import { apps } from "@/apps/registry";
import { createWindowId, type DomainEvent, type WindowId } from "@/os/domain";
import { createDesktopStore, type DesktopStore } from "@/os/store/desktopStore";
import { playClose } from "@/ui/motion/motion";

const generateWindowId = (): WindowId => {
  const id = createWindowId(crypto.randomUUID());
  if (!id.ok) throw new Error("randomUUID returned an invalid id");
  return id.value;
};

/** Marks the part of a window that animates, on the real window and on its leftover copy. */
export const SURFACE_ATTRIBUTE = "data-window-surface";

/**
 * Everything the desktop must remember that is not domain state: DOM nodes and what the next
 * focus move should do. It sits beside the store because a DOM node is not state: it cannot be
 * saved, and it does not exist during the static render.
 */
export interface DesktopShell {
  readonly store: DesktopStore;
  registerWindow(id: WindowId, element: HTMLElement | null): void;
  /** Remembers which control opened a window, so closing it can return focus there. */
  rememberOpener(id: WindowId, opener: HTMLElement): void;
  /** Moves DOM focus into a window that is already on the page. */
  focusWindowElement(id: WindowId): void;
  /** Closes without the exit animation. DESIGN §6: Esc never animates. */
  closeWithoutMotion(id: WindowId): void;
  /** True once, for a window opened by a command and not restored by a reload. */
  takeOpeningWindow(id: WindowId): boolean;
  /** After React has committed: moves DOM focus to match the domain, if a command asked for it. */
  syncFocus(): void;
  setGhostLayer(element: HTMLElement | null): void;
  setRoot(element: HTMLElement | null): void;
}

export const createDesktopShell = (): DesktopShell => {
  const windowElements = new Map<WindowId, HTMLElement>();
  const openers = new Map<WindowId, HTMLElement>();
  const openingWindows = new Set<WindowId>();
  let ghostLayer: HTMLElement | null = null;
  let root: HTMLElement | null = null;
  let skipExitMotion = false;
  /** Hydration emits no events, so a reload never steals focus from the page. */
  let focusMoveRequested = false;
  /** Where DOM focus goes if no window is left to take it. */
  let fallbackFocus: (() => HTMLElement | null | undefined) | null = null;

  const iconOf = (appId: string | undefined): HTMLElement | null | undefined =>
    root?.querySelector<HTMLElement>(`[data-app-icon="${appId}"]`);

  const leaveGhost = (id: WindowId): void => {
    const element = windowElements.get(id);
    if (element === undefined || ghostLayer === null) return;

    // The domain has committed, and React has not removed the node yet, so it can still be copied.
    const ghost = element.cloneNode(true) as HTMLElement;
    ghost.removeAttribute("role");
    ghost.removeAttribute("aria-labelledby");
    ghost.removeAttribute("tabindex");
    ghost.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
    ghost.setAttribute("aria-hidden", "true");
    ghost.inert = true;

    const surface = ghost.querySelector<HTMLElement>(`[${SURFACE_ATTRIBUTE}]`);
    if (surface === null) return;
    ghostLayer.append(ghost);
    playClose(ghost, surface);
  };

  const handleEvent = (event: DomainEvent): void => {
    switch (event.type) {
      case "WindowOpened":
        openingWindows.add(event.windowId);
        break;
      case "WindowFocused":
        focusMoveRequested = true;
        break;
      case "WindowClosed": {
        const opener = openers.get(event.windowId);
        const appId = windowElements.get(event.windowId)?.dataset.appId;
        openers.delete(event.windowId);
        focusMoveRequested = true;
        fallbackFocus = () => (opener?.isConnected ? opener : iconOf(appId));
        if (!skipExitMotion) leaveGhost(event.windowId);
        break;
      }
      case "WindowMinimised":
        focusMoveRequested = true;
        fallbackFocus = () =>
          root?.querySelector<HTMLElement>(`[data-taskbar-window="${event.windowId}"]`);
        break;
      default:
        break;
    }
  };

  const store = createDesktopStore({
    apps,
    generateId: generateWindowId,
    getStorage: () => window.localStorage,
    onEvents: (events) => events.forEach(handleEvent),
  });

  return {
    store,

    registerWindow(id, element) {
      if (element === null) windowElements.delete(id);
      else windowElements.set(id, element);
    },

    rememberOpener: (id, opener) => void openers.set(id, opener),

    focusWindowElement(id) {
      windowElements.get(id)?.focus({ preventScroll: true });
    },

    closeWithoutMotion(id) {
      skipExitMotion = true;
      store.getState().closeWindow(id);
      skipExitMotion = false;
    },

    takeOpeningWindow: (id) => openingWindows.delete(id),

    syncFocus() {
      if (!focusMoveRequested) return;
      focusMoveRequested = false;
      const fallback = fallbackFocus;
      fallbackFocus = null;

      const focused = store.getState().manager.focusedWindowId;
      if (focused === null) {
        fallback?.()?.focus({ preventScroll: true });
        return;
      }
      const element = windowElements.get(focused);
      if (!element?.contains(document.activeElement)) element?.focus({ preventScroll: true });
    },

    setGhostLayer(element) {
      ghostLayer = element;
    },

    setRoot(element) {
      root = element;
    },
  };
};

