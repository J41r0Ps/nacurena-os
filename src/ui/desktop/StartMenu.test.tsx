import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { englishStrings } from "@/i18n/testStrings";
import { Desktop } from "./Desktop";

const renderDesktop = () => render(<Desktop locale="en" strings={englishStrings()} />);

const startButton = () => screen.getByRole("button", { name: "Start" });

// The closed menu is hidden by CSS, which jsdom does not load, so `hidden: true` finds it either way.
const menu = () => screen.getByRole("menu", { name: "Start", hidden: true });
const item = (name: string) => within(menu()).getByRole("menuitem", { name, hidden: true });

const isOpen = () => startButton().getAttribute("aria-expanded") === "true";

const press = (key: string) => fireEvent.keyDown(document.activeElement as Element, { key });

const openWithKeyboard = async () => {
  const user = userEvent.setup();
  startButton().focus();
  await user.keyboard("{Enter}");
  return user;
};

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
});

describe("start menu markup", () => {
  it("follows the menu button pattern while closed", () => {
    renderDesktop();

    expect(startButton()).toHaveAttribute("aria-haspopup", "menu");
    expect(startButton()).toHaveAttribute("aria-expanded", "false");
    expect(startButton()).toHaveAttribute("aria-controls", menu().id);
    expect(menu()).toHaveAttribute("data-open", "false");
  });

  it("lists every app as a real link to its URL", () => {
    renderDesktop();

    expect(item("Projects")).toHaveAttribute("href", "/en/projects/");
    expect(item("Documents")).toHaveAttribute("href", "/en/documents/");
  });

  it("keeps the items out of the tab order, so Tab leaves the menu", () => {
    renderDesktop();

    expect(item("Projects")).toHaveAttribute("tabindex", "-1");
    expect(item("Documents")).toHaveAttribute("tabindex", "-1");
  });
});

describe("start menu keyboard", () => {
  it("opens with Enter and focuses the first item", async () => {
    renderDesktop();

    await openWithKeyboard();

    expect(isOpen()).toBe(true);
    expect(item("Projects")).toHaveFocus();
  });

  it("opens with Space and focuses the first item", async () => {
    renderDesktop();
    const user = userEvent.setup();
    startButton().focus();

    await user.keyboard(" ");

    expect(isOpen()).toBe(true);
    expect(item("Projects")).toHaveFocus();
  });

  it("opens with the down arrow on the first item", () => {
    renderDesktop();
    startButton().focus();

    press("ArrowDown");

    expect(item("Projects")).toHaveFocus();
  });

  it("opens with the up arrow on the last item", () => {
    renderDesktop();
    startButton().focus();

    press("ArrowUp");

    expect(item("Documents")).toHaveFocus();
  });

  it("moves with the arrow keys and wraps at both ends", async () => {
    renderDesktop();
    await openWithKeyboard();

    press("ArrowDown");
    expect(item("Documents")).toHaveFocus();

    press("ArrowDown");
    expect(item("Projects")).toHaveFocus();

    press("ArrowUp");
    expect(item("Documents")).toHaveFocus();
  });

  it("jumps with Home and End", async () => {
    renderDesktop();
    await openWithKeyboard();

    press("End");
    expect(item("Documents")).toHaveFocus();

    press("Home");
    expect(item("Projects")).toHaveFocus();
  });

  it("jumps to the item that starts with a typed letter", async () => {
    renderDesktop();
    await openWithKeyboard();

    press("d");

    expect(item("Documents")).toHaveFocus();
  });

  it("closes with Esc and returns focus to the start button", async () => {
    renderDesktop();
    await openWithKeyboard();

    press("Escape");

    expect(isOpen()).toBe(false);
    expect(startButton()).toHaveFocus();
  });

  it("closes on Tab without pulling focus back", async () => {
    renderDesktop();
    await openWithKeyboard();

    press("Tab");

    expect(isOpen()).toBe(false);
    expect(startButton()).not.toHaveFocus();
  });

  it("opens the app with Enter, closes, and moves focus into the window", async () => {
    renderDesktop();
    const user = await openWithKeyboard();

    await user.keyboard("{Enter}");

    expect(isOpen()).toBe(false);
    await vi.waitFor(() => expect(screen.getByRole("dialog", { name: "Projects" })).toHaveFocus());
  });

  it("opens the app with Space, which a link would otherwise ignore", async () => {
    renderDesktop();
    await openWithKeyboard();

    press(" ");

    expect(screen.getByRole("dialog", { name: "Projects" })).toBeInTheDocument();
  });

  it("returns focus to the start button when that window closes", async () => {
    renderDesktop();
    const user = await openWithKeyboard();
    await user.keyboard("{Enter}");
    const window = screen.getByRole("dialog", { name: "Projects" });
    await vi.waitFor(() => expect(window).toHaveFocus());

    fireEvent.keyDown(window, { key: "Escape" });

    await vi.waitFor(() => expect(startButton()).toHaveFocus());
  });
});

describe("start menu pointer", () => {
  it("toggles with the button", () => {
    renderDesktop();

    fireEvent.click(startButton());
    expect(isOpen()).toBe(true);

    fireEvent.click(startButton());
    expect(isOpen()).toBe(false);
  });

  it("closes on a press outside it, without moving focus to the button", () => {
    renderDesktop();
    fireEvent.click(startButton());

    act(() => {
      document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });

    expect(isOpen()).toBe(false);
    expect(startButton()).not.toHaveFocus();
  });

  it("opens the app on a click", () => {
    renderDesktop();
    fireEvent.click(startButton());

    fireEvent.click(item("Documents"));

    expect(screen.getByRole("dialog", { name: "Documents" })).toBeInTheDocument();
    expect(isOpen()).toBe(false);
  });

  it("leaves a ctrl-click to the browser, which opens a new tab", () => {
    renderDesktop();
    fireEvent.click(startButton());

    // `fireEvent` returns false if the handler called preventDefault.
    const leftToBrowser = fireEvent.click(item("Documents"), { ctrlKey: true });

    expect(leftToBrowser).toBe(true);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
