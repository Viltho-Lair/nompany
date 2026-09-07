import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { buildMetadata, breadcrumbLd, urlFor } from "@/lib/seo";
import { PLANS, VAT_RATE, YEARLY_DISCOUNT, fmtSar, pick } from "@/lib/pricing";
import { pricingCopy } from "@/shared/marketing/pricing";
import { getDict } from "@/shared/i18n";
import { dirFor } from "@/shared/locale";

/* PRICING, WITH THE PRICES IN THE HTML.
   ------------------------------------------------------------------
   This page exists because pricing was an in-page view with no address:
   the string "SAR" did not appear anywhere in the served HTML of a
   product with a published price list, and the figures arrived from a
   client fetch, which is why no engine has ever seen one. A view cannot
   be ranked, cited, or linked to from a directory listing.

   EVERY NUMBER IS READ FROM `PLANS` AT RENDER — the same table the app
   bills against. None is written into the copy module, because a price
   typed into marketing copy is free to disagree with the one charged
   and the reader cannot tell which is which.

   HEADCOUNT PLANS ONLY. `lib/pricing` also holds CORE/DEPARTMENTS/
   PRESETS — the in-app a-la-carte department checkout. That is a
   different pricing model for a different moment and it never appears
   here; the two live in one file and are easy to confuse. */

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildMetadata({ locale, path: "/pricing" });
}

// THE CURRENCY CODE IS PRINTED, not implied.
//
// `fmtSar` groups the digits and stops there — it returns "150", not "SAR 150".
// The measurement that started this rebuild was that the string "SAR" appears
// NOWHERE in the served HTML of a product with a published price list, and a
// page of bare numbers would have reproduced that defect while looking fixed.
// Printed in both locales rather than swapped for ر.س in Arabic: it is an ISO
// code, it matches what the JSON-LD `priceCurrency` states, and an Arabic
// searcher looking for SAR pricing finds the page either way.
const CURRENCY = "SAR";

/** SAR per employee per month, as a range when the plan steps across bands. */
function rateLabel(plan, locale) {
  if (plan.free) return null;
  if (!plan.bands?.length) return null;
  const rates = plan.bands.map((b) => b.rate);
  const lo = Math.min(...rates);
  const hi = Math.max(...rates);
  return lo === hi
    ? `${CURRENCY} ${fmtSar(lo)}`
    : `${CURRENCY} ${fmtSar(lo)} – ${fmtSar(hi)}`;
}

