import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appIds, apps } from "@/apps/registry";
import { createWindowId, type AppId, type WindowId } from "@/os/domain";
import { DESKTOP_STORAGE_KEY } from "@/os/store/desktopPersistence";
import { createDesktopStore } from "@/os/store/desktopStore";
import { createUrlSync, type UrlSync } from "./urlSync";

const [projects, documents] = appIds;

const windowIds = () => {
  let next = 1;
  return (): WindowId => {
    const id = createWindowId(`window-${next++}`);
    if (!id.ok) throw new Error("bad id");
    return id.value;
  };
};

const titleOf = (appId: AppId | null): string => (appId === null ? "Home" : `${appId} title`);

const setUp = (path: string, stored: Record<string, string> = {}) => {
  window.history.replaceState(null, "", path);
  const store = createDesktopStore({
    apps,
    generateId: windowIds(),
    getStorage: () => ({
      getItem: (key) => stored[key] ?? null,
      setItem: () => {},
    }),
  });
  const sync = createUrlSync({ store, locale: "en", appIds, titleOf });
  return { store, sync };
};

/** The browser moving through history: the URL changes first, then `popstate` fires. */
const browserGoesTo = (path: string): void => {
  window.history.replaceState(null, "", path);
  vi.mocked(window.history.replaceState).mockClear();
  window.dispatchEvent(new PopStateEvent("popstate"));
};

let stop: (() => void) | undefined;

const start = (sync: UrlSync): void => {
  stop = sync.start();
  vi.mocked(window.history.replaceState).mockClear();
};

beforeEach(() => {
  vi.spyOn(window.history, "pushState");
  vi.spyOn(window.history, "replaceState");
});

afterEach(() => {
  stop?.();
  stop = undefined;
  vi.restoreAllMocks();
});

describe("from the desktop to the URL", () => {
  it("pushes a deliberate open and updates the title", () => {
    const { store, sync } = setUp("/en/");
    start(sync);

    sync.opening(() => store.getState().openApp(projects));

    expect(window.history.pushState).toHaveBeenCalledOnce();
    expect(window.location.pathname).toBe("/en/projects/");
    expect(document.title).toBe("projects title");
  });

  it("replaces when focus moves between windows, so history does not grow", () => {
    const { store, sync } = setUp("/en/");
    start(sync);
    const first = sync.opening(() => store.getState().openApp(projects));
    sync.opening(() => store.getState().openApp(documents));
    vi.mocked(window.history.pushState).mockClear();

    store.getState().focusWindow(first as WindowId);

    expect(window.history.pushState).not.toHaveBeenCalled();
    expect(window.history.replaceState).toHaveBeenCalledOnce();
    expect(window.location.pathname).toBe("/en/projects/");
  });

  it("writes nothing when a second window of the same app opens", () => {
    const { store, sync } = setUp("/en/");
    start(sync);
    sync.opening(() => store.getState().openApp(documents));
    vi.mocked(window.history.pushState).mockClear();

    sync.opening(() => store.getState().openApp(documents));

    expect(window.history.pushState).not.toHaveBeenCalled();
  });

  it("returns to the locale root when the last window closes, by replacing", () => {
    const { store, sync } = setUp("/en/");
    start(sync);
    const id = sync.opening(() => store.getState().openApp(projects));
    vi.mocked(window.history.pushState).mockClear();

    store.getState().closeWindow(id as WindowId);

    expect(window.history.pushState).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe("/en/");
    expect(document.title).toBe("Home");
  });

  it("follows focus to the app behind when a window closes", () => {
    const { store, sync } = setUp("/en/");
    start(sync);
    sync.opening(() => store.getState().openApp(projects));
    const second = sync.opening(() => store.getState().openApp(documents));

    store.getState().closeWindow(second as WindowId);

    expect(window.location.pathname).toBe("/en/projects/");
  });

  it("goes back to following after an open, even if the command throws", () => {
    const { store, sync } = setUp("/en/");
    start(sync);
    expect(() =>
      sync.opening(() => {
        throw new Error("boom");
      }),
    ).toThrow("boom");

    store.getState().openApp(projects);

    expect(window.history.pushState).not.toHaveBeenCalled();
  });
});

