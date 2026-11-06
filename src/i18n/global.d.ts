import type { Locale } from "@/os/routing/desktopAddress";
import type { Messages } from "./messages";

// Teaches next-intl our keys, so a mistyped key in `t("...")` fails `tsc` and `next build`.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
