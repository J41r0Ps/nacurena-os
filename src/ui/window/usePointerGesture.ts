import { useRef, type PointerEvent } from "react";

interface Gesture<Origin> {
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly origin: Origin;
}

/**
 * One drag of one pointer, for both moving and resizing a window.
 *
 * `begin` returns what the gesture starts from, or null to refuse it. `update` gets that origin
 * and the TOTAL distance so far. Adding small steps instead would drift: once the domain clamps a
 * window, the pointer and the window would stay apart after the pointer comes back.
 *
 * Pointer capture sends every later event to this element, even when the pointer leaves it or the
 * browser window, so a fast drag cannot lose the window.
 */
export const usePointerGesture = <Origin>(
  begin: () => Origin | null,
  update: (origin: Origin, dx: number, dy: number) => void,
) => {
  const gesture = useRef<Gesture<Origin> | null>(null);

  const end = (): void => {
    gesture.current = null;
  };

  return {
    onPointerDown(event: PointerEvent<HTMLElement>): void {
      if (event.button !== 0 || !event.isPrimary) return;
      const origin = begin();
      if (origin === null) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      gesture.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        origin,
      };
    },
    onPointerMove(event: PointerEvent<HTMLElement>): void {
      const current = gesture.current;
      if (current === null || current.pointerId !== event.pointerId) return;
      update(current.origin, event.clientX - current.startX, event.clientY - current.startY);
    },
    onPointerUp: end,
    // The browser can take a touch away, for example to scroll. The window stays where it is.
    onPointerCancel: end,
  };
};
