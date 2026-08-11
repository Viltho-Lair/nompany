import Link from "next/link";
import Reveal from "@/components/Reveal";
import ClientsFeedback from "@/components/experience/ClientsFeedback";

// Editorial, product-forward homepage for nompany (a modular ERP SaaS):
// a gradient hero with the value proposition + primary CTAs, a "how it works"
// band, a features grid of the ERP modules, a value-tile strip, an about
// teaser, an optional "trusted by" logo wall + founder note, and the orbiting
// customer-feedback section. The shared "Let's connect" band + footer close the
// page (rendered by the locale layout).
const Arrow = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const eyebrow = "font-display text-xs font-700 uppercase tracking-[0.3em]";

export default function EditorialHome({ locale, dict, clients = [], reviews = [] }) {
  const h = dict.home;
  const startHref = `/${locale}/signup`;

  return (
    <div className="w-full overflow-x-hidden">
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative flex min-h-[88vh] items-center overflow-hidden bg-steel-900">
        <span className="absolute inset-0 bg-[radial-gradient(80%_120%_at_15%_0%,rgba(37,99,235,0.45),transparent),radial-gradient(70%_100%_at_100%_100%,rgba(59,130,246,0.28),transparent)]" />
        <div className="container-page relative z-10 py-32 sm:py-40">
          <Reveal>
            <p className={`${eyebrow} text-brand-300`}>{h.heroKicker}</p>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-6 max-w-4xl font-display text-4xl font-800 leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
              {h.heroHeadline}
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">{h.heroIntro}</p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href={startHref} className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-7 py-3.5 font-display text-sm font-700 uppercase tracking-[0.12em] text-white transition-colors hover:bg-brand-500">
                {h.ctaStart} <Arrow />
              </Link>
              <a href="#features" className="inline-flex items-center gap-2 rounded-full border border-white/40 px-7 py-3.5 font-display text-sm font-700 uppercase tracking-[0.12em] text-white transition-colors hover:border-white">
                {h.ctaPricing}
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────── */}
      <section className="border-t border-steel-400/15 bg-white dark:border-white/10 dark:bg-steel-900">
        <div className="container-page py-20 sm:py-28">
          <Reveal className="max-w-3xl">
            <p className={`${eyebrow} text-brand-600 dark:text-brand-300`}>{h.howEyebrow}</p>
            <h2 className="mt-4 font-display text-3xl font-800 leading-[1.1] tracking-tight text-brand-950 dark:text-white sm:text-5xl">
              {h.howTitle}
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {h.how.map((step, i) => (
              <Reveal key={step.title} delay={i * 80}>
                <div className="font-mono text-sm font-500 text-brand-500">{String(i + 1).padStart(2, "0")}</div>
                <h3 className="mt-3 font-display text-xl font-700 text-brand-950 dark:text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-steel-600 dark:text-slate-300">{step.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features (modules grid) ─────────────────────────── */}
      <section id="features" className="scroll-mt-20 border-t border-steel-400/15 bg-steel-50 dark:border-white/10 dark:bg-steel-900">
        <div className="container-page py-20 sm:py-28">
          <Reveal className="max-w-3xl">
            <p className={`${eyebrow} text-brand-600 dark:text-brand-300`}>{h.featuresEyebrow}</p>
            <h2 className="mt-4 font-display text-3xl font-800 leading-[1.1] tracking-tight text-brand-950 dark:text-white sm:text-5xl">
              {h.featuresTitle}
            </h2>
            <p className="mt-5 text-lg text-steel-600 dark:text-slate-300">{h.featuresLead}</p>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {h.modules.map((m, i) => (
              <Reveal key={m.name} delay={i * 50}>
                <div className="flex h-full items-start gap-4 rounded-geex border border-steel-200 bg-white p-6 transition-colors hover:border-brand-500/50 dark:border-white/10 dark:bg-steel-800">
                  <span className="font-mono text-sm font-500 text-steel-400">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="font-display text-lg font-700 text-brand-950 dark:text-white">{m.name}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-steel-600 dark:text-slate-300">{m.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Value tiles strip ───────────────────────────────── */}
      <section className="bg-brand-900 dark:bg-steel-900">
        <div className="container-page grid grid-cols-2 gap-8 py-14 lg:grid-cols-4">
          {h.valueTiles.map((tile, i) => (
            <Reveal key={tile.label} delay={i * 80} className="text-center">
              <div className="font-display text-3xl font-800 text-white sm:text-4xl">{tile.value}</div>
              <div className={`mt-2 ${eyebrow} text-brand-300`}>{tile.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── About teaser ────────────────────────────────────── */}
      <section className="bg-white dark:bg-steel-900">
        <div className="container-page grid gap-10 py-20 sm:py-28 lg:grid-cols-[1fr_1fr] lg:items-center">
          <Reveal>
            <p className={`${eyebrow} text-brand-600 dark:text-brand-300`}>{h.aboutEyebrow}</p>
            <h2 className="mt-4 font-display text-3xl font-800 leading-[1.1] tracking-tight text-brand-950 dark:text-white sm:text-5xl">
              {h.aboutTitle}
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-steel-600 dark:text-slate-300">{h.aboutText}</p>
            <Link href={`/${locale}/about`} className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-600 px-7 py-3.5 font-display text-sm font-700 uppercase tracking-[0.12em] text-white transition-colors hover:bg-brand-700">
              {h.aboutCta} <Arrow />
            </Link>
          </Reveal>
          <Reveal delay={120}>
            <p className="font-display text-xs uppercase tracking-[0.18em] text-brand-600 dark:text-brand-300">
              {dict.nav.features} · {dict.nav.pricing} · {dict.nav.about}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Trusted by (logo wall) ──────────────────────────── */}
      {clients.length > 0 && (
        <section className="border-t border-steel-400/15 bg-steel-50 dark:border-white/10 dark:bg-steel-900">
          <div className="container-page py-20 sm:py-24">
            <Reveal>
              <p className={`${eyebrow} text-brand-600 dark:text-brand-300`}>{h.clientsTitle}</p>
            </Reveal>
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {clients.slice(0, 10).map((c, i) => (
                <Reveal key={c.id} delay={i * 40}>
                  <div className="flex h-24 items-center justify-center overflow-hidden rounded-2xl border border-steel-200 bg-white px-4 dark:border-white/10 dark:bg-white/5">
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

      {/* ── Customer feedback (orbiting reviews + centred emblem) ─ */}
      <ClientsFeedback locale={locale} dict={dict} reviews={reviews} />
    </div>
  );
}
