import { CornersIn } from "@phosphor-icons/react/dist/csr/CornersIn";
import { CornersOut } from "@phosphor-icons/react/dist/csr/CornersOut";
import { Minus } from "@phosphor-icons/react/dist/csr/Minus";
import { X } from "@phosphor-icons/react/dist/csr/X";
import type { AppStrings } from "@/ui/desktop/shellStrings";

// The ring sits inside the cell: a window at the screen edge would otherwise clip it.
const CELL =
  "control-feedback focus-ring flex h-(--titlebar-h) w-(--control-w) items-center justify-center focus-visible:-outline-offset-2";

interface WindowControlsProps {
  readonly strings: AppStrings;
  /** Without JavaScript the buttons do nothing, so Close becomes a link to this address. */
  readonly closeHref: string;
  readonly isMaximised: boolean;
  /** False in a compact viewport, where every window already fills the screen. */
  readonly canMaximise: boolean;
  onMinimise(): void;
  onToggleMaximise(): void;
  onClose(): void;
}

export const WindowControls = ({
  strings,
  closeHref,
  isMaximised,
  canMaximise,
  onMinimise,
  onToggleMaximise,
  onClose,
}: WindowControlsProps) => (
  // `relative z-20` keeps the cells above the resize handles, so a corner never steals Close.
  <div className="relative z-20 flex shrink-0">
    <a
      href={closeHref}
      aria-label={strings.close}
      className={`${CELL} hidden hover:bg-text hover:text-surface-sunken noscript:flex`}
    >
      <X size={14} aria-hidden="true" />
    </a>
    <button
      type="button"
      aria-label={strings.minimise}
      className={`${CELL} hover:bg-surface-overlay noscript:hidden`}
      onClick={onMinimise}
    >
      <Minus size={14} aria-hidden="true" />
    </button>
    {canMaximise && (
      <button
        type="button"
        aria-label={isMaximised ? strings.restore : strings.maximise}
        className={`${CELL} hover:bg-surface-overlay noscript:hidden`}
        onClick={onToggleMaximise}
      >
        {isMaximised ? (
          <CornersIn size={14} aria-hidden="true" />
        ) : (
          <CornersOut size={14} aria-hidden="true" />
        )}
      </button>
    )}
    <button
      type="button"
      aria-label={strings.close}
      className={`${CELL} hover:bg-text hover:text-surface-sunken noscript:hidden`}
      onClick={onClose}
    >
      <X size={14} aria-hidden="true" />
    </button>
  </div>
);
