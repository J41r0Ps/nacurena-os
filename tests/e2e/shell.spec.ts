import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const STORAGE_KEY = "nacurena-os:desktop:v1";

const LOCALES = ["en", "nl", "es"] as const;
const APPS = ["projects", "documents"] as const;

const TITLES = {
  en: { projects: "Projects", documents: "Documents" },
  nl: { projects: "Projecten", documents: "Documenten" },
  es: { projects: "Proyectos", documents: "Documentos" },
} as const;

/** Where a new window opens, in pixels. The static HTML has the same numbers. */
const FIRST_WINDOW = { x: 128, y: 16, width: 720, height: 480 };

const projectsWindow = (page: Page) => page.getByRole("dialog", { name: "Projects" });
const documentsWindow = (page: Page) => page.getByRole("dialog", { name: "Documents" });
const taskbar = (page: Page) => page.getByRole("group", { name: "Open apps" });
const icon = (page: Page, app: string) => page.locator(`[data-app-icon="${app}"]`);
const startButton = (page: Page) => page.getByRole("button", { name: "Start" });

const pathname = (page: Page) => new URL(page.url()).pathname;

/** Settled, so the app has hydrated and the lazily loaded motion code is really in play. */
const visit = async (page: Page, path: string) => {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
};

/** A value on `window` dies with the document, so finding it again proves no page load happened. */
const markDocument = (page: Page) =>
  page.evaluate(() => {
    (window as unknown as { marker: string }).marker = "same document";
  });

const expectSameDocument = async (page: Page) => {
  const marker = await page.evaluate(() => (window as unknown as { marker?: string }).marker);
  expect(marker).toBe("same document");
};

// React logs hydration mismatches as console errors, and the store logs every refused command.
let problems: string[] = [];

test.beforeEach(({ page }) => {
  problems = [];
  page.on("console", (message) => {
    // A 404 page reports its own status, which is the point of it and not a fault.
    if (message.type() === "error" && !message.text().includes("404")) {
      problems.push(message.text());
    }
  });
  page.on("pageerror", (error) => problems.push(error.message));
});

