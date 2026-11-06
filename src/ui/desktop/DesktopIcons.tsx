import type { MouseEvent } from "react";
import { apps, type DesktopApp } from "@/apps/registry";
import { pathOf } from "@/os/routing/desktopAddress";
import { appIcons } from "./appIcons";
import { isPlainClick } from "./appLink";
import { useDesktopShell } from "./desktopContext";

/**
 * A real link, so it works without JavaScript, in a new tab and for crawlers. With JavaScript the
 * click is taken over and opens a window with no page load.
 */
const DesktopIcon = ({ app }: { readonly app: DesktopApp }) => {
  const shell = useDesktopShell();
  const AppIcon = appIcons[app.messageKey];

  const open = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    // One click opens (DESIGN §4). A habitual double-click must not open a second window. Enter
    // reports detail 0, so the keyboard always gets through.
    if (event.detail > 1) return;
    shell.openFrom(app.id, event.currentTarget);
  };

  return (
    <a
      href={pathOf({ locale: shell.locale, appId: app.id })}
      data-app-icon={app.id}
      onClick={open}
      className="control-feedback focus-ring flex size-(--icon-cell) flex-col items-center justify-center gap-1 rounded-control p-1 hover:bg-surface-overlay"
    >
      <AppIcon size={32} weight="duotone" aria-hidden="true" className="text-accent" />
      <span className="line-clamp-2 text-center text-caption text-text">
        {shell.strings.apps[app.id].title}
      </span>
    </a>
  );
};

/** Fills top to bottom, then left to right. Fixed positions in v1 (DESIGN §4). */
export const DesktopIcons = () => {
  const { strings } = useDesktopShell();

  return (
    <ul
      aria-label={strings.appsLabel}
      className="absolute inset-4 grid auto-cols-(--icon-cell) grid-flow-col grid-rows-[repeat(auto-fill,var(--icon-cell))]"
    >
      {apps.map((app) => (
        <li key={app.id}>
          <DesktopIcon app={app} />
        </li>
      ))}
    </ul>
  );
};
