import type { AppDefinition } from "./AppDefinition";
import type { Bounds } from "./Bounds";
import type { AppId, WindowId } from "./ids";
import type { WindowSnapshot } from "./snapshot";
import type { Viewport } from "./Viewport";

export type WindowState = "normal" | "minimised" | "maximised";

interface WindowFields {
  readonly id: WindowId;
  readonly appId: AppId;
  readonly singleInstance: boolean;
  readonly state: WindowState;
  readonly stateBeforeMinimise: Exclude<WindowState, "minimised">;
  readonly bounds: Bounds;
  readonly zOrder: number;
}

/**
 * An entity: identified by `id`, not by its values. The `with…` methods return a changed copy,
 * and that copy is harmless on its own, because no WindowManager method accepts a Window. The
 * only windows that count are the ones inside the aggregate, which is what keeps it in charge.
 */
export class Window implements WindowFields {
  readonly id: WindowId;
  readonly appId: AppId;
  readonly singleInstance: boolean;
  readonly state: WindowState;
  readonly stateBeforeMinimise: Exclude<WindowState, "minimised">;
  /** Always the normal bounds, whatever the state. Use `displayBounds` to draw the window. */
  readonly bounds: Bounds;
  readonly zOrder: number;

  private constructor(fields: WindowFields) {
    this.id = fields.id;
    this.appId = fields.appId;
    this.singleInstance = fields.singleInstance;
    this.state = fields.state;
    this.stateBeforeMinimise = fields.stateBeforeMinimise;
    this.bounds = fields.bounds;
    this.zOrder = fields.zOrder;
    Object.freeze(this);
  }

  static open(id: WindowId, app: AppDefinition, bounds: Bounds, zOrder: number): Window {
    return new Window({
      id,
      appId: app.id,
      singleInstance: app.singleInstance,
      state: "normal",
      stateBeforeMinimise: "normal",
      bounds,
      zOrder,
    });
  }

  /** For fields that were already validated by `WindowManager.fromSnapshot`. */
  static fromValidated(fields: WindowFields): Window {
    return new Window(fields);
  }

  get isVisible(): boolean {
    return this.state !== "minimised";
  }

  /** Derived, so a maximised window can never disagree with the current viewport (INV-14). */
  displayBounds(viewport: Viewport): Bounds {
    return this.state === "maximised" ? viewport.toBounds() : this.bounds;
  }

  withBounds(bounds: Bounds): Window {
    return new Window({ ...this, bounds });
  }

  withZOrder(zOrder: number): Window {
    return new Window({ ...this, zOrder });
  }

  asMinimised(): Window {
    if (this.state === "minimised") return this;
    return new Window({ ...this, state: "minimised", stateBeforeMinimise: this.state });
  }

  asMaximised(): Window {
    return new Window({ ...this, state: "maximised", stateBeforeMinimise: "normal" });
  }

  /** One step back: minimised returns to its previous state, maximised returns to normal. */
  asRestored(): Window {
    const state = this.state === "minimised" ? this.stateBeforeMinimise : "normal";
    return new Window({ ...this, state, stateBeforeMinimise: "normal" });
  }

  toSnapshot(): WindowSnapshot {
    return {
      id: this.id,
      appId: this.appId,
      singleInstance: this.singleInstance,
      state: this.state,
      stateBeforeMinimise: this.stateBeforeMinimise,
      x: this.bounds.x,
      y: this.bounds.y,
      width: this.bounds.width,
      height: this.bounds.height,
      zOrder: this.zOrder,
    };
  }
}
