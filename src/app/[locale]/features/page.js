import Link from "next/link";
import { getDict } from "@/lib/i18n";
import { breadcrumbLd, urlFor, buildMetadata } from "@/lib/seo";
import { pick } from "@/lib/pricing";
import { PRICING_LOCKED } from "@/lib/site";
import { CORE_FEATURES, MODULE_FEATURES } from "@/lib/features";
import JsonLd from "@/components/JsonLd";
import Reveal from "@/components/Reveal";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildMetadata({ locale, path: "/features" });
}

const Arrow = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const Check = () => (
  <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const eyebrow = "font-display text-xs font-700 uppercase tracking-[0.3em]";

export default async function FeaturesPage({ params }) {
  const { locale } = await params;
  const dict = getDict(locale);
  const f = dict.features;
  const startHref = `/${locale}/signup`;

  const breadcrumb = breadcrumbLd([
    { name: dict.nav.home, url: urlFor(locale, "") },
    { name: f.title, url: urlFor(locale, "/features") },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />

      {/* Header */}
      <section className="relative overflow-hidden border-b border-steel-400/15 bg-steel-900 dark:border-white/10">
        <span className="absolute inset-0 bg-[radial-gradient(70%_120%_at_15%_0%,rgba(37,99,235,0.4),transparent),radial-gradient(60%_100%_at_100%_100%,rgba(59,130,246,0.25),transparent)]" />
        <div className="container-page relative z-10 pb-16 pt-36 sm:pt-44">
          <p className={`${eyebrow} text-brand-300`}>{f.eyebrow}</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-800 leading-[1.05] tracking-tight text-white sm:text-6xl">
            {f.title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/75">{f.lead}</p>
        </div>
      </section>

      {/* Core platform */}
      <section className="bg-white dark:bg-steel-900">
        <div className="container-page py-16 sm:py-24">
          <Reveal>
            <div className="rounded-geex border-2 border-brand-500/40 bg-brand-50 p-8 dark:bg-brand-500/5 sm:p-10">
              <span className="inline-flex rounded-full bg-brand-600 px-3 py-1 font-display text-[0.65rem] font-700 uppercase tracking-[0.14em] text-white">
                {f.coreLabel}
              </span>
              <h2 className="mt-4 font-display text-2xl font-800 tracking-tight text-brand-950 dark:text-white sm:text-3xl">
                {pick(CORE_FEATURES.name, locale)}
              </h2>
              <p className="mt-2 max-w-2xl text-lg text-steel-600 dark:text-slate-300">{pick(CORE_FEATURES.tagline, locale)}</p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {CORE_FEATURES.items.map((item) => (
                  <li key={pick(item, "en")} className="flex items-start gap-2.5 text-sm text-steel-700 dark:text-slate-200">
                    <Check /> {pick(item, locale)}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Modules */}
      <section className="border-t border-steel-400/15 bg-steel-50 dark:border-white/10 dark:bg-steel-900">
        <div className="container-page py-16 sm:py-24">
          <Reveal className="max-w-2xl">
            <h2 className="font-display text-3xl font-800 tracking-tight text-brand-950 dark:text-white sm:text-4xl">{f.modulesTitle}</h2>
            <p className="mt-4 text-lg text-steel-600 dark:text-slate-300">{f.modulesLead}</p>
          </Reveal>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {MODULE_FEATURES.map((mod, i) => (
              <Reveal key={mod.key} delay={(i % 2) * 80}>
                <div className="flex h-full flex-col rounded-geex border border-steel-200 bg-white p-8 dark:border-white/10 dark:bg-steel-800">
                  <h3 className="font-display text-xl font-800 text-brand-950 dark:text-white">{pick(mod.name, locale)}</h3>
                  <p className="mt-1.5 text-sm text-steel-600 dark:text-slate-300">{pick(mod.tagline, locale)}</p>
                  <ul className="mt-5 space-y-2.5">
                    {mod.items.map((item) => (
                      <li key={pick(item, "en")} className="flex items-start gap-2.5 text-sm text-steel-700 dark:text-slate-200">
                        <Check /> {pick(item, locale)}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-brand-900 dark:bg-steel-900">
        <div className="container-page flex flex-col gap-6 py-16 sm:flex-row sm:items-center sm:justify-between sm:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-800 tracking-tight text-white sm:text-4xl">{f.ctaTitle}</h2>
            <p className="mt-3 text-lg text-white/75">{f.ctaText}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <Link href={startHref} className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-display text-sm font-700 uppercase tracking-[0.12em] text-brand-950 transition-colors hover:bg-brand-300">
              {f.ctaPrimary} <Arrow />
            </Link>
            {!PRICING_LOCKED && (
              <Link href={`/${locale}/pricing`} className="inline-flex items-center gap-2 rounded-full border border-white/40 px-7 py-3.5 font-display text-sm font-700 uppercase tracking-[0.12em] text-white transition-colors hover:border-white">
                {f.ctaSecondary}
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
