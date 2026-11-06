// The only motion module the rest of the UI touches. It holds no GSAP import, so GSAP stays out of
// First Load JS. Motion never gates state (DESIGN §6), which makes loading it late safe: until the
// chunk arrives a window simply appears or disappears at once.

interface WindowMotion {
  playOpen(surface: HTMLElement): void;
  playClose(ghost: HTMLElement, surface: HTMLElement): void;
}

let motion: WindowMotion | null = null;

export const loadMotion = (): void => {
  import("./windowMotion")
    .then((loaded) => {
      motion = loaded;
    })
    .catch(() => {
      // A failed chunk costs the animation and nothing else.
    });
};

export const playOpen = (surface: HTMLElement): void => {
  motion?.playOpen(surface);
};

/** `ghost` is the inert leftover element, and `surface` is the part of it that animates. */
export const playClose = (ghost: HTMLElement, surface: HTMLElement): void => {
  if (motion === null) ghost.remove();
  else motion.playClose(ghost, surface);
};
