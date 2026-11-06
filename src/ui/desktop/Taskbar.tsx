import { memo } from "react";
import { appById } from "@/apps/registry";
import type { WindowId } from "@/os/domain";
import { Clock } from "./Clock";
import { useDesktopShell, useDesktopStore, useWindowIds } from "./desktopContext";

const TaskbarButton = memo(function TaskbarButton({ id }: { readonly id: WindowId }) {
  const { store } = useDesktopShell();
  const appId = useDesktopStore(
    (state) => state.manager.windows.find((window) => window.id === id)?.appId,
  );
  const isMinimised = useDesktopStore(
    (state) => state.manager.windows.find((window) => window.id === id)?.state === "minimised",
  );
  const isFocused = useDesktopStore((state) => state.manager.focusedWindowId === id);

  const app = appId === undefined ? undefined : appById(appId);
  if (app === undefined) return null;
  const AppIcon = app.icon;

  const activate = (): void => {
    const { focusWindow, minimiseWindow, restoreWindow } = store.getState();
    if (isMinimised) restoreWindow(id);
    else if (isFocused) minimiseWindow(id);
    else focusWindow(id);
  };

  return (
    <button
      type="button"
      data-taskbar-window={id}
      aria-pressed={isFocused}
      aria-label={isMinimised ? `${app.title}, minimised` : app.title}
      onClick={activate}
      className={`control-feedback focus-ring relative flex h-10 max-w-40 min-w-11 flex-1 items-center gap-2 rounded-control px-3 text-ui hover:bg-surface-overlay ${
        isFocused ? "bg-surface-overlay text-text" : "text-muted"
      }`}
    >
      <AppIcon size={16} aria-hidden="true" className="shrink-0" />
      <span className="truncate">{app.title}</span>
      {/* The bar's length repeats the state, so focus does not rely on colour alone. */}
      <span
        aria-hidden="true"
        className={`absolute bottom-0.5 left-1/2 h-0.5 -translate-x-1/2 ${
          isFocused ? "w-4 bg-accent" : "w-1.5 bg-muted"
        }`}
      />
    </button>
  );
});

export const Taskbar = () => {
  const ids = useWindowIds();

  return (
    <div className="flex h-(--taskbar-h) shrink-0 items-center gap-1 border-t border-border bg-surface-sunken px-1">
      <div
        role="group"
        aria-label="Open apps"
        className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto p-0.5"
      >
        {ids.map((id) => (
          <TaskbarButton key={id} id={id} />
        ))}
      </div>
      <Clock />
    </div>
  );
};
