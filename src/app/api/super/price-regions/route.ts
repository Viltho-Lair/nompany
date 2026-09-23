import { route } from "@/platform/http/route";
import { listCatalog, getCatalogSettings } from "@/lib/data/catalog";
import { listPriceRegions, createPriceRegion, updatePriceRegion, deletePriceRegion } from "@/lib/data/priceRegions";
import { getExchangeSnapshot } from "@/lib/data/exchangeRates";
import { crossRate } from "@/shared/currencies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE PRICE REGIONS, for the console's Regional pricing screen.
//
// The GET answers everything that screen draws in ONE call: the regions, the
// base list they are priced from (packages, their bands, tiers), and today's
// rate from the base into each region's currency — so a suggestion on screen is
// the same arithmetic `buildPricing` does, not a second opinion worked out in
// the browser.
//
// A refusal names what to fix: `taken` carries the country and the region
// already holding it, `default-required` means a region must stay the
// catch-all.
const spec = { auth: "super", name: "super/price-regions" };

export const GET = route(spec, async () => {
  const [regions, packages, tiers, settings, snap] = await Promise.all([
    listPriceRegions(), listCatalog("packages"), listCatalog("tiers"), getCatalogSettings(), getExchangeSnapshot(),
  ]);
  const base = settings.baseCurrency;
  const rates: Record<string, number | null> = {};
  for (const r of regions) rates[r.currency] = r.currency === base ? 1 : crossRate(snap.rates, base, r.currency);
  return {
    regions,
    baseCurrency: base,
    taxPercent: settings.taxPercent,
    rates,
    stale: Boolean(snap.stale),
    // Only what a price is worked out FROM — the rest of a package is the
    // Packages screen's business.
    packages: packages.map((p) => ({
      id: p.id, name: p.name, type: p.type || "compound", isPublic: Boolean(p.isPublic),
      costPerEmployee: Number(p.costPerEmployee) || 0, maxEmployees: Number(p.maxEmployees) || 0,
      categories: (Array.isArray(p.categories) ? p.categories : []).map((c: Record<string, unknown>) => ({
        id: c.id, label: c.label, costPerEmployee: Number(c.costPerEmployee) || 0, maxEmployees: Number(c.maxEmployees) || 0,
      })),
    })),
    tiers: tiers.map((t) => ({ id: t.id, name: t.name, cost: Number(t.cost) || 0, isPublic: Boolean(t.isPublic) })),
  };
});

export const POST = route({ ...spec, body: true }, async ({ body }) => {
  const out = await createPriceRegion(body);
  if ("error" in out) return out;
  return { status: 201, body: { ok: true, item: out.item } };
});

export const PUT = route({ ...spec, body: true }, async ({ body }) => {
  if (!body.id) return { error: "missing" };
  const out = await updatePriceRegion(String(body.id), body);
  if ("error" in out) return out;
  return { ok: true, item: out.item };
});

export const DELETE = route({ ...spec, body: true }, async ({ body }) => {
  if (!body.id) return { error: "missing" };
  const out = await deletePriceRegion(String(body.id));
  if ("error" in out) return out;
  return { ok: true };
});
