import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { apps, type DesktopApp } from "@/apps/registry";
import { pathOf } from "@/os/routing/desktopAddress";
import { appIcons } from "./appIcons";
import { isPlainClick } from "./appLink";
import { useDesktopShell } from "./desktopContext";

/** Which item takes focus when the menu opens, or `null` while it is closed. */
type OpenAt = "first" | "last" | null;

/**
 * The WAI-ARIA menu button pattern, with links as menu items. A start menu is an application menu:
 * arrow keys move, Esc goes back to the button, and the role tells a screen reader to expect that.
 * Roving focus means the items are not tab stops, so Tab leaves the menu and closes it.
 */
export const StartMenu = () => {
  const shell = useDesktopShell();
  const { strings, locale } = shell;
  const [openAt, setOpenAt] = useState<OpenAt>(null);
  const isOpen = openAt !== null;
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const close = (): void => setOpenAt(null);

  const closeAndReturnFocus = (): void => {
    close();
    buttonRef.current?.focus();
  };

  // Before paint, so a keyboard user never sees the menu open with focus still on the button.
  useLayoutEffect(() => {
    if (openAt === null) return;
    itemRefs.current[openAt === "first" ? 0 : apps.length - 1]?.focus();
  }, [openAt]);

  useEffect(() => {
    if (!isOpen) return;

    // A click elsewhere has its own target for focus, so the menu does not pull it back.
    const closeOnOutsidePress = (event: PointerEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenAt(null);
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, [isOpen]);

  const handleButtonKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpenAt(event.key === "ArrowDown" ? "first" : "last");
    }
  };

  const focusItem = (index: number): void => {
    itemRefs.current[(index + apps.length) % apps.length]?.focus();
  };

  /** Type-ahead: jumps to the next item that starts with the letter, searching past the current one. */
  const focusByLetter = (letter: string, from: number): void => {
    for (let step = 1; step <= apps.length; step++) {
      const index = (from + step) % apps.length;
      const title = strings.apps[apps[index].id].title;
      if (title.toLowerCase().startsWith(letter.toLowerCase())) {
        focusItem(index);
        return;
      }
    }
  };

  const handleItemKeyDown = (event: KeyboardEvent<HTMLAnchorElement>, index: number): void => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusItem(index + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusItem(index - 1);
        break;
      case "Home":
        event.preventDefault();
        focusItem(0);
        break;
      case "End":
        event.preventDefault();
        focusItem(apps.length - 1);
        break;
      case "Escape":
        event.preventDefault();
        closeAndReturnFocus();
        break;
      case "Tab":
        // Not prevented: focus moves on as usual, and the menu gets out of the way.
        close();
        break;
      case " ":
        // Space does not activate a link by itself, but the pattern says a menu item must.
        event.preventDefault();
        event.currentTarget.click();
        break;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          focusByLetter(event.key, index);
        }
    }
  };

  const handleItemClick = (event: MouseEvent, app: DesktopApp): void => {
    close();
    if (!isPlainClick(event)) return;
    event.preventDefault();
    // The button is the opener: the item is hidden by the time this window closes.
    if (buttonRef.current !== null) shell.openFrom(app.id, buttonRef.current);
  };

  return (
    // The whole menu needs JavaScript, and every app is a link on the desktop without it.
    <div ref={rootRef} className="relative shrink-0 noscript:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-label={strings.start}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setOpenAt(isOpen ? null : "first")}
        onKeyDown={handleButtonKeyDown}
        className={`control-feedback focus-ring flex size-10 items-center justify-center rounded-control text-accent hover:bg-surface-overlay ${
          isOpen ? "bg-surface-overlay" : ""
        }`}
      >
        <span aria-hidden="true" className="jn-logo h-5 w-8" />
      </button>
      <ul
        id={menuId}
        role="menu"
        aria-label={strings.start}
        data-open={isOpen}
        className="start-menu absolute bottom-full left-0 z-10 mb-2 flex w-64 flex-col gap-0.5 rounded-window border border-border-strong bg-surface-overlay p-1 shadow-focused"
      >
        {apps.map((app, index) => {
          const AppIcon = appIcons[app.messageKey];

          return (
            <li key={app.id} role="none">
              <a
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                role="menuitem"
                tabIndex={-1}
                href={pathOf({ locale, appId: app.id })}
                data-start-item={app.id}
                onClick={(event) => handleItemClick(event, app)}
                onKeyDown={(event) => handleItemKeyDown(event, index)}
                className="control-feedback focus-ring flex h-10 items-center gap-3 rounded-control px-2 text-ui text-text hover:bg-surface-raised focus-visible:-outline-offset-2"
              >
                <AppIcon size={20} weight="duotone" aria-hidden="true" className="shrink-0 text-accent" />
                <span className="truncate">{strings.apps[app.id].title}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
