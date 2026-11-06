import { memo, useCallback, useId, useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { appById } from "@/apps/registry";
import type { Position, WindowId } from "@/os/domain";
import { useDesktopShell, useDesktopStore } from "@/ui/desktop/desktopContext";
import { SURFACE_ATTRIBUTE } from "@/ui/desktop/desktopShell";
import { playOpen } from "@/ui/motion/motion";
import { ResizeHandles } from "./ResizeHandles";
import { usePointerGesture } from "./usePointerGesture";
import { WindowControls } from "./WindowControls";

const surfaceAttribute = { [SURFACE_ATTRIBUTE]: "" };

/**
 * One window. It takes only an id and selects its own data, so dragging one window re-renders
 * this frame alone: the domain replaces only the object that changed.
 *
 * Non-modal dialog: `role="dialog"` with a name and no `aria-modal`, because everything behind a
 * window stays usable. So Tab is not trapped, unlike the modal pattern.
 */
export const WindowFrame = memo(function WindowFrame({ id }: { readonly id: WindowId }) {
  const shell = useDesktopShell();
  const { store } = shell;
  const titleId = useId();
  const surfaceRef = useRef<HTMLDivElement>(null);

  const appWindow = useDesktopStore((state) =>
    state.manager.windows.find((candidate) => candidate.id === id),
  );
  const viewport = useDesktopStore((state) => state.manager.viewport);
  const isFocused = useDesktopStore((state) => state.manager.focusedWindowId === id);

  const registerElement = useCallback(
    (element: HTMLElement | null) => shell.registerWindow(id, element),
    [shell, id],
  );

  // Before paint, so the first frame the visitor sees is already the start of the animation.
  useLayoutEffect(() => {
    if (shell.takeOpeningWindow(id) && surfaceRef.current !== null) playOpen(surfaceRef.current);
  }, [shell, id]);

  const isCompact = viewport.isCompact;
  const canDrag = appWindow?.state === "normal" && !isCompact;

  const dragGesture = usePointerGesture<Position>(
    () => (canDrag ? appWindow.bounds.position : null),
    (start, dx, dy) => store.getState().moveWindow(id, start.x + dx, start.y + dy),
  );

  // The parent drops this frame right after the window closes, one render later.
  if (appWindow === undefined) return null;
  const app = appById(appWindow.appId);
  if (app === undefined) return null;

  const { state } = appWindow;
  const bounds = appWindow.displayBounds(viewport);
  const fillsViewport = state === "maximised" || isCompact;
  const AppIcon = app.icon;

  const toggleMaximise = (): void => {
    const { maximiseWindow, restoreWindow } = store.getState();
    if (state === "maximised") restoreWindow(id);
    else maximiseWindow(id);
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") shell.closeWithoutMotion(id);
  };

  return (
    <section
      ref={registerElement}
      role="dialog"
      aria-labelledby={titleId}
      tabIndex={-1}
      hidden={state === "minimised"}
      data-app-id={appWindow.appId}
      data-window-state={state}
      data-focused={isFocused}
      className="focus-ring pointer-events-auto absolute top-0 left-0 focus-visible:-outline-offset-2"
      style={{
        transform: `translate(${bounds.x}px, ${bounds.y}px)`,
        width: bounds.width,
        height: bounds.height,
        zIndex: appWindow.zOrder,
      }}
      // Capture runs before any child handler, so a window is on top before a drag begins.
      onPointerDownCapture={() => store.getState().focusWindow(id)}
      onFocusCapture={() => store.getState().focusWindow(id)}
      onKeyDown={handleKeyDown}
    >
      {/* GSAP animates only this wrapper. React owns the outer element's transform. */}
      <div
        {...surfaceAttribute}
        ref={surfaceRef}
        className={`flex h-full flex-col ${
          fillsViewport
            ? ""
            : `rounded-window border ${
                isFocused
                  ? "border-border-strong shadow-focused"
                  : "border-border shadow-unfocused"
              }`
        }`}
      >
        <div
          className={`flex h-(--titlebar-h) shrink-0 bg-surface-raised text-ui font-medium ${
            fillsViewport ? "" : "rounded-t-window"
          } ${isFocused ? "text-text" : "text-muted"}`}
        >
          {/* The controls are a sibling of this region, so they can never start a drag. */}
          <div
            {...dragGesture}
            data-window-drag-region=""
            onDoubleClick={isCompact ? undefined : toggleMaximise}
            className={`flex min-w-0 flex-1 items-center gap-2 pl-2 select-none ${
              canDrag ? "touch-none" : ""
            }`}
          >
            <AppIcon size={16} aria-hidden="true" className="shrink-0" />
            <h2 id={titleId} className="truncate">
              {app.title}
            </h2>
          </div>
          <WindowControls
            title={app.title}
            isMaximised={state === "maximised"}
            canMaximise={!isCompact}
            onMinimise={() => store.getState().minimiseWindow(id)}
            onToggleMaximise={toggleMaximise}
            onClose={() => store.getState().closeWindow(id)}
          />
        </div>
        <div
          className={`min-h-0 flex-1 overflow-auto bg-surface p-4 text-body text-text ${
            fillsViewport ? "" : "rounded-b-window"
          }`}
        >
          <p>{app.body}</p>
        </div>
      </div>
      {canDrag && <ResizeHandles id={id} />}
    </section>
  );
});