test.afterEach(() => {
  expect(problems).toEqual([]);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("/en/projects shows the Projects window, open and readable", async ({ page }) => {
    await page.goto("/en/projects");

    const window = projectsWindow(page);
    await expect(window).toBeVisible();
    await expect(window.getByRole("heading", { name: "Projects" })).toBeVisible();
    await expect(window).toHaveAttribute("data-focused", "true");
    await expect(window).toContainText("Projects is not built yet.");
    expect(await window.boundingBox()).toEqual(FIRST_WINDOW);
  });

  test("every locale shows its own window title", async ({ page }) => {
    for (const locale of LOCALES) {
      for (const app of APPS) {
        await page.goto(`/${locale}/${app}/`);

        await expect(page.getByRole("dialog", { name: TITLES[locale][app] })).toBeVisible();
      }
    }
  });

  test("offers no button, because none could do anything", async ({ page }) => {
    await page.goto("/en/projects/");

    await expect(page.getByRole("button")).toHaveCount(0);
  });

  test("Close is a link to the locale root", async ({ page }) => {
    await page.goto("/nl/projects/");

    await page.getByRole("link", { name: "Projecten sluiten" }).click();

    await expect(page).toHaveURL(/\/nl\/$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("an icon is a link that loads the app's page", async ({ page }) => {
    await page.goto("/");

    await icon(page, "documents").click();

    await expect(page).toHaveURL(/\/en\/documents\/$/);
    await expect(documentsWindow(page)).toBeVisible();
  });

  test("the name and contact links are on every route", async ({ page }) => {
    for (const path of ["/", "/en/projects/", "/nl/documents/"]) {
      await page.goto(path);

      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Jairo Nacurena");
      await expect(page.getByRole("link", { name: "GitHub" })).toBeVisible();
    }
  });

  test.describe("on a phone", () => {
    test.use({ viewport: { width: 375, height: 700 } });

    test("the static window fills the work area instead of overflowing", async ({ page }) => {
      await page.goto("/en/projects/");

      expect(await projectsWindow(page).boundingBox()).toEqual({
        x: 0,
        y: 0,
        width: 375,
        height: 652,
      });
    });
  });
});

test.describe("the static HTML", () => {
  const htmlOf = async (request: { get(path: string): Promise<{ text(): Promise<string> }> }, path: string) =>
    (await request.get(path)).text();

  test("has the right lang on the addresses printed on the CV", async ({ request }) => {
    expect(await htmlOf(request, "/")).toContain('<html lang="en"');
    expect(await htmlOf(request, "/nl/")).toContain('<html lang="nl"');
    expect(await htmlOf(request, "/es/")).toContain('<html lang="es"');
  });

  test("has the right lang, title and description for every locale and app", async ({ request }) => {
    for (const locale of LOCALES) {
      for (const app of APPS) {
        const html = await htmlOf(request, `/${locale}/${app}/`);

        expect(html).toContain(`<html lang="${locale}"`);
        expect(html).toContain(`<title>${TITLES[locale][app]} · Jairo Nacurena</title>`);
        expect(html).toMatch(/<meta name="description" content="[^"]{20,}"/);
      }
    }
  });

  test("gives each locale's home its own description", async ({ request }) => {
    const descriptions = await Promise.all(
      LOCALES.map(async (locale) => {
        const html = await htmlOf(request, `/${locale}/`);
        return /<meta name="description" content="([^"]+)"/.exec(html)?.[1];
      }),
    );

    expect(new Set(descriptions).size).toBe(LOCALES.length);
  });

  test("names / as the canonical address of /en/, because they are the same page", async ({
    request,
  }) => {
    expect(await htmlOf(request, "/en/")).toContain(
      '<link rel="canonical" href="https://jaironacurena.com/"',
    );
  });

  test("has the window in the HTML of an app route, and none on a locale root", async ({
    request,
  }) => {
    expect(await htmlOf(request, "/en/projects/")).toContain('role="dialog"');
    expect(await htmlOf(request, "/nl/")).not.toContain('role="dialog"');
  });

  test("makes every icon a real link in the language of the page", async ({ request }) => {
    const html = await htmlOf(request, "/es/");

    expect(html).toContain('href="/es/projects/"');
    expect(html).toContain('href="/es/documents/"');
  });
});

test.describe("hydration", () => {
  /** Records every dialog taken out of the page, from before the first script runs. */
  const watchForRemovedWindows = (page: Page) =>
    page.addInitScript(() => {
      const scope = window as unknown as { removedWindows: number };
      scope.removedWindows = 0;
      new MutationObserver((records) => {
        for (const record of records) {
          for (const node of record.removedNodes) {
            if (node instanceof HTMLElement && node.querySelector('[role="dialog"], [data-window-surface]')) {
              scope.removedWindows += 1;
            }
            if (node instanceof HTMLElement && node.getAttribute("role") === "dialog") {
              scope.removedWindows += 1;
            }
          }
        }
      }).observe(document, { childList: true, subtree: true });
    });

  test("on a first visit the static window is never removed, moved or animated", async ({ page }) => {
    await watchForRemovedWindows(page);

    await visit(page, "/en/projects/");

    const window = projectsWindow(page);
    await expect(window).toHaveAttribute("data-focused", "true");
    expect(await window.boundingBox()).toEqual(FIRST_WINDOW);
    expect(await page.evaluate(() => (globalThis as unknown as { removedWindows: number }).removedWindows)).toBe(0);
    const style = await window
      .locator("[data-window-surface]")
      .evaluate((surface) => surface.getAttribute("style"));
    expect(style ?? "").not.toContain("opacity");
  });

  test("does not take DOM focus away from the page", async ({ page }) => {
    await visit(page, "/en/projects/");

    await expect(projectsWindow(page)).not.toBeFocused();
  });

  test("a reload on /en/documents keeps it open, as one window", async ({ page }) => {
    await visit(page, "/en/documents/");
    await expect(documentsWindow(page)).toBeVisible();

    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(documentsWindow(page)).toHaveCount(1);
    await expect(documentsWindow(page)).toHaveAttribute("data-focused", "true");
  });

  test("the saved layout and the URL's app appear together, with the URL's app in front", async ({
    page,
  }) => {
    await visit(page, "/");
    await icon(page, "documents").click();
    await documentsWindow(page).locator("[data-window-drag-region]").hover();
    await page.mouse.down();
    await page.mouse.move(700, 300, { steps: 6 });
    await page.mouse.up();
    const saved = await documentsWindow(page).boundingBox();
    await page.waitForFunction((key) => localStorage.getItem(key)?.includes("documents"), STORAGE_KEY);
    await page.waitForTimeout(300);

    await visit(page, "/en/projects/");

    await expect(projectsWindow(page)).toHaveAttribute("data-focused", "true");
    await expect(documentsWindow(page)).toHaveAttribute("data-focused", "false");
    expect(await documentsWindow(page).boundingBox()).toEqual(saved);
    await expect(taskbar(page).getByRole("button")).toHaveCount(2);
  });

  test("a URL brings a minimised window back as it was", async ({ page }) => {
    await visit(page, "/en/projects/");
    await projectsWindow(page).getByRole("button", { name: "Maximise Projects" }).click();
    await projectsWindow(page).getByRole("button", { name: "Minimise Projects" }).click();
    await page.waitForTimeout(300);

    await visit(page, "/en/projects/");

    await expect(projectsWindow(page)).toHaveAttribute("data-window-state", "maximised");
    await expect(projectsWindow(page)).toHaveAttribute("data-focused", "true");
  });

  test("a locale root keeps a saved layout, and the address catches up", async ({ page }) => {
    await visit(page, "/en/documents/");
    await documentsWindow(page).getByRole("button", { name: "Maximise Documents" }).click();
    await page.waitForTimeout(300);

    await visit(page, "/");

    await expect(documentsWindow(page)).toHaveAttribute("data-window-state", "maximised");
    expect(pathname(page)).toBe("/en/documents/");
  });

  test("Back still works after that rewrite, with no page load", async ({ page }) => {
    await visit(page, "/en/documents/");
    await documentsWindow(page).getByRole("button", { name: "Maximise Documents" }).click();
    await page.waitForTimeout(300);
    await visit(page, "/");
    await markDocument(page);

    await icon(page, "projects").evaluate((element: HTMLElement) => element.click());
    await expect(page).toHaveURL(/\/en\/projects\/$/);
    await page.goBack();

    await expect(page).toHaveURL(/\/en\/documents\/$/);
    await expectSameDocument(page);
  });
});

test.describe("URL sync", () => {
  test("opening an icon changes the URL without loading a page", async ({ page }) => {
    await visit(page, "/");
    await markDocument(page);
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));

    await icon(page, "projects").click();

    await expect(page).toHaveURL(/\/en\/projects\/$/);
    await expect(projectsWindow(page)).toBeVisible();
    await expectSameDocument(page);
    // Neither a document nor the router's data for the new route: the store does all the work.
    expect(requests.filter((url) => !url.includes("/_next/static/"))).toEqual([]);
  });

  test("the tab title follows the app", async ({ page }) => {
    await visit(page, "/");

    await icon(page, "projects").click();
    await expect(page).toHaveTitle("Projects · Jairo Nacurena");

    await projectsWindow(page).getByRole("button", { name: "Close Projects" }).click();
    await expect(page).toHaveTitle("Jairo Nacurena");
  });

  test("a ctrl-click on an icon leaves this desktop alone", async ({ page, context }) => {
    await visit(page, "/");

    const opened = context.waitForEvent("page");
    await icon(page, "projects").click({ modifiers: ["ControlOrMeta"] });
    const tab = await opened;

    await expect(tab).toHaveURL(/\/en\/projects\/$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(pathname(page)).toBe("/");
  });

  test("focusing another window updates the URL and adds no history", async ({ page }) => {
    await visit(page, "/");
    await icon(page, "documents").click();
    await icon(page, "projects").click();
    const entries = await page.evaluate(() => history.length);

    await taskbar(page).getByRole("button", { name: "Documents" }).click();
    await expect(page).toHaveURL(/\/en\/documents\/$/);
    await taskbar(page).getByRole("button", { name: "Projects" }).click();
    await expect(page).toHaveURL(/\/en\/projects\/$/);

    expect(await page.evaluate(() => history.length)).toBe(entries);
  });

  test("closing the last window returns to the locale root", async ({ page }) => {
    await visit(page, "/nl/projects/");

    await page.getByRole("button", { name: "Projecten sluiten" }).click();

    await expect(page).toHaveURL(/\/nl\/$/);
  });

  test("closing one of two windows moves the URL to the one that takes focus", async ({ page }) => {
    await visit(page, "/");
    await icon(page, "documents").click();
    await icon(page, "projects").click();

    await projectsWindow(page).getByRole("button", { name: "Close Projects" }).click();

    await expect(page).toHaveURL(/\/en\/documents\/$/);
  });

  test("minimising the last visible window returns to the locale root", async ({ page }) => {
    await visit(page, "/en/projects/");

    await projectsWindow(page).getByRole("button", { name: "Minimise Projects" }).click();

    await expect(page).toHaveURL(/\/en\/$/);
    await taskbar(page).getByRole("button", { name: "Projects, minimised" }).click();
    await expect(page).toHaveURL(/\/en\/projects\/$/);
  });

  test("two windows of one app share its URL", async ({ page }) => {
    await visit(page, "/");
    await icon(page, "documents").click();
    const entries = await page.evaluate(() => history.length);

    await icon(page, "documents").click();

    await expect(documentsWindow(page)).toHaveCount(2);
    expect(pathname(page)).toBe("/en/documents/");
    expect(await page.evaluate(() => history.length)).toBe(entries);
  });
});

