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
} from "@/os/domain";
import { loadDesktop, saveDesktop, type GetStorage } from "./desktopPersistence";

/** Long enough to skip the frames of a drag, short enough that a crash loses almost nothing. */
export const SAVE_DELAY_MS = 200;

/** Only a placeholder: `hydrate` replaces it with the measured work area after mount. */
const INITIAL_VIEWPORT = { width: 1280, height: 720 };

export interface DesktopDependencies {
  readonly apps: readonly AppDefinition[];
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

export const createDesktopStore = ({
  apps,
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

    return {
      manager: WindowManager.create(initialViewport()),

      hydrate(width, height) {
        // A hidden tab can measure 0 × 0. The ResizeObserver corrects the viewport later.
        const viewport = viewportOf(width, height) ?? get().manager.viewport;
        set({ manager: loadDesktop(getStorage, apps, viewport) });
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
