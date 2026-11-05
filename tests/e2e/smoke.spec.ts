import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("the page loads and shows the h1", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("the page has no accessibility violations", async ({ page }) => {
  await page.goto("/");

  // No tag filter: every axe rule applies, including colour contrast.
  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations).toEqual([]);
});
