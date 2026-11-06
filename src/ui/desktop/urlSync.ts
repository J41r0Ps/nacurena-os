import type { AppId } from "@/os/domain";
import {
  addressOf,
  nextHistoryAction,
  parsePath,
  pathOf,
  type HistoryIntent,
  type Locale,
} from "@/os/routing/desktopAddress";
import type { DesktopStore } from "@/os/store/desktopStore";

interface UrlSyncOptions {
  readonly store: DesktopStore;
  readonly locale: Locale;
  readonly appIds: readonly AppId[];
  readonly titleOf: (appId: AppId | null) => string;
}

export interface UrlSync {
  /** Starts following the desktop and the browser. Returns the function that stops it. */
  start(): () => void;
  /** Runs a command as a deliberate open, the one kind of change that adds a history entry. */
  opening<T>(command: () => T): T;
}

/**
 * The bridge between the desktop and the address bar, in both directions. The store owns the
 * windows and the URL only reflects it, so this uses the History API and never Next's router: a
 * router navigation would replace the page, and with it the desktop.
 */
export const createUrlSync = ({ store, locale, appIds, titleOf }: UrlSyncOptions): UrlSync => {
  let intent: HistoryIntent = "follow";
  /** True while the browser leads, so the change it causes is not written back. */
  let followingBrowser = false;

  const currentAddress = () => parsePath(window.location.pathname, appIds);

  const write = (state: unknown): void => {
    const next = addressOf(store.getState().manager, locale);
    const action = nextHistoryAction(currentAddress(), next, intent);
    if (action === "none") return;

    if (action === "push") window.history.pushState(state, "", pathOf(next));
    else window.history.replaceState(state, "", pathOf(next));
    document.title = titleOf(next.appId);
  };

  const onPopState = (): void => {
    const address = currentAddress();
    // Only this document's language: the other languages are separate pages.
    if (address === null || address.locale !== locale) return;

    const { showApp, showDesktop } = store.getState();
    followingBrowser = true;
    if (address.appId === null) showDesktop();
    else showApp(address.appId);
    followingBrowser = false;
    document.title = titleOf(address.appId);
  };

  return {
    start() {
      // A saved layout on a locale root has a focused app, so the address catches up with it.
      // Next patches `history` in an effect that has not run yet, so this one write must keep its
      // state by hand. Losing it would turn the next Back press into a full reload.
      write(window.history.state);

      const unsubscribe = store.subscribe((state, previous) => {
        if (followingBrowser) return;
        if (state.manager.focusedWindowId !== previous.manager.focusedWindowId) write(null);
      });
      window.addEventListener("popstate", onPopState);

      return () => {
        unsubscribe();
        window.removeEventListener("popstate", onPopState);
      };
    },

    opening(command) {
      intent = "open";
      try {
        return command();
      } finally {
        intent = "follow";
      }
    },
  };
};
