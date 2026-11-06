import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const STORAGE_KEY = "nacurena-os:desktop:v1";

// Measured from the rendered page, in a 1280 × 720 browser with a 48 px taskbar.
const WORK_AREA = { width: 1280, height: 672 };

const documentsWindow = (page: Page) => page.getByRole("dialog", { name: "Documents" });
const projectsWindow = (page: Page) => page.getByRole("dialog", { name: "Projects" });
const taskbar = (page: Page) => page.getByRole("group", { name: "Open apps" });

const icon = (page: Page, app: string) => page.locator(`[data-app-icon="${app}"]`);

const box = async (window: Locator) => {
  const bounds = await window.boundingBox();
  if (bounds === null) throw new Error("The window is not visible");
  return bounds;
};

/** Holds the mouse down at a point and drags it in steps, as a person would. */
const dragFrom = async (page: Page, x: number, y: number, toX: number, toY: number) => {
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(toX, toY, { steps: 8 });
  await page.mouse.up();
};

/** Drags a window by its title bar, 40 px in from its left edge. */
const dragTitle = async (page: Page, window: Locator, dx: number, dy: number) => {
  const start = await box(window);
  const x = Math.max(start.x, 0) + 40;
  const y = start.y + 16;
  await dragFrom(page, x, y, x + dx, y + dy);
};

const dragEdge = async (page: Page, window: Locator, edge: string, dx: number, dy: number) => {
  const handle = await box(window.locator(`[data-resize-edge="${edge}"]`));
  const x = handle.x + handle.width / 2;
  const y = handle.y + handle.height / 2;
  await dragFrom(page, x, y, x + dx, y + dy);
};

const openDocuments = async (page: Page) => {
  await icon(page, "documents").click();
  await expect(documentsWindow(page).first()).toBeVisible();
};

/** Waits for the page to settle, so the lazily loaded motion code is really in play. */
const gotoDesktop = async (page: Page) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
};

// React logs hydration mismatches as console errors, and the store logs every refused command.
// Both are bugs, so every test in this file fails on any console error.
// Starts empty, so a test that fails before beforeEach runs reports only its real error.
let problems: string[] = [];

test.beforeEach(async ({ page }) => {
  problems = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(message.text());
  });
  page.on("pageerror", (error) => problems.push(error.message));
  await gotoDesktop(page);
});

test.afterEach(() => {
  expect(problems).toEqual([]);
});

test.describe("the static page", () => {
  test("has the name, the links and the desktop in the HTML, with no window", async ({ request }) => {
    const html = await (await request.get("/")).text();

    expect(html).toContain("Jairo Nacurena");
    expect(html).toContain("https://github.com/J41r0Ps");
    expect(html).toContain("data-app-icon");
    expect(html).not.toContain('role="dialog"');
  });

  test("the work area stops at the taskbar", async ({ page }) => {
    await openDocuments(page);
    await documentsWindow(page).getByRole("button", { name: "Maximise Documents" }).click();

    expect(await box(documentsWindow(page))).toMatchObject({ x: 0, y: 0, ...WORK_AREA });
  });
});

