import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Bounds,
  Size,
  WindowManager,
  checkInvariants,
  createAppId,
  createWindowId,
  type AppDefinition,
  type AppId,
  type DomainEvent,
  type Result,
  type WindowId,
} from "@/os/domain";
import { DESKTOP_STORAGE_KEY, type DesktopStorage } from "./desktopPersistence";
import {
  SAVE_DELAY_MS,
  URL_WINDOW_ID,
  createDesktopStore,
  type DesktopStore,
} from "./desktopStore";

const unwrap = <T, E>(result: Result<T, E>): T => {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
};

const appId = (value: string): AppId => unwrap(createAppId(value));
const windowId = (value: string): WindowId => unwrap(createWindowId(value));

const defineApp = (id: string, singleInstance: boolean): AppDefinition => ({
  id: appId(id),
  singleInstance,
  defaultSize: unwrap(Size.create(640, 480)),
});

const projects = defineApp("projects", true);
const documents = defineApp("documents", false);
const apps = [projects, documents];

const memoryStorage = (initial: string | null = null): DesktopStorage & { value: string | null } => ({
  value: initial,
  getItem() {
    return this.value;
  },
  setItem(_key, value) {
    this.value = value;
  },
});

const setup = (storage: DesktopStorage = memoryStorage(), onEvents = vi.fn()) => {
  let next = 1;
  const store = createDesktopStore({
    apps,
    generateId: () => windowId(`window-${next++}`),
    getStorage: () => storage,
    onEvents,
  });
  return { store, storage, onEvents, actions: store.getState() };
};

const open = (store: DesktopStore, app: AppDefinition = documents): WindowId => {
  const id = store.getState().openApp(app.id);
  if (id === null) throw new Error("expected a window");
  return id;
};

