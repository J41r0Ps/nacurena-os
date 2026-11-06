import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appIds } from "@/apps/registry";
import { englishStrings } from "@/i18n/testStrings";
import type { AppId } from "@/os/domain";
import { Desktop } from "./Desktop";

const renderDesktop = () => render(<Desktop locale="en" strings={englishStrings()} />);

const icon = (name: string): HTMLElement => {
  const element = document.querySelector<HTMLElement>(`[data-app-icon="${name}"]`);
  if (element === null) throw new Error(`No icon for ${name}`);
  return element;
};

const openApp = (name: string): HTMLElement => {
  fireEvent.click(icon(name), { detail: 1 });
  return screen.getAllByRole("dialog").at(-1) as HTMLElement;
};

const taskbarGroup = () => within(screen.getByRole("group", { name: "Open apps" }));

/** jsdom measures everything as 0 × 0, so a compact work area has to be faked. */
const measureWorkArea = (width: number, height: number): void => {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(width);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(height);
};

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("window chrome", () => {
  it("names the window after its app, without making it modal", () => {
    renderDesktop();
    const window = openApp("documents");

    expect(window).toHaveAccessibleName("Documents");
    expect(window).not.toHaveAttribute("aria-modal");
  });

  it("gives every control a real button with a label", () => {
    renderDesktop();
    const window = within(openApp("documents"));

    expect(window.getByRole("button", { name: "Minimise Documents" })).toBeInTheDocument();
    expect(window.getByRole("button", { name: "Maximise Documents" })).toBeInTheDocument();
    expect(window.getByRole("button", { name: "Close Documents" })).toBeInTheDocument();
  });

  it("keeps the controls out of the drag region", () => {
    renderDesktop();
    const window = openApp("documents");
    const dragRegion = window.querySelector("[data-window-drag-region]");

    expect(dragRegion).not.toBeNull();
    expect(dragRegion?.querySelector("button")).toBeNull();
  });

  it("maximises and restores from the same control", () => {
    renderDesktop();
    const window = openApp("documents");

    fireEvent.click(within(window).getByRole("button", { name: "Maximise Documents" }));
    expect(window).toHaveAttribute("data-window-state", "maximised");

    fireEvent.click(within(window).getByRole("button", { name: "Restore Documents" }));
    expect(window).toHaveAttribute("data-window-state", "normal");
  });

  it("maximises on a double-click of the title", () => {
    renderDesktop();
    const window = openApp("documents");

    fireEvent.doubleClick(window.querySelector("[data-window-drag-region]") as Element);

    expect(window).toHaveAttribute("data-window-state", "maximised");
  });

  it("offers no resize handles on a maximised window", () => {
    renderDesktop();
    const window = openApp("documents");
    expect(window.querySelectorAll("[data-resize-edge]")).toHaveLength(8);

    fireEvent.click(within(window).getByRole("button", { name: "Maximise Documents" }));

    expect(window.querySelectorAll("[data-resize-edge]")).toHaveLength(0);
  });

  it("closes from the control", () => {
    renderDesktop();
    const window = openApp("documents");

    fireEvent.click(within(window).getByRole("button", { name: "Close Documents" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes with Esc, and leaves no animated copy behind", () => {
    renderDesktop();
    const window = openApp("documents");

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.querySelector("[inert]")).toBeNull();
  });

  it("minimises to the taskbar and restores from it", () => {
    renderDesktop();
    const window = openApp("documents");

    fireEvent.click(within(window).getByRole("button", { name: "Minimise Documents" }));
    expect(window).not.toBeVisible();

    fireEvent.click(taskbarGroup().getByRole("button", { name: "Documents, minimised" }));
    expect(window).toBeVisible();
  });

  it("marks the focused window, with a different state for the one behind", () => {
    renderDesktop();
    const first = openApp("documents");
    const second = openApp("projects");

    expect(second).toHaveAttribute("data-focused", "true");
    expect(first).toHaveAttribute("data-focused", "false");

    fireEvent.pointerDown(first);

    expect(first).toHaveAttribute("data-focused", "true");
    expect(second).toHaveAttribute("data-focused", "false");
  });
});

describe("compact viewport", () => {
  it("hides maximise and the resize handles, and keeps minimise and close", () => {
    measureWorkArea(375, 700);
    renderDesktop();
    const window = openApp("documents");
    const controls = within(window);

    expect(controls.queryByRole("button", { name: /Maximise/ })).not.toBeInTheDocument();
    expect(window.querySelectorAll("[data-resize-edge]")).toHaveLength(0);
    expect(controls.getByRole("button", { name: "Minimise Documents" })).toBeInTheDocument();
    expect(controls.getByRole("button", { name: "Close Documents" })).toBeInTheDocument();
  });

  it("fills the work area", () => {
    measureWorkArea(375, 700);
    renderDesktop();
    const window = openApp("documents");

    expect(window).toHaveStyle({ width: "375px", height: "700px" });
  });

  it("does nothing on a double-click of the title", () => {
    measureWorkArea(375, 700);
    renderDesktop();
    const window = openApp("documents");

    fireEvent.doubleClick(window.querySelector("[data-window-drag-region]") as Element);

    expect(window).toHaveAttribute("data-window-state", "normal");
  });
});

describe("desktop", () => {
  it("shows no window in the first render, so it matches the static HTML", () => {
    renderDesktop();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens one window per click, and ignores the second click of a double-click", () => {
    renderDesktop();

    fireEvent.click(icon("documents"), { detail: 1 });
    fireEvent.click(icon("documents"), { detail: 2 });

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("opens from the keyboard, which reports no click count", () => {
    renderDesktop();

    fireEvent.click(icon("documents"), { detail: 0 });

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("opens a second window for a multi-instance app", () => {
    renderDesktop();

    openApp("documents");
    openApp("documents");

    expect(screen.getAllByRole("dialog")).toHaveLength(2);
    expect(taskbarGroup().getAllByRole("button")).toHaveLength(2);
  });

  it("brings back the one window of a single-instance app", () => {
    renderDesktop();

    openApp("projects");
    openApp("projects");

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("minimises from the taskbar when the window is already focused", () => {
    renderDesktop();
    const window = openApp("documents");

    fireEvent.click(taskbarGroup().getByRole("button", { name: "Documents" }));

    expect(window).toHaveAttribute("data-window-state", "minimised");
  });

  it("focuses a background window from the taskbar instead of minimising it", () => {
    renderDesktop();
    const first = openApp("documents");
    openApp("projects");

    fireEvent.click(taskbarGroup().getByRole("button", { name: "Documents" }));

    expect(first).toHaveAttribute("data-focused", "true");
    expect(first).toHaveAttribute("data-window-state", "normal");
  });

  it("marks the focused window's taskbar button as pressed", () => {
    renderDesktop();
    openApp("documents");
    openApp("projects");

    const buttons = taskbarGroup();
    expect(buttons.getByRole("button", { name: "Projects" })).toHaveAttribute("aria-pressed", "true");
    expect(buttons.getByRole("button", { name: "Documents" })).toHaveAttribute("aria-pressed", "false");
  });

  it("fills in the clock after mount", () => {
    vi.useFakeTimers();
    renderDesktop();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    vi.useRealTimers();

    expect(document.querySelector("time")?.textContent).not.toBe("");
  });

  it("has no dead buttons: on an empty desktop the only button is Start", () => {
    renderDesktop();

    expect(screen.getAllByRole("button")).toEqual([screen.getByRole("button", { name: "Start" })]);
  });

  it("makes every icon a real link to its app's URL", () => {
    renderDesktop();

    expect(icon("projects")).toHaveAttribute("href", "/en/projects/");
    expect(icon("documents")).toHaveAttribute("href", "/en/documents/");
  });

  it("builds the links in the language of the page", () => {
    render(<Desktop locale="nl" strings={englishStrings()} />);

    expect(icon("projects")).toHaveAttribute("href", "/nl/projects/");
  });

  it("takes over a plain click, so the page does not load", () => {
    renderDesktop();

    // `fireEvent` returns false if the handler called preventDefault.
    const leftToBrowser = fireEvent.click(icon("documents"), { detail: 1 });

    expect(leftToBrowser).toBe(false);
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it.each([
    ["ctrl", { ctrlKey: true }],
    ["cmd", { metaKey: true }],
    ["shift", { shiftKey: true }],
    ["alt", { altKey: true }],
    ["middle", { button: 1 }],
  ])("leaves a %s click to the browser, so a new tab still works", (_name, modifier) => {
    renderDesktop();

    const leftToBrowser = fireEvent.click(icon("documents"), { detail: 1, ...modifier });

    expect(leftToBrowser).toBe(true);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not follow the link on the second click of a double-click", () => {
    renderDesktop();

    expect(fireEvent.click(icon("documents"), { detail: 2 })).toBe(false);
  });
});

describe("a page with an app in its URL", () => {
  const renderAt = (appId: AppId) =>
    render(<Desktop locale="en" strings={englishStrings()} initialAppId={appId} />);

  it("shows the window, focused, in the very first render", () => {
    renderAt(appIds[0]);

    const window = screen.getByRole("dialog", { name: "Projects" });
    expect(window).toHaveAttribute("data-focused", "true");
    expect(window).toHaveAttribute("data-static-window");
  });

  it("does not take DOM focus away from the page", () => {
    renderAt(appIds[0]);

    expect(screen.getByRole("dialog", { name: "Projects" })).not.toHaveFocus();
  });

  it("does not offer the window a second time in the taskbar", () => {
    renderAt(appIds[0]);

    expect(taskbarGroup().getAllByRole("button")).toHaveLength(1);
  });

  it("links the no-JavaScript Close to the locale root", () => {
    renderAt(appIds[0]);

    expect(screen.getByRole("link", { name: "Close Projects" })).toHaveAttribute("href", "/en/");
  });
});

describe("focus", () => {
  it("moves into a window when it opens", async () => {
    renderDesktop();
    const window = openApp("documents");

    await vi.waitFor(() => expect(window).toHaveFocus());
  });

  it("returns to the opener when the last window closes", async () => {
    renderDesktop();
    const opener = icon("documents");
    opener.focus();
    const window = openApp("documents");
    await vi.waitFor(() => expect(window).toHaveFocus());

    fireEvent.click(within(window).getByRole("button", { name: "Close Documents" }));

    await vi.waitFor(() => expect(opener).toHaveFocus());
  });

  it("goes to the window that takes over when another one is left", async () => {
    renderDesktop();
    const first = openApp("documents");
    const second = openApp("projects");
    await vi.waitFor(() => expect(second).toHaveFocus());

    fireEvent.click(within(second).getByRole("button", { name: "Close Projects" }));

    await vi.waitFor(() => expect(first).toHaveFocus());
  });

  it("goes to the taskbar button when the last window is minimised", async () => {
    renderDesktop();
    const window = openApp("documents");
    await vi.waitFor(() => expect(window).toHaveFocus());

    fireEvent.click(within(window).getByRole("button", { name: "Minimise Documents" }));

    const button = taskbarGroup().getByRole("button", { name: "Documents, minimised" });
    await vi.waitFor(() => expect(button).toHaveFocus());
  });

  it("makes a window the focused one when Tab lands inside it", () => {
    renderDesktop();
    const first = openApp("documents");
    openApp("projects");

    act(() => within(first).getByRole("button", { name: "Close Documents" }).focus());

    expect(first).toHaveAttribute("data-focused", "true");
  });
});
