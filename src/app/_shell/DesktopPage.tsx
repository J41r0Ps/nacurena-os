import { getTranslations } from "next-intl/server";
import { buildShellStrings } from "@/i18n/shellStrings";
import type { AppId } from "@/os/domain";
import type { Locale } from "@/os/routing/desktopAddress";
import { Desktop } from "@/ui/desktop/Desktop";
import { DesktopIdentity } from "./DesktopIdentity";

interface DesktopPageProps {
  readonly locale: Locale;
  /** The app this URL opens. It is in the static HTML, already open and focused. */
  readonly appId?: AppId;
}

/**
 * One page for every route. It stays a Server Component: only <Desktop> runs in the browser, and
 * <DesktopIdentity> is passed in as `children`, so it is plain HTML that works without JavaScript.
 */
export const DesktopPage = async ({ locale, appId }: DesktopPageProps) => {
  const t = await getTranslations({ locale });

  return (
    <main>
      <Desktop locale={locale} initialAppId={appId} strings={buildShellStrings(t)}>
        <DesktopIdentity
          contactLabel={t("desktop.contactLabel")}
          emailLabel={t("desktop.email")}
        />
      </Desktop>
    </main>
  );
};
