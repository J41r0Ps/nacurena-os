import type { Metadata } from "next";
import { createTranslator } from "next-intl";
import { messages } from "@/i18n/messages";
import { LOCALES, ROOT_LOCALE, pathOf } from "@/os/routing/desktopAddress";
import { NotFoundWindow } from "./_shell/NotFoundWindow";
import { RootDocument } from "./_shell/RootDocument";

const t = createTranslator({ locale: ROOT_LOCALE, messages: messages[ROOT_LOCALE] });

const languageNames = { en: "English", nl: "Nederlands", es: "Español" } as const;

// No robots tag: Next adds noindex to this page by itself.
export const metadata: Metadata = { title: t("notFound.pageTitle") };

// out/404.html. It must always exist: without a top-level 404.html, Cloudflare Pages treats the
// site as a single-page app and answers every unknown path with "/" and a 200.
export default function GlobalNotFound() {
  return (
    <RootDocument locale={ROOT_LOCALE}>
      <NotFoundWindow
        windowTitle={t("notFound.windowTitle")}
        title={t("notFound.title")}
        body={t("notFound.body")}
        primary={{ label: t("notFound.desktop"), href: "/" }}
        linksLabel={t("notFound.linksLabel")}
        links={LOCALES.map((locale) => ({
          label: languageNames[locale],
          href: pathOf({ locale, appId: null }),
        }))}
      />
    </RootDocument>
  );
}
