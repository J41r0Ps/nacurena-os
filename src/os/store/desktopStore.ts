import { createStore, type StoreApi } from "zustand/vanilla";
import {
  Position,
  Viewport,
  WindowManager,
  type AppDefinition,
  type AppId,
  type Bounds,
  type CommandResult,
  type DomainEvent,
  type ResizeEdge,
  type WindowId,
  type WindowIdGenerator,
  createWindowId,
} from "@/os/domain";
import { loadDesktop, saveDesktop, type GetStorage } from "./desktopPersistence";

/** Long enough to skip the frames of a drag, short enough that a crash loses almost nothing. */
export const SAVE_DELAY_MS = 200;

/** Only a placeholder: `hydrate` replaces it with the measured work area after mount. */
const INITIAL_VIEWPORT = { width: 1280, height: 720 };

/**
 * The id of the window that a URL opens in the static HTML. It is fixed, because the server and
 * the first client render must match, and a random id in a render would be a hydration mismatch.
 */
export const URL_WINDOW_ID: WindowId = (() => {
  const id = createWindowId("url-window");
  if (!id.ok) throw new Error("URL_WINDOW_ID must be a valid window id");
  return id.value;
})();

export interface DesktopDependencies {
  readonly apps: readonly AppDefinition[];
  /** The app the page's URL names. It is open from the very first render. */
  readonly initialApp?: AppDefinition;
  readonly generateId: WindowIdGenerator;
  readonly getStorage: GetStorage;
  /** Runs right after the domain committed, before React has updated the page. */
  readonly onEvents?: (events: readonly DomainEvent[]) => void;
}

/**
 * The state is one immutable aggregate plus actions. An action only translates a call into a
 * domain command: every rule lives in the domain, so this file can hold no rule of its own.
 */
export interface DesktopState {
  readonly manager: WindowManager;
  /** Loads the saved desktop and starts saving. Returns the function that stops saving. */
  hydrate(width: number, height: number): () => void;
  /** Goes to an app by its address: focuses a window it already has, or opens one. */
  showApp(appId: AppId): void;
  /** Goes to the locale root, where no app has focus, so every window is minimised. */
  showDesktop(): void;
  /** Returns the window that ended up focused, or null if the app is unknown. */
  openApp(appId: AppId): WindowId | null;
  focusWindow(id: WindowId): void;
  moveWindow(id: WindowId, x: number, y: number): void;
  resizeWindowFromEdge(id: WindowId, start: Bounds, edge: ResizeEdge, dx: number, dy: number): void;
  minimiseWindow(id: WindowId): void;
  maximiseWindow(id: WindowId): void;
  restoreWindow(id: WindowId): void;
  closeWindow(id: WindowId): void;
  resizeViewport(width: number, height: number): void;
}

export type DesktopStore = StoreApi<DesktopState>;

const viewportOf = (width: number, height: number): Viewport | null => {
  const viewport = Viewport.create(Math.round(width), Math.round(height));
  return viewport.ok ? viewport.value : null;
};

const initialViewport = (): Viewport => {
  const viewport = viewportOf(INITIAL_VIEWPORT.width, INITIAL_VIEWPORT.height);
  if (viewport === null) throw new Error("INITIAL_VIEWPORT must be a valid viewport");
  return viewport;
};

/** DOMAIN.md: an error means the UI asked for something it should never ask. */
const reportRefusal = (refusal: unknown): void => {
  console.error("The window manager refused a command", refusal);
};

/**
 * Saves shortly after the last change, because `localStorage` is synchronous and a drag changes
 * the state every frame. Returns the function that stops saving.
 */
const startSaving = (store: DesktopStore, getStorage: GetStorage): (() => void) => {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const save = (): void => {
    timer = null;
    saveDesktop(getStorage, store.getState().manager);
  };

  const flush = (): void => {
    if (timer === null) return;
    clearTimeout(timer);
    save();
  };

  const unsubscribe = store.subscribe((state, previous) => {
    if (state.manager === previous.manager) return;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(save, SAVE_DELAY_MS);
  });

  // A reload can come sooner than the delay, and `pagehide` also fires on mobile browsers.
  window.addEventListener("pagehide", flush);

  return () => {
    unsubscribe();
    window.removeEventListener("pagehide", flush);
    flush();
  };
};