describe("from the URL to the desktop", () => {
  it("shows the app of the address, opening it if it has no window", () => {
    const { store, sync } = setUp("/en/");
    start(sync);

    browserGoesTo("/en/projects/");

    const { manager } = store.getState();
    expect(manager.windows.map((window) => window.appId)).toEqual([projects]);
    expect(manager.focusedWindowId).toBe(manager.windows[0].id);
    expect(document.title).toBe("projects title");
  });

  it("focuses a window the app already has, and creates nothing", () => {
    const { store, sync } = setUp("/en/");
    start(sync);
    sync.opening(() => store.getState().openApp(documents));
    sync.opening(() => store.getState().openApp(projects));

    browserGoesTo("/en/documents/");

    const { manager } = store.getState();
    expect(manager.windows).toHaveLength(2);
    expect(manager.windows.find((w) => w.id === manager.focusedWindowId)?.appId).toBe(documents);
  });

  it("minimises every window on the locale root, and closes none", () => {
    const { store, sync } = setUp("/en/");
    start(sync);
    sync.opening(() => store.getState().openApp(projects));

    browserGoesTo("/en/");

    const { manager } = store.getState();
    expect(manager.windows).toHaveLength(1);
    expect(manager.windows[0].state).toBe("minimised");
    expect(manager.focusedWindowId).toBeNull();
  });

  it("restores the same window when the browser goes forward again", () => {
    const { store, sync } = setUp("/en/");
    start(sync);
    const id = sync.opening(() => store.getState().openApp(projects));
    browserGoesTo("/en/");

    browserGoesTo("/en/projects/");

    expect(store.getState().manager.focusedWindowId).toBe(id);
  });

  it("does not write the change back, so the browser stays where it went", () => {
    const { store, sync } = setUp("/en/");
    start(sync);
    sync.opening(() => store.getState().openApp(projects));
    sync.opening(() => store.getState().openApp(documents));
    vi.mocked(window.history.pushState).mockClear();

    browserGoesTo("/en/projects/");

    expect(window.history.pushState).not.toHaveBeenCalled();
    expect(window.history.replaceState).not.toHaveBeenCalled();
  });

  it("leaves the desktop alone on a path that is not an address", () => {
    const { store, sync } = setUp("/en/");
    start(sync);
    sync.opening(() => store.getState().openApp(projects));
    const before = store.getState().manager;

    browserGoesTo("/en/unknown/");

    expect(store.getState().manager).toBe(before);
  });

  it("stops listening when stopped", () => {
    const { store, sync } = setUp("/en/");
    start(sync);
    stop?.();
    stop = undefined;

    browserGoesTo("/en/projects/");

    expect(store.getState().manager.windows).toHaveLength(0);
  });
});

describe("arriving on a locale root with a saved layout", () => {
  const savedDesktop = (): Record<string, string> => {
    const { store } = setUp("/en/");
    store.getState().openApp(documents);
    return { [DESKTOP_STORAGE_KEY]: JSON.stringify(store.getState().manager.toSnapshot()) };
  };

  it("keeps the layout and moves the address to the focused app, by replacing", () => {
    const stored = savedDesktop();
    const { store, sync } = setUp("/en/", stored);
    store.getState().hydrate(1280, 672);

    stop = sync.start();

    expect(window.history.pushState).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe("/en/documents/");
  });

  // Next patches `history` after this runs, and a lost `__NA` turns the next Back into a reload.
  it("keeps the router's history state", () => {
    const stored = savedDesktop();
    const { store, sync } = setUp("/en/", stored);
    window.history.replaceState({ __NA: true }, "", "/en/");
    store.getState().hydrate(1280, 672);

    stop = sync.start();

    expect(window.history.state).toEqual({ __NA: true });
  });

  it("writes nothing on an empty desktop, so the bare root keeps its address", () => {
    const { sync } = setUp("/");

    start(sync);

    expect(window.location.pathname).toBe("/");
  });
});
