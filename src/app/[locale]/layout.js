import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SiteTracker from "@/components/SiteTracker";
import { getSiteSettings } from "@/lib/data/site";
import { getDict, dirFor, isLocale, locales } from "@/shared/i18n";
import { AccountLocaleProvider } from "@/components/public/locale";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// Content is admin-editable and stored in Redis, so render on demand to
// reflect changes immediately rather than serving a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDict(locale);
  const settings = await getSiteSettings();
  const dir = dirFor(locale);

  return (
    <AccountLocaleProvider locale={locale}>
      {/* The URL is the locale on these pages, so the provider only
          republishes what the segment already says — it exists so a dialog
          five components deep does not have to be handed a prop. */}
      <div dir={dir} lang={locale} className="flex min-h-screen flex-col">
        <Nav locale={locale} dict={dict} settings={settings} />
        <main className="flex-1">{children}</main>
        <Footer locale={locale} dict={dict} settings={settings} />
        <SiteTracker />
      </div>
    </AccountLocaleProvider>
  );
}
