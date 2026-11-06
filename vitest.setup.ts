import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// RTL only cleans up by itself when test globals are on, and we import ours.
afterEach(cleanup);

// jsdom has no layout, so it leaves out the browser APIs built on it. These stand-ins only keep
// components from crashing. Real sizes, dragging and media queries are tested in Playwright.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

vi.stubGlobal("matchMedia", (query: string) => ({
  matches: false,
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
}));

Element.prototype.setPointerCapture = () => {};
