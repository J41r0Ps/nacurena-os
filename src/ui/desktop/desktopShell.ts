import { appById, appIds, apps } from "@/apps/registry";
import { createWindowId, type AppId, type DomainEvent, type WindowId } from "@/os/domain";
import type { Locale } from "@/os/routing/desktopAddress";
import { createDesktopStore, type DesktopStore } from "@/os/store/desktopStore";
import { playClose } from "@/ui/motion/motion";
import type { ShellStrings } from "./shellStrings";
import { createUrlSync } from "./urlSync";

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
  readonly locale: Locale;
  readonly strings: ShellStrings;
  /** Keeps the URL and the desktop in step until the returned function is called. */
  startUrlSync(): () => void;
  /** A deliberate open from an icon or the start menu: the one kind of change that adds history. */
  openFrom(appId: AppId, opener: HTMLElement): void;
  registerWindow(id: WindowId, element: HTMLElement | null): void;
  /** Closes without the exit animation. DESIGN §6: Esc never animates. */
  closeWithoutMotion(id: WindowId): void;
  /** True once, for a window opened by a command and not restored by a reload. */
  takeOpeningWindow(id: WindowId): boolean;
  /** After React has committed: moves DOM focus to match the domain, if a command asked for it. */
  syncFocus(): void;
  setGhostLayer(element: HTMLElement | null): void;
  setRoot(element: HTMLElement | null): void;
}

export interface DesktopShellOptions {
  readonly locale: Locale;
  readonly strings: ShellStrings;
  readonly initialAppId?: AppId;
}

export const createDesktopShell = ({
  locale,
  strings,
  initialAppId,
}: DesktopShellOptions): DesktopShell => {
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
    initialApp: initialAppId === undefined ? undefined : appById(initialAppId),
    generateId: generateWindowId,
    getStorage: () => window.localStorage,
    onEvents: (events) => events.forEach(handleEvent),
  });

  const urlSync = createUrlSync({
    store,
    locale,
    appIds,
    titleOf: (appId) => (appId === null ? strings.homeTitle : strings.apps[appId].pageTitle),
  });

  return {
    store,
    locale,
    strings,
    startUrlSync: urlSync.start,

    openFrom(appId, opener) {
      const id = urlSync.opening(() => store.getState().openApp(appId));
      if (id === null) return;
      // Remembered so that closing the window can return focus there.
      openers.set(id, opener);
      // A new window is not on the page yet: `syncFocus` handles that one after React commits.
      windowElements.get(id)?.focus({ preventScroll: true });
    },

    registerWindow(id, element) {
      if (element === null) windowElements.delete(id);
      else windowElements.set(id, element);
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

