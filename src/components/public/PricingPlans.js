"use client";

import Link from "next/link";
import { useState } from "react";
import { PLANS, CURRENCIES, YEARLY_DISCOUNT, convertFromSar, fmtCurrencyAmount, pick } from "@/lib/pricing";
import Riyal from "@/components/Riyal";

const Check = () => (
  <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);
const Arrow = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
const ChevronDown = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 opacity-60" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

// Per-employee pricing. Currency selector + Monthly/Yearly toggle above four
// headcount plans. Small + Medium each pick a headcount BAND via a segmented
// toggle (no live employee count); the card shows that band's per-employee rate.
// Yearly is 15% off (after VAT). `copy` is the dict.pricing object from the
// (server) page.
export default function PricingPlans({ locale, copy: c, popularKey = null, subscribeMode = false, currentPlanKey = null }) {
  const [yearly, setYearly] = useState(false);
  const [busyKey, setBusyKey] = useState("");

  // Subscribe mode (logged-in /subscribe): the CTA records the chosen package
  // (Stripe deferred → intent only) and returns to the account. Contact plans
  // still route to sales; the current plan is shown as non-actionable.
  async function subscribe(plan) {
    setBusyKey(plan.key);
    try {
      // Billing is not wired to the restructured model yet — record the intent
      // on the user's questionnaire so the choice isn't lost, then return.
      const res = await fetch("/api/identity/questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "create", packageKey: plan.key }),
      });
      if (res.ok) { window.location.assign(`/${locale}/account`); return; }
    } catch { /* ignore */ }
    setBusyKey("");
  }
  const [currency, setCurrency] = useState("SAR");
  // Selected band index per banded plan (0 = lower band, the default).
  const [bandIdx, setBandIdx] = useState(() =>
    Object.fromEntries(PLANS.filter((p) => p.bands).map((p) => [p.key, 0]))
  );
  const approx = currency !== "SAR";

  // Package key carried to signup — banded plans include the chosen band ("-1"/"-2").
  const packageKeyFor = (plan) => (plan.bands ? `${plan.key}-${(bandIdx[plan.key] ?? 0) + 1}` : plan.key);
  // Public pricing: every plan (incl. Large) → Registration carrying its package,
  // then the Questionnaire. Subscribe mode only reaches here for contact plans.
  const hrefFor = (plan) => (subscribeMode ? `/${locale}/contact` : `/${locale}/signup?package=${packageKeyFor(plan)}`);
  const ctaLabel = (plan) => (subscribeMode && plan.cta === "contact" ? c.ctaContact : plan.cta === "start" ? c.ctaStart : c.ctaChoose);
  // "Most Popular" follows real subscribers when we have data, else the flag.
  const isPopular = (plan) => (popularKey ? plan.key === popularKey : plan.popular);
  // SAR amount → number string in the selected currency (with "≈" when converted).
  const money = (sar) => `${approx ? "≈ " : ""}${fmtCurrencyAmount(convertFromSar(sar, currency), currency)}`;
  // Currency symbol: the Riyal glyph for SAR, otherwise the currency code text.
  const Sym = ({ big }) =>
    currency === "SAR"
      ? <Riyal className={`inline-block ${big ? "h-[0.7em] w-[0.7em] align-[-0.02em]" : "h-[0.85em] w-[0.85em] align-[-0.05em]"}`} />
      : <span className={big ? "font-display text-sm font-700" : ""}>{currency}</span>;

  const seg = (active) =>
    `relative rounded-full px-5 py-2 font-display text-sm font-700 transition-colors ${
      active ? "bg-brand-600 text-white" : "text-steel-600 hover:text-brand-950 dark:text-slate-300 dark:hover:text-white"
    }`;

  return (
    <div>
      {/* Controls: currency selector + billing toggle */}
      <div className="mb-12 flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
        <label className="inline-flex items-center gap-2 rounded-full border border-steel-200 bg-white px-3 py-1.5 dark:border-white/15 dark:bg-steel-800">
          <span className="font-display text-xs font-700 uppercase tracking-[0.14em] text-steel-500 dark:text-slate-400">{c.currency}</span>
          <div className="relative inline-flex items-center">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              aria-label={c.currency}
              className="appearance-none rounded-full bg-transparent py-1 pe-6 ps-1 font-display text-sm font-700 text-brand-950 focus:outline-none dark:text-white"
            >
              {CURRENCIES.map((cur) => (
                <option key={cur.code} value={cur.code}>{cur.code}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute end-0"><ChevronDown /></span>
          </div>
        </label>

        <div className="inline-flex items-center gap-1 rounded-full border border-steel-200 bg-white p-1 dark:border-white/15 dark:bg-steel-800">
          <button type="button" onClick={() => setYearly(false)} className={seg(!yearly)}>{c.monthly}</button>
          <button type="button" onClick={() => setYearly(true)} className={seg(yearly)}>
            <span className="inline-flex items-center gap-2">
              {c.yearly}
              <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-700 ${yearly ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"}`}>
                {c.yearlySave}
              </span>
            </span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const bi = bandIdx[plan.key] ?? 0;
          const band = plan.bands ? plan.bands[bi] : null;
          // Per-employee rate for the selected band (yearly = 15% off).
          const rate = band ? (yearly ? band.rate * (1 - YEARLY_DISCOUNT) : band.rate) : 0;
          // Displayed price = TOTAL for the band's MAXIMUM headcount (rate × maxUsers),
          // not the per-employee rate.
          const bandMax = band ? band.upTo : 0;
          const bandTotal = rate * bandMax;
          return (
            <div
              key={plan.key}
              className={`relative flex h-full flex-col rounded-geex border bg-white p-7 dark:bg-steel-800 ${
                isPopular(plan)
                  ? "border-brand-500 shadow-[0_30px_70px_-40px_rgba(37,99,235,0.6)] dark:border-brand-500"
                  : "border-steel-200 dark:border-white/10"
              }`}
            >
              {isPopular(plan) && (
                <span className="absolute -top-3 start-7 rounded-full bg-brand-600 px-3 py-1 font-display text-[0.65rem] font-700 uppercase tracking-[0.14em] text-white">
                  {c.mostPopular}
                </span>
              )}

              <h3 className="font-display text-xl font-800 text-brand-950 dark:text-white">{pick(plan.name, locale)}</h3>
              <p className="mt-1.5 min-h-[2.5rem] text-sm leading-snug text-steel-600 dark:text-slate-300">{pick(plan.tagline, locale)}</p>

              {/* Price */}
              <div className="mt-5">
                {plan.free ? (
                  <span className="font-display text-4xl font-800 text-brand-950 dark:text-white">{c.freePrice}</span>
                ) : plan.invoicedMonthly ? (
                  <span className="font-display text-2xl font-800 text-brand-950 dark:text-white">{c.invoicedMonthly}</span>
                ) : (
                  <>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-display text-4xl font-800 text-brand-950 dark:text-white">{money(bandTotal)}</span>
                      <span className="font-display text-brand-950 dark:text-white"><Sym big /></span>
                    </div>
                    <span className="mt-0.5 block text-sm font-500 text-steel-500 dark:text-slate-400">{(c.perMaxUsers || "for up to {n} users / month").replace("{n}", bandMax)}</span>
                  </>
                )}
              </div>

              {/* Band switch (Small / Medium) or note */}
              {plan.bands ? (
                <div className="mt-4">
                  <span className="mb-1.5 block font-display text-[0.7rem] font-700 uppercase tracking-[0.14em] text-steel-400 dark:text-slate-500">{c.employees}</span>
                  <div className="inline-flex rounded-full border border-steel-200 bg-steel-50 p-1 dark:border-white/15 dark:bg-white/5">
                    {plan.bands.map((b, i) => {
                      const active = i === bi;
                      return (
                        <button
                          key={b.label}
                          type="button"
                          onClick={() => setBandIdx((s) => ({ ...s, [plan.key]: i }))}
                          aria-pressed={active}
                          className={`rounded-full px-3.5 py-1.5 font-display text-xs font-700 transition-colors ${
                            active ? "bg-brand-600 text-white" : "text-steel-600 hover:text-brand-950 dark:text-slate-300 dark:hover:text-white"
                          }`}
                        >
                          {b.label}
                        </button>
                      );
                    })}
                  </div>
                  {yearly && <p className="mt-2 text-xs font-500 text-emerald-600 dark:text-emerald-400">{c.billedYearly}</p>}
                </div>
              ) : (
                <p className="mt-2 text-xs font-500 text-steel-500 dark:text-slate-400">
                  {plan.free ? c.freeNote : c.invoicedNote}
                </p>
              )}

              {/* Users badge */}
              <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-steel-100 px-3 py-1 font-display text-xs font-700 text-brand-950 dark:bg-white/10 dark:text-white">
                {pick(plan.users, locale)}
              </span>

              {/* CTA */}
              {subscribeMode && plan.key === currentPlanKey ? (
                <span className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-50 px-6 py-3 font-display text-sm font-700 uppercase tracking-[0.12em] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  {c.currentPlan || "Current plan"}
                </span>
              ) : subscribeMode && plan.cta !== "contact" ? (
                <button
                  type="button"
                  disabled={busyKey === plan.key}
                  onClick={() => subscribe(plan)}
                  className={`mt-6 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-display text-sm font-700 uppercase tracking-[0.12em] transition-colors disabled:opacity-60 ${
                    isPopular(plan)
                      ? "bg-brand-600 text-white hover:bg-brand-700"
                      : "border border-steel-300 text-brand-950 hover:border-brand-500 dark:border-white/20 dark:text-white"
                  }`}
                >
                  {busyKey === plan.key ? "…" : (c.ctaSelect || "Select plan")} <Arrow />
                </button>
              ) : (
                <Link
                  href={hrefFor(plan)}
                  className={`mt-6 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-display text-sm font-700 uppercase tracking-[0.12em] transition-colors ${
                    isPopular(plan)
                      ? "bg-brand-600 text-white hover:bg-brand-700"
                      : "border border-steel-300 text-brand-950 hover:border-brand-500 dark:border-white/20 dark:text-white"
                  }`}
                >
                  {ctaLabel(plan)} <Arrow />
                </Link>
              )}

              {/* Features */}
              <p className="mt-7 font-display text-xs font-700 uppercase tracking-[0.16em] text-steel-500 dark:text-slate-400">{c.featuresLabel}</p>
              <ul className="mt-3 flex-1 space-y-2.5">
                {pick(plan.features, locale).map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-steel-700 dark:text-slate-200">
                    <Check /> {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="mt-10 text-center text-xs leading-relaxed text-steel-500 dark:text-slate-400">
        {c.vatNote}
        {approx && <> {c.approxNote}</>}
      </p>
    </div>
  );
}
