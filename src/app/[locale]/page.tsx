import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ROOT_LOCALE, isLocale } from "@/os/routing/desktopAddress";
import { DesktopPage } from "../_shell/DesktopPage";
import { SITE_URL, homeMetadata } from "../_shell/metadata";

export const generateMetadata = async ({ params }: PageProps<"/[locale]">): Promise<Metadata> => {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const metadata = await homeMetadata(locale);

  // "/" and "/en/" are the same page, so this says which one search engines should keep.
  return locale === ROOT_LOCALE
    ? { ...metadata, alternates: { canonical: `${SITE_URL}/` } }
    : metadata;
};

export default async function LocaleHome({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  return <DesktopPage locale={locale} />;
}
