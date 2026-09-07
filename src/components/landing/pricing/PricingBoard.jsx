"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLandingLocale } from "@/components/landing/locale";
import { landingDict } from "@/shared/landing";
import { AnimatePresence, motion } from "motion/react";
import { fmtCurrencyAmount } from "@/lib/pricing";
import { CONTACT } from "@/lib/site";
import { CURRENCIES_FROM_EXCHANGE_API } from "@/shared/currencies";
import { EASE_OUT_EXPO, fadeUp, stagger, VIEWPORT } from "@/components/landing/lib/motion";
import { MagneticButton } from "../ui/MagneticButton";
import { SectionHeading } from "../ui/SectionHeading";

/* ==================================================================
   Pricing — every card comes from Packages in /super.

   THIS IS THE PAGE'S BOARD, not an in-page view any more. It was
   `views/PricingView`, reached by a tab, and it had no address: a view
   cannot be ranked, cited, or linked to from a directory listing, and
   its figures arrived from a client fetch — which is why the string
   "SAR" appeared nowhere in the served HTML of a product with a
   published price list.

   IT NO LONGER FETCHES. The route renders `buildPricing()` on the
   server and hands the result in as `initial`, so the prices are in the
   first byte of HTML: for a crawler, for a reader with JavaScript off,
   and for anyone on a slow connection. Everything interactive here —
   the monthly/yearly switch, the currency picker, the band selector —
   is an enhancement over a page that already shows real numbers.

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

// The card's own words, keyed the way the card reads them. The dictionary is
// flat and shared with the rest of the marketing page, so the `pv` prefix is
// what keeps `currency` here from colliding with a currency elsewhere.
const copyFor = (tr) => ({
  eyebrow: tr.pvEyebrow,
  title: tr.pvTitle,
  lead: tr.pvLead,
  currency: tr.pvCurrency,
  monthly: tr.pvMonthly,
  yearly: tr.pvYearly,
  freePrice: tr.pvFreePrice,
  freeNote: tr.pvFreeNote,
  perMaxUsers: tr.pvPerMaxUsers,
  employees: tr.pvEmployees,
  billedYearly: tr.pvBilledYearly,
  invoicedMonthly: tr.pvInvoicedMonthly,
  invoicedNote: tr.pvInvoicedNote,
  mostPopular: tr.pvMostPopular,
  featuresLabel: tr.pvIncludes,
  ctaStart: tr.startFree,
  bandTitle: tr.pvBandTitle,
  bandText: tr.pvBandText,
});

const assurancesFor = (tr) => [
  { id: "platform", title: tr.pvAs1Title, body: tr.pvAs1Body },
  { id: "free", title: tr.pvAs2Title, body: tr.pvAs2Body },
  { id: "yearly", title: tr.pvAs3Title, body: tr.pvAs3Body },
];

export function PricingBoard({ initial = null, locale = "en" }) {
  const tr = landingDict(useLandingLocale());
  const COPY = copyFor(tr);
  const [yearly, setYearly] = useState(false);
  // THE SERVER ALWAYS RENDERS THE BASE CURRENCY, and the reader's own is
  // applied after mount.
  //
  // The prices are authored in ONE currency and that currency is what has to
  // reach the HTML: the measurement that started this rebuild was that it
  // appeared nowhere in the served markup of a product with a published price
  // list. Opening in a geo-guessed currency during the first render would put a
  // different one there and quietly reproduce the defect — with the JSON-LD
  // still quoting the base, so the page and its own markup would disagree about
  // what the product costs.
  //
  // WHICH currency that is comes from `catalogSettings.baseCurrency` and is
  // carried here on `initial.base`. It used to be the literal "SAR", which made
  // one country's money the origin in a product built in Jordan and sold
  // regionally and then globally. The argument above is unchanged and holds for
  // any base; only the hard-coding is gone.
  //
  // The switch below is a DEFAULT for a person, not a decision: it runs once,
  // only if the snapshot actually quotes that currency, and never after the
  // picker has been touched — reaching in afterwards would fight the reader.
  const [currency, setCurrency] = useState(initial?.base || "USD");
  const pickedOwn = useRef(false);
  useEffect(() => {
    if (pickedOwn.current) return;
    const own = initial?.currency;
    if (own && own !== (initial?.base || "USD") && initial?.rates?.[own]) setCurrency(own);
  }, [initial]);

  // ALREADY HERE, rendered on the server by the route that mounts this. It
  // used to be fetched on mount, so the price list existed only after
  // JavaScript ran — invisible to every engine and to anyone whose script
  // never arrived.
  const live = initial;

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
    plan.type === "free" ? tr.startFree : plan.type === "premium" ? tr.contactSales : tr.pvGetStarted;

  // EVERY CURRENCY, ONE TREATMENT. SAR used to be drawn here as a glyph while the
  // other 165 showed their letters — one country's money given a courtesy no
  // other gets, on the public pricing page of a product sold regionally and then
  // globally. `components/Riyal` is deleted rather than left unused.
  const Sym = ({ big = false }) => (
    <span className={big ? "font-display text-lg font-600" : ""}>{currency}</span>
  );

  return (
    <section className="mx-auto max-w-7xl px-6 pb-24 pt-32 lg:pt-40">
      {/* THE PAGE'S H1. This board is a route now, not a section of one,
          so its heading is the document heading — it rendered with no h1 at
          all until this was passed. */}
      <SectionHeading as="h1" align="center" eyebrow={COPY.eyebrow} title={COPY.title} description={COPY.lead} />

      {/* Controls — currency selector + billing toggle. The sliding pill is a
          shared layoutId, so it glides between states. */}
      <motion.div
        // Rise only — an entrance that starts at opacity 0 is written into the
        // server-rendered style attribute and hides this row from anything that
        // does not run JavaScript.
        initial={{ y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: EASE_OUT_EXPO }}
        className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
      >
        <CurrencyPicker
          value={currency}
          options={currencyOptions}
          // A DELIBERATE CHOICE, marked as one. Once the reader has picked a
          // currency, the geo default must never reach in and change it back.
          onChange={(code) => { pickedOwn.current = true; setCurrency(code); }}
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
          <p className="col-span-full py-12 text-center text-sm text-fg-dim">{tr.loadingPrices}</p>
        )}
        {!loading && cards.length === 0 && (
          <p className="col-span-full py-12 text-center text-sm text-fg-dim">
            {tr.pvNoPackages}
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
                    /* A REAL DESTINATION, because this button had none. It
                       called `onNavigate("contact")` — a prop this component
                       does not take and never has, left behind when the board
                       stopped being an in-page view (`views/PricingView`) and
                       became a route: inside the landing page's tab tree that
                       function was in scope, and on `/[locale]/pricing` there is
                       nothing to swap and nothing to call. So the premium plan's
                       only call to action THREW when it was clicked. ESLint knew
                       (`no-undef`), and lint:budget was failing on it.

                       IT IS THE SALES MAILBOX, not the contact form, and that is
                       a deliberate stop rather than the end state. The form is
                       still an in-page view with no address of its own — see
                       views/views.js, which says contact becomes a route in the
                       change that gives it a backend, and it now has one — so
                       there is no URL to send anybody to yet. Until there is,
                       this does what the Security page's contact section already
                       does with the same CONTACT constants, and it goes to
                       `sales` because `mailboxFor` sends any team of ten or more
                       there and every plan carrying this CTA is larger than
                       that. A mailto that works beats a form you cannot link
                       to. */
                    <MagneticButton
                      variant="ghost"
                      strength={10}
                      href={`mailto:${CONTACT.sales}`}
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
        {assurancesFor(tr).map((item) => (
          <motion.div key={item.id} variants={fadeUp} className="rounded-2xl border border-line bg-ink-soft/50 p-6">
            <h4 className="font-display text-sm font-600">{item.title}</h4>
            <p className="mt-2 text-sm text-fg-muted">{item.body}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Closing band */}
      <motion.div
        // Rise only, for the reason above: this band carries a heading and
        // three paragraphs, and they have to be in the HTML.
        initial={{ y: 20 }}
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
  const tr = landingDict(useLandingLocale());
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
              placeholder={tr.searchCodeNameCountry}
              aria-label={tr.searchCurrencies}
              className="w-full rounded-xl bg-ink/60 px-3 py-2 text-sm text-fg placeholder:text-fg-dim/70 focus:outline-none focus:ring-1 focus:ring-fg-dim/40"
            />
          </div>
          <ul role="listbox" aria-label={label} className="max-h-64 overflow-y-auto py-1">
            {results.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-fg-dim">{tr.nothingMatches}</li>
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
                  {c.code === value && <span className="text-xs text-fg">{tr.selected}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
