import { WindowManager, type AppDefinition, type Viewport } from "@/os/domain";

/** The schema version lives in the key: a new schema uses a new key, so old data goes unread. */
export const DESKTOP_STORAGE_KEY = "nacurena-os:desktop:v1";

export type DesktopStorage = Pick<Storage, "getItem" | "setItem">;

/** A function, because in some private modes merely reading `window.localStorage` throws. */
export type GetStorage = () => DesktopStorage;

/** A saved app may have been removed or changed since the visitor's last visit. */
const matchesApps = (manager: WindowManager, apps: readonly AppDefinition[]): boolean =>
  manager.windows.every((window) => {
    const app = apps.find((candidate) => candidate.id === window.appId);
    return app !== undefined && app.singleInstance === window.singleInstance;
  });

/**
 * Storage is untrusted input, so anything unexpected gives a fresh desktop and never an error.
 * The order comes from ADR-007: validate first, then refit, because the saved viewport may not
 * match the current one.
 */
export const loadDesktop = (
  getStorage: GetStorage,
  apps: readonly AppDefinition[],
  viewport: Viewport,
): WindowManager => {
  const fresh = WindowManager.create(viewport);

  try {
    const saved = getStorage().getItem(DESKTOP_STORAGE_KEY);
    if (saved === null) return fresh;

    const restored = WindowManager.fromSnapshot(JSON.parse(saved));
    if (!restored.ok || !matchesApps(restored.value, apps)) return fresh;

    const refitted = restored.value.resizeViewport(viewport);
    return refitted.ok ? refitted.value.manager : fresh;
  } catch {
    return fresh;
  }
};

/** A failed save (quota, private mode) only costs the layout on the next visit. */
export const saveDesktop = (getStorage: GetStorage, manager: WindowManager): void => {
  try {
    getStorage().setItem(DESKTOP_STORAGE_KEY, JSON.stringify(manager.toSnapshot()));
  } catch {
    // Nothing useful to do: the desktop keeps working from memory.
  }
};
