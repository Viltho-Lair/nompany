import Link from "next/link";
import { notFound } from "next/navigation";
import { PRICING_LOCKED } from "@/lib/site";
import { getDict } from "@/lib/i18n";
import { breadcrumbLd, urlFor } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import PricingPlans from "@/components/public/PricingPlans";
import { listStudios } from "@/lib/data/studios";
import { mostPopularPlanKey } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  if (PRICING_LOCKED) return { title: "Not found", robots: { index: false, follow: false } };
  const { locale } = await params;
  const dict = getDict(locale);
  return { title: dict.pricing.title, description: dict.pricing.lead };
}

const Arrow = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const eyebrow = "font-display text-xs font-700 uppercase tracking-[0.3em]";

export default async function PricingPage({ params }) {
  if (PRICING_LOCKED) notFound();
  const { locale } = await params;
  const dict = getDict(locale);
  const p = dict.pricing;
  // "Most Popular" from actual subscribers (their recorded packageKey); falls
  // back to the hardcoded flag until subscribers have a recorded package.
  const popularKey = mostPopularPlanKey(await listStudios().catch(() => []));
  const startHref = `/${locale}/signup`;

  const breadcrumb = breadcrumbLd([
    { name: dict.nav.home, url: urlFor(locale, "") },
    { name: p.title, url: urlFor(locale, "/pricing") },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />

      {/* Header */}
      <section className="relative overflow-hidden border-b border-steel-400/15 bg-steel-900 dark:border-white/10">
        <span className="absolute inset-0 bg-[radial-gradient(70%_120%_at_15%_0%,rgba(37,99,235,0.4),transparent),radial-gradient(60%_100%_at_100%_100%,rgba(59,130,246,0.25),transparent)]" />
        <div className="container-page relative z-10 pb-16 pt-36 sm:pt-44">
          <p className={`${eyebrow} text-brand-300`}>{p.eyebrow}</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-800 leading-[1.05] tracking-tight text-white sm:text-6xl">
            {p.title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/75">{p.lead}</p>
        </div>
      </section>

      {/* Plans */}
      <section className="bg-white dark:bg-steel-900">
        <div className="container-page py-16 sm:py-20">
          <PricingPlans locale={locale} copy={p} popularKey={popularKey} />
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-brand-900 dark:bg-steel-900">
        <div className="container-page flex flex-col gap-6 py-16 sm:flex-row sm:items-center sm:justify-between sm:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-800 tracking-tight text-white sm:text-4xl">{p.bandTitle}</h2>
            <p className="mt-3 text-lg text-white/75">{p.bandText}</p>
          </div>
          <div className="shrink-0">
            <Link href={startHref} className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-display text-sm font-700 uppercase tracking-[0.12em] text-brand-950 transition-colors hover:bg-brand-300">
              {p.ctaStart} <Arrow />
            </Link>
            <p className="mt-2 text-xs text-white/60">{p.ctaNote}</p>
          </div>
        </div>
      </section>
    </>
  );
}