test.describe("back and forward", () => {
  test("move between apps without loading a page or closing a window", async ({ page }) => {
    await visit(page, "/");
    await markDocument(page);
    await icon(page, "projects").click();
    await icon(page, "documents").click();
    await expect(documentsWindow(page)).toHaveAttribute("data-focused", "true");

    await page.goBack();
    await expect(page).toHaveURL(/\/en\/projects\/$/);
    await expect(projectsWindow(page)).toHaveAttribute("data-focused", "true");
    await expect(documentsWindow(page)).toBeVisible();

    await page.goForward();
    await expect(page).toHaveURL(/\/en\/documents\/$/);
    await expect(documentsWindow(page)).toHaveAttribute("data-focused", "true");

    await expectSameDocument(page);
  });

  test("Back to the root minimises, and Forward restores the same window", async ({ page }) => {
    await visit(page, "/");
    await markDocument(page);
    await icon(page, "projects").click();
    await expect(projectsWindow(page)).toBeVisible();
    await projectsWindow(page).locator("[data-window-drag-region]").hover();
    await page.mouse.down();
    await page.mouse.move(500, 200, { steps: 6 });
    await page.mouse.up();
    const moved = await projectsWindow(page).boundingBox();

    await page.goBack();
    await expect(page).toHaveURL(/localhost:\d+\/$/);
    await expect(projectsWindow(page)).toHaveCount(0);
    await expect(taskbar(page).getByRole("button", { name: "Projects, minimised" })).toBeVisible();
    await expect(page).toHaveTitle("Jairo Nacurena");

    await page.goForward();
    await expect(projectsWindow(page)).toBeVisible();
    expect(await projectsWindow(page).boundingBox()).toEqual(moved);
    await expectSameDocument(page);
  });

  test("Back never traps the visitor on the page", async ({ page }) => {
    await page.goto("about:blank");
    await visit(page, "/");
    await icon(page, "projects").click();
    await expect(page).toHaveURL(/\/en\/projects\/$/);

    await page.goBack();
    await expect(page).toHaveURL(/localhost:\d+\/$/);
    await page.goBack();

    await expect(page).toHaveURL("about:blank");
  });

  test("Back never brings a closed app back", async ({ page }) => {
    await visit(page, "/");
    await icon(page, "projects").click();
    await projectsWindow(page).getByRole("button", { name: "Close Projects" }).click();
    await expect(page).toHaveURL(/\/en\/$/);

    await page.goBack();

    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("DOM focus follows, so the keyboard stays with the app on screen", async ({ page }) => {
    await visit(page, "/");
    await icon(page, "projects").click();
    await icon(page, "documents").click();

    await page.goBack();

    await expect(projectsWindow(page)).toBeFocused();
  });
});

test.describe("start menu", () => {
  const menu = (page: Page) => page.getByRole("menu", { name: "Start" });
  const item = (page: Page, name: string) => menu(page).getByRole("menuitem", { name });

  test.beforeEach(async ({ page }) => {
    await visit(page, "/");
  });

  test("is hidden until opened, and its links are not tab stops", async ({ page }) => {
    await expect(menu(page)).toBeHidden();

    await startButton(page).focus();
    await page.keyboard.press("Tab");

    await expect(item(page, "Projects")).toBeHidden();
    await expect(startButton(page)).not.toBeFocused();
  });

  test("works by keyboard from start to finish", async ({ page }) => {
    await startButton(page).focus();

    await page.keyboard.press("Enter");
    await expect(item(page, "Projects")).toBeFocused();

    await page.keyboard.press("ArrowDown");
    await expect(item(page, "Documents")).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(documentsWindow(page)).toBeFocused();
    await expect(page).toHaveURL(/\/en\/documents\/$/);
    await expect(menu(page)).toBeHidden();

    await page.keyboard.press("Escape");
    await expect(startButton(page)).toBeFocused();
  });

  test("opens with Space, and Esc returns focus to the button", async ({ page }) => {
    await startButton(page).focus();

    await page.keyboard.press("Space");
    await expect(item(page, "Projects")).toBeFocused();

    await page.keyboard.press("Escape");

    await expect(startButton(page)).toBeFocused();
    await expect(menu(page)).toBeHidden();
  });

  test("Esc closes the menu and not the window behind it", async ({ page }) => {
    await icon(page, "projects").click();
    await startButton(page).click();

    await page.keyboard.press("Escape");

    await expect(menu(page)).toBeHidden();
    await expect(projectsWindow(page)).toBeVisible();
  });

  test("opens above the taskbar and above a maximised window", async ({ page }) => {
    await icon(page, "projects").click();
    await projectsWindow(page).getByRole("button", { name: "Maximise Projects" }).click();
    await startButton(page).click();

    // A click lands on whatever is really on top, so a hidden item would time out here.
    await item(page, "Documents").click({ timeout: 2000 });

    await expect(documentsWindow(page)).toBeVisible();
  });

  test("a click outside closes it", async ({ page }) => {
    await startButton(page).click();
    await expect(menu(page)).toBeVisible();

    await page.mouse.click(700, 300);

    await expect(menu(page)).toBeHidden();
  });

  test("full motion scales from 0.98", async ({ page }) => {
    expect(await page.locator(".start-menu").evaluate((el) => getComputedStyle(el).scale)).toBe("0.98");
  });

  test("reduced motion uses opacity only", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });

    // Polled: the closed state holds its scale for 120 ms, so the exit can finish.
    await expect
      .poll(() => page.locator(".start-menu").evaluate((el) => getComputedStyle(el).scale))
      .toBe("1");
  });
});

