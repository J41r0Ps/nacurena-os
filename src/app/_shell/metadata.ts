import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { AppMessageKey } from "@/apps/registry";
import type { Locale } from "@/os/routing/desktopAddress";

export const SITE_URL = "https://jaironacurena.com";

export const homeMetadata = async (locale: Locale): Promise<Metadata> => {
  const t = await getTranslations({ locale, namespace: "metadata" });

  return { title: t("homeTitle"), description: t("homeDescription") };
};

export const appMetadata = async (locale: Locale, key: AppMessageKey): Promise<Metadata> => {
  const t = await getTranslations({ locale });

  return {
    title: t("metadata.appTitle", { app: t(`apps.${key}.title`) }),
    description: t(`apps.${key}.description`),
  };
};