/** Opens the URL's app before anything is measured, so it is part of the static HTML. */
const managerWith = (initialApp: AppDefinition | undefined): WindowManager => {
  const empty = WindowManager.create(initialViewport());
  if (initialApp === undefined) return empty;

  const opened = empty.openApp(initialApp, () => URL_WINDOW_ID);
  if (!opened.ok) throw new Error("A new desktop must accept the app in its URL");
  return opened.value.manager;
};

export const createDesktopStore = ({
  apps,
  initialApp,
  generateId,
  getStorage,
  onEvents,
}: DesktopDependencies): DesktopStore =>
  createStore<DesktopState>()((set, get, store) => {
    /** The one door into the state. A refused command leaves the manager exactly as it was. */
    const apply = (result: CommandResult): void => {
      if (!result.ok) {
        reportRefusal(result.error);
        return;
      }
      const { manager, events } = result.value;
      if (manager === get().manager) return;
      set({ manager });
      onEvents?.(events);
    };

    /** Keeps the id of the static window, so React keeps its element, unless a saved one has it. */
    const urlWindowId = (manager: WindowManager): WindowIdGenerator =>
      manager.windows.some((window) => window.id === URL_WINDOW_ID)
        ? generateId
        : () => URL_WINDOW_ID;

    /** The URL wins over the saved layout. Its events are dropped, so nothing animates. */
    const withUrlApp = (manager: WindowManager): WindowManager => {
      if (initialApp === undefined) return manager;
      const shown = manager.showApp(initialApp, urlWindowId(manager));
      if (shown.ok) return shown.value.manager;
      reportRefusal(shown.error);
      return manager;
    };

    return {
      manager: managerWith(initialApp),

      hydrate(width, height) {
        // A hidden tab can measure 0 × 0. The ResizeObserver corrects the viewport later.
        const viewport = viewportOf(width, height) ?? get().manager.viewport;
        set({ manager: withUrlApp(loadDesktop(getStorage, apps, viewport)) });
        // Saving starts only here, so the empty first state can never overwrite a saved desktop.
        return startSaving(store, getStorage);
      },

      openApp(appId) {
        const app = apps.find((candidate) => candidate.id === appId);
        if (app === undefined) {
          reportRefusal({ code: "UnknownApp", appId });
          return null;
        }
        apply(get().manager.openApp(app, generateId));
        return get().manager.focusedWindowId;
      },

      showApp(appId) {
        const app = apps.find((candidate) => candidate.id === appId);
        if (app === undefined) reportRefusal({ code: "UnknownApp", appId });
        else apply(get().manager.showApp(app, generateId));
      },

      showDesktop: () => apply(get().manager.showDesktop()),

      focusWindow: (id) => apply(get().manager.focusWindow(id)),

      moveWindow(id, x, y) {
        // ADR-007: pointers report fractions, and `Position` accepts whole pixels only.
        const position = Position.create(Math.round(x), Math.round(y));
        if (position.ok) apply(get().manager.moveWindow(id, position.value));
        else reportRefusal(position.error);
      },

      resizeWindowFromEdge(id, start, edge, dx, dy) {
        apply(
          get().manager.resizeWindowFromEdge(id, start, edge, Math.round(dx), Math.round(dy)),
        );
      },

      minimiseWindow: (id) => apply(get().manager.minimiseWindow(id)),
      maximiseWindow: (id) => apply(get().manager.maximiseWindow(id)),
      restoreWindow: (id) => apply(get().manager.restoreWindow(id)),
      closeWindow: (id) => apply(get().manager.closeWindow(id)),

      resizeViewport(width, height) {
        const viewport = viewportOf(width, height);
        if (viewport !== null) apply(get().manager.resizeViewport(viewport));
      },
    };
  });
