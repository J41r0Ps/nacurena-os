import { Files } from "@phosphor-icons/react/dist/csr/Files";
import { FolderOpen } from "@phosphor-icons/react/dist/csr/FolderOpen";
import type { Icon } from "@phosphor-icons/react/dist/lib/types";
import { Size, createAppId, type AppDefinition, type AppId, type Result } from "@/os/domain";

/** What the desktop needs on top of the domain's `AppDefinition`. */
export interface DesktopApp extends AppDefinition {
  readonly title: string;
  readonly icon: Icon;
  /** Plain text until the real apps arrive in later slices. */
  readonly body: string;
}

/** The values below are written by hand, so a failure is a bug that should stop the build. */
const unwrap = <T, E>(result: Result<T, E>): T => {
  if (!result.ok) throw new Error(`Invalid app definition: ${JSON.stringify(result.error)}`);
  return result.value;
};

export const apps: readonly DesktopApp[] = [
  {
    id: unwrap(createAppId("projects")),
    title: "Projects",
    icon: FolderOpen,
    singleInstance: true,
    defaultSize: unwrap(Size.create(720, 480)),
    body: "Projects is not built yet.",
  },
  {
    id: unwrap(createAppId("documents")),
    title: "Documents",
    icon: Files,
    singleInstance: false,
    defaultSize: unwrap(Size.create(640, 440)),
    body: "Documents is not built yet.",
  },
];

export const appById = (id: AppId): DesktopApp | undefined =>
  apps.find((app) => app.id === id);
