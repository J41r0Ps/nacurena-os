import { setRequestLocale } from "next-intl/server";
import { ROOT_LOCALE } from "@/os/routing/desktopAddress";
import { RootDocument } from "../_shell/RootDocument";

// A second root layout, because `<html lang>` needs a locale and "/" has no `[locale]` param.
// The two never meet: the desktop moves with the History API, not with Next's router.
export default function RootLayout({ children }: LayoutProps<"/">) {
  setRequestLocale(ROOT_LOCALE);

  return <RootDocument locale={ROOT_LOCALE}>{children}</RootDocument>;
}
