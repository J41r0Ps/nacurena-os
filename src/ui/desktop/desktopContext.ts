import { createContext, useContext } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { WindowId } from "@/os/domain";
import type { DesktopState } from "@/os/store/desktopStore";
import type { DesktopShell } from "./desktopShell";

/** A context, not a global: each render tree and each test gets its own store. */
export const DesktopShellContext = createContext<DesktopShell | null>(null);

export const useDesktopShell = (): DesktopShell => {
  const shell = useContext(DesktopShellContext);
  if (shell === null) throw new Error("useDesktopShell must be used inside <Desktop>");
  return shell;
};

/**
 * A component re-renders only when what its selector returns changes. The aggregate is immutable,
 * so a selector that returns one `Window` stays the same object unless that window changed.
 */
export const useDesktopStore = <T>(selector: (state: DesktopState) => T): T =>
  useStore(useDesktopShell().store, selector);

/** `useShallow` compares the items, so a new array holding the same ids causes no render. */
export const useWindowIds = (): readonly WindowId[] =>
  useDesktopStore(useShallow((state) => state.manager.windows.map((window) => window.id)));
