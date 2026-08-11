import Link from "next/link";
import { getDict } from "@/lib/i18n";
import { breadcrumbLd, urlFor, buildMetadata } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import Reveal from "@/components/Reveal";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildMetadata({ locale, path: "/about" });
}

const Arrow = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const eyebrow = "font-display text-xs font-700 uppercase tracking-[0.3em]";

export default async function AboutPage({ params }) {
  const { locale } = await params;
  const dict = getDict(locale);
  const a = dict.about;

  const breadcrumb = breadcrumbLd([
    { name: dict.nav.home, url: urlFor(locale, "") },
    { name: a.title, url: urlFor(locale, "/about") },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-steel-400/15 bg-steel-900 dark:border-white/10">
        <span className="absolute inset-0 bg-[radial-gradient(70%_120%_at_15%_0%,rgba(37,99,235,0.4),transparent),radial-gradient(60%_100%_at_100%_100%,rgba(59,130,246,0.25),transparent)]" />
        <div className="container-page relative z-10 pb-16 pt-36 sm:pt-44">
          <p className={`${eyebrow} text-brand-300`}>{a.title}</p>
          <h1 className="mt-4 max-w-4xl font-display text-4xl font-800 leading-[1.05] tracking-tight text-white sm:text-6xl">
            {a.headline}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">{a.lead}</p>
        </div>
      </section>

      {/* Story */}
      <section className="bg-white dark:bg-steel-900">
        <div className="container-page grid gap-10 py-16 sm:py-24 lg:grid-cols-[1fr_1.4fr]">
          <h2 className="font-display text-3xl font-800 leading-[1.1] tracking-tight text-brand-950 dark:text-white sm:text-4xl">
            {a.storyTitle}
          </h2>
          <p className="whitespace-pre-line text-lg leading-relaxed text-steel-600 dark:text-slate-300">{a.story}</p>
        </div>
      </section>

      {/* Mission + Vision */}
      <section className="border-t border-steel-400/15 bg-steel-50 dark:border-white/10 dark:bg-steel-900">
        <div className="container-page grid gap-6 py-16 sm:py-20 lg:grid-cols-2">
          {[
            { title: a.missionTitle, text: a.missionText },
            { title: a.visionTitle, text: a.visionText },
          ].map((c) => (
            <div key={c.title} className="rounded-geex border border-steel-200 bg-white p-8 dark:border-white/10 dark:bg-steel-800">
              <p className={`${eyebrow} text-brand-600 dark:text-brand-300`}>{c.title}</p>
              <p className="mt-4 text-lg leading-relaxed text-steel-700 dark:text-slate-200">{c.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="bg-white dark:bg-steel-900">
        <div className="container-page py-16 sm:py-24">
          <Reveal className="max-w-2xl">
            <h2 className="font-display text-3xl font-800 tracking-tight text-brand-950 dark:text-white sm:text-4xl">{a.valuesTitle}</h2>
          </Reveal>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {a.values.map((v, i) => (
              <Reveal key={v.title} delay={i * 70}>
                <div className="font-mono text-sm font-500 text-brand-500">{String(i + 1).padStart(2, "0")}</div>
                <h3 className="mt-3 font-display text-lg font-700 text-brand-950 dark:text-white">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-steel-600 dark:text-slate-300">{v.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Team CTA */}
      <section className="border-t border-steel-400/15 bg-steel-50 dark:border-white/10 dark:bg-steel-900">
        <div className="container-page flex flex-col gap-6 py-16 sm:flex-row sm:items-end sm:justify-between sm:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-800 leading-[1.1] tracking-tight text-brand-950 dark:text-white sm:text-5xl">
              {a.teamTitle}
            </h2>
            <p className="mt-4 text-lg text-steel-600 dark:text-slate-300">{a.teamLead}</p>
          </div>
          <Link href={`/${locale}/team`} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand-600 px-7 py-3.5 font-display text-sm font-700 uppercase tracking-[0.12em] text-white transition-colors hover:bg-brand-700">
            {a.teamCta} <Arrow />
          </Link>
        </div>
      </section>
    </>
  );
}
