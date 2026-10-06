import { headers } from "next/headers";
import { NotFoundView } from "@/components/landing/site/NotFoundView";
import { getDict, isLocale, defaultLocale, dirFor } from "@/shared/i18n";

// The 404 for a wrong address under /en or /ar, in the site's design. It
// renders inside the [locale] layout; not-found components receive no params,
// so the locale is read from the `x-locale` header the proxy injects.
export default async function NotFound() {
  const headerLocale = (await headers()).get("x-locale");
  const locale = isLocale(headerLocale) ? headerLocale : defaultLocale;
  return <NotFoundView locale={locale} nf={getDict(locale).notFound} dir={dirFor(locale)} />;
}
