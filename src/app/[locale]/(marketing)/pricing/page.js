import JsonLd from "@/components/JsonLd";
import { buildMetadata, breadcrumbLd, urlFor, softwareApplicationLd } from "@/lib/seo";
import { buildPricing } from "@/modules/marketing/pricing";
import { PricingBoard } from "@/components/landing/pricing/PricingBoard";
import { getDict } from "@/shared/i18n";
import { headers } from "next/headers";

/* PRICING — the board that was an in-page view, now with an address.
   ------------------------------------------------------------------
   THE CARDS COME FROM PACKAGES IN /super. Nothing on them is authored
   in this repository: the name, the tagline, the users line, the
   bullets, the bands and every figure are stored and edited in the
   console, so changing a price is a save rather than a deploy. There is
   deliberately no hardcoded fallback — an empty catalogue says so,
   because a stale constant is a wrong price stated with confidence.

   THE FIGURES ARE RENDERED ON THE SERVER. `buildPricing` is the same
   function `/api/pricing` returns, called here rather than fetched, so
   the prices are in the first byte of HTML. The measurement that
   started this rebuild was that "SAR" appeared nowhere in the served
   HTML of a product with a public price list, and a board that fetched
   its own numbers on mount would have reproduced that exactly while
   looking finished.

   THE INTERACTIVE PARTS STAY INTERACTIVE. Monthly/yearly, the currency
   picker and the per-card band selector all still work — they are an
   enhancement over a page that already shows real numbers, which is the
   right order.

   Schema: Offer per public package, priced from the same payload the
   page renders, so the markup and the page cannot disagree. */

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildMetadata({ locale, path: "/pricing" });
}

export default async function PricingPage({ params }) {
  const { locale } = await params;
  const dict = getDict(locale);
  const h = await headers();
  const pricing = await buildPricing(h.get("x-vercel-ip-country"));

  const structured = [
    breadcrumbLd([
      { name: dict.nav.home, url: urlFor(locale, "") },
      { name: dict.nav.pricing, url: urlFor(locale, "/pricing") },
    ]),
    softwareApplicationLd(pricing.cards, pricing.base, locale),
  ].filter(Boolean);

  return (
    <>
      <JsonLd data={structured} />
      {/* THE SAME CHROME AS EVERY OTHER PUBLIC PAGE. The shell carries the
          dark palette this board was designed against, the nav, the footer,
          and the locale context every string inside it reads — without which
          /ar would fall back to English on a page whose whole point is that
          the Arabic site is not a second-class copy. */}
        <PricingBoard initial={pricing} locale={locale} />
    </>
  );
}
