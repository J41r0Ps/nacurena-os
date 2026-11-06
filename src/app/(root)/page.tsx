import { setRequestLocale } from "next-intl/server";
import { ROOT_LOCALE } from "@/os/routing/desktopAddress";
import { DesktopPage } from "../_shell/DesktopPage";
import { homeMetadata } from "../_shell/metadata";

export const generateMetadata = () => homeMetadata(ROOT_LOCALE);

// The address printed on the CV: a real English page, with no redirect to depend on (ADR-011).
export default function RootPage() {
  setRequestLocale(ROOT_LOCALE);

  return <DesktopPage locale={ROOT_LOCALE} />;
}
