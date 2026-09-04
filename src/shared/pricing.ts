// WHAT AN ITEM IS QUOTED AT, and where that number came from.
//
// THE PROBLEM THIS SOLVES IS NAMED IN THE CODE IT REPLACES. `catalogueItems`
// in modules/technical said: "Unit and price come off the registered item, so
// the builder does not ask for either. unitCost is the only price Registered
// Items holds — if the studio needs to quote above cost, that margin belongs on
// the item."
//
// It did not belong on the item, because it was not on the item: a quotation
// line was copied from LANDED COST, so a studio that never hand-edited every
// line quoted its work at what it paid for it. There was no sell price, no
// margin, and no way to record what a particular customer had been promised.
//
// THREE SOURCES, IN ORDER OF HOW SPECIFIC THEY ARE. A rate agreed with this
// customer beats the studio's own list price, which beats cost. Cost is the
// last resort rather than the default it used to be, and an item with no price
// at all says so instead of quoting zero — see `basis: "none"`.
//
// NO SERVER IMPORTS, so the screens resolve a price with the same function the
// server does. Two copies of "the customer's agreed rate wins" are two copies
// free to disagree, and the disagreement would be about money.

/**
 * Where a quoted price came from. Carried beside the number so a screen can say
 * "this is Acme's agreed rate" rather than showing a figure nobody can account
 * for — and so nobody has to reverse-engineer it by comparing against cost.
 */
export type PriceBasis = "customer" | "sell" | "cost" | "none";

const money = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
};

export function resolveUnitPrice(input: {
  /** Landed unit cost, already in the studio's own money. */
  cost?: unknown;
  /** The studio's list price for this item, if it has set one. */
  sellPrice?: unknown;
  /** What THIS customer has been promised, if anything. */
  customerRate?: unknown;
}): { price: number; basis: PriceBasis } {
  const rate = money(input.customerRate);
  if (rate) return { price: rate, basis: "customer" };

  const sell = money(input.sellPrice);
  if (sell) return { price: sell, basis: "sell" };

  const cost = money(input.cost);
  // COST IS A FALLBACK NOW, NOT THE PRICE. It is still better than nothing —
  // a builder needs a number to start from — but the basis says plainly that
  // nobody has priced this item, so a screen can mark it rather than let it
  // pass as a considered figure.
  if (cost) return { price: cost, basis: "cost" };

  // ZERO IS NOT A PRICE OF ZERO. An item nobody has costed or priced quotes at
  // nothing, and saying "none" is the difference between "this is free" and
  // "nobody has said". The builder shows it as unpriced.
  return { price: 0, basis: "none" };
}

/**
 * GROSS MARGIN, as a percentage OF THE PRICE — (price − cost) / price.
 *
 * Named and commented because the other reading is just as common and gives a
 * different number: markup is (price − cost) / COST, so an item bought at 100
 * and sold at 150 is 33% margin and 50% markup. One of them has to be chosen
 * and written down, or two screens quote the same item at two "margins".
 *
 * Null rather than zero when there is no cost to compare against: an item with
 * no cost recorded has an unknown margin, not a margin of 100%.
 */
export function marginPct(price: unknown, cost: unknown): number | null {
  const p = money(price);
  const c = money(cost);
  if (!p || !c) return null;
  return Math.round(((p - c) / p) * 1000) / 10;
}

/** One item's agreed price for one customer. */
export type CustomerRate = {
  itemId: string;
  unitPrice: number;
  /** Free text: the reason, the agreement it came from, when it was struck. */
  note: string;
};

/**
 * A customer's rate list, cleaned the way every stored list here is: unknown
 * items dropped rather than trusted, one row per item, and capped.
 *
 * DROPPING AN UNKNOWN ITEM IS DELIBERATE. A rate against an item that no longer
 * exists prices nothing and would sit in the record forever looking like a
 * promise the studio had made. `knownItemIds` is the caller's job to supply —
 * this stays pure, and the caller is the only one who can read the catalogue.
 *
 * THE LAST ROW FOR AN ITEM WINS, so an editor that appends a corrected rate
 * does not have to find and remove the old one first.
 */
export const MAX_RATES = 500;

export function cleanRates(value: unknown, knownItemIds: ReadonlySet<string>): CustomerRate[] {
  if (!Array.isArray(value)) return [];
  const byItem = new Map<string, CustomerRate>();
  for (const raw of value) {
    const row = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const itemId = String(row.itemId ?? "").trim().slice(0, 60);
    if (!itemId || !knownItemIds.has(itemId)) continue;
    const unitPrice = money(row.unitPrice);
    // A RATE OF ZERO IS A DELETION, not a promise to supply for nothing. It is
    // how an editor removes one without a second verb.
    if (!unitPrice) { byItem.delete(itemId); continue; }
    byItem.set(itemId, { itemId, unitPrice, note: String(row.note ?? "").trim().slice(0, 200) });
  }
  return [...byItem.values()].slice(0, MAX_RATES);
}

/** A customer's rates as a lookup, for the pricer. */
export function ratesByItem(rates: unknown): Record<string, number> {
  if (!Array.isArray(rates)) return {};
  const out: Record<string, number> = {};
  for (const r of rates as CustomerRate[]) {
    const id = String(r?.itemId ?? "");
    if (id) out[id] = money(r?.unitPrice);
  }
  return out;
}
