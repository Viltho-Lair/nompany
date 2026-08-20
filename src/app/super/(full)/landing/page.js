import Link from "next/link";
import Icon from "../../_components/Icon";
import { toneBg, toneFg, toneInk } from "../../_components/ui";
import { BASE } from "../../_components/nav";

export const metadata = { title: "Landing Page" };

const NAV = ["Product", "Modules", "Pricing", "Customers", "Docs"];

const FEATURES = [
  { icon: "briefcase", title: "Every department", body: "Sales, Projects, Inventory, HR, Finance and Technical — switch on only what the company needs." },
  { icon: "zap", title: "Live by default", body: "Dashboards, approvals and reporting update as work happens, with no nightly batch to wait for." },
  { icon: "shield", title: "Serious security", body: "Two-factor authentication, session control, scoped API keys and a full audit trail." },
  { icon: "globe", title: "Bilingual", body: "English and Arabic across every screen, with right-to-left handled properly rather than mirrored." },
  { icon: "layers", title: "One platform", body: "A single identity, a single bill, and one place to see the whole operation." },
  { icon: "chart", title: "Answers, not exports", body: "Reporting that reads like a briefing instead of a spreadsheet dump." },
];

const STATS = [
  { value: "4,746", label: "Studios running" },
  { value: "12,486", label: "Daily users" },
  { value: "99.9%", label: "Uptime, 12 months" },
  { value: "6", label: "Modules available" },
];

const LOGOS = ["Falcon Contracting", "Nourah Logistics", "Dar Almanar", "Tamweel Group", "Bahr Marine", "Najd Foods"];

const QUOTES = [
  { quote: "We closed three separate systems in a quarter. Finance and Projects finally agree on the same numbers.", name: "Lina Haddad", role: "Operations Director, Falcon Contracting" },
  { quote: "The Arabic support is the real thing — our site teams stopped switching to English to get work done.", name: "Omar Nasser", role: "CFO, Nourah Logistics" },
  { quote: "Onboarding took an afternoon. I expected a project.", name: "Sara Al-Otaibi", role: "GM, Dar Almanar" },
];