test.describe("404", () => {
  test("an unknown path gets a real 404 and the OS look", async ({ page }) => {
    const response = await page.goto("/en/does-not-exist/");

    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page does not exist");
    await expect(page.getByRole("link", { name: "Go to the desktop" })).toHaveAttribute("href", "/");
    await expect(page.getByRole("link", { name: "Nederlands" })).toHaveAttribute("href", "/nl/");
  });

  test("an unknown app in a known locale is a 404 too", async ({ request }) => {
    expect((await request.get("/nl/unknown-app/")).status()).toBe(404);
  });

  // Pages acts as a single-page app without this file: every unknown path becomes a 200.
  test("out/404.html exists at the top level", () => {
    expect(readFileSync("out/404.html", "utf8")).toContain('<html lang="en"');
  });

  for (const [locale, heading] of [
    ["en", "This page does not exist"],
    ["nl", "Deze pagina bestaat niet"],
    ["es", "Esta página no existe"],
  ] as const) {
    // `serve` only knows the root 404, so this plays the host: Pages answers a missing path with
    // the nearest 404.html. It also proves that page hydrates cleanly at a URL it was not built for.
    test(`${locale} serves its own 404 at any unknown path`, async ({ page }) => {
      const body = readFileSync(`out/${locale}/404.html`, "utf8");
      await page.route(`**/${locale}/missing/`, (route) =>
        route.fulfill({ status: 404, contentType: "text/html", body }),
      );

      await page.goto(`/${locale}/missing/`);
      await page.waitForLoadState("networkidle");

      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.getByRole("link", { name: TITLES[locale].projects })).toHaveAttribute(
        "href",
        `/${locale}/projects/`,
      );
    });
  }
});

test.describe("accessibility", () => {
  const noViolations = async (page: Page) => {
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  };

  for (const path of ["/", "/nl/", "/en/projects/", "/es/documents/"]) {
    test(`${path} has no violations`, async ({ page }) => {
      await visit(page, path);

      await noViolations(page);
    });
  }

  test("the open start menu has no violations", async ({ page }) => {
    await visit(page, "/");
    await startButton(page).click();
    await expect(page.locator(".start-menu")).toHaveCSS("opacity", "1");

    await noViolations(page);
  });

  test("the 404 page has no violations", async ({ page }) => {
    await page.goto("/en/does-not-exist/");

    await noViolations(page);
  });
});
