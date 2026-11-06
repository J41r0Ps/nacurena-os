import type { MouseEvent } from "react";
import { apps, type DesktopApp } from "@/apps/registry";
import { useDesktopShell } from "./desktopContext";

const DesktopIcon = ({ app }: { readonly app: DesktopApp }) => {
  const shell = useDesktopShell();
  const AppIcon = app.icon;

  const open = (event: MouseEvent<HTMLButtonElement>): void => {
    // One click opens (DESIGN §4). A habitual double-click must not open a second window. Enter
    // reports detail 0, so the keyboard always gets through.
    if (event.detail > 1) return;
    const id = shell.store.getState().openApp(app.id);
    if (id === null) return;
    shell.rememberOpener(id, event.currentTarget);
    // A new window is not on the page yet: `syncFocus` handles that one after React commits.
    shell.focusWindowElement(id);
  };

  // A button until Slice 4, when the app URLs exist and this becomes a real link (ADR-010).
  return (
    <button
      type="button"
      data-app-icon={app.id}
      onClick={open}
      className="control-feedback focus-ring flex size-(--icon-cell) flex-col items-center justify-center gap-1 rounded-control p-1 hover:bg-surface-overlay"
    >
      <AppIcon size={32} weight="duotone" aria-hidden="true" className="text-accent" />
      <span className="line-clamp-2 text-center text-caption text-text">{app.title}</span>
    </button>
  );
};

/** Fills top to bottom, then left to right. Fixed positions in v1 (DESIGN §4). */
export const DesktopIcons = () => (
  <ul
    aria-label="Apps"
    className="absolute inset-4 grid auto-cols-(--icon-cell) grid-flow-col grid-rows-[repeat(auto-fill,var(--icon-cell))]"
  >
    {apps.map((app) => (
      <li key={app.id}>
        <DesktopIcon app={app} />
      </li>
    ))}
  </ul>
);
