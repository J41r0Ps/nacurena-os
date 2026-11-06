import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { apps } from "@/apps/registry";
import { isLocale, pathOf } from "@/os/routing/desktopAddress";
import { NotFoundWindow } from "../../_shell/NotFoundWindow";

export const generateMetadata = async ({ params }: PageProps<"/[locale]/404">): Promise<Metadata> => {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getTranslations({ locale, namespace: "notFound" });

  return { title: t("pageTitle"), robots: { index: false } };
};

// Built as /<locale>/404/, then moved to /<locale>/404.html by scripts/localize-404.mjs, because
// Cloudflare Pages serves the 404.html nearest to the missing path.
export default async function LocaleNotFound({ params }: PageProps<"/[locale]/404">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  return (
    <NotFoundWindow
      windowTitle={t("notFound.windowTitle")}
      title={t("notFound.title")}
      body={t("notFound.body")}
      primary={{ label: t("notFound.desktop"), href: pathOf({ locale, appId: null }) }}
      linksLabel={t("notFound.linksLabel")}
      links={apps.map((app) => ({
        label: t(`apps.${app.messageKey}.title`),
        href: pathOf({ locale, appId: app.id }),
      }))}
    />
  );
}
