import { describe, expect, it } from "vitest";
import { apps, closesOnEscape, type DesktopApp } from "./registry";

describe("registry", () => {
  it("uses each app's id as its message key, so its URL and its strings cannot drift apart", () => {
    for (const app of apps) expect(app.id).toBe(app.messageKey);
  });

  it("has an id that is safe in a URL for every app", () => {
    for (const app of apps) expect(app.id).toMatch(/^[a-z][a-z0-9-]*$/);
  });

  it("closes on Esc unless an app opts out", () => {
    const [app] = apps;
    const optedOut: DesktopApp = { ...app, closesOnEscape: false };

    expect(closesOnEscape(app)).toBe(true);
    expect(closesOnEscape(optedOut)).toBe(false);
  });
});
