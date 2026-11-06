import type { createTranslator } from "next-intl";
import { apps, type AppMessageKey } from "@/apps/registry";
import type { AppStrings, ShellStrings } from "@/ui/desktop/shellStrings";
import type { Messages } from "./messages";

export type ShellTranslator = ReturnType<typeof createTranslator<Messages>>;

const appStrings = (t: ShellTranslator, key: AppMessageKey): AppStrings => {
  const title = t(`apps.${key}.title`);

  return {
    title,
    body: t(`apps.${key}.body`),
    pageTitle: t("metadata.appTitle", { app: title }),
    minimise: t("window.minimise", { app: title }),
    maximise: t("window.maximise", { app: title }),
    restore: t("window.restore", { app: title }),
    close: t("window.close", { app: title }),
    minimised: t("taskbar.minimised", { app: title }),
  };
};

/**
 * Every string the client island shows, resolved at build time. The browser receives finished text
 * and no message runtime: these strings cannot change after the build, because switching language
 * is a full page load.
 */
export const buildShellStrings = (t: ShellTranslator): ShellStrings => ({
  homeTitle: t("metadata.homeTitle"),
  appsLabel: t("desktop.appsLabel"),
  openApps: t("taskbar.openApps"),
  start: t("startMenu.label"),
  apps: Object.fromEntries(apps.map((app) => [app.id, appStrings(t, app.messageKey)])),
});
