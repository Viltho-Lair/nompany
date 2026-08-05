import Link from "next/link";
import { field } from "@/lib/i18n";
import { projectSlug, serviceSlug } from "@/lib/slug";
import Reveal from "@/components/Reveal";
import ClientsFeedback from "@/components/experience/ClientsFeedback";

// Editorial, image-forward homepage (adapted from the reference site into
// MegaTech blue): a full-bleed hero, stacked featured-project bands, a large
// services list, a stats strip, an about teaser, a client logo wall, an
// optional leadership quote and gallery peek, and the orbiting client-feedback
// section. The shared "Let's connect" band + footer close the page (rendered by
// the locale layout). No hovering/travelling logo.
const Arrow = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const eyebrow = "font-display text-xs font-700 uppercase tracking-[0.3em]";

export default function EditorialHome({ locale, dict, settings, services = [], projects = [], clients = [], galleryImages = [], reviews = [] }) {
  const s = settings;
  const heroImg = (galleryImages.find((g) => g.heroFeatured) || galleryImages[0])?.image || "";
  const hasMgmt = Boolean(field(s, "mgmt_quote", locale) && s.mgmt_name);
  const galleryPeek = galleryImages.slice(0, 6);
  const stats = [
    { value: s.stat_years, label: dict.home.statYears },
    { value: s.stat_projects, label: dict.home.statProjects },
    { value: s.stat_cities, label: dict.home.statCities },
    { value: s.stat_clients, label: dict.home.statClients },
  ].filter((x) => x.value);

  return (
    <div className="w-full overflow-x-hidden">
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative flex min-h-[92vh] items-end overflow-hidden bg-brand-950">
        {heroImg ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroImg} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/70 to-brand-950/30" />
          </>
        ) : (
          <span className="absolute inset-0 bg-[radial-gradient(80%_120%_at_20%_0%,rgba(1,89,174,0.55),transparent),radial-gradient(70%_100%_at_100%_100%,rgba(61,132,214,0.3),transparent)]" />
        )}
        <div className="container-page relative z-10 pb-20 pt-40 sm:pb-28">
          <Reveal>
            <p className={`${eyebrow} text-brand-300`}>{field(s, "hero_kicker", locale) || dict.home.heroKicker}</p>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-6 max-w-5xl font-display text-4xl font-800 uppercase leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
              {field(s, "tagline", locale)}
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">{field(s, "intro", locale)}</p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href={`/${locale}/projects`} className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-display text-sm font-700 uppercase tracking-[0.12em] text-brand-950 transition-colors hover:bg-brand-300">
                {dict.common.viewOurProjects} <Arrow />
              </Link>
              <Link href={`/${locale}/services`} className="inline-flex items-center gap-2 rounded-full border border-white/40 px-7 py-3.5 font-display text-sm font-700 uppercase tracking-[0.12em] text-white transition-colors hover:border-white">
                {dict.nav.services}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Featured projects (stacked full-bleed bands) ─────── */}
      {projects.map((p) => (
        <section key={p.id} className="relative flex min-h-[80vh] items-end overflow-hidden bg-brand-950">
          {p.image ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <span className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/55 to-brand-950/10" />
            </>
          ) : (
            <span className="absolute inset-0 bg-gradient-to-br from-brand-950 via-brand-700 to-brand-500" />
          )}
          <div className="container-page relative z-10 py-16 sm:py-20">
            <Reveal>
              <p className={`${eyebrow} text-brand-300`}>{dict.home.projectsTitle}</p>
              <h2 className="mt-4 max-w-4xl font-display text-3xl font-800 uppercase leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
                {field(p, "title", locale)}
              </h2>
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-600 uppercase tracking-[0.14em] text-white/70">
                {p.category && <span>{p.category}</span>}
                {field(p, "location", locale) && <span aria-hidden>/</span>}
                {field(p, "location", locale) && <span>{field(p, "location", locale)}</span>}
                {p.year && <span aria-hidden>/</span>}
                {p.year && <span>{p.year}</span>}
              </div>
              <Link href={`/${locale}/projects/${projectSlug(p)}`} className="mt-7 inline-flex items-center gap-2 font-display text-sm font-700 uppercase tracking-[0.14em] text-white transition-colors hover:text-brand-300">
                {dict.common.viewProject} <Arrow />
              </Link>
            </Reveal>
          </div>
        </section>
      ))}

      {/* ── Services (editorial list) ────────────────────────── */}
      <section className="border-t border-steel-400/15 bg-white dark:border-white/10 dark:bg-[#0b1633]">
        <div className="container-page py-20 sm:py-28">
          <Reveal className="max-w-3xl">
            <p className={`${eyebrow} text-brand-500 dark:text-brand-300`}>{dict.nav.services}</p>
            <h2 className="mt-4 font-display text-3xl font-800 uppercase leading-[1.05] tracking-tight text-brand-950 dark:text-white sm:text-5xl">
              {dict.home.capabilitiesTitle}
            </h2>
            <p className="mt-5 text-lg text-steel-700 dark:text-slate-300">{dict.home.capabilitiesLead}</p>
          </Reveal>
          <div className="mt-12 border-t border-steel-400/20 dark:border-white/10">
            {services.map((svc, i) => (
              <Reveal key={svc.id}>
                <Link
                  href={`/${locale}/services/${serviceSlug(svc)}`}
                  className="group flex items-center gap-5 border-b border-steel-400/20 py-6 transition-colors hover:bg-brand-500/[0.04] dark:border-white/10"
                >
                  <span className="font-mono text-sm font-500 text-steel-400">{String(i + 1).padStart(2, "0")}</span>
                  <span className="flex-1 font-display text-2xl font-700 uppercase tracking-tight text-brand-950 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-300 sm:text-3xl">
                    {field(svc, "title", locale)}
                  </span>
                  <span className="text-steel-400 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1"><Arrow /></span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats strip ─────────────────────────────────────── */}
      {stats.length > 0 && (
        <section className="bg-brand-900 dark:bg-[#08122b]">
          <div className="container-page grid grid-cols-2 gap-8 py-14 lg:grid-cols-4">
            {stats.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 80} className="text-center">
                <div className="font-display text-4xl font-800 text-white sm:text-6xl">{stat.value}</div>
                <div className={`mt-2 ${eyebrow} text-brand-300`}>{stat.label}</div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ── About teaser ────────────────────────────────────── */}
      <section className="bg-white dark:bg-[#0b1633]">
        <div className="container-page grid gap-10 py-20 sm:py-28 lg:grid-cols-[1fr_1fr] lg:items-center">
          <Reveal>
            <p className={`${eyebrow} text-brand-500 dark:text-brand-300`}>{dict.nav.about}</p>
            <h2 className="mt-4 font-display text-3xl font-800 uppercase leading-[1.05] tracking-tight text-brand-950 dark:text-white sm:text-5xl">
              {field(s, "site_name", locale) || dict.common.brand}
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-steel-700 dark:text-slate-300">{field(s, "intro", locale)}</p>
            <Link href={`/${locale}/about`} className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-700 px-7 py-3.5 font-display text-sm font-700 uppercase tracking-[0.12em] text-white transition-colors hover:bg-brand-950">
              {dict.nav.about} <Arrow />
            </Link>
          </Reveal>
          <Reveal delay={120}>
            <p className="font-display text-xs uppercase tracking-[0.18em] text-brand-500 dark:text-brand-300">
              {dict.common.established} {s.founded_year} · {field(s, "city", locale)}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Clients logo wall ───────────────────────────────── */}
      {clients.length > 0 && (
        <section className="border-t border-steel-400/15 bg-slate-50 dark:border-white/10 dark:bg-[#08122b]">
          <div className="container-page py-20 sm:py-24">
            <Reveal className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className={`${eyebrow} text-brand-500 dark:text-brand-300`}>{dict.home.clientsTitle}</p>
              </div>
              <Link href={`/${locale}/clients`} className="inline-flex items-center gap-2 font-display text-sm font-600 uppercase tracking-[0.12em] text-brand-700 transition-colors hover:text-brand-950 dark:text-brand-300 dark:hover:text-white">
                {dict.common.viewAll} <Arrow />
              </Link>
            </Reveal>
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {clients.slice(0, 10).map((c, i) => (
                <Reveal key={c.id} delay={i * 40}>
                  <div className="flex h-24 items-center justify-center overflow-hidden rounded-2xl border border-steel-400/20 bg-white px-4 dark:border-white/10 dark:bg-white/5">
                    {c.image || c.logo ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={c.image || c.logo} alt={c.name} className="max-h-12 w-auto object-contain" />
                    ) : (
                      <span className="text-center font-display text-sm font-600 text-brand-950 dark:text-white">{c.name}</span>
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Leadership quote ────────────────────────────────── */}
      {hasMgmt && (
        <section className="bg-white dark:bg-[#0b1633]">
          <div className="container-page py-20 sm:py-28">
            <Reveal className="mx-auto max-w-4xl text-center">
              <p className={`${eyebrow} text-brand-500 dark:text-brand-300`}>{dict.home.managementEyebrow}</p>
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
            </Reveal>
          </div>
        </section>
      )}

      {/* ── Gallery peek ────────────────────────────────────── */}
      {galleryPeek.length > 0 && (
        <section className="border-t border-steel-400/15 bg-slate-50 dark:border-white/10 dark:bg-[#08122b]">
          <div className="container-page py-20 sm:py-24">
            <Reveal className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <p className={`${eyebrow} text-brand-500 dark:text-brand-300`}>{dict.home.galleryEyebrow}</p>
                <h2 className="mt-4 font-display text-3xl font-800 uppercase leading-[1.05] tracking-tight text-brand-950 dark:text-white sm:text-5xl">
                  {dict.home.galleryTitle}
                </h2>
              </div>
              <Link href={`/${locale}/gallery`} className="inline-flex items-center gap-2 font-display text-sm font-600 uppercase tracking-[0.12em] text-brand-700 transition-colors hover:text-brand-950 dark:text-brand-300 dark:hover:text-white">
                {dict.home.galleryCta} <Arrow />
              </Link>
            </Reveal>
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {galleryPeek.map((img, i) => (
                <Reveal key={img.id} delay={i * 50}>
                  <div className={`relative overflow-hidden rounded-2xl ${i === 0 ? "sm:col-span-2 sm:row-span-2" : ""}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.image} alt={field(img, "title", locale) || ""} className="h-full min-h-[10rem] w-full object-cover" />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Client feedback (orbiting reviews + centred emblem) ─ */}
      <ClientsFeedback locale={locale} dict={dict} reviews={reviews} />
    </div>
  );
}
