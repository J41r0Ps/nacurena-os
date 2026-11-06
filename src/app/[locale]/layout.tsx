import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { LOCALES, isLocale } from "@/os/routing/desktopAddress";
import { RootDocument } from "../_shell/RootDocument";

/** Anything not listed here has no file in `out/`, so the host answers with a 404. */
export const dynamicParams = false;

export const generateStaticParams = () => LOCALES.map((locale) => ({ locale }));

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  // Without this, next-intl would read the request headers, which a static build does not have.
  setRequestLocale(locale);

  return <RootDocument locale={locale}>{children}</RootDocument>;
}
