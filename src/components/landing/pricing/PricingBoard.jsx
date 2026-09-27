"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { useLandingLocale } from "@/components/landing/locale";
import { landingDict } from "@/shared/landing";
import { fmtCurrencyAmount } from "@/lib/pricing";
import { Forward } from "@/components/landing/site/Chrome";
import { CELL_IN, Cta, EASE, RISE_SMALL, SPRING, useInViewReveal } from "@/components/landing/site/primitives";

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

   THE SITE'S DESIGN (27/09/2026). The board sits inside SiteShell and
   draws with the home page's parts — the same glass cards, pills and
   spotlight edge as the Bento, the same `Cta`. NOTHING IS HIDDEN BY
   MOTION'S `initial`: every entrance is `useInViewReveal` (CSS hides
   `[data-sm]` only once the boot script has armed motion), and the
   price swap's `initial` is suppressed on first render by
   `AnimatePresence initial={false}`, so the server HTML carries every
   name and every figure at full opacity.
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

// The home page's card, verbatim: a faint pane with an inset hairline.
const PANE = "rounded-3xl bg-white/[0.025] ring-1 ring-inset ring-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]";
// The recommended plan's light — the Bento pricing cell's accent, from the top.
const POPULAR_TINT = "radial-gradient(120% 70% at 50% 0%, rgba(139,124,255,0.24), rgba(139,124,255,0) 62%)";
const BAND_TINT = "radial-gradient(130% 120% at 0% 100%, rgba(139,124,255,0.42), rgba(76,60,190,0.14) 45%, rgba(139,124,255,0) 75%)";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b7cff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07070a]";

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
            // The band's catalogue id travels to signup with the package's.
            id: cat.id,
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

  // Nothing to show until /super answers. An empty grid says "loading", where
  // stale hardcoded prices would say something false with confidence.
  const loading = live === null;
  // THE CHOICE GOES THROUGH /api/intent, which remembers it in a signed cookie
  // and then sends the visitor to signup (or, signed in, to studio creation).
  // It used to be `/signup?package=<id>-<band index>`, which nothing on signup
  // read — every choice died there (24/09/2026). CATALOGUE IDS now, package and
  // band both, never a position: a band index names a different band the day
  // one is added in /super. The free card sends no package, which CLEARS any
  // choice made earlier, so "start free" never inherits a paid pre-selection.
  const signupHref = (plan) => {
    if (plan.free) return `/api/intent?locale=${locale}`;
    const band = plan.bands ? plan.bands[bandIdx[plan.key] ?? 0] : null;
    const q = new URLSearchParams({ locale, package: plan.key, cycle: yearly ? "yearly" : "monthly" });
    if (band?.id) q.set("band", band.id);
    return `/api/intent?${q}`;
  };

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

  const eyebrow = useInViewReveal(0, RISE_SMALL);
  const title = useInViewReveal(0.06);
  const lead = useInViewReveal(0.12, RISE_SMALL);
  const controls = useInViewReveal(0.18, RISE_SMALL, 0.1);
  const tiersHead = useInViewReveal(0);
  const band = useInViewReveal(0, CELL_IN, 0.2);

  return (
    <section className="relative px-6 pb-28 pt-36 md:px-10 md:pb-40 md:pt-44">
      <div className="mx-auto max-w-[1280px]">
        {/* THE PAGE'S H1. This board is a route now, not a section of one,
            so its heading is the document heading — it rendered with no h1 at
            all until this was passed. */}
        <header className="max-w-[46rem]">
          <motion.p
            {...eyebrow}
            className="inline-flex min-h-8 items-center rounded-full bg-white/[0.05] px-3.5 py-1.5 text-[13px] text-white/75 ring-1 ring-inset ring-white/10 backdrop-blur-md"
          >
            {COPY.eyebrow}
          </motion.p>
          <motion.h1
            {...title}
            className="mt-7 text-[2.6rem] font-medium leading-[1.05] tracking-[-0.035em] md:text-[4rem] rtl:leading-[1.25] rtl:tracking-normal"
          >
            {COPY.title}
          </motion.h1>
          <motion.p {...lead} className="mt-6 max-w-[56ch] text-[16px] leading-relaxed text-[#9d9dab] md:text-[17px]">
            {COPY.lead}
          </motion.p>
        </header>

        {/* Controls — whose prices these are + billing toggle. */}
        <motion.div {...controls} className="mt-14 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* WHOSE PRICES THESE ARE, said rather than picked. A fallback list
              (the visitor's region could not be priced today) says only its
              currency, because naming a region the visitor is not in would be
              the wrong claim. */}
          <p className="text-[13px] text-white/55">
            {live?.priced === "region" && !live?.region?.isDefault && regionName ? tr.pvPricesFor(regionName, currency) : tr.pvPricesFallback(currency)}
          </p>
          <Segmented
            pillId="billing-pill"
            value={yearly ? "yearly" : "monthly"}
            onChange={(id) => setYearly(id === "yearly")}
            options={[
              { id: "monthly", label: COPY.monthly },
              {
                id: "yearly",
                label: COPY.yearly,
                // ONLY WHEN THERE IS A SAVING TO NAME. `discountPct` comes from
                // the catalogue settings in /super, which default to zero — so
                // this badge published "Save 0%" on both language versions of
                // the pricing page: a nought dressed as an offer. Nought off is
                // not a discount, it is the absence of one, and the toggle says
                // "Yearly" perfectly well alone.
                badge: discountPct > 0 ? tr.pvSave(discountPct) : null,
              },
            ]}
          />
        </motion.div>

        {/* Plans */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading && (
            <p className="col-span-full py-12 text-center text-[14px] text-white/55">{tr.loadingPrices}</p>
          )}
          {!loading && cards.length === 0 && (
            <p className={`${PANE} col-span-full px-6 py-14 text-center text-[15px] text-white/60`}>{tr.pvNoPackages}</p>
          )}
          {cards.map((plan, i) => {
            const bi = bandIdx[plan.key] ?? 0;
            const planBand = plan.bands ? plan.bands[bi] : null;
            // Every figure comes from /super. A compound package prices by its
            // chosen category; free and premium show no number at all.
            const bandMax = planBand ? planBand.upTo : plan.maxEmployees || 0;
            const bandTotal = planBand ? (yearly ? planBand.yearly : planBand.monthly) : (yearly ? plan.yearly : plan.monthly);

            return (
              <PlanCard key={plan.key} i={i} popular={plan.popular}>
                {plan.popular && (
                  <span className="absolute end-5 top-5 rounded-full bg-[#8b7cff]/15 px-2.5 py-1 text-[11px] font-medium text-[#c9c2ff] ring-1 ring-inset ring-[#8b7cff]/30">
                    {COPY.mostPopular}
                  </span>
                )}

                <h2 className={`${plan.popular ? "pe-28" : ""} text-[1.2rem] font-medium tracking-[-0.02em] rtl:tracking-normal`}>{plan.name}</h2>
                <p className="mt-2 min-h-[2.75rem] text-[14px] leading-relaxed text-[#9a9aa8]">{plan.tagline}</p>

                {/* Price — crossfades out of focus when the billing period or
                    band changes. The fixed heights here and on the band switch
                    below keep every CTA on one line. */}
                <div className="mt-6">
                  <div className="flex h-12 items-baseline overflow-hidden">
                    <PriceSwap swapKey={`${plan.key}-${yearly}-${bi}`}>
                      {plan.free ? (
                        <span className="text-[2.5rem] leading-none">{COPY.freePrice}</span>
                      ) : plan.invoicedMonthly ? (
                        <span className="text-[1.6rem] leading-none">{COPY.invoicedMonthly}</span>
                      ) : (
                        <>
                          <span className="text-[2.5rem] leading-none">{money(bandTotal)}</span>
                          {/* EVERY CURRENCY, ONE TREATMENT. SAR used to be drawn
                              as a glyph while the other 165 showed their letters;
                              `components/Riyal` is deleted rather than left unused. */}
                          <span className="text-[15px] font-normal text-white/55">{currency}</span>
                        </>
                      )}
                    </PriceSwap>
                  </div>

                  <p className="mt-2 min-h-[2.5rem] text-[13px] leading-snug text-white/55">
                    {plan.free
                      ? COPY.freeNote(Number(plan.durationMonths) || 0)
                      : plan.invoicedMonthly
                        ? COPY.invoicedNote
                        : COPY.perMaxUsers.replace("{n}", String(bandMax))}
                  </p>
                </div>

                {/* Headcount band switch */}
                <div className="mt-4 min-h-[5rem]">
                  {plan.bands && (
                    <>
                      <span className="mb-2 block text-[12px] text-white/55">{COPY.employees}</span>
                      <Segmented
                        size="sm"
                        pillId={`band-pill-${plan.key}`}
                        value={bi}
                        onChange={(idx) => setBandIdx((s) => ({ ...s, [plan.key]: idx }))}
                        options={plan.bands.map((b, idx) => ({ id: idx, key: b.label, label: b.label }))}
                      />
                      {yearly && <p className="mt-2 text-[12px] text-[#c9c2ff]">{COPY.billedYearly}</p>}
                    </>
                  )}
                </div>

                {/* Headcount badge, and the term beside it. */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {plan.users ? (
                    <span className="inline-flex rounded-full bg-white/[0.05] px-3 py-1 text-[12px] text-white/70 ring-1 ring-inset ring-white/10">{plan.users}</span>
                  ) : null}
                  {plan.durationMonths > 0 && (
                    <span className="inline-flex rounded-full bg-white/[0.05] px-3 py-1 text-[12px] text-white/70 ring-1 ring-inset ring-white/10">
                      {tr.pvMonths(plan.durationMonths)}
                    </span>
                  )}
                </div>

                <div className="mt-6">
                  {/* A REAL DESTINATION, and it took two commits to get one.
                      This button called `onNavigate("contact")` — a prop the
                      component does not take and never has, left behind when
                      the board stopped being an in-page view
                      (`views/PricingView`) and became a route. It then went to
                      `mailto:CONTACT.sales`, deliberately and temporarily, until
                      contact became a route with a backend that sends;
                      `/api/contact` sends, so this is the destination it was
                      standing in for. The form still routes by team size through
                      `mailboxFor`, which is more than a hardcoded `sales` could do.

                      One button, two destinations. The premium card stays ghost
                      whether or not it is marked popular — "Contact sales" is
                      not the press this page is steering anybody towards. */}
                  <Cta
                    href={ctaHref(plan)}
                    variant={plan.cta !== "contact" && plan.popular ? "primary" : "ghost"}
                    className="w-full justify-center"
                  >
                    {ctaLabel(plan)}
                    <Forward size={15} />
                  </Cta>
                </div>

                <p className="mt-8 text-[12px] text-white/55">{COPY.featuresLabel}</p>
                <ul className="mt-3 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2.5 text-[14px] leading-snug text-white/70">
                      <span
                        aria-hidden="true"
                        className={`mt-px grid size-[18px] shrink-0 place-items-center rounded-full ring-1 ring-inset ${
                          plan.popular ? "bg-[#8b7cff]/15 text-[#c9c2ff] ring-[#8b7cff]/30" : "bg-white/[0.04] text-white/60 ring-white/10"
                        }`}
                      >
                        <Check size={11} strokeWidth={2.5} />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </PlanCard>
            );
          })}
        </div>

        {/* TAX IS ADDED ON TOP (the owner, 23/09/2026), so every figure above is
            before it — said once, under the cards, with the rate /super holds. */}
        {!loading && cards.length > 0 && live?.taxPercent > 0 && (
          <p className="mt-5 text-center text-[13px] text-white/55">{tr.pvTaxNote(live.taxPercent)}</p>
        )}

        {/* TIERS, BOUGHT BESIDE A PACKAGE and priced per month (the owner,
            23/09/2026), in the same region's currency as the cards above. The
            monthly/yearly switch moves these too — one switch, one period, for
            everything on the page. Services are listed by name because a count
            cannot tell a buyer whether the one they need is in. */}
        {!loading && (live?.tiers || []).length > 0 && (
          <div className="mt-28 md:mt-36">
            <motion.div {...tiersHead}>
              <h2 className="text-[2rem] font-medium leading-[1.1] tracking-[-0.035em] md:text-[3rem] rtl:tracking-normal">{tr.pvTiersTitle}</h2>
              <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-[#8f8f9c]">{tr.pvTiersLead}</p>
            </motion.div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {live.tiers.map((tier, i) => {
                const amount = yearly ? tier.yearly : tier.monthly;
                return (
                  <PlanCard key={tier.id} i={i}>
                    <h3 className="text-[1.2rem] font-medium tracking-[-0.02em] rtl:tracking-normal">{tier.name}</h3>
                    <div className="mt-5 flex h-10 items-baseline overflow-hidden">
                      <PriceSwap swapKey={`${tier.id}-${yearly}`}>
                        {tier.monthly > 0 ? (
                          <>
                            <span className="text-[2rem] leading-none">{money(amount)}</span>
                            <span className="text-[14px] font-normal text-white/55">{currency}</span>
                            <span className="text-[14px] font-normal text-white/55">{yearly ? tr.pvPerYear : tr.pvPerMonth}</span>
                          </>
                        ) : (
                          <span className="text-[1.6rem] leading-none">{tr.pvTierIncluded}</span>
                        )}
                      </PriceSwap>
                    </div>
                    {tier.durationMonths > 0 && (
                      <span className="mt-4 inline-flex w-fit rounded-full bg-white/[0.05] px-3 py-1 text-[12px] text-white/70 ring-1 ring-inset ring-white/10">
                        {tr.pvMonths(tier.durationMonths)}
                      </span>
                    )}
                    {tier.services.length > 0 && (
                      <ul className="mt-6 space-y-2.5 border-t border-white/[0.07] pt-5">
                        {tier.services.map((name) => (
                          <li key={name} className="flex gap-2.5 text-[14px] leading-snug text-white/70">
                            <span aria-hidden="true" className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[#8b7cff]/70" />
                            {name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </PlanCard>
                );
              })}
            </div>
          </div>
        )}

        {/* Assurances — all three are statements the pricing model actually backs. */}
        <ul className="mt-28 grid gap-4 md:mt-36 md:grid-cols-3">
          {assurancesFor(tr).map((item, i) => (
            <Assurance key={item.id} i={i} title={item.title} body={item.body} />
          ))}
        </ul>

        {/* Closing band — the Bento's pricing cell, turned round to point at signup. */}
        <motion.div {...band} className={`relative isolate mt-4 overflow-hidden p-8 md:p-12 ${PANE}`}>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={{ background: BAND_TINT }} />
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-[36rem]">
              <h2 className="text-[2rem] font-medium leading-[1.08] tracking-[-0.035em] md:text-[2.75rem] rtl:leading-[1.3] rtl:tracking-normal">
                {COPY.bandTitle}
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-white/70">{COPY.bandText}</p>
            </div>
            <Cta href={`/api/intent?locale=${locale}`}>
              {COPY.ctaStart}
              <Forward />
            </Cta>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/**
 * A card that arrives out of focus in a short cascade, with the Bento's light
 * following the cursor across it and lighting its edge. The recommended plan
 * carries the accent's glow from the top and a stronger hairline.
 */
function PlanCard({ i, popular = false, children }) {
  const reveal = useInViewReveal(Math.min(i, 5) * 0.08, CELL_IN, 0.15);
  const mx = useMotionValue(-600);
  const my = useMotionValue(-600);
  const glow = useMotionTemplate`radial-gradient(420px circle at ${mx}px ${my}px, rgba(139,124,255,0.12), transparent 60%)`;
  const edge = useMotionTemplate`radial-gradient(260px circle at ${mx}px ${my}px, rgba(214,208,255,0.6), transparent 70%)`;

  function move(e) {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
  }
  function leave() {
    mx.set(-600);
    my.set(-600);
  }

  return (
    <motion.article
      {...reveal}
      onPointerMove={move}
      onPointerLeave={leave}
      className={`relative isolate flex flex-col overflow-hidden rounded-3xl p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-inset md:p-7 ${
        popular ? "bg-white/[0.04] ring-[#8b7cff]/35" : "bg-white/[0.025] ring-white/[0.07]"
      }`}
    >
      {popular ? <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={{ background: POPULAR_TINT }} /> : null}
      <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={{ background: glow }} />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-3xl p-px"
        style={{
          background: edge,
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      {children}
    </motion.article>
  );
}

/**
 * A figure that changes in place: the old one lifts away out of focus while
 * the new one settles. `initial={false}` on the presence means the first
 * render — the server's — is the settled figure, never a hidden one.
 */
function PriceSwap({ swapKey, children }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={swapKey}
        initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={reduce ? undefined : { opacity: 0, y: -14, filter: "blur(6px)" }}
        transition={{ duration: 0.32, ease: EASE }}
        className="flex items-baseline gap-1.5 font-medium tabular-nums tracking-[-0.03em] rtl:tracking-normal"
      >
        {children}
      </motion.span>
    </AnimatePresence>
  );
}

/**
 * The site's segmented pill (as on the home page's charts), with the selected
 * fill gliding between options on a spring. Buttons with `aria-pressed`, the
 * same semantics the board had.
 */
function Segmented({ options, value, onChange, pillId, size = "md" }) {
  const reduce = useReducedMotion();
  const pad = size === "sm" ? "px-3 py-1.5 text-[12px]" : "px-4 py-2 text-[13px] sm:text-[14px]";
  return (
    <div className="inline-flex w-fit max-w-full flex-wrap items-center gap-0.5 rounded-full bg-white/[0.04] p-1 ring-1 ring-inset ring-white/10">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.key ?? o.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.id)}
            className={`relative rounded-full font-medium transition-colors duration-200 ${pad} ${FOCUS} ${
              active ? "text-[#0b0b10]" : "text-white/65 hover:text-white"
            }`}
          >
            {active && (
              <motion.span
                layoutId={pillId}
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-[#ececf1]"
                transition={reduce ? { duration: 0 } : SPRING}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-2">
              {o.label}
              {o.badge ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors duration-200 ${
                    active ? "bg-[#0b0b10]/10 text-[#0b0b10]" : "bg-[#8b7cff]/15 text-[#c9c2ff]"
                  }`}
                >
                  {o.badge}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Assurance({ i, title, body }) {
  const reveal = useInViewReveal(i * 0.08, CELL_IN, 0.3);
  return (
    <motion.li {...reveal} className={`p-7 ${PANE}`}>
      <span aria-hidden="true" className="font-mono text-[12px] tabular-nums text-[#c9c2ff]" dir="ltr">
        {String(i + 1).padStart(2, "0")}
      </span>
      <h3 className="mt-5 text-[1.15rem] font-medium tracking-[-0.02em] rtl:tracking-normal">{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-[#9a9aa8]">{body}</p>
    </motion.li>
  );
}
