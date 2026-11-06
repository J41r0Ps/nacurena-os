import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { apps } from "@/apps/registry";
import { isLocale } from "@/os/routing/desktopAddress";
import { DesktopPage } from "../../_shell/DesktopPage";
import { appMetadata } from "../../_shell/metadata";

export const dynamicParams = false;

// Runs once per locale from the parent layout, which gives every locale x app pair.
export const generateStaticParams = () => apps.map((app) => ({ app: app.id }));

const resolve = async ({ params }: PageProps<"/[locale]/[app]">) => {
  const { locale, app: appId } = await params;
  const app = apps.find((candidate) => candidate.id === appId);
  if (!isLocale(locale) || app === undefined) notFound();

  return { locale, app };
};

export const generateMetadata = async (props: PageProps<"/[locale]/[app]">): Promise<Metadata> => {
  const { locale, app } = await resolve(props);

  return appMetadata(locale, app.messageKey);
};

export default async function AppPage(props: PageProps<"/[locale]/[app]">) {
  const { locale, app } = await resolve(props);
  setRequestLocale(locale);

  return <DesktopPage locale={locale} appId={app.id} />;
}
