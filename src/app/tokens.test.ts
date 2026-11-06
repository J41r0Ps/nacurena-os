import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CASCADE_ORIGIN_X, TITLE_BAR_HEIGHT, WINDOW_CONTROL_WIDTH } from "@/os/domain";

const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

const pixels = (token: string): number => {
  const match = new RegExp(`${token}:\\s*(\\d+)px`).exec(css);
  if (match === null) throw new Error(`${token} is not in globals.css`);
  return Number(match[1]);
};

// The domain clamps with these numbers and CSS draws with them. If they drifted apart, a window
// could look reachable while the domain measured something else.
describe("tokens shared with the domain", () => {
  it("--titlebar-h equals TITLE_BAR_HEIGHT", () => {
    expect(pixels("--titlebar-h")).toBe(TITLE_BAR_HEIGHT);
  });

  it("--control-w equals WINDOW_CONTROL_WIDTH", () => {
    expect(pixels("--control-w")).toBe(WINDOW_CONTROL_WIDTH);
  });

  it("CASCADE_ORIGIN_X clears the icon column, with its 16 px margin and gap", () => {
    expect(CASCADE_ORIGIN_X).toBe(16 + pixels("--icon-cell") + 16);
  });
});
