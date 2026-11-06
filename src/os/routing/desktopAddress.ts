import type { AppId, WindowManager } from "@/os/domain";

export const LOCALES = ["en", "nl", "es"] as const;
export type Locale = (typeof LOCALES)[number];

/** The language of the bare root, which is the address printed on the CV. */
export const ROOT_LOCALE: Locale = "en";

export const isLocale = (value: string): value is Locale =>
  (LOCALES as readonly string[]).includes(value);

/**
 * Where the visitor is: a language, and the app that has focus. No app means the locale root.
 * It names an App and never a Window, because a WindowId is random and exists for one visitor
 * only, so a link holding one could never open anything for the next person.
 */
export interface DesktopAddress {
  readonly locale: Locale;
  readonly appId: AppId | null;
}

/** Always with a trailing slash, the form `trailingSlash` builds and the host serves directly. */
export const pathOf = ({ locale, appId }: DesktopAddress): string =>
  appId === null ? `/${locale}/` : `/${locale}/${appId}/`;

/** Returns null for a path that is not an address, so the caller leaves the desktop alone. */
export const parsePath = (
  pathname: string,
  appIds: readonly AppId[],
): DesktopAddress | null => {
  const [first, second, ...rest] = pathname.split("/").filter((part) => part !== "");

  if (first === undefined) return { locale: ROOT_LOCALE, appId: null };
  if (!isLocale(first) || rest.length > 0) return null;
  if (second === undefined) return { locale: first, appId: null };

  const appId = appIds.find((candidate) => candidate === second);
  return appId === undefined ? null : { locale: first, appId };
};

/** Derived from focus and never stored, so the address and the desktop cannot drift apart. */
export const addressOf = (manager: WindowManager, locale: Locale): DesktopAddress => {
  const focused = manager.windows.find((window) => window.id === manager.focusedWindowId);
  return { locale, appId: focused?.appId ?? null };
};

/**
 * Why the address changed. "open" is the visitor going somewhere on purpose. "follow" is the
 * address keeping up with focus: a click, the taskbar, or a window closing.
 */
export type HistoryIntent = "open" | "follow";

export type HistoryAction = "none" | "push" | "replace";

/**
 * History holds one entry per deliberate open, and everything else rewrites the current entry.
 * Pushing on focus would make Back replay every click. Replacing on open would make Back leave
 * the site straight after opening Projects.
 */
export const nextHistoryAction = (
  current: DesktopAddress | null,
  next: DesktopAddress,
  intent: HistoryIntent,
): HistoryAction => {
  if (current?.locale === next.locale && current.appId === next.appId) return "none";
  return intent === "open" ? "push" : "replace";
};
