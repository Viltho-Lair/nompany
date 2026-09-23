"use client";

import { useMemo, useState } from "react";
import { useLandingLocale } from "@/components/landing/locale";
import { landingDict } from "@/shared/landing";
import { AnimatePresence, motion } from "motion/react";
import { fmtCurrencyAmount } from "@/lib/pricing";
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
   the monthly/yearly switch and the band selector —
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
  // THE PRICES ARE THE VISITOR'S REGION'S, AND THERE IS NO PICKER (23/09/2026,
  // the owner, after Steam). This used to render the base list, then switch to
  // the visitor's currency after mount and multiply by today's rate — a price
  // that was a guess at the conversion, which the checkout would never have
  // charged. The server now hands over one region's list with the figures
  // already fixed in its currency (modules/marketing/pricing), so what is
  // rendered first is what is charged, and the JSON-LD quotes the same numbers.
  //
  // No picker, deliberately: offering every region's list is how a buyer
  // shops for the cheapest one, and the checkout prices by the country of the
  // payment method anyway (shared/priceRegions).
  //
  // ALREADY HERE, rendered on the server by the route that mounts this. It
  // used to be fetched on mount, so the price list existed only after
  // JavaScript ran — invisible to every engine and to anyone whose script
  // never arrived.
  const live = initial;
  const currency = live?.currency || "USD";
  const regionName = (locale === "ar" && live?.region?.nameAr) || live?.region?.name || "";

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
  // THE FIGURE IS ALREADY IN THE REGION'S CURRENCY — nothing is converted
  // here any more, so nothing is rounded here either: the amount shown is the
  // amount the region was priced at, to that currency's own decimals.
  const money = (amount) => fmtCurrencyAmount(amount, currency);

  // Package key carried to signup — banded plans include the chosen band.
  const packageKeyFor = (plan) =>
    plan.bands ? `${plan.key}-${(bandIdx[plan.key] ?? 0) + 1}` : plan.key;
  // Nothing to show until /super answers. An empty grid says "loading", where
  // stale hardcoded prices would say something false with confidence.
  const loading = live === null;
  const signupHref = (plan) => `/${locale}/signup?package=${packageKeyFor(plan)}`;

  // EVERY CARD'S BUTTON IS A LINK, and the premium one was not.
  //
  // It called `onNavigate("contact")` — a prop this component has never
  // declared and this page can never pass, because `pricing/page.js` is a
  // Server Component and a function does not cross that boundary. So the
  // board's own "Contact sales" threw the moment anybody pressed it, and it is
  // the only thing in the repository ESLint calls an error rather than a
  // warning: `no-undef` was reporting a runtime crash, not a style.
  //
  // The fix is the address, not the prop. Contact was the last in-page view,
  // and its own comment said it becomes a route once it has a backend that
  // sends; `/api/contact` sends. A button that swaps a client view cannot be
  // opened in a new tab, linked to, or followed by a crawler — which is the
  // argument that moved this very board out of the views.
  const ctaHref = (plan) =>
    plan.cta === "contact" ? `/${locale}/contact` : signupHref(plan);

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

      {/* Controls — whose prices these are + billing toggle. The sliding pill is a
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
        {/* WHOSE PRICES THESE ARE, said rather than picked. A fallback list
            (the visitor's region could not be priced today) says only its
            currency, because naming a region the visitor is not in would be
            the wrong claim. */}
        <p className="text-xs text-fg-muted">
          {live?.priced === "region" && !live?.region?.isDefault && regionName ? tr.pvPricesFor(regionName, currency) : tr.pvPricesFallback(currency)}
        </p>
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
                  {/* ONLY WHEN THERE IS A SAVING TO NAME. `discountPct` comes
                      from the catalogue settings in /super, which default to
                      zero — so this badge published "Save 0%" on both language
                      versions of the pricing page: a nought dressed as an
                      offer, and the same defect as the empty package card
                      beside it. Nought off is not a discount, it is the absence
                      of one, and the toggle says "Yearly" perfectly well alone.
                      It was also hard-coded English on a bilingual site. */}
                  {option.id === "yearly" && discountPct > 0 && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[0.65rem] font-600 ${
                        isActive ? "bg-white/20 text-white" : "bg-mint/15 text-mint"
                      }`}
                    >
                      {tr.pvSave(discountPct)}
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

                {/* Price — swaps with a vertical slide when billing
                    period or band changes. The fixed heights here and on the
                    band switch below keep all four CTAs on one line. */}
                <div className="mt-6">
                  <div className="flex h-11 items-baseline gap-1.5 overflow-hidden">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={`${plan.key}-${yearly}-${bi}`}
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
                      ? COPY.freeNote(Number(plan.durationMonths) || 0)
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
                  {/* A REAL DESTINATION, and it took two commits to get one.
                      This button called `onNavigate("contact")` — a prop the
                      component does not take and never has, left behind when
                      the board stopped being an in-page view
                      (`views/PricingView`) and became a route: inside the
                      landing page's tab tree that function was in scope, and on
                      `/[locale]/pricing` there is nothing to swap and nothing to
                      call. So the premium plan's only call to action THREW when
                      it was clicked, ESLint knew (`no-undef`), and lint:budget
                      was failing on it.

                      IT WENT TO `mailto:CONTACT.sales` FIRST, deliberately and
                      temporarily: the contact FORM was still an in-page view
                      with no address, so there was no URL to send anybody to,
                      and a mailto that works beats a form you cannot link to.
                      `views/views.js` set the release condition — contact
                      becomes a route in the change that gives it a backend that
                      actually sends. `/api/contact` sends, the route exists, so
                      the stop is over and this is the destination it was
                      standing in for. The mailbox is not lost: the form still
                      routes by team size through `mailboxFor`, which is more
                      than a hardcoded `sales` could do.

                      One button, two destinations. The premium card stays ghost
                      whether or not it is marked popular — "Contact sales" is
                      not the press this page is steering anybody towards. */}
                  <MagneticButton
                    variant={plan.cta !== "contact" && plan.popular ? "primary" : "ghost"}
                    strength={10}
                    href={ctaHref(plan)}
                    className="w-full justify-center px-5 py-3"
                  >
                    {ctaLabel(plan)}
                  </MagneticButton>
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


      {/* TIERS, BOUGHT BESIDE A PACKAGE and priced per month (the owner,
          23/09/2026), in the same region's currency as the cards above. The
          monthly/yearly switch moves these too — one switch, one period, for
          everything on the page. Services are listed by name because a count
          cannot tell a buyer whether the one they need is in. */}
      {!loading && (live?.tiers || []).length > 0 && (
        <div className="mt-16">
          <SectionHeading align="center" title={tr.pvTiersTitle} description={tr.pvTiersLead} />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {live.tiers.map((tier) => {
              const amount = yearly ? tier.yearly : tier.monthly;
              return (
                <article key={tier.id} className="surface flex flex-col rounded-2xl p-6">
                  <h3 className="font-display text-lg font-600">{tier.name}</h3>
                  <p className="mt-4 flex items-baseline gap-1.5 font-display font-600 tabular-nums">
                    {tier.monthly > 0 ? (
                      <>
                        <span className="text-3xl">{money(amount)}</span>
                        <Sym />
                        <span className="text-sm font-400 text-fg-dim">{yearly ? tr.pvPerYear : tr.pvPerMonth}</span>
                      </>
                    ) : (
                      <span className="text-2xl">{tr.pvTierIncluded}</span>
                    )}
                  </p>
                  {tier.durationMonths > 0 && (
                    <span className="mt-3 inline-flex w-fit rounded-full bg-ink/50 px-3 py-1 text-xs text-fg-muted">
                      {tr.pvMonths(tier.durationMonths)}
                    </span>
                  )}
                  {tier.services.length > 0 && (
                    <ul className="mt-5 space-y-2">
                      {tier.services.map((name) => (
                        <li key={name} className="text-sm text-fg-muted">{name}</li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* TAX IS ADDED ON TOP (the owner, 23/09/2026), so every figure above is
          before it — said once, under the cards, with the rate /super holds. */}
      {!loading && cards.length > 0 && live?.taxPercent > 0 && (
        <p className="mt-6 text-center text-xs text-fg-dim">{tr.pvTaxNote(live.taxPercent)}</p>
      )}

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
