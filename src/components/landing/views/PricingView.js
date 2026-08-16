"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { fmtCurrencyAmount } from "@/lib/pricing";
import { CURRENCIES_FROM_EXCHANGE_API } from "@/lib/currencies";
import Riyal from "@/components/Riyal";
import { EASE_OUT_EXPO, fadeUp, stagger, VIEWPORT } from "@/components/landing/lib/motion";
import { MagneticButton } from "../ui/MagneticButton";
import { SectionHeading } from "../ui/SectionHeading";

/* ==================================================================
   Pricing — every card comes from Packages in /super.

   Nothing on a card is authored here any more: the name, the tagline,
   the users line, the bullets, the ranges and every figure are stored
   and edited in the console, so changing a price is a save rather than
   a deploy. There is deliberately NO FALLBACK — if the catalogue is
   empty the page says so, because a stale hardcoded number is a wrong
   price stated with confidence.

   A package's TYPE decides the shape of its card and the words on its
   button: Free shows no figure and says "Start Free", Premium shows
   "invoiced monthly" and says "Contact Sales", and Compound is priced
   by category and says "Get Started". The categories are the headcount
   bands the switch moves between.

   Both languages come down together and the card picks by locale, so
   the Arabic site is not a second-class copy of the English one.
================================================================== */

const COPY = {
  eyebrow: "Pricing",
  title: "Pricing that scales with your team",
  lead: "Priced by your team size — start free for up to 9 users, then choose the plan that fits your headcount. Every plan includes the full platform.",
  currency: "Currency",
  monthly: "Monthly",
  yearly: "Yearly",
  freePrice: "Free",
  freeNote: "Always free",
  perMaxUsers: "for up to {n} users / month",
  employees: "employees",
  billedYearly: "billed yearly",
  invoicedMonthly: "Invoiced monthly",
  invoicedNote: "Billed at the end of each month based on your number of employees.",
  mostPopular: "Most popular",
  featuresLabel: "Includes",
  ctaStart: "Start free",
  bandTitle: "Ready to run your company on one platform?",
  bandText: "Create your free account — no card required.",
};

const ASSURANCES = [
  {
    title: "The whole platform, every plan",
    body: "Every department is switched on from the free tier up. You pay for team size, not for modules.",
  },
  {
    title: "Free under ten people",
    body: "Micro is free forever for up to 9 employees — English and Arabic, RTL-ready, no card required.",
  },
  {
    title: "Pay yearly, pay less",
    body: "Switch to yearly billing and the discount comes off every plan. Companies of 250+ are invoiced monthly on actual headcount instead.",
  },
];

