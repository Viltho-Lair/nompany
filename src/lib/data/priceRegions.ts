// THE PRICE REGIONS, STORED — one small list under REG.priceRegions, read whole
// and written through editJSON (invariant 8), the same lifecycle as the
// packages it prices. What a region IS and how a price is worked out live in
// `shared/priceRegions`, which is pure; this file only keeps the list.

import { getJSON, editJSON } from "@/platform/db/store";
import { ID, REG } from "@/platform/db/keys";
import { cleanRegion, countryClaim, SEED_REGIONS, type PriceRegion } from "@/shared/priceRegions";

const now = () => new Date().toISOString();

type Refusal = { error: string; country?: string; region?: string };

/**
 * EVERY REGION, planting the starting set the first time the list is read.
 *
 * PLANTED WHEN THE LIST HAS NEVER EXISTED, never when it is merely empty: a
 * `null` document is a catalogue that predates regions, and `[]` is one where
 * somebody deleted them — re-planting into that would resurrect nine regions
 * the owner removed. (The default region cannot be deleted, so an owner cannot
 * actually reach `[]` from the console; the rule is written for the store, not
 * the screen.)
 */
export async function listPriceRegions(): Promise<PriceRegion[]> {
  const stored = await getJSON<PriceRegion[]>(REG.priceRegions);
  if (Array.isArray(stored)) return stored;
  return editJSON<PriceRegion[], PriceRegion[]>(REG.priceRegions, (cur) => {
    if (Array.isArray(cur)) return { result: cur };
    const at = now();
    const seeded = SEED_REGIONS.map((r) => ({ ...r, createdAt: at, updatedAt: at }));
    return { next: seeded, result: seeded };
  });
}

/**
 * ONE DEFAULT, ALWAYS. Marking a region the default takes the mark off every
 * other; taking it off the only region carrying it is refused, because a
 * country no region names would then have nowhere to be priced.
 */
function withDefault(rows: PriceRegion[], changed: PriceRegion): PriceRegion[] | Refusal {
  const next = rows.some((r) => r.id === changed.id)
    ? rows.map((r) => (r.id === changed.id ? changed : r))
    : [...rows, changed];
  if (changed.isDefault) return next.map((r) => (r.id === changed.id ? r : r.isDefault ? { ...r, isDefault: false } : r));
  if (!next.some((r) => r.isDefault)) return { error: "default-required" };
  return next;
}

const refused = (v: unknown): v is Refusal => Boolean(v && typeof v === "object" && "error" in v);

export async function createPriceRegion(body: Record<string, unknown>): Promise<{ item: PriceRegion } | Refusal> {
  await listPriceRegions();
  const at = now();
  const row: PriceRegion = { id: ID.priceRegion(), ...cleanRegion(body || {}), createdAt: at, updatedAt: at };
  return editJSON<PriceRegion[], { item: PriceRegion } | Refusal>(REG.priceRegions, (cur) => {
    const rows = Array.isArray(cur) ? cur : [];
    const claim = countryClaim(rows, row.id, row.countries);
    if (claim) return { result: { error: "taken", ...claim } };
    const next = withDefault(rows, row);
    if (refused(next)) return { result: next };
    return { next, result: { item: row } };
  });
}

/**
 * AN EDIT MERGES, AND PRICES MERGE KEY BY KEY. A body carrying one price
 * changes that price and leaves the other forty alone; a price sent as null or
 * "" is REMOVED, which is how a fixed price goes back to being a suggestion.
 */
export async function updatePriceRegion(id: string, body: Record<string, unknown>): Promise<{ item: PriceRegion } | Refusal> {
  await listPriceRegions();
  const updatedAt = now(); // outside the closure: editJSON re-runs it per CAS round.
  return editJSON<PriceRegion[], { item: PriceRegion } | Refusal>(REG.priceRegions, (cur) => {
    const rows = Array.isArray(cur) ? cur : [];
    const current = rows.find((r) => r.id === id);
    if (!current) return { result: { error: "notfound" } };

    // A NEW CURRENCY EMPTIES THE FIXED PRICES. They are amounts, not values:
    // 3.1 fixed in dinars would otherwise be read as 3.1 dollars the moment
    // the currency changed, and nothing on the page would say so.
    // Compared AFTER cleaning, so a currency that cleans to the one already
    // held is not a change.
    const nextCurrency = body.currency === undefined ? current.currency : cleanRegion({ currency: body.currency }).currency;
    const prices: Record<string, unknown> = nextCurrency === current.currency ? { ...current.prices } : {};
    const patch = body.prices && typeof body.prices === "object" ? (body.prices as Record<string, unknown>) : {};
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "") delete prices[key];
      else prices[key] = value;
    }

    const changed: PriceRegion = {
      ...cleanRegion({ ...current, ...body, prices }),
      id: current.id, createdAt: current.createdAt, updatedAt,
    };
    const claim = countryClaim(rows, id, changed.countries);
    if (claim) return { result: { error: "taken", ...claim } };
    const next = withDefault(rows, changed);
    if (refused(next)) return { result: next };
    return { next, result: { item: changed } };
  });
}

/** Removes a region. The default one is refused — see `withDefault`. */
export async function deletePriceRegion(id: string): Promise<{ ok: true } | Refusal> {
  await listPriceRegions();
  return editJSON<PriceRegion[], { ok: true } | Refusal>(REG.priceRegions, (cur) => {
    const rows = Array.isArray(cur) ? cur : [];
    const target = rows.find((r) => r.id === id);
    if (!target) return { result: { error: "notfound" } };
    if (target.isDefault) return { result: { error: "default-required" } };
    return { next: rows.filter((r) => r.id !== id), result: { ok: true } };
  });
}
