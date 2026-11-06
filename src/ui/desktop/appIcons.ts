import { Files } from "@phosphor-icons/react/dist/csr/Files";
import { FolderOpen } from "@phosphor-icons/react/dist/csr/FolderOpen";
import type { Icon } from "@phosphor-icons/react/dist/lib/types";
import type { AppMessageKey } from "@/apps/registry";

// Apart from the registry, because these icons call `createContext`, which does not exist in a
// Server Component, and the routes read the registry on the server.
export const appIcons: Record<AppMessageKey, Icon> = {
  projects: FolderOpen,
  documents: Files,
};
