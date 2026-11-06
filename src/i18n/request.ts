import { getRequestConfig } from "next-intl/server";
import { ROOT_LOCALE, isLocale } from "@/os/routing/desktopAddress";
import { messages } from "./messages";

// next-intl calls this once per page while building. There is no middleware, so the locale only
// ever comes from `setRequestLocale` in the layouts and pages.
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested !== undefined && isLocale(requested) ? requested : ROOT_LOCALE;

  return { locale, messages: messages[locale] };
});
