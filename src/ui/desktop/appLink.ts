import type { MouseEvent } from "react";

/**
 * True when a click on an app link should open a window. A modified click belongs to the browser,
 * so "open in new tab" works as it does on any other link.
 */
export const isPlainClick = (event: MouseEvent): boolean =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
