"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { loadMotion } from "@/ui/motion/motion";
import { WindowFrame } from "@/ui/window/WindowFrame";
import { DesktopShellContext, useDesktopShell, useDesktopStore, useWindowIds } from "./desktopContext";
import { createDesktopShell } from "./desktopShell";
import { DesktopIcons } from "./DesktopIcons";
import { Taskbar } from "./Taskbar";

const WindowsLayer = () => {
  const shell = useDesktopShell();
  const ids = useWindowIds();
  const focusedWindowId = useDesktopStore((state) => state.manager.focusedWindowId);

  // `ids` is a dependency too: closing a window that is not focused also has to settle DOM focus.
  useEffect(() => {
    shell.syncFocus();
  }, [shell, focusedWindowId, ids]);

  return (
    // `isolation` traps the growing z-order integers here, so they can never rise above the taskbar.
    <div className="pointer-events-none absolute inset-0 isolate">
      {ids.map((id) => (
        <WindowFrame key={id} id={id} />
      ))}
      {/* React renders nothing in here, so it never touches the leftover copies of closed windows. */}
      <div ref={(element) => shell.setGhostLayer(element)} />
    </div>
  );
};

const DesktopSurface = ({ children }: { readonly children: ReactNode }) => {
  const shell = useDesktopShell();
  const workAreaRef = useRef<HTMLDivElement>(null);

  // A layout effect runs after hydration but before paint. The static HTML and the first client
  // render therefore match (zero windows), and the saved windows are there on the first frame.
  useLayoutEffect(() => {
    const workArea = workAreaRef.current;
    if (workArea === null) return;

    const { hydrate, resizeViewport } = shell.store.getState();
    const stopSaving = hydrate(workArea.clientWidth, workArea.clientHeight);
    loadMotion();

    const observer = new ResizeObserver(() =>
      resizeViewport(workArea.clientWidth, workArea.clientHeight),
    );
    observer.observe(workArea);

    return () => {
      observer.disconnect();
      stopSaving();
    };
  }, [shell]);

  return (
    <div ref={(element) => shell.setRoot(element)} className="flex h-dvh flex-col">
      {/* The work area is the domain's viewport: it stops at the taskbar. */}
      <div ref={workAreaRef} className="relative min-h-0 flex-1 overflow-hidden bg-surface-sunken">
        <DesktopIcons />
        {children}
        <WindowsLayer />
      </div>
      <Taskbar />
    </div>
  );
};

/**
 * The client island: the one file that says "use client". Everything it imports joins the client
 * bundle by itself, and `children` stays server-rendered HTML that this island merely places.
 */
export const Desktop = ({ children }: { readonly children?: ReactNode }) => {
  // Created once per mounted desktop, and never shared between renders on the server.
  const [shell] = useState(createDesktopShell);

  return (
    <DesktopShellContext value={shell}>
      <DesktopSurface>{children}</DesktopSurface>
    </DesktopShellContext>
  );
};
