import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Desktop } from "./Desktop";

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
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("window chrome", () => {
  it("names the window after its app, without making it modal", () => {
    render(<Desktop />);
    const window = openApp("documents");

    expect(window).toHaveAccessibleName("Documents");
    expect(window).not.toHaveAttribute("aria-modal");
  });

  it("gives every control a real button with a label", () => {
    render(<Desktop />);
    const window = within(openApp("documents"));

    expect(window.getByRole("button", { name: "Minimise Documents" })).toBeInTheDocument();
    expect(window.getByRole("button", { name: "Maximise Documents" })).toBeInTheDocument();
    expect(window.getByRole("button", { name: "Close Documents" })).toBeInTheDocument();
  });

  it("keeps the controls out of the drag region", () => {
    render(<Desktop />);
    const window = openApp("documents");
    const dragRegion = window.querySelector("[data-window-drag-region]");

    expect(dragRegion).not.toBeNull();
    expect(dragRegion?.querySelector("button")).toBeNull();
  });

  it("maximises and restores from the same control", () => {
    render(<Desktop />);
    const window = openApp("documents");

    fireEvent.click(within(window).getByRole("button", { name: "Maximise Documents" }));
    expect(window).toHaveAttribute("data-window-state", "maximised");

    fireEvent.click(within(window).getByRole("button", { name: "Restore Documents" }));
    expect(window).toHaveAttribute("data-window-state", "normal");
  });

  it("maximises on a double-click of the title", () => {
    render(<Desktop />);
    const window = openApp("documents");

    fireEvent.doubleClick(window.querySelector("[data-window-drag-region]") as Element);

    expect(window).toHaveAttribute("data-window-state", "maximised");
  });

  it("offers no resize handles on a maximised window", () => {
    render(<Desktop />);
    const window = openApp("documents");
    expect(window.querySelectorAll("[data-resize-edge]")).toHaveLength(8);

    fireEvent.click(within(window).getByRole("button", { name: "Maximise Documents" }));

    expect(window.querySelectorAll("[data-resize-edge]")).toHaveLength(0);
  });

  it("closes from the control", () => {
    render(<Desktop />);
    const window = openApp("documents");

    fireEvent.click(within(window).getByRole("button", { name: "Close Documents" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes with Esc, and leaves no animated copy behind", () => {
    render(<Desktop />);
    const window = openApp("documents");

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.querySelector("[inert]")).toBeNull();
  });

  it("minimises to the taskbar and restores from it", () => {
    render(<Desktop />);
    const window = openApp("documents");

    fireEvent.click(within(window).getByRole("button", { name: "Minimise Documents" }));
    expect(window).not.toBeVisible();

    fireEvent.click(taskbarGroup().getByRole("button", { name: "Documents, minimised" }));
    expect(window).toBeVisible();
  });

  it("marks the focused window, with a different state for the one behind", () => {
    render(<Desktop />);
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
    render(<Desktop />);
    const window = openApp("documents");
    const controls = within(window);

    expect(controls.queryByRole("button", { name: /Maximise/ })).not.toBeInTheDocument();
    expect(window.querySelectorAll("[data-resize-edge]")).toHaveLength(0);
    expect(controls.getByRole("button", { name: "Minimise Documents" })).toBeInTheDocument();
    expect(controls.getByRole("button", { name: "Close Documents" })).toBeInTheDocument();
  });

  it("fills the work area", () => {
    measureWorkArea(375, 700);
    render(<Desktop />);
    const window = openApp("documents");

    expect(window).toHaveStyle({ width: "375px", height: "700px" });
  });

  it("does nothing on a double-click of the title", () => {
    measureWorkArea(375, 700);
    render(<Desktop />);
    const window = openApp("documents");

    fireEvent.doubleClick(window.querySelector("[data-window-drag-region]") as Element);

    expect(window).toHaveAttribute("data-window-state", "normal");
  });
});

describe("desktop", () => {
  it("shows no window in the first render, so it matches the static HTML", () => {
    render(<Desktop />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens one window per click, and ignores the second click of a double-click", () => {
    render(<Desktop />);

    fireEvent.click(icon("documents"), { detail: 1 });
    fireEvent.click(icon("documents"), { detail: 2 });

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("opens from the keyboard, which reports no click count", () => {
    render(<Desktop />);

    fireEvent.click(icon("documents"), { detail: 0 });

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("opens a second window for a multi-instance app", () => {
    render(<Desktop />);

    openApp("documents");
    openApp("documents");

    expect(screen.getAllByRole("dialog")).toHaveLength(2);
    expect(taskbarGroup().getAllByRole("button")).toHaveLength(2);
  });

  it("brings back the one window of a single-instance app", () => {
    render(<Desktop />);

    openApp("projects");
    openApp("projects");

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("minimises from the taskbar when the window is already focused", () => {
    render(<Desktop />);
    const window = openApp("documents");

    fireEvent.click(taskbarGroup().getByRole("button", { name: "Documents" }));

    expect(window).toHaveAttribute("data-window-state", "minimised");
  });

  it("focuses a background window from the taskbar instead of minimising it", () => {
    render(<Desktop />);
    const first = openApp("documents");
    openApp("projects");

    fireEvent.click(taskbarGroup().getByRole("button", { name: "Documents" }));

    expect(first).toHaveAttribute("data-focused", "true");
    expect(first).toHaveAttribute("data-window-state", "normal");
  });

  it("marks the focused window's taskbar button as pressed", () => {
    render(<Desktop />);
    openApp("documents");
    openApp("projects");

    const buttons = taskbarGroup();
    expect(buttons.getByRole("button", { name: "Projects" })).toHaveAttribute("aria-pressed", "true");
    expect(buttons.getByRole("button", { name: "Documents" })).toHaveAttribute("aria-pressed", "false");
  });

  it("fills in the clock after mount", () => {
    vi.useFakeTimers();
    render(<Desktop />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    vi.useRealTimers();

    expect(document.querySelector("time")?.textContent).not.toBe("");
  });

  it("has no dead buttons: every button on the desktop belongs to an app", () => {
    render(<Desktop />);

    const buttons = screen.getAllByRole("button");

    expect(buttons).toEqual([icon("projects"), icon("documents")]);
  });
});

describe("focus", () => {
  it("moves into a window when it opens", async () => {
    render(<Desktop />);
    const window = openApp("documents");

    await vi.waitFor(() => expect(window).toHaveFocus());
  });

  it("returns to the opener when the last window closes", async () => {
    render(<Desktop />);
    const opener = icon("documents");
    opener.focus();
    const window = openApp("documents");
    await vi.waitFor(() => expect(window).toHaveFocus());

    fireEvent.click(within(window).getByRole("button", { name: "Close Documents" }));

    await vi.waitFor(() => expect(opener).toHaveFocus());
  });

  it("goes to the window that takes over when another one is left", async () => {
    render(<Desktop />);
    const first = openApp("documents");
    const second = openApp("projects");
    await vi.waitFor(() => expect(second).toHaveFocus());

    fireEvent.click(within(second).getByRole("button", { name: "Close Projects" }));

    await vi.waitFor(() => expect(first).toHaveFocus());
  });

  it("goes to the taskbar button when the last window is minimised", async () => {
    render(<Desktop />);
    const window = openApp("documents");
    await vi.waitFor(() => expect(window).toHaveFocus());

    fireEvent.click(within(window).getByRole("button", { name: "Minimise Documents" }));

    const button = taskbarGroup().getByRole("button", { name: "Documents, minimised" });
    await vi.waitFor(() => expect(button).toHaveFocus());
  });

  it("makes a window the focused one when Tab lands inside it", () => {
    render(<Desktop />);
    const first = openApp("documents");
    openApp("projects");

    act(() => within(first).getByRole("button", { name: "Close Documents" }).focus());

    expect(first).toHaveAttribute("data-focused", "true");
  });
});
