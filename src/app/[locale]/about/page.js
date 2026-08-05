import Link from "next/link";
import { getSettings } from "@/lib/db";
import { getDict, field } from "@/lib/i18n";
import { breadcrumbLd, urlFor } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const dict = getDict(locale);
  return { title: dict.about.title, description: dict.about.lead };
}

const Arrow = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default async function AboutPage({ params }) {
  const { locale } = await params;
  const dict = getDict(locale);
  const s = await getSettings();

  const headline = field(s, "about_headline", locale) || field(s, "tagline", locale);
  const story = field(s, "about", locale) || field(s, "intro", locale);
  const mission = field(s, "mission", locale) || dict.about.missionText;
  const vision = field(s, "vision", locale) || dict.about.visionText;
  const heroImg = s.about_image || "";
  const hasMgmt = Boolean(field(s, "mgmt_quote", locale) && s.mgmt_name);

  const stats = [
    { value: s.stat_years, label: dict.home.statYears },
    { value: s.stat_projects, label: dict.home.statProjects },
    { value: s.stat_cities, label: dict.home.statCities },
    { value: s.stat_clients, label: dict.home.statClients },
  ].filter((x) => x.value);

  const breadcrumb = breadcrumbLd([
    { name: dict.nav.home, url: urlFor(locale, "") },
    { name: dict.about.title, url: urlFor(locale, "/about") },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />

      {/* Hero */}
      <section className="relative flex min-h-[70vh] items-end overflow-hidden bg-brand-950">
        {heroImg ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroImg} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/70 to-brand-950/30" />
          </>
        ) : (
          <span className="absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(1,89,174,0.55),transparent),radial-gradient(70%_100%_at_100%_100%,rgba(61,132,214,0.3),transparent)]" />
        )}
        <div className="container-page relative z-10 pb-16 pt-40">
          <p className="font-display text-xs font-700 uppercase tracking-[0.3em] text-brand-300">{dict.about.title}</p>
          <h1 className="mt-5 max-w-4xl font-display text-4xl font-800 uppercase leading-[1.03] tracking-tight text-white sm:text-6xl lg:text-7xl">
            {headline}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">{dict.about.lead}</p>
        </div>
      </section>

      {/* Story */}
      {story && (
        <section className="bg-white dark:bg-[#0b1633]">
          <div className="container-page grid gap-10 py-16 sm:py-24 lg:grid-cols-[1fr_1.4fr]">
            <h2 className="font-display text-3xl font-800 uppercase leading-[1.05] tracking-tight text-brand-950 dark:text-white sm:text-4xl">
              {dict.about.storyTitle}
            </h2>
            <p className="whitespace-pre-line text-lg leading-relaxed text-steel-700 dark:text-slate-300">{story}</p>
          </div>
        </section>
      )}

      {/* Mission + Vision */}
      <section className="border-t border-steel-400/15 bg-slate-50 dark:border-white/10 dark:bg-[#08122b]">
        <div className="container-page grid gap-6 py-16 sm:py-20 lg:grid-cols-2">
          {[
            { title: dict.about.missionTitle, text: mission },
            { title: dict.about.visionTitle, text: vision },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl border border-steel-400/15 bg-white p-8 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-display text-xs font-700 uppercase tracking-[0.24em] text-brand-500 dark:text-brand-300">{c.title}</p>
              <p className="mt-4 text-lg leading-relaxed text-steel-700 dark:text-slate-200">{c.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      {stats.length > 0 && (
        <section className="bg-brand-900 dark:bg-[#08122b]">
          <div className="container-page grid grid-cols-2 gap-8 py-14 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-display text-4xl font-800 text-white sm:text-6xl">{stat.value}</div>
                <div className="mt-2 font-display text-xs font-700 uppercase tracking-[0.3em] text-brand-300">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Leadership quote */}
      {hasMgmt && (
        <section className="bg-white dark:bg-[#0b1633]">
          <div className="container-page py-16 sm:py-24">
            <div className="mx-auto max-w-4xl text-center">
              <p className="font-display text-xs font-700 uppercase tracking-[0.3em] text-brand-500 dark:text-brand-300">{dict.home.managementEyebrow}</p>
              <p className="mt-6 font-display text-2xl font-600 italic leading-relaxed text-brand-950 dark:text-white sm:text-4xl">
                &ldquo;{field(s, "mgmt_quote", locale)}&rdquo;
              </p>
              <div className="mt-8 flex items-center justify-center gap-4">
                {s.mgmt_photo && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={s.mgmt_photo} alt={s.mgmt_name} className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-brand-500/30 sm:h-20 sm:w-20" />
                )}
                <div className="text-start">
                  <p style={{ fontFamily: "var(--font-signature)" }} className="text-2xl font-400 leading-tight text-brand-950 dark:text-white sm:text-3xl">{s.mgmt_name}</p>
                  <p className="mt-0.5 text-sm text-steel-500 dark:text-slate-400">{field(s, "mgmt_position", locale)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Team CTA */}
      <section className="border-t border-steel-400/15 bg-slate-50 dark:border-white/10 dark:bg-[#08122b]">
        <div className="container-page flex flex-col gap-6 py-16 sm:flex-row sm:items-end sm:justify-between sm:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-800 uppercase leading-[1.05] tracking-tight text-brand-950 dark:text-white sm:text-5xl">
              {dict.about.teamTitle}
            </h2>
            <p className="mt-4 text-lg text-steel-700 dark:text-slate-300">{dict.about.teamLead}</p>
          </div>
          <Link href={`/${locale}/team`} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand-700 px-7 py-3.5 font-display text-sm font-700 uppercase tracking-[0.12em] text-white transition-colors hover:bg-brand-950">
            {dict.about.teamCta} <Arrow />
          </Link>
        </div>
      </section>
    </>
  );
}
