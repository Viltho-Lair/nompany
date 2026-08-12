import { headers } from "next/headers";
import Link from "next/link";
import { getDict, isLocale, defaultLocale } from "@/lib/i18n";
import { marketingUrl } from "@/lib/site";
import BackButton from "@/components/public/BackButton";

// Custom 404 in the nompany design. Renders inside the [locale] layout, so the
// Nav + Footer frame it. not-found components don't receive params, so the
// active locale is read from the `x-locale` header the proxy injects.
export default async function NotFound() {
  const headerLocale = (await headers()).get("x-locale");
  const locale = isLocale(headerLocale) ? headerLocale : defaultLocale;
  const dict = getDict(locale);
  const nf = dict.notFound;
  // "Home" is the marketing site now — /{locale} only redirects there anyway.
  const homeHref = marketingUrl();

  return (
    <section className="relative flex min-h-[80vh] items-center overflow-hidden bg-steel-900">
      <span className="absolute inset-0 bg-[radial-gradient(70%_120%_at_15%_0%,rgba(37,99,235,0.4),transparent),radial-gradient(60%_100%_at_100%_100%,rgba(59,130,246,0.25),transparent)]" />
      <div className="container-page relative z-10 py-24 text-center">
        <p className="font-display text-[6rem] font-800 leading-none tracking-tight text-brand-500 sm:text-[9rem]">
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
    </section>
  );
}
