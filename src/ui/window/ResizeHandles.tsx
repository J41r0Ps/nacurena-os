import type { Bounds, ResizeEdge, WindowId } from "@/os/domain";
import { useDesktopShell } from "@/ui/desktop/desktopContext";
import { usePointerGesture } from "./usePointerGesture";

// Handles straddle the window edge, 8 px on edges and 12 px on corners (DESIGN §3). Corners come
// last, so they sit on top of the edges they meet. Tailwind scans for whole class names, which is
// why these are written out instead of being built from the edge name.
const HANDLES: readonly { readonly edge: ResizeEdge; readonly className: string }[] = [
  { edge: "n", className: "-top-1 left-1.5 right-1.5 h-2 cursor-ns-resize" },
  { edge: "s", className: "-bottom-1 left-1.5 right-1.5 h-2 cursor-ns-resize" },
  { edge: "w", className: "-left-1 top-1.5 bottom-1.5 w-2 cursor-ew-resize" },
  { edge: "e", className: "-right-1 top-1.5 bottom-1.5 w-2 cursor-ew-resize" },
  { edge: "nw", className: "-left-1.5 -top-1.5 size-3 cursor-nwse-resize" },
  { edge: "ne", className: "-right-1.5 -top-1.5 size-3 cursor-nesw-resize" },
  { edge: "sw", className: "-bottom-1.5 -left-1.5 size-3 cursor-nesw-resize" },
  { edge: "se", className: "-bottom-1.5 -right-1.5 size-3 cursor-nwse-resize" },
];

interface ResizeHandleProps {
  readonly id: WindowId;
  readonly edge: ResizeEdge;
  readonly className: string;
}

const ResizeHandle = ({ id, edge, className }: ResizeHandleProps) => {
  const { store } = useDesktopShell();
  const gesture = usePointerGesture<Bounds>(
    () => store.getState().manager.windows.find((window) => window.id === id)?.bounds ?? null,
    (start, dx, dy) => store.getState().resizeWindowFromEdge(id, start, edge, dx, dy),
  );

  return (
    <div
      {...gesture}
      data-resize-edge={edge}
      className={`absolute z-10 touch-none ${className}`}
    />
  );
};

/** Pointer only, so hidden from assistive technology. Maximise is the alternative to resizing. */
export const ResizeHandles = ({ id }: { readonly id: WindowId }) => (
  <div aria-hidden="true">
    {HANDLES.map(({ edge, className }) => (
      <ResizeHandle key={edge} id={id} edge={edge} className={className} />
    ))}
  </div>
);
