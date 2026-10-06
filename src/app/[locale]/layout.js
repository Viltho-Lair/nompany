import { notFound } from "next/navigation";
import SiteTracker from "@/components/SiteTracker";
import { dirFor, isLocale, locales } from "@/shared/i18n";
import { AccountLocaleProvider } from "@/components/public/locale";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// Content is admin-editable, so render on demand rather than serving a
// build-time snapshot. (This layout read the public site settings for the old
// header and footer until 06/10/2026; it reads nothing now, and the pages under
// it still read theirs per request.)
export const dynamic = "force-dynamic";

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dir = dirFor(locale);

  return (
    <AccountLocaleProvider locale={locale}>
      {/* The URL is the locale on these pages, so the provider only
          republishes what the segment already says — it exists so a dialog
          five components deep does not have to be handed a prop. */}
      <div dir={dir} lang={locale} className="flex min-h-screen flex-col">
        {/* NO HEADER OR FOOTER HERE (06/10/2026). The old `Nav` and `Footer`
            stood down on every page under this segment — each is either bare
            (home, sign-in, the account) or draws the marketing site's own
            chrome — while `Nav` still asked /api/identity/me on every view.
            Both were deleted; a page brings what it needs. */}
        <main className="flex-1">{children}</main>
        <SiteTracker />
      </div>
    </AccountLocaleProvider>
  );
}
