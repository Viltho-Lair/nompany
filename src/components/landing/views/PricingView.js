"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  PLANS,
  YEARLY_DISCOUNT,
  fmtCurrencyAmount,
  pick,
} from "@/lib/pricing";
import { CURRENCIES_FROM_EXCHANGE_API } from "@/lib/currencies";
import Riyal from "@/components/Riyal";
import { EASE_OUT_EXPO, fadeUp, stagger, VIEWPORT } from "@/components/landing/lib/motion";
import { MagneticButton } from "../ui/MagneticButton";
import { SectionHeading } from "../ui/SectionHeading";

/* ==================================================================
   Pricing — driven by the SAME `@/lib/pricing` module the rest of the
   app uses, so the marketing numbers and the in-app ones can never
   drift. Per-employee plans authored in SAR incl. 15% VAT, viewable in
   five currencies, 15% off yearly. Small and Medium each carry two
   headcount bands; the card shows the TOTAL monthly price for that
   band's maximum headcount.

   The surrounding landing page is English-only, so the copy below is
   too — plan names and features still come through `pick()` so they
   follow the locale the moment the page becomes bilingual.
================================================================== */

const COPY = {
  eyebrow: "Pricing",
  title: "Pricing that scales with your team",
  lead: "Priced by your team size — start free for up to 9 users, then choose the plan that fits your headcount. Every plan includes the full platform.",
  currency: "Currency",
  monthly: "Monthly",
  yearly: "Yearly",
  yearlySave: "Save 15%",
  freePrice: "Free",
  freeNote: "Always free",
  perMaxUsers: "for up to {n} users / month",
  employees: "employees",
  billedYearly: "billed yearly",
  invoicedMonthly: "Invoiced monthly",
  invoicedNote: "Billed at the end of each month based on your number of employees.",
  approxNote: "Prices in currencies other than SAR are approximate.",
  mostPopular: "Most popular",
  featuresLabel: "Includes",
  ctaStart: "Start free",
  ctaChoose: "Get started",
  ctaContact: "Contact sales",
  vatNote: "All prices include 15% VAT. Yearly billing saves 15% versus monthly.",
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
    title: "Yearly saves 15%",
    body: "All prices include 15% VAT. Companies of 250+ are invoiced monthly on actual headcount instead.",
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
  // Selected band index per banded plan (0 = lower band, the default).
  const [bandIdx, setBandIdx] = useState(() =>
    Object.fromEntries(PLANS.filter((p) => p.bands).map((p) => [p.key, 0]))
  );

  const approx = currency !== "SAR";
  // Converted with TODAY's rate when we have one, and only then. A stale static
  // table quoting a price to two decimals is more misleading than an honest
  // fallback, so an unquoted currency simply stays in SAR.
  const rate = live?.rates?.[currency];
  const money = (sar) => {
    const amount = rate != null ? sar * rate : sar;
    return `${approx && rate != null ? "≈ " : ""}${fmtCurrencyAmount(amount, currency)}`;
  };

  // Package key carried to signup — banded plans include the chosen band.
  const packageKeyFor = (plan) =>
    plan.bands ? `${plan.key}-${(bandIdx[plan.key] ?? 0) + 1}` : plan.key;
  const signupHref = (plan) => `/${locale}/signup?package=${packageKeyFor(plan)}`;

  const ctaLabel = (plan) =>
    plan.cta === "start" ? COPY.ctaStart : plan.cta === "contact" ? COPY.ctaContact : COPY.ctaChoose;

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
        {/* THE WHOLE PILL IS THE CONTROL. The select used to be a small inline
            element inside the label, so only the three letters of the code
            opened it — the word "Currency" and the chevron did nothing. It now
            lies invisibly across the entire pill, which also keeps the NATIVE
            dropdown, and a native one is what makes a list this long usable on
            a phone. */}
        <label className="relative inline-flex cursor-pointer items-center gap-2 rounded-full border border-line bg-ink-soft/70 px-4 py-2 focus-within:border-fg-dim">
          <span className="text-[0.7rem] uppercase tracking-[0.16em] text-fg-dim">{COPY.currency}</span>
          <span className="font-display text-sm font-600 text-fg">{currency}</span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            aria-label={COPY.currency}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          >
            {currencyOptions.map((cur) => (
              <option key={cur.code} value={cur.code} className="bg-ink-soft text-fg">
                {cur.code} — {cur.name}
              </option>
            ))}
          </select>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="M4 6.5 8 10.5l4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-fg-dim"
            />
          </svg>
        </label>

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
                      {COPY.yearlySave}
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
        {PLANS.map((plan) => {
          const bi = bandIdx[plan.key] ?? 0;
          const band = plan.bands ? plan.bands[bi] : null;
          // Per-employee rate for the selected band (yearly = 15% off), then
          // the TOTAL for that band's maximum headcount.
          const bandMax = band ? band.upTo : 0;
          // The PACKAGE with this band's upper bound is the price. Matched on
          // the ceiling rather than a name, so renaming a package in /super
          // cannot silently unprice a band. The figures authored in lib/pricing
          // remain the fallback until the call lands.
          const priced = live?.bands?.[bandMax];
          const bandTotal = priced
            ? (yearly ? priced.yearly : priced.monthly)
            : band
              ? (yearly ? band.rate * (1 - YEARLY_DISCOUNT) : band.rate) * bandMax
              : 0;

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
                <h3 className="font-display text-lg font-600">{pick(plan.name, locale)}</h3>
                <p className="mt-2 min-h-[2.5rem] text-sm text-fg-muted">{pick(plan.tagline, locale)}</p>

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

                {/* Headcount badge */}
                <span className="mt-5 inline-flex w-fit rounded-full bg-ink/50 px-3 py-1 text-xs text-fg-muted">
                  {pick(plan.users, locale)}
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
                  {pick(plan.features, locale).map((feature) => (
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

      <p className="mt-8 text-center text-xs leading-relaxed text-fg-dim">
        {COPY.vatNote}
        {approx && <> {COPY.approxNote}</>}
      </p>

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
