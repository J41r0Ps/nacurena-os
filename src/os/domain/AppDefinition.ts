import type { AppId } from "./ids";
import type { Size } from "./Size";

/**
 * What the window manager needs to know about an app. The list of real apps lives outside the
 * domain: it is content, and the manager only ever needs the app being opened.
 */
export interface AppDefinition {
  readonly id: AppId;
  readonly singleInstance: boolean;
  readonly defaultSize: Size;
}