export default function LandingPage() {
  return (
    <div className="w-full">
      {/* header */}
      <header
        className="sticky top-0 z-30 border-b"
        style={{
          borderColor: "var(--ad-border)",
          backgroundColor: "color-mix(in srgb, var(--ad-background) 80%, transparent)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="mx-auto flex h-[74px] max-w-6xl items-center gap-8 px-5">
          <Link href={BASE} className="inline-flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg text-lg font-700 text-white"
              style={{ backgroundColor: "var(--ad-primary)" }}
            >
              n
            </span>
            <span className="text-lg font-600">nompany</span>
          </Link>
          <nav className="hidden flex-1 items-center gap-7 md:flex">
            {NAV.map((n) => (
              <span key={n} className="cursor-pointer text-sm text-[var(--ad-muted-foreground)] hover:text-[var(--ad-foreground)]">
                {n}
              </span>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-2 md:ms-0">
            <Link href={BASE} className="ad-btn ad-btn-ghost ad-btn-sm">Sign in</Link>
            <Link href={`${BASE}/v2/register`} className="ad-btn ad-btn-primary ad-btn-sm">Get started</Link>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden px-5 py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <span className="absolute start-[8%] top-[12%] h-[320px] w-[320px] animate-pulse rounded-full bg-[var(--ad-primary)] opacity-[0.06]" />
          <span className="absolute end-[10%] top-[30%] h-[220px] w-[220px] animate-pulse rounded-full bg-[var(--ad-primary)] opacity-[0.08] [animation-delay:1s]" />
          <span className="absolute bottom-[8%] start-[30%] h-[260px] w-[260px] animate-pulse rounded-full bg-[var(--ad-primary)] opacity-[0.05] [animation-delay:2s]" />
        </div>

        <div className="relative mx-auto max-w-3xl text-center">
          <span className="ad-badge" style={{ backgroundColor: toneBg("primary", 0.12), color: toneInk("primary") }}>
            <Icon name="rocket" className="h-3 w-3" /> Release 4.2 is live
          </span>
          <h1 className="mt-6 text-4xl font-700 leading-tight tracking-tight sm:text-6xl">
            Run the whole company from one platform
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-[var(--ad-muted-foreground)] sm:text-lg">
            nompany is a modular ERP. Turn on the departments you need, pay for what you use, and give everyone the
            same version of the truth.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href={`${BASE}/v2/register`} className="ad-btn ad-btn-primary px-7 py-3">
              Start free <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-4 text-xs text-[var(--ad-muted-foreground)]">No card required · 14-day trial · cancel any time</p>
        </div>

        {/* app preview */}
        <div className="relative mx-auto mt-16 max-w-5xl">
          <div className="ad-card overflow-hidden p-2">
            <div className="flex h-8 items-center gap-1.5 px-2">
              {["danger", "warning", "success"].map((c) => (
                <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: toneFg(c) }} />
              ))}
            </div>
            <div className="flex overflow-hidden rounded-lg" style={{ backgroundColor: "var(--ad-background)" }}>
              <div className="hidden w-[180px] shrink-0 p-4 sm:block" style={{ backgroundColor: "var(--ad-sidebar)" }}>
                {["Dashboard", "Projects", "Finance", "HR", "Inventory", "Settings"].map((l, i) => (
                  <div
                    key={l}
                    className="mb-1.5 rounded px-2.5 py-2 text-xs"
                    style={
                      i === 0
                        ? { backgroundColor: "var(--ad-sidebar-accent)", color: "var(--ad-sidebar-primary)" }
                        : { color: "var(--ad-sidebar-foreground)" }
                    }
                  >
                    {l}
                  </div>
                ))}
              </div>
              <div className="min-w-0 flex-1 p-5">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {["var(--ad-chart-1)", "var(--ad-chart-2)", "var(--ad-chart-3)", "var(--ad-chart-4)"].map((c, i) => (
                    <div key={c} className="rounded-lg p-3.5 text-white" style={{ backgroundColor: c }}>
                      <p className="text-[10px] opacity-80">{["Revenue", "Users", "Orders", "Rate"][i]}</p>
                      <p className="mt-0.5 text-base font-600">{["$2.9M", "86.4K", "6,465", "12.1%"][i]}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="ad-card h-32 sm:col-span-2" />
                  <div className="ad-card h-32" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* logos */}
      <section className="border-y px-5 py-10" style={{ borderColor: "var(--ad-border)" }}>
        <div className="mx-auto max-w-5xl">
          <p className="text-center text-xs uppercase tracking-widest text-[var(--ad-muted-foreground)]">
            Trusted across the Gulf
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {LOGOS.map((l) => (
              <span key={l} className="text-sm font-600 text-[var(--ad-muted-foreground)] opacity-70">
                {l}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* features */}
      <section className="px-5 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-3xl font-700">Built for how companies actually work</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--ad-muted-foreground)]">
              Not a suite of separate products bolted together — one system where every department sees the same data.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="ad-card p-6">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-lg"
                  style={{ backgroundColor: toneBg("primary", 0.12), color: toneInk("primary") }}
                >
                  <Icon name={f.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-600">{f.title}</h3>
                <p className="mt-1.5 text-sm text-[var(--ad-muted-foreground)]">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* stats */}
      <section
        className="px-5 py-16"
        style={{ backgroundImage: "linear-gradient(135deg, var(--ad-primary), color-mix(in srgb, var(--ad-primary) 65%, var(--ad-foreground)))" }}
      >
        <div className="mx-auto grid max-w-5xl gap-8 text-center sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-700 text-white sm:text-4xl">{s.value}</p>
              <p className="mt-1.5 text-sm text-white/70">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* testimonials */}
      <section className="px-5 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-700">What operators say</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {QUOTES.map((q) => (
              <figure key={q.name} className="ad-card flex flex-col p-6">
                <div className="flex gap-0.5" aria-label="5 out of 5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Icon key={i} name="star" className="h-4 w-4" style={{ color: "var(--ad-warning)", fill: "var(--ad-warning)" }} />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed">“{q.quote}”</blockquote>
                <figcaption className="mt-5 border-t pt-4" style={{ borderColor: "var(--ad-border)" }}>
                  <p className="text-sm font-600">{q.name}</p>
                  <p className="text-xs text-[var(--ad-muted-foreground)]">{q.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* cta */}
      <section className="px-5 pb-24">
        <div className="ad-card mx-auto max-w-4xl p-12 text-center">
          <h2 className="text-3xl font-700">Ready to see it on your own data?</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-[var(--ad-muted-foreground)]">
            Set up a studio in an afternoon. Import what you have, switch on the modules you need, invite the team.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href={`${BASE}/v2/register`} className="ad-btn ad-btn-primary px-7 py-3">
              Create a studio <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
            <Link href={`${BASE}/docs`} className="ad-btn ad-btn-outline px-7 py-3">
              Read the docs
            </Link>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t px-5 py-10" style={{ borderColor: "var(--ad-border)" }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-700 text-white"
              style={{ backgroundColor: "var(--ad-primary)" }}
            >
              n
            </span>
            <span className="text-sm font-600">nompany</span>
          </div>
          <nav className="flex flex-wrap gap-6 text-xs text-[var(--ad-muted-foreground)]">
            {["Privacy", "Terms", "Security", "Status", "Contact"].map((l) => (
              <span key={l} className="cursor-pointer hover:text-[var(--ad-foreground)]">{l}</span>
            ))}
          </nav>
          <p className="text-xs text-[var(--ad-muted-foreground)]">© {new Date().getFullYear()} nompany</p>
        </div>
      </footer>
    </div>
  );
}