const boundsOf = (store: DesktopStore, id: WindowId): Bounds => {
  const window = store.getState().manager.windows.find((candidate) => candidate.id === id);
  if (window === undefined) throw new Error("expected a window");
  return window.bounds;
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("persistence", () => {
  it("round-trips a desktop through storage", () => {
    const first = setup();
    const stop = first.actions.hydrate(1280, 720);
    const moved = open(first.store);
    first.actions.moveWindow(moved, 200, 150);
    const hidden = open(first.store);
    first.actions.minimiseWindow(hidden);
    vi.advanceTimersByTime(SAVE_DELAY_MS);
    stop();

    const second = setup(first.storage);
    second.actions.hydrate(1280, 720);

    expect(second.store.getState().manager.toSnapshot()).toEqual(
      first.store.getState().manager.toSnapshot(),
    );
  });

  it("uses a versioned key", () => {
    expect(DESKTOP_STORAGE_KEY).toMatch(/:v\d+$/);
  });

  it("refits saved windows to the current viewport", () => {
    const first = setup();
    const stop = first.actions.hydrate(1920, 1080);
    const id = open(first.store);
    first.actions.moveWindow(id, 1800, 1000);
    stop();

    const second = setup(first.storage);
    second.actions.hydrate(1024, 600);
    const { manager } = second.store.getState();

    expect(manager.viewport.width).toBe(1024);
    expect(manager.windows[0].bounds.x).toBe(1024 - 64);
    expect(checkInvariants(manager.toSnapshot())).toEqual([]);
  });

  const savedWindow = {
    id: "w",
    appId: "documents",
    singleInstance: false,
    state: "normal",
    stateBeforeMinimise: "normal",
    x: 0,
    y: 0,
    width: 640,
    height: 480,
    zOrder: 0,
  };
  const saved = (window: object, focusedWindowId: string | null = "w") =>
    JSON.stringify({
      viewport: { width: 1280, height: 720 },
      focusedWindowId,
      windows: [window],
    });

  it.each([
    ["invalid JSON", "{not json"],
    ["an empty string", ""],
    ["JSON null", "null"],
    ["a number", "42"],
    ["the wrong shape", JSON.stringify({ windows: "many" })],
    ["a missing field", saved({ ...savedWindow, zOrder: undefined })],
    ["a fractional position", saved({ ...savedWindow, x: 0.5 })],
    ["a broken invariant", saved({ ...savedWindow, width: 1 })],
    ["a focus on nothing", saved(savedWindow, "ghost")],
    ["a window out of reach", saved({ ...savedWindow, x: 99_999 })],
    ["an app that no longer exists", saved({ ...savedWindow, appId: "removed" })],
    ["an app that changed its instance rule", saved({ ...savedWindow, singleInstance: true })],
  ])("gives a fresh desktop for %s", (_name, value) => {
    const { store, actions } = setup(memoryStorage(value));

    expect(() => actions.hydrate(1280, 720)).not.toThrow();

    const { manager } = store.getState();
    expect(manager.windows).toEqual([]);
    expect(manager.viewport.width).toBe(1280);
  });

  it("accepts the valid version of those saved windows", () => {
    const { store, actions } = setup(memoryStorage(saved(savedWindow)));
    actions.hydrate(1280, 720);

    expect(store.getState().manager.windows).toHaveLength(1);
  });

  it("gives a fresh desktop when reading storage throws", () => {
    const store = createDesktopStore({
      apps,
      generateId: () => windowId("w"),
      getStorage: () => {
        throw new Error("SecurityError");
      },
    });

    expect(() => store.getState().hydrate(1280, 720)).not.toThrow();
    expect(store.getState().manager.windows).toEqual([]);
  });

  it("keeps working when saving throws", () => {
    const storage: DesktopStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    const { store, actions } = setup(storage);
    actions.hydrate(1280, 720);
    open(store);

    expect(() => vi.advanceTimersByTime(SAVE_DELAY_MS)).not.toThrow();
    expect(store.getState().manager.windows).toHaveLength(1);
  });

  it("falls back to the current viewport when the area measures 0 × 0", () => {
    const { store, actions } = setup();
    actions.hydrate(0, 0);

    expect(store.getState().manager.viewport.width).toBeGreaterThan(0);
  });

  it("saves nothing before hydration, so it cannot overwrite a saved desktop", () => {
    const storage = memoryStorage("saved earlier");
    const { store } = setup(storage);
    open(store);
    vi.advanceTimersByTime(SAVE_DELAY_MS * 10);

    expect(storage.value).toBe("saved earlier");
  });

  it("does not save the loaded state again on hydration alone", () => {
    const setItem = vi.fn();
    const { actions } = setup({ getItem: () => null, setItem });
    actions.hydrate(1280, 720);
    vi.advanceTimersByTime(SAVE_DELAY_MS * 10);

    expect(setItem).not.toHaveBeenCalled();
  });

  it("writes once for a burst of changes, such as a drag", () => {
    const setItem = vi.fn();
    const { store, actions } = setup({ getItem: () => null, setItem });
    actions.hydrate(1280, 720);
    const id = open(store);

    for (let x = 0; x < 60; x++) {
      actions.moveWindow(id, x, 10);
      vi.advanceTimersByTime(16);
    }
    expect(setItem).not.toHaveBeenCalled();

    vi.advanceTimersByTime(SAVE_DELAY_MS);
    expect(setItem).toHaveBeenCalledTimes(1);
  });

  it("saves pending changes when the page goes away", () => {
    const storage = memoryStorage();
    const { store, actions } = setup(storage);
    actions.hydrate(1280, 720);
    open(store);

    window.dispatchEvent(new Event("pagehide"));

    expect(storage.value).not.toBeNull();
  });

  it("stops saving once stopped", () => {
    const setItem = vi.fn();
    const { store, actions } = setup({ getItem: () => null, setItem });
    const stop = actions.hydrate(1280, 720);
    stop();
    open(store);
    vi.advanceTimersByTime(SAVE_DELAY_MS * 10);

    expect(setItem).not.toHaveBeenCalled();
  });
});

describe("the store never bypasses the domain", () => {
  const commands = [
    "openApp",
    "focusWindow",
    "moveWindow",
    "resizeWindowFromEdge",
    "minimiseWindow",
    "maximiseWindow",
    "restoreWindow",
    "closeWindow",
    "resizeViewport",
  ] as const;

  it.each(commands)("%s goes through the WindowManager command of that name", (command) => {
    const { store, actions } = setup();
    const id = open(store);
    const start = boundsOf(store, id);
    const spy = vi.spyOn(WindowManager.prototype, command);

    const calls = {
      openApp: () => actions.openApp(documents.id),
      focusWindow: () => actions.focusWindow(id),
      moveWindow: () => actions.moveWindow(id, 5, 5),
      resizeWindowFromEdge: () => actions.resizeWindowFromEdge(id, start, "e", 5, 0),
      minimiseWindow: () => actions.minimiseWindow(id),
      maximiseWindow: () => actions.maximiseWindow(id),
      restoreWindow: () => actions.restoreWindow(id),
      closeWindow: () => actions.closeWindow(id),
      resizeViewport: () => actions.resizeViewport(1000, 700),
    };
    calls[command]();

    expect(spy).toHaveBeenCalledOnce();
  });

  it("only ever holds a WindowManager, so an invalid state cannot be stored", () => {
    const { store } = setup();
    open(store);

    expect(store.getState().manager).toBeInstanceOf(WindowManager);
    expect(Object.isFrozen(store.getState().manager)).toBe(true);
  });

  it("keeps the same instance when the domain refuses a command", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { store, actions, onEvents } = setup();
    open(store);
    onEvents.mockClear();
    const before = store.getState().manager;

    actions.focusWindow(windowId("ghost"));

    expect(store.getState().manager).toBe(before);
    expect(onEvents).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledOnce();
  });

  it("keeps the same instance and notifies nobody for a no-op", () => {
    const { store, actions } = setup();
    const id = open(store);
    const listener = vi.fn();
    store.subscribe(listener);

    actions.focusWindow(id);

    expect(listener).not.toHaveBeenCalled();
  });

  it("does not enforce a rule itself: the domain clamps a move", () => {
    const { store, actions } = setup();
    actions.hydrate(1280, 720);
    const id = open(store);

    actions.moveWindow(id, -99_999, -99_999);

    expect(boundsOf(store, id)).toMatchObject({ x: 184 - 640, y: 0 });
  });

  it("refuses an unknown app without changing the state", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { store, actions } = setup();
    const before = store.getState().manager;

    expect(actions.openApp(appId("removed"))).toBeNull();
    expect(store.getState().manager).toBe(before);
    expect(error).toHaveBeenCalledOnce();
  });
});

