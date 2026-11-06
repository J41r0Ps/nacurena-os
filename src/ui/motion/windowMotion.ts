import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";

gsap.registerPlugin(CustomEase);

// Same curve as --ease-out in globals.css. GSAP cannot read a CSS timing function.
const easeOut = CustomEase.create("os-ease-out", "M0,0 C0.23,1 0.32,1 1,1");

let reducedMotion = false;

// Kept up to date by GSAP, so a visitor changing the setting mid-visit is respected at once.
gsap.matchMedia().add(
  {
    reduce: "(prefers-reduced-motion: reduce)",
    full: "(prefers-reduced-motion: no-preference)",
  },
  (context) => {
    reducedMotion = context.conditions?.reduce === true;
  },
);

const REDUCED_DURATION = 0.12;

export const playOpen = (surface: HTMLElement): void => {
  gsap.fromTo(
    surface,
    reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 },
    {
      opacity: 1,
      scale: 1,
      duration: reducedMotion ? REDUCED_DURATION : 0.2,
      ease: easeOut,
      overwrite: "auto",
      // A leftover transform would keep a stacking context and can soften text.
      clearProps: "opacity,scale,transform",
    },
  );
};

/** Uses `to`, so a window closed while still opening continues from where it is. */
export const playClose = (ghost: HTMLElement, surface: HTMLElement): void => {
  gsap.to(surface, {
    opacity: 0,
    scale: reducedMotion ? 1 : 0.98,
    duration: reducedMotion ? REDUCED_DURATION : 0.14,
    ease: easeOut,
    overwrite: "auto",
    onComplete: () => ghost.remove(),
  });
};