test.describe("windows", () => {
  test("open with one click, and appear in the taskbar", async ({ page }) => {
    await openDocuments(page);

    await expect(taskbar(page).getByRole("button", { name: "Documents" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("open with Enter", async ({ page }) => {
    await icon(page, "documents").focus();
    await page.keyboard.press("Enter");

    await expect(documentsWindow(page)).toBeVisible();
  });

  test("a double-click on an icon opens one window, not two", async ({ page }) => {
    await icon(page, "documents").dblclick();

    await expect(documentsWindow(page)).toHaveCount(1);
  });

  test("a single-instance app keeps one window, a multi-instance app gets more", async ({ page }) => {
    await icon(page, "projects").click();
    await icon(page, "projects").click();
    await expect(projectsWindow(page)).toHaveCount(1);

    await icon(page, "documents").click();
    await icon(page, "documents").click();
    await expect(documentsWindow(page)).toHaveCount(2);
  });

  test("open beside the icons, so every icon stays clickable", async ({ page }) => {
    await openDocuments(page);

    expect(await box(documentsWindow(page))).toMatchObject({ x: 128, y: 16 });
    await icon(page, "projects").click({ timeout: 2000 });
    await expect(projectsWindow(page)).toBeVisible();
  });

  test("drag by the title bar, 1:1 with the pointer", async ({ page }) => {
    await openDocuments(page);
    const window = documentsWindow(page);
    const start = await box(window);

    await dragTitle(page, window, 200, 120);

    expect(await box(window)).toMatchObject({
      x: start.x + 200,
      y: start.y + 120,
      width: start.width,
      height: start.height,
    });
  });

  test("do not drag from the controls", async ({ page }) => {
    await openDocuments(page);
    const window = documentsWindow(page);
    const start = await box(window);
    const control = await box(window.getByRole("button", { name: "Maximise Documents" }));

    await dragFrom(page, control.x + 20, control.y + 16, control.x + 220, control.y + 216);

    expect(await box(window)).toMatchObject({ x: start.x, y: start.y });
  });

  test("come to the front and take focus on pointer down", async ({ page }) => {
    await openDocuments(page);
    await dragTitle(page, documentsWindow(page), 300, 100);
    await icon(page, "projects").click();
    await expect(projectsWindow(page)).toHaveAttribute("data-focused", "true");

    const behind = await box(documentsWindow(page));
    await page.mouse.click(behind.x + behind.width - 150, behind.y + behind.height - 10);

    await expect(documentsWindow(page)).toHaveAttribute("data-focused", "true");
    await expect(projectsWindow(page)).toHaveAttribute("data-focused", "false");
  });

  test("resize from every edge and corner, keeping the opposite edges still", async ({ page }) => {
    await openDocuments(page);
    const window = documentsWindow(page);
    await dragTitle(page, window, 200, 100);

    const cases = [
      ["e", 40, 0],
      ["s", 0, 40],
      ["w", -40, 0],
      ["n", 0, -40],
      ["se", 20, 30],
      ["nw", -20, -30],
      ["ne", 20, -30],
      ["sw", -20, 30],
    ] as const;

    for (const [edge, dx, dy] of cases) {
      const before = await box(window);
      await dragEdge(page, window, edge, dx, dy);
      const after = await box(window);

      const expected = {
        left: before.x + (edge.includes("w") ? dx : 0),
        top: before.y + (edge.includes("n") ? dy : 0),
        right: before.x + before.width + (edge.includes("e") ? dx : 0),
        bottom: before.y + before.height + (edge.includes("s") ? dy : 0),
      };
      expect({
        left: after.x,
        top: after.y,
        right: after.x + after.width,
        bottom: after.y + after.height,
      }).toEqual(expected);
    }
  });

  test("stop at the minimum size without pushing the opposite edge", async ({ page }) => {
    await openDocuments(page);
    const window = documentsWindow(page);
    await dragTitle(page, window, 100, 100);
    const start = await box(window);

    await dragEdge(page, window, "nw", 900, 900);
    const after = await box(window);

    expect(after).toMatchObject({ width: 320, height: 200 });
    expect(after.x + after.width).toBe(start.x + start.width);
    expect(after.y + after.height).toBe(start.y + start.height);
  });

  test("maximise from the button and restore the exact bounds", async ({ page }) => {
    await openDocuments(page);
    const window = documentsWindow(page);
    await dragTitle(page, window, 150, 90);
    const start = await box(window);

    await window.getByRole("button", { name: "Maximise Documents" }).click();
    expect(await box(window)).toMatchObject({ x: 0, y: 0, ...WORK_AREA });

    await window.getByRole("button", { name: "Restore Documents" }).click();
    expect(await box(window)).toEqual(start);
  });

  test("maximise and restore with a double-click on the title", async ({ page }) => {
    await openDocuments(page);
    const window = documentsWindow(page);
    const region = window.locator("[data-window-drag-region]");

    await region.dblclick();
    await expect(window).toHaveAttribute("data-window-state", "maximised");

    await region.dblclick();
    await expect(window).toHaveAttribute("data-window-state", "normal");
  });

  test("a maximised window cannot be dragged", async ({ page }) => {
    await openDocuments(page);
    const window = documentsWindow(page);
    await window.getByRole("button", { name: "Maximise Documents" }).click();

    await dragFrom(page, 100, 16, 300, 200);

    expect(await box(window)).toMatchObject({ x: 0, y: 0, ...WORK_AREA });
  });

  test("minimise to the taskbar and restore from it", async ({ page }) => {
    await openDocuments(page);
    const window = documentsWindow(page);
    await dragTitle(page, window, 80, 60);
    const start = await box(window);

    await window.getByRole("button", { name: "Minimise Documents" }).click();
    await expect(window).toBeHidden();

    await taskbar(page).getByRole("button", { name: "Documents, minimised" }).click();
    await expect(window).toBeVisible();
    expect(await box(window)).toEqual(start);
  });

  test("minimise and restore keep a maximised window maximised", async ({ page }) => {
    await openDocuments(page);
    const window = documentsWindow(page);
    await window.getByRole("button", { name: "Maximise Documents" }).click();
    await window.getByRole("button", { name: "Minimise Documents" }).click();

    await taskbar(page).getByRole("button", { name: "Documents, minimised" }).click();

    await expect(window).toHaveAttribute("data-window-state", "maximised");
  });

  test("close", async ({ page }) => {
    await openDocuments(page);

    await documentsWindow(page).getByRole("button", { name: "Close Documents" }).click();

    await expect(documentsWindow(page)).toHaveCount(0);
    await expect(taskbar(page).getByRole("button")).toHaveCount(0);
  });

  test("close with Esc", async ({ page }) => {
    await openDocuments(page);
    await expect(documentsWindow(page)).toBeFocused();

    await page.keyboard.press("Escape");

    await expect(documentsWindow(page)).toHaveCount(0);
  });
});

test.describe("reachability", () => {
  test("a window pushed left keeps its controls and can be dragged back", async ({ page }) => {
    await openDocuments(page);
    const window = documentsWindow(page);
    const { width } = await box(window);

    await dragTitle(page, window, -3000, 0);

    // 184 = the three control cells (120) plus the grab strip (64).
    const pushed = await box(window);
    expect(pushed.x).toBe(184 - width);

    // The right 120 px are controls, so the 64 px left of them must still start a drag.
    await dragFrom(page, 32, pushed.y + 16, 432, pushed.y + 66);

    expect(await box(window)).toMatchObject({ x: 184 - width + 400, y: pushed.y + 50 });
  });

  test("a window pushed left can still be closed", async ({ page }) => {
    await openDocuments(page);
    await dragTitle(page, documentsWindow(page), -3000, 0);

    await documentsWindow(page).getByRole("button", { name: "Close Documents" }).click();

    await expect(documentsWindow(page)).toHaveCount(0);
  });

  test("a window pushed right can be dragged back by its title", async ({ page }) => {
    await openDocuments(page);
    const window = documentsWindow(page);

    await dragTitle(page, window, 3000, 0);
    const pushed = await box(window);
    expect(pushed.x).toBe(WORK_AREA.width - 64);

    await dragFrom(page, pushed.x + 32, pushed.y + 16, pushed.x - 368, pushed.y + 16);

    expect((await box(window)).x).toBe(pushed.x - 400);
  });

  test("a window dragged down keeps its title bar above the taskbar", async ({ page }) => {
    await openDocuments(page);
    const window = documentsWindow(page);

    await dragTitle(page, window, 0, 3000);

    expect((await box(window)).y).toBe(WORK_AREA.height - 32);
  });

  test("a smaller browser window keeps every window reachable", async ({ page }) => {
    await openDocuments(page);
    const window = documentsWindow(page);
    await dragTitle(page, window, 3000, 0);

    await page.setViewportSize({ width: 900, height: 600 });

    await expect.poll(async () => (await box(window)).x).toBe(900 - 64);
  });
});

test.describe("persistence", () => {
  test("a reload keeps the layout", async ({ page }) => {
    await openDocuments(page);
    const window = documentsWindow(page);
    await dragTitle(page, window, 240, 130);
    await dragEdge(page, window, "se", 60, 40);
    await icon(page, "projects").click();
    await projectsWindow(page).getByRole("button", { name: "Minimise Projects" }).click();
    const layout = await box(window);

    await page.reload();

    await expect(window).toBeVisible();
    expect(await box(window)).toEqual(layout);
    await expect(window).toHaveAttribute("data-focused", "true");
    await expect(projectsWindow(page)).toHaveCount(0);
    await expect(taskbar(page).getByRole("button", { name: "Projects, minimised" })).toBeVisible();
  });

  test("a reload does not move focus or replay the opening", async ({ page }) => {
    await openDocuments(page);
    await page.reload();
    await expect(documentsWindow(page)).toBeVisible();

    await expect(documentsWindow(page)).not.toBeFocused();
    const animations = await documentsWindow(page)
      .locator("[data-window-surface]")
      .evaluate((surface) => surface.getAttribute("style"));
    expect(animations ?? "").not.toContain("opacity");
  });

  test("corrupted storage gives a fresh desktop, and it keeps working", async ({ page }) => {
    await page.evaluate((key) => localStorage.setItem(key, "{not json"), STORAGE_KEY);

    await page.reload();

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await openDocuments(page);
  });

  test("stale storage from a removed app gives a fresh desktop", async ({ page }) => {
    await openDocuments(page);
    await page.reload();
    await page.evaluate((key) => {
      const saved = localStorage.getItem(key) ?? "";
      localStorage.setItem(key, saved.replaceAll("documents", "removed-app"));
    }, STORAGE_KEY);

    // The root and not a reload: the URL now holds /en/documents/, which would open a window.
    await gotoDesktop(page);

    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});

test.describe("keyboard focus", () => {
  test("moves into a window on open and back to the opener on close", async ({ page }) => {
    await icon(page, "documents").focus();
    await page.keyboard.press("Enter");
    await expect(documentsWindow(page)).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(documentsWindow(page).getByRole("button", { name: "Minimise Documents" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(icon(page, "documents")).toBeFocused();
  });

  test("goes to the window that takes over when another is still open", async ({ page }) => {
    await openDocuments(page);
    await icon(page, "projects").focus();
    await page.keyboard.press("Enter");
    await expect(projectsWindow(page)).toBeFocused();

    await page.keyboard.press("Escape");

    await expect(documentsWindow(page)).toBeFocused();
    await expect(documentsWindow(page)).toHaveAttribute("data-focused", "true");
  });

  test("falls back to the app's icon when a reload lost the opener", async ({ page }) => {
    await openDocuments(page);
    await page.reload();

    await documentsWindow(page).getByRole("button", { name: "Close Documents" }).click();

    await expect(icon(page, "documents")).toBeFocused();
  });

  test("is not trapped: Tab can leave a window", async ({ page }) => {
    await openDocuments(page);
    await expect(documentsWindow(page)).toBeFocused();

    for (let press = 0; press < 3; press++) await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    const insideWindow = await documentsWindow(page).evaluate((window) =>
      window.contains(document.activeElement),
    );
    expect(insideWindow).toBe(false);
  });
});

test.describe("motion", () => {
  const ghosts = (page: Page) => page.locator('[inert][aria-hidden="true"]');

  test("close leaves an inert copy that removes itself, while the domain is already done", async ({
    page,
  }) => {
    await openDocuments(page);

    await documentsWindow(page).getByRole("button", { name: "Close Documents" }).click();

    await expect(documentsWindow(page)).toHaveCount(0);
    await expect(ghosts(page)).toHaveCount(0);
  });

  test("the leftover copy exists during the exit, and cannot be clicked", async ({ page }) => {
    await openDocuments(page);
    const ghostSeen = page.evaluate(
      () =>
        new Promise<{ inert: boolean; role: string | null; ids: number }>((resolve) => {
          new MutationObserver((records, observer) => {
            for (const record of records) {
              for (const node of record.addedNodes) {
                if (node instanceof HTMLElement && node.inert) {
                  observer.disconnect();
                  resolve({
                    inert: node.inert,
                    role: node.getAttribute("role"),
                    ids: node.querySelectorAll("[id]").length,
                  });
                }
              }
            }
          }).observe(document.body, { childList: true, subtree: true });
        }),
    );

    await documentsWindow(page).getByRole("button", { name: "Close Documents" }).click();

    expect(await ghostSeen).toEqual({ inert: true, role: null, ids: 0 });
  });

  test("the opening animation ends with no leftover transform", async ({ page }) => {
    await openDocuments(page);
    const surface = documentsWindow(page).locator("[data-window-surface]");

    await expect
      .poll(() => surface.evaluate((element) => element.getAttribute("style") ?? ""))
      .not.toContain("opacity");
  });

  /** Starts watching for a new window and reports the transform of its first animated frame. */
  const watchFirstOpeningFrame = async (page: Page) => {
    await page.evaluate(() => {
      const scope = window as unknown as { firstOpeningFrame: Promise<string> };
      scope.firstOpeningFrame = new Promise((resolve) => {
        new MutationObserver((records, observer) => {
          for (const record of records) {
            for (const node of record.addedNodes) {
              if (!(node instanceof HTMLElement)) continue;
              const surface = node.querySelector<HTMLElement>("[data-window-surface]");
              if (surface !== null) {
                observer.disconnect();
                // Microtask: runs after the layout effect that starts the tween.
                queueMicrotask(() => resolve(surface.style.transform));
              }
            }
          }
        }).observe(document.body, { childList: true, subtree: true });
      });
    });
  };

  const firstOpeningFrame = (page: Page) =>
    page.evaluate(
      () => (window as unknown as { firstOpeningFrame: Promise<string> }).firstOpeningFrame,
    );

  test("full motion opens from a smaller scale", async ({ page }) => {
    await watchFirstOpeningFrame(page);

    await icon(page, "documents").click();

    expect(await firstOpeningFrame(page)).toContain("scale(0.96");
  });

  test("reduced motion uses opacity only", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await gotoDesktop(page);
    await watchFirstOpeningFrame(page);

    await icon(page, "documents").click();

    expect(await firstOpeningFrame(page)).not.toContain("scale(0.96");
  });
});

test.describe("at the narrowest free-window width", () => {
  test.use({ viewport: { width: 768, height: 700 } });

  test("a wide window opens with its Close button on screen", async ({ page }) => {
    await icon(page, "projects").click();

    const close = await box(projectsWindow(page).getByRole("button", { name: "Close Projects" }));
    expect(close.x + close.width).toBeLessThanOrEqual(768);
  });
});

test.describe("below 768 px", () => {
  test.use({ viewport: { width: 375, height: 700 } });

  test("windows fill the work area and cannot be dragged or resized", async ({ page }) => {
    await openDocuments(page);
    const window = documentsWindow(page);
    const filled = { x: 0, y: 0, width: 375, height: 652 };
    expect(await box(window)).toMatchObject(filled);

    await dragFrom(page, 60, 16, 200, 200);

    expect(await box(window)).toMatchObject(filled);
    await expect(window.locator("[data-resize-edge]")).toHaveCount(0);
    await expect(window.getByRole("button", { name: /Maximise/ })).toHaveCount(0);
  });

  test("windows go back to their own bounds when the screen gets wider", async ({ page }) => {
    await openDocuments(page);

    await page.setViewportSize({ width: 1280, height: 720 });

    await expect
      .poll(async () => (await box(documentsWindow(page))).width)
      .toBeLessThan(1280);
  });

  test("the desktop has no accessibility violations", async ({ page }) => {
    await openDocuments(page);

    const results = await new AxeBuilder({ page }).analyze();

    expect(results.violations).toEqual([]);
  });
});

test.describe("accessibility", () => {
  test("an empty desktop has no violations", async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze();

    expect(results.violations).toEqual([]);
  });

  test("open, focused, unfocused, minimised and maximised windows have no violations", async ({
    page,
  }) => {
    await openDocuments(page);
    await dragTitle(page, documentsWindow(page), 300, 100);
    await icon(page, "projects").click();
    await icon(page, "documents").click();
    const second = documentsWindow(page).last();
    await second.getByRole("button", { name: "Minimise Documents" }).click();

    const layered = await new AxeBuilder({ page }).analyze();
    expect(layered.violations).toEqual([]);

    await projectsWindow(page).getByRole("button", { name: "Maximise Projects" }).click();
    const maximised = await new AxeBuilder({ page }).analyze();
    expect(maximised.violations).toEqual([]);
  });
});