describe("a desktop with an app in its URL", () => {
  const setupAt = (initialApp: AppDefinition, storage = memoryStorage()) => {
    const onEvents = vi.fn();
    let next = 1;
    const store = createDesktopStore({
      apps,
      initialApp,
      generateId: () => windowId(`window-${next++}`),
      getStorage: () => storage,
      onEvents,
    });
    return { store, storage, onEvents };
  };

  /** What a visitor left behind, as it would sit in storage. */
  const savedWith = (...appsToOpen: AppDefinition[]): string => {
    const { store } = setup();
    store.getState().hydrate(1280, 672);
    appsToOpen.forEach((app) => open(store, app));
    return JSON.stringify(store.getState().manager.toSnapshot());
  };

  const appOfFocused = (store: DesktopStore) => {
    const { manager } = store.getState();
    return manager.windows.find((window) => window.id === manager.focusedWindowId)?.appId;
  };

  it("has the window in the initial state, which is what the static HTML renders", () => {
    const { store } = setupAt(projects);

    const initial = store.getInitialState().manager;

    expect(initial.windows.map((window) => window.id)).toEqual([URL_WINDOW_ID]);
    expect(initial.focusedWindowId).toBe(URL_WINDOW_ID);
  });

  it("never calls the random generator for the first render", () => {
    const generateId = vi.fn(() => windowId("random"));

    createDesktopStore({
      apps,
      initialApp: projects,
      generateId,
      getStorage: () => memoryStorage(),
    });

    expect(generateId).not.toHaveBeenCalled();
  });

  it("keeps the same window on a first visit, so React keeps the same element", () => {
    const { store } = setupAt(projects);
    const before = boundsOf(store, URL_WINDOW_ID);

    store.getState().hydrate(1280, 672);

    expect(store.getState().manager.windows.map((window) => window.id)).toEqual([URL_WINDOW_ID]);
    expect(boundsOf(store, URL_WINDOW_ID)).toEqual(before);
  });

  it("keeps the saved windows and puts the URL's app in front", () => {
    const { store } = setupAt(projects, memoryStorage(savedWith(documents)));

    store.getState().hydrate(1280, 672);

    expect(store.getState().manager.windows).toHaveLength(2);
    expect(appOfFocused(store)).toBe(projects.id);
  });

  it("uses the saved window of the URL's app instead of opening another", () => {
    const { store } = setupAt(projects, memoryStorage(savedWith(projects, documents)));

    store.getState().hydrate(1280, 672);

    expect(store.getState().manager.windows).toHaveLength(2);
    expect(appOfFocused(store)).toBe(projects.id);
  });

  it("does not add a window on each reload of a multi-instance app", () => {
    const storage = memoryStorage();
    const first = setupAt(documents, storage);
    first.store.getState().hydrate(1280, 672)();
    storage.setItem(DESKTOP_STORAGE_KEY, JSON.stringify(first.store.getState().manager.toSnapshot()));

    const second = setupAt(documents, storage);
    second.store.getState().hydrate(1280, 672);

    expect(second.store.getState().manager.windows).toHaveLength(1);
  });

  it("restores the URL's app when it was saved minimised", () => {
    const { store: source } = setup();
    source.getState().hydrate(1280, 672);
    source.getState().minimiseWindow(open(source, projects));
    const saved = JSON.stringify(source.getState().manager.toSnapshot());
    const { store } = setupAt(projects, memoryStorage(saved));

    store.getState().hydrate(1280, 672);

    expect(appOfFocused(store)).toBe(projects.id);
    expect(store.getState().manager.windows[0].state).toBe("normal");
  });

  it("uses a new id if a saved window already holds the fixed one", () => {
    const first = setupAt(projects);
    first.store.getState().hydrate(1280, 672);
    const saved = JSON.stringify(first.store.getState().manager.toSnapshot());
    const { store } = setupAt(documents, memoryStorage(saved));

    store.getState().hydrate(1280, 672);

    const { manager } = store.getState();
    expect(manager.windows).toHaveLength(2);
    expect(appOfFocused(store)).toBe(documents.id);
    expect(checkInvariants(manager.toSnapshot())).toEqual([]);
  });

  it("emits no events, so nothing animates and DOM focus stays where it is", () => {
    const { store, onEvents } = setupAt(projects, memoryStorage(savedWith(documents)));

    store.getState().hydrate(1280, 672);

    expect(onEvents).not.toHaveBeenCalled();
  });

  it("can hydrate twice with the same result, which React's strict mode does", () => {
    const { store } = setupAt(documents);

    store.getState().hydrate(1280, 672)();
    store.getState().hydrate(1280, 672);

    expect(store.getState().manager.windows).toHaveLength(1);
  });
});