export default async function PricingPage({ params }) {
  const { locale } = await params;
  const tr = pricingCopy(locale);
  const dict = getDict(locale);
  const dir = dirFor(locale);

  const free = PLANS.find((p) => p.free);
  const paid = PLANS.filter((p) => !p.free);

  // `Offer` per plan, driven by the same table the page renders — the markup
  // and the page cannot state different prices because they read one source.
  const offers = PLANS.map((plan) => {
    const rates = plan.bands?.map((b) => b.rate) || [];
    return {
      "@type": "Offer",
      name: pick(plan.name, locale),
      priceCurrency: "SAR",
      ...(plan.free
        ? { price: 0 }
        : rates.length
          ? {
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                priceCurrency: "SAR",
                minPrice: Math.min(...rates),
                maxPrice: Math.max(...rates),
                valueAddedTaxIncluded: true,
                unitText: "employee/month",
              },
            }
          : {}),
      eligibleQuantity: {
        "@type": "QuantitativeValue",
        minValue: plan.minUsers,
        ...(plan.maxUsers ? { maxValue: plan.maxUsers } : {}),
      },
    };
  });

  const structured = [
    breadcrumbLd([
      { name: dict.nav.home, url: urlFor(locale, "") },
      { name: tr.title, url: urlFor(locale, "/pricing") },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "nompany",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: offers,
    },
  ];

  return (
    <>
      <JsonLd data={structured} />
      <div dir={dir} className="container-page py-14 sm:py-20">
        <header className="max-w-2xl">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {tr.title}
          </h1>
          <p className="mt-5 text-lg text-steel-700 dark:text-slate-300">{tr.lead}</p>
        </header>

        {/* THE FREE PLAN IS STATED FIRST AND PLAINLY. It is the whole product
            for teams under ten, and burying it under the paid bands would be
            the one thing a reader remembers wrongly. */}
        {free ? (
          <section className="mt-12 rounded-2xl border border-brand-500/25 bg-brand-500/[0.04] p-7 sm:p-9">
            <p className="font-display text-xs uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">
              {tr.freeEyebrow}
            </p>
            <div className="mt-3 flex flex-wrap items-baseline gap-3">
              <p className="font-display text-4xl font-semibold sm:text-5xl">
                {CURRENCY} {fmtSar(0)}
              </p>
              <p className="text-steel-700 dark:text-slate-300">
                {pick(free.users, locale)}
              </p>
            </div>
            <p className="mt-4 max-w-xl text-steel-700 dark:text-slate-300">
              {pick(free.tagline, locale)}
            </p>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {(pick(free.features, locale) || []).map((f) => (
                <li key={f} className="text-sm text-steel-700 dark:text-slate-300">
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={`/${locale}/signup`}
              className="mt-7 inline-flex items-center rounded-full bg-brand-600 px-6 py-3 font-display text-sm font-600 text-white transition-colors hover:bg-brand-700"
            >
              {tr.freeCta}
            </Link>
          </section>
        ) : null}

        <section className="mt-14">
          <div className="grid gap-5 lg:grid-cols-3">
            {paid.map((plan) => {
              const rate = rateLabel(plan, locale);
              return (
                <div
                  key={plan.key}
                  className="flex flex-col rounded-2xl border border-steel-400/20 p-6 dark:border-white/10"
                >
                  <p className="font-display text-lg font-600">
                    {pick(plan.name, locale)}
                  </p>
                  <p className="mt-1 text-sm text-steel-600 dark:text-slate-400">
                    {pick(plan.users, locale)}
                  </p>

                  {/* THE TOP TIER IS INVOICED ON HEADCOUNT AFTER THE FACT and
                      carries no band, so it shows no rate rather than a
                      fabricated one. */}
                  {rate ? (
                    <>
                      <p className="mt-5 font-display text-3xl font-semibold">{rate}</p>
                      <p className="text-xs text-steel-600 dark:text-slate-400">
                        {tr.perEmployee} · {tr.perMonth} · {tr.vatIncluded}
                      </p>
                      {plan.bands?.length > 1 ? (
                        <ul className="mt-4 space-y-1 border-t border-steel-400/15 pt-4 dark:border-white/10">
                          {plan.bands.map((b) => (
                            <li
                              key={b.label}
                              className="flex justify-between text-xs text-steel-600 dark:text-slate-400"
                            >
                              <span>{b.label}</span>
                              <span className="num">{CURRENCY} {fmtSar(b.rate)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </>
                  ) : (
                    <p className="mt-5 text-sm text-steel-700 dark:text-slate-300">
                      {pick(plan.tagline, locale)}
                    </p>
                  )}

                  <ul className="mt-5 flex-1 space-y-1.5">
                    {(pick(plan.features, locale) || []).map((f) => (
                      <li key={f} className="text-sm text-steel-700 dark:text-slate-300">
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.cta === "contact" ? `/${locale}/contact` : `/${locale}/signup`}
                    className="mt-6 inline-flex items-center justify-center rounded-full border border-brand-500/40 px-5 py-2.5 font-display text-sm font-600 text-brand-700 transition-colors hover:bg-brand-500/10 dark:text-brand-300"
                  >
                    {plan.cta === "contact" ? tr.contactCta : tr.paidCta}
                  </Link>
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-sm text-steel-600 dark:text-slate-400">
            {tr.yearlyNote} {tr.everythingNote}
          </p>
          {/* VAT and the yearly discount are read, not written: both are
              constants in lib/pricing, so a change to either moves this line. */}
          <p className="mt-1 text-xs text-steel-500 dark:text-slate-500">
            {Math.round(VAT_RATE * 100)}% VAT · −{Math.round(YEARLY_DISCOUNT * 100)}%
          </p>
        </section>
      </div>
    </>
  );
}
