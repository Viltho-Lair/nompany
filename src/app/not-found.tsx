import { headers } from "next/headers";
import { getDict, isLocale, defaultLocale, dirFor } from "@/shared/i18n";
import { NotFoundView } from "@/components/landing/site/NotFoundView";

// Root 404 for URLs that match no route (e.g. old removed pages). Renders inside
// the root layout (no Nav/Footer), so it's a self-contained full-screen page in
// the nompany design. Locale comes from the `x-locale` header the proxy injects.
export default async function NotFound() {
  const headerLocale = (await headers()).get("x-locale");
  const locale = isLocale(headerLocale) ? headerLocale : defaultLocale;
  // The site's 404 (27/09/2026), shared with the locale one.
  return <NotFoundView locale={locale} nf={getDict(locale).notFound} dir={dirFor(locale)} />;
}
