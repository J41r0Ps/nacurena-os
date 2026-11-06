import { Size, createAppId, type AppDefinition, type AppId, type Result } from "@/os/domain";
import type en from "../../messages/en.json";

/** An app without messages fails the build, because this type comes from the English file. */
export type AppMessageKey = keyof typeof en.apps;

/**
 * What the desktop needs on top of the domain's `AppDefinition`. Data only, so a Server Component
 * can read it to list the routes. Icons are React and live in `src/ui/desktop/appIcons.ts`.
 */
export interface DesktopApp extends AppDefinition {
  readonly messageKey: AppMessageKey;
  /**
   * Esc closes a focused window unless this is false. Terminal and Mail will set it, because they
   * need the key themselves. It is here and not in the domain: a key press is a UI policy.
   */
  readonly closesOnEscape?: boolean;
}

/** The values below are written by hand, so a failure is a bug that should stop the build. */
const unwrap = <T, E>(result: Result<T, E>): T => {
  if (!result.ok) throw new Error(`Invalid app definition: ${JSON.stringify(result.error)}`);
  return result.value;
};

export const apps: readonly DesktopApp[] = [
  {
    id: unwrap(createAppId("projects")),
    messageKey: "projects",
    singleInstance: true,
    defaultSize: unwrap(Size.create(720, 480)),
  },
  {
    id: unwrap(createAppId("documents")),
    messageKey: "documents",
    singleInstance: false,
    defaultSize: unwrap(Size.create(640, 440)),
  },
];

export const appIds: readonly AppId[] = apps.map((app) => app.id);

export const appById = (id: AppId): DesktopApp | undefined =>
  apps.find((app) => app.id === id);

/** The default lives here, so every caller agrees on what an unset flag means. */
export const closesOnEscape = (app: DesktopApp): boolean => app.closesOnEscape !== false;
