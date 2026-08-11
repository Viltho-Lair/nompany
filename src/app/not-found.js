import { headers } from "next/headers";
import Link from "next/link";
import { getDict, isLocale, defaultLocale, dirFor } from "@/lib/i18n";
import BackButton from "@/components/public/BackButton";

// Root 404 for URLs that match no route (e.g. old removed pages). Renders inside
// the root layout (no Nav/Footer), so it's a self-contained full-screen page in
// the nompany design. Locale comes from the `x-locale` header the proxy injects.
export default async function NotFound() {
  const headerLocale = (await headers()).get("x-locale");
  const locale = isLocale(headerLocale) ? headerLocale : defaultLocale;
  const dict = getDict(locale);
  const nf = dict.notFound;
  const dir = dirFor(locale);
  const homeHref = `/${locale}`;

  return (
    <main dir={dir} lang={locale} className="relative flex min-h-screen items-center overflow-hidden bg-steel-900">
      <span className="absolute inset-0 bg-[radial-gradient(70%_120%_at_15%_0%,rgba(37,99,235,0.4),transparent),radial-gradient(60%_100%_at_100%_100%,rgba(59,130,246,0.25),transparent)]" />
      <div className="relative z-10 mx-auto w-full max-w-2xl px-6 py-24 text-center">
        <Link href={homeHref} className="font-display text-lg font-800 tracking-tight text-white">nompany</Link>
        <p className="mt-10 font-display text-[6rem] font-800 leading-none tracking-tight text-brand-500 sm:text-[9rem]">
          {nf.code}
        </p>
        <h1 className="mt-2 font-display text-3xl font-800 tracking-tight text-white sm:text-5xl">
          {nf.title}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/70">{nf.message}</p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={homeHref}
            className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-7 py-3.5 font-display text-sm font-700 uppercase tracking-[0.12em] text-white transition-colors hover:bg-brand-500"
          >
            {nf.backHome}
          </Link>
          <BackButton
            label={nf.goBack}
            fallbackHref={homeHref}
            className="inline-flex items-center gap-2 rounded-full border border-white/40 px-7 py-3.5 font-display text-sm font-700 uppercase tracking-[0.12em] text-white transition-colors hover:border-white"
          />
        </div>
      </div>
    </main>
  );
}