describe("going to an address", () => {
  it("forwards showApp to the domain, with events, because this one is visible", () => {
    const { store, onEvents } = setup();
    store.getState().hydrate(1280, 672);

    store.getState().showApp(documents.id);

    expect(store.getState().manager.windows).toHaveLength(1);
    expect(onEvents).toHaveBeenCalledOnce();
  });

  it("refuses an unknown app without changing the state", () => {
    const { store } = setup();
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const before = store.getState().manager;

    store.getState().showApp(appId("removed"));

    expect(store.getState().manager).toBe(before);
    expect(errors).toHaveBeenCalledOnce();
  });

  it("forwards showDesktop to the domain", () => {
    const { store } = setup();
    open(store);

    store.getState().showDesktop();

    expect(store.getState().manager.focusedWindowId).toBeNull();
  });
});

describe("the adapter's own work", () => {
  it("rounds drag values before they reach the domain", () => {
    const { store, actions } = setup();
    const id = open(store);

    actions.moveWindow(id, 100.4, 50.6);

    expect(boundsOf(store, id)).toMatchObject({ x: 100, y: 51 });
  });

  it("rounds resize distances before they reach the domain", () => {
    const { store, actions } = setup();
    const id = open(store);
    const start = boundsOf(store, id);

    actions.resizeWindowFromEdge(id, start, "se", 10.4, 20.6);

    expect(boundsOf(store, id)).toMatchObject({
      width: start.width + 10,
      height: start.height + 21,
    });
  });

  it("does not store a value that cannot become a position", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { store, actions } = setup();
    const id = open(store);
    const before = store.getState().manager;

    actions.moveWindow(id, Number.NaN, 0);

    expect(store.getState().manager).toBe(before);
    expect(error).toHaveBeenCalledOnce();
  });

  it("ignores a viewport too small to be real, such as a hidden tab", () => {
    const { store, actions } = setup();
    const before = store.getState().manager;

    actions.resizeViewport(0, 0);

    expect(store.getState().manager).toBe(before);
  });

  it("returns the focused window from openApp, also for a single-instance app", () => {
    const { store } = setup();
    const first = open(store, projects);
    open(store, documents);

    expect(open(store, projects)).toBe(first);
  });

  it("commits the state before it forwards the domain events", () => {
    const seen: { events: readonly DomainEvent[]; windows: number }[] = [];
    const store: DesktopStore = createDesktopStore({
      apps,
      generateId: () => windowId("w"),
      getStorage: () => memoryStorage(),
      onEvents: (events) =>
        seen.push({ events, windows: store.getState().manager.windows.length }),
    });

    store.getState().openApp(documents.id);

    expect(seen).toHaveLength(1);
    expect(seen[0].windows).toBe(1);
    expect(seen[0].events.map((event) => event.type)).toEqual(["WindowOpened", "WindowFocused"]);
  });

  it("emits no events on hydration, so reloading never plays an opening animation", () => {
    const first = setup();
    const stop = first.actions.hydrate(1280, 720);
    open(first.store);
    stop();

    const onEvents = vi.fn();
    const second = setup(first.storage, onEvents);
    second.actions.hydrate(1280, 720);

    expect(second.store.getState().manager.windows).toHaveLength(1);
    expect(onEvents).not.toHaveBeenCalled();
  });

  it("uses a fresh store per call, so nothing is shared between renders", () => {
    const one = setup();
    const two = setup();
    open(one.store);

    expect(two.store.getState().manager.windows).toEqual([]);
  });
});