export function PricingView({ onNavigate, locale = "en" }) {
  const [yearly, setYearly] = useState(false);
  const [currency, setCurrency] = useState("SAR");

  // Band prices, the yearly discount and today's rates all come from /super,
  // in one public call. Until it answers the page still renders — with the
  // rates authored in lib/pricing — rather than showing an empty price list.
  const [live, setLive] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/pricing", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return;
        setLive(d);
        // Opened in the reader's own money. Only as a DEFAULT, and only before
        // they touch the picker — reaching in afterwards would fight them.
        if (d.currency && d.rates?.[d.currency]) setCurrency(d.currency);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // Only currencies today's snapshot actually quotes. Listing all 166 when a
  // third of them have no rate would offer prices that cannot be worked out.
  const currencyOptions = useMemo(() => {
    const quoted = live?.rates ? Object.keys(live.rates) : null;
    const pool = quoted?.length
      ? CURRENCIES_FROM_EXCHANGE_API.filter((c) => quoted.includes(c.code))
      : CURRENCIES_FROM_EXCHANGE_API.filter((c) => ["SAR", "USD", "AED", "EUR", "GBP"].includes(c.code));
    return pool;
  }, [live]);
  // Selected category index per compound card (0 = the first, the default).
  const [bandIdx, setBandIdx] = useState({});

  // THE CARDS ARE THE PACKAGES. Nothing is authored in this file any more: the
  // name, the wording, the bullets, the ranges and every figure come from
  // /super, so a price change is a save rather than a deploy.
  //
  // TYPE decides the card's shape and its button. Free shows no figure at all,
  // Premium shows "invoiced monthly" instead of one, and only Compound has
  // categories to switch between.
  const cards = useMemo(() => {
    const ar = locale === "ar";
    return (live?.cards || []).map((c) => ({
      key: c.id,
      type: c.type,
      free: c.type === "free",
      invoicedMonthly: c.type === "premium",
      popular: c.popular,
      name: (ar && c.nameAr) || c.name,
      tagline: (ar && c.taglineAr) || c.tagline,
      users: (ar && c.usersLabelAr) || c.usersLabel,
      features: ((ar && c.includesAr?.length) ? c.includesAr : c.includes) || [],
      durationMonths: c.durationMonths,
      maxEmployees: c.maxEmployees,
      monthly: c.monthly,
      yearly: c.yearly,
      // Only a compound package switches bands; the label is what /super wrote.
      bands: c.type === "compound" && c.categories.length
        ? c.categories.map((cat) => ({
            label: cat.label || `${cat.minEmployees}–${cat.maxEmployees}`,
            upTo: cat.maxEmployees,
            monthly: cat.monthly,
            yearly: cat.yearly,
          }))
        : null,
      // The button says what the type means it should.
      cta: c.type === "free" ? "start" : c.type === "premium" ? "contact" : "choose",
    }));
  }, [live, locale]);

  // The saving is whatever the gear in /super says, not a number baked in
  // here — two places claiming a discount is how they end up disagreeing.
  const discountPct = live?.yearlyDiscountPct ?? 0;
  // Converted with TODAY's rate when we have one, and only then — an unquoted
  // currency simply stays in SAR rather than being converted by a guess.
  //
  // ROUNDED UP, to a whole unit. A price is a promise about what will be
  // charged, and rounding down would advertise a figure fractionally below it.
  // Up also means the number carries no decimals to argue about, which is why
  // the "approximately" mark is gone with it.
  const rate = live?.rates?.[currency];
  const money = (sar) => {
    const amount = rate != null ? Math.ceil(sar * rate) : sar;
    return fmtCurrencyAmount(amount, currency);
  };

  // Package key carried to signup — banded plans include the chosen band.
  const packageKeyFor = (plan) =>
    plan.bands ? `${plan.key}-${(bandIdx[plan.key] ?? 0) + 1}` : plan.key;
  // Nothing to show until /super answers. An empty grid says "loading", where
  // stale hardcoded prices would say something false with confidence.
  const loading = live === null;
  const signupHref = (plan) => `/${locale}/signup?package=${packageKeyFor(plan)}`;

  // Fixed by the card type, not chosen per package: the words are a promise
  // about what pressing the button does, and that follows from the shape.
  const ctaLabel = (plan) =>
    plan.type === "free" ? "Start Free" : plan.type === "premium" ? "Contact Sales" : "Get Started";

  const Sym = ({ big = false }) =>
    currency === "SAR" ? (
      <Riyal
        className={
          big
            ? "inline-block h-[0.72em] w-[0.65em] align-[-0.02em]"
            : "inline-block h-[0.85em] w-[0.78em] align-[-0.05em]"
        }
      />
    ) : (
      <span className={big ? "font-display text-lg font-600" : ""}>{currency}</span>
    );

  return (
    <section className="mx-auto max-w-7xl px-6 pb-24 pt-32 lg:pt-40">
      <SectionHeading align="center" eyebrow={COPY.eyebrow} title={COPY.title} description={COPY.lead} />

      {/* Controls — currency selector + billing toggle. The sliding pill is a
          shared layoutId, so it glides between states. */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: EASE_OUT_EXPO }}
        className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
      >
        <CurrencyPicker
          value={currency}
          options={currencyOptions}
          onChange={setCurrency}
          label={COPY.currency}
        />
        <div className="flex items-center gap-1 rounded-full border border-line bg-ink-soft/70 p-1">
          {[
            { id: "monthly", label: COPY.monthly },
            { id: "yearly", label: COPY.yearly },
          ].map((option) => {
            const isActive = (option.id === "yearly") === yearly;
            return (
              <button
                key={option.id}
                onClick={() => setYearly(option.id === "yearly")}
                className={`relative rounded-full px-4 py-2 text-xs font-500 transition-colors duration-300 sm:text-sm ${
                  isActive ? "text-white" : "text-fg-muted hover:text-fg"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="billing-pill"
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-iris to-violet"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-2">
                  {option.label}
                  {option.id === "yearly" && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[0.65rem] font-600 ${
                        isActive ? "bg-white/20 text-white" : "bg-mint/15 text-mint"
                      }`}
                    >
                      Save {discountPct}%
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Plans */}
      <motion.div
        variants={stagger(0.08, 0.1)}
        initial="hidden"
        animate="show"
        className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        {loading && (
          <p className="col-span-full py-12 text-center text-sm text-fg-dim">Loading prices…</p>
        )}
        {!loading && cards.length === 0 && (
          <p className="col-span-full py-12 text-center text-sm text-fg-dim">
            No packages are published yet.
          </p>
        )}
        {cards.map((plan) => {
          const bi = bandIdx[plan.key] ?? 0;
          const band = plan.bands ? plan.bands[bi] : null;
          // Every figure comes from /super. A compound package prices by its
          // chosen category; free and premium show no number at all.
          const bandMax = band ? band.upTo : plan.maxEmployees || 0;
          const bandTotal = band ? (yearly ? band.yearly : band.monthly) : (yearly ? plan.yearly : plan.monthly);

          return (
            <motion.article
              key={plan.key}
              variants={fadeUp}
              whileHover={{ y: -8 }}
              transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
              className={`surface relative flex flex-col overflow-hidden rounded-2xl p-6 will-change-transform ${
                plan.popular ? "ring-1 ring-iris/60" : ""
              }`}
            >
              {plan.popular && (
                <>
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-70"
                    style={{
                      background:
                        "radial-gradient(90% 60% at 50% 0%, color-mix(in oklab, var(--color-iris) 18%, transparent), transparent 70%)",
                    }}
                  />
                  <span className="absolute right-5 top-5 rounded-full bg-iris/20 px-2.5 py-1 text-[10px] uppercase tracking-wider text-iris-bright">
                    {COPY.mostPopular}
                  </span>
                </>
              )}

              <div className="relative flex flex-1 flex-col">
                <h3 className="font-display text-lg font-600">{plan.name}</h3>
                <p className="mt-2 min-h-[2.5rem] text-sm text-fg-muted">{plan.tagline}</p>

                {/* Price — swaps with a vertical slide when currency, billing
                    period or band changes. The fixed heights here and on the
                    band switch below keep all four CTAs on one line. */}
                <div className="mt-6">
                  <div className="flex h-11 items-baseline gap-1.5 overflow-hidden">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={`${plan.key}-${yearly}-${bi}-${currency}`}
                        initial={{ y: 26, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -26, opacity: 0 }}
                        transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                        className="flex items-baseline gap-1.5 font-display font-600 tabular-nums tracking-tight"
                      >
                        {plan.free ? (
                          <span className="text-4xl">{COPY.freePrice}</span>
                        ) : plan.invoicedMonthly ? (
                          <span className="text-2xl">{COPY.invoicedMonthly}</span>
                        ) : (
                          <>
                            <span className="text-4xl">{money(bandTotal)}</span>
                            <Sym big />
                          </>
                        )}
                      </motion.span>
                    </AnimatePresence>
                  </div>

                  <p className="mt-1 min-h-[3rem] text-xs text-fg-dim">
                    {plan.free
                      ? COPY.freeNote
                      : plan.invoicedMonthly
                        ? COPY.invoicedNote
                        : COPY.perMaxUsers.replace("{n}", String(bandMax))}
                  </p>
                </div>

                {/* Headcount band switch (Small / Medium) */}
                <div className="mt-4 min-h-[4.75rem]">
                  {plan.bands && (
                    <>
                      <span className="mb-1.5 block text-[0.65rem] uppercase tracking-[0.16em] text-fg-dim">
                        {COPY.employees}
                      </span>
                      <div className="inline-flex rounded-full border border-line bg-ink/40 p-1">
                        {plan.bands.map((b, i) => {
                          const active = i === bi;
                          return (
                            <button
                              key={b.label}
                              type="button"
                              aria-pressed={active}
                              onClick={() => setBandIdx((s) => ({ ...s, [plan.key]: i }))}
                              className={`relative rounded-full px-3 py-1.5 text-xs font-500 transition-colors duration-300 ${
                                active ? "text-white" : "text-fg-muted hover:text-fg"
                              }`}
                            >
                              {active && (
                                <motion.span
                                  layoutId={`band-pill-${plan.key}`}
                                  className="absolute inset-0 rounded-full bg-gradient-to-r from-iris to-violet"
                                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                                />
                              )}
                              <span className="relative z-10">{b.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      {yearly && <p className="mt-2 text-xs text-mint">{COPY.billedYearly}</p>}
                    </>
                  )}
                </div>

                {/* Headcount badge, and the term beside it. */}
                <span className="mt-5 flex w-fit flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full bg-ink/50 px-3 py-1 text-xs text-fg-muted">{plan.users}</span>
                  {plan.durationMonths > 0 && (
                    <span className="inline-flex rounded-full bg-ink/50 px-3 py-1 text-xs text-fg-muted">
                      {plan.durationMonths} {plan.durationMonths === 1 ? "month" : "months"}
                    </span>
                  )}
                </span>

                <div className="mt-6">
                  {plan.cta === "contact" ? (
                    <MagneticButton
                      variant="ghost"
                      strength={10}
                      onClick={() => onNavigate("contact")}
                      className="w-full justify-center px-5 py-3"
                    >
                      {ctaLabel(plan)}
                    </MagneticButton>
                  ) : (
                    <MagneticButton
                      variant={plan.popular ? "primary" : "ghost"}
                      strength={10}
                      href={signupHref(plan)}
                      className="w-full justify-center px-5 py-3"
                    >
                      {ctaLabel(plan)}
                    </MagneticButton>
                  )}
                </div>

                <p className="mt-7 text-[0.65rem] uppercase tracking-[0.16em] text-fg-dim">
                  {COPY.featuresLabel}
                </p>
                <ul className="mt-3 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2.5 text-sm text-fg-muted">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0" aria-hidden>
                        <circle cx="8" cy="8" r="7.2" stroke="var(--color-line)" />
                        <path
                          d="M5 8.2l2.1 2.1L11 6.4"
                          stroke={plan.popular ? "var(--color-iris-bright)" : "var(--color-mint)"}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.article>
          );
        })}
      </motion.div>


      {/* Assurances — all three are statements the pricing model actually backs. */}
      <motion.div
        variants={stagger(0.08)}
        initial="hidden"
        whileInView="show"
        viewport={VIEWPORT}
        className="mt-14 grid gap-5 sm:grid-cols-3"
      >
        {ASSURANCES.map((item) => (
          <motion.div key={item.title} variants={fadeUp} className="rounded-2xl border border-line bg-ink-soft/50 p-6">
            <h4 className="font-display text-sm font-600">{item.title}</h4>
            <p className="mt-2 text-sm text-fg-muted">{item.body}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Closing band */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VIEWPORT}
        transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
        className="surface mt-14 flex flex-col gap-6 rounded-2xl p-8 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="max-w-xl">
          <h3 className="font-display text-2xl font-600 tracking-tight">{COPY.bandTitle}</h3>
          <p className="mt-2 text-sm text-fg-muted">{COPY.bandText}</p>
        </div>
        <MagneticButton href={`/${locale}/signup?package=micro`} strength={12}>
          {COPY.ctaStart}
        </MagneticButton>
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------
   Currency picker — the page's own control, not the browser's.

   A native <select> was the honest first answer: it is accessible for
   free and a phone renders it well. But it also renders as the operating
   system's list, which on this page sat inside a dark, thin-bordered,
   display-typeface layout and looked like something from another site.

   So this is built: the same pill, a panel in the same ink and line
   colours, and a search box — because the list is over a hundred rows
   and scrolling to JOD is not a design. Searching matches code, name or
   country, since somebody hunting the riyal may know any of the three.

   Keyboard and screen readers are handled rather than assumed: it is a
   combobox with a listbox, Escape closes, arrows move, Enter picks, and
   a click anywhere outside dismisses it.
   ------------------------------------------------------------------ */
function CurrencyPicker({ value, options, onChange, label }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);
  const searchRef = useRef(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (c) => c.code.toLowerCase().includes(q)
        || c.name.toLowerCase().includes(q)
        || (c.country || "").toLowerCase().includes(q),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    // The search takes focus on open, so typing works without aiming at it.
    searchRef.current?.focus();
    return () => { window.removeEventListener("mousedown", onDown); window.removeEventListener("keydown", onKey); };
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);

  const choose = (code) => { onChange(code); setOpen(false); setQuery(""); };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && results[active]) { e.preventDefault(); choose(results[active].code); }
  };

  return (
    <div className="relative" ref={boxRef}>
      {/* THE WHOLE PILL IS THE CONTROL. The old select was a small inline
          element inside its label, so only the three letters of the code
          opened it — the word "Currency" and the chevron did nothing. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className="inline-flex w-full items-center gap-2 rounded-full border border-line bg-ink-soft/70 px-4 py-2 transition-colors hover:border-fg-dim/60 sm:w-auto"
      >
        <span className="text-[0.7rem] uppercase tracking-[0.16em] text-fg-dim">{label}</span>
        <span className="font-display text-sm font-600 text-fg">{value}</span>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden
          className={`ms-auto text-fg-dim transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-[min(20rem,calc(100vw-3rem))] overflow-hidden rounded-2xl border border-line bg-ink-soft shadow-2xl">
          <div className="border-b border-line p-2">
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search code, name or country"
              aria-label="Search currencies"
              className="w-full rounded-xl bg-ink/60 px-3 py-2 text-sm text-fg placeholder:text-fg-dim/70 focus:outline-none focus:ring-1 focus:ring-fg-dim/40"
            />
          </div>
          <ul role="listbox" aria-label={label} className="max-h-64 overflow-y-auto py-1">
            {results.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-fg-dim">Nothing matches that.</li>
            )}
            {results.map((c, i) => (
              <li key={c.code} role="option" aria-selected={c.code === value}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(c.code)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-start transition-colors ${
                    i === active ? "bg-fg/10" : ""
                  }`}
                >
                  <span className={`w-11 shrink-0 font-display text-sm font-600 ${c.code === value ? "text-fg" : "text-fg-dim"}`}>{c.code}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-fg-dim">{c.name}</span>
                  {c.code === value && <span className="text-xs text-fg">Selected</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
