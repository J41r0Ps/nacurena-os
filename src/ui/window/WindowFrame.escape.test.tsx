import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { englishStrings } from "@/i18n/testStrings";
import { Desktop } from "@/ui/desktop/Desktop";

// No real app opts out yet: Terminal and Mail arrive later. So this file marks Documents as one.
vi.mock("@/apps/registry", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/apps/registry")>();
  const apps = original.apps.map((app) =>
    app.messageKey === "documents" ? { ...app, closesOnEscape: false } : app,
  );

  return {
    ...original,
    apps,
    appById: (id: string) => apps.find((app) => app.id === id),
  };
});

const open = (name: string): HTMLElement => {
  fireEvent.click(document.querySelector(`[data-app-icon="${name}"]`) as Element, { detail: 1 });
  return screen.getAllByRole("dialog").at(-1) as HTMLElement;
};

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
  render(<Desktop locale="en" strings={englishStrings()} />);
});

describe("Esc in a window", () => {
  it("leaves the window open when its app opted out", () => {
    const window = open("documents");

    fireEvent.keyDown(window, { key: "Escape" });

    expect(window).toBeInTheDocument();
  });

  it("still closes an app that did not opt out", () => {
    const window = open("projects");

    fireEvent.keyDown(window, { key: "Escape" });

    expect(window).not.toBeInTheDocument();
  });
});
