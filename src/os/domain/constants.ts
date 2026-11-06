// All in CSS pixels. See "Ubiquitous language" in docs/DOMAIN.md.
export const MIN_WINDOW_WIDTH = 320;
export const MIN_WINDOW_HEIGHT = 200;
export const TITLE_BAR_HEIGHT = 32;
export const GRAB_STRIP_WIDTH = 64;

/** Minimise, maximise and close sit at the right of the title bar and never start a drag. */
export const WINDOW_CONTROL_WIDTH = 40;
export const WINDOW_CONTROL_COUNT = 3;
export const WINDOW_CONTROLS_WIDTH = WINDOW_CONTROL_WIDTH * WINDOW_CONTROL_COUNT;

/**
 * How much of a window, measured from its right edge, must stay right of the viewport's left
 * edge. Control cells cannot be dragged, so a grab strip has to fit beside them.
 */
export const MIN_VISIBLE_TITLE_BAR_WIDTH = WINDOW_CONTROLS_WIDTH + GRAB_STRIP_WIDTH;

/** Below this viewport width, windows fill the viewport and cannot be moved. */
export const COMPACT_VIEWPORT_WIDTH = 768;

/**
 * Where the cascade starts: right of the desktop icon column (16 px margin, 96 px cell, 16 px gap)
 * and level with its top, so opening a window never hides the icons.
 */
export const CASCADE_ORIGIN_X = 128;
export const CASCADE_ORIGIN_Y = 16;
/** Each new window opens this far down and right from the previous one. */
export const CASCADE_STEP = 32;
/** After this many steps the cascade returns to its origin. */
export const CASCADE_LENGTH = 8;
