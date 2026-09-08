// WHAT THE GOODS ACTUALLY COST BY THE TIME THEY REACHED THE YARD.
//
// A PURCHASE ORDER SAYS WHAT THE SUPPLIER CHARGED. Freight, customs duty,
// insurance, clearance and handling are paid to other people, arrive on other
// invoices, and belong to the same goods — so a studio that values stock at the
// order price is understating what it holds, and quoting from that cost is
// quoting below what the material really cost to get.
//
// IT MATTERS MOST WHERE THIS PRODUCT SELLS. An importing contractor's freight
// and duty are routinely a fifth of the order value; pricing a bid off the
// supplier's invoice alone loses that on every line.
//
// PURE. No imports, no store, no clock. The caller hands in the order's lines
// and the charges against them, so the screen and the server distribute the
// same money identically and every rule below is asserted without a database.

/** One line of the shipment being costed. */
export type CostLine = {
  id: string;
  itemId?: string;
  qty: number;
  /** What the supplier charged per unit — the order's own price. */
  unitPrice: number;
};

/** One charge arriving on somebody else's invoice. */
export type Charge = {
  id: string;
  kind: string;
  amount: number;
};

// HOW A CHARGE IS SPREAD ACROSS THE LINES, and the choice is not cosmetic.
//
//   value    pro-rata on each line's value. Right for duty and insurance, which
//            really are charged on what the goods are worth.
//   quantity pro-rata on units. Right for handling and per-piece charges.
//   weight   pro-rata on weight, which is what a freight invoice is actually
//            priced on — and the one this product CANNOT do, because no line
//            carries a weight. Declared so the gap is visible rather than
//            silently approximated by value, which is what every ERP that
//            offers three bases and stores two ends up doing.
export const BASES = ["value", "quantity"] as const;
export type Basis = (typeof BASES)[number];
export const DEFAULT_BASIS: Basis = "value";

export const isBasis = (v: unknown): v is Basis =>
  (BASES as readonly string[]).includes(String(v ?? ""));

const round = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export type LandedLine = {
  id: string;
  itemId: string;
  qty: number;
  /** The supplier's price for the whole line. */
  goods: number;
  /** This line's share of every charge. */
  charges: number;
  /** goods + charges. */
  landed: number;
  /** landed / qty — what a unit really cost. Null when the line has no units. */
  unitLanded: number | null;
};

export type LandedCost = {
  basis: Basis;
  lines: LandedLine[];
  goods: number;
  charges: number;
  landed: number;
  /** Set when nothing could carry the charges — see `allocate`. */
  unallocated: number;
};

/**
 * SPREAD THE CHARGES OVER THE LINES.
 *
 * THE ALLOCATED SHARES MUST SUM TO THE CHARGE EXACTLY, and that is the whole
 * difficulty. Three lines splitting £100 by thirds gives 33.33 three times,
 * which is 99.99 — so a studio's landed total would be a penny short of what it
 * paid, on every shipment, forever. The last line takes the remainder, which is
 * the conventional fix and is why this returns whole cents rather than a
 * fraction each caller rounds for itself.
 *
 * NOTHING TO SPREAD ACROSS IS REPORTED, NOT SWALLOWED. If every line is worth
 * nothing (a free-of-charge shipment) there is no value to allocate ON, and the
 * charges are real money that has to go somewhere — so they come back as
 * `unallocated` rather than vanishing or being divided by nought.
 */
export function landedCost(
  lines: readonly CostLine[],
  charges: readonly Charge[],
  basis: Basis = DEFAULT_BASIS,
): LandedCost {
  const rows = (lines || []).map((l) => ({
    id: String(l?.id ?? ""),
    itemId: String(l?.itemId ?? ""),
    qty: Math.max(0, num(l?.qty)),
    goods: round(Math.max(0, num(l?.qty)) * Math.max(0, num(l?.unitPrice))),
  }));

  const totalCharge = round((charges || []).reduce((n, c) => n + Math.max(0, num(c?.amount)), 0));
  const weightOf = (r: (typeof rows)[number]) => (basis === "quantity" ? r.qty : r.goods);
  const totalWeight = rows.reduce((n, r) => n + weightOf(r), 0);

  let allocated = 0;
  const out: LandedLine[] = rows.map((r, i) => {
    let share = 0;
    if (totalCharge > 0 && totalWeight > 0) {
      // THE LAST LINE TAKES WHAT IS LEFT rather than its own rounded share, so
      // the parts always add to the whole. Any other line gets its true share
      // rounded to the cent.
      share = i === rows.length - 1
        ? round(totalCharge - allocated)
        : round((totalCharge * weightOf(r)) / totalWeight);
      allocated = round(allocated + share);
    }
    const landed = round(r.goods + share);
    return {
      id: r.id,
      itemId: r.itemId,
      qty: r.qty,
      goods: r.goods,
      charges: share,
      landed,
      // NEVER A DIVISION BY NOUGHT. A line with no units has no unit cost, and
      // "0.00 each" would be a different and wrong claim.
      unitLanded: r.qty > 0 ? round(landed / r.qty) : null,
    };
  });

  const goods = round(out.reduce((n, l) => n + l.goods, 0));
  const spread = round(out.reduce((n, l) => n + l.charges, 0));

  return {
    basis,
    lines: out,
    goods,
    charges: spread,
    landed: round(goods + spread),
    unallocated: round(totalCharge - spread),
  };
}

/** Why this charge cannot be recorded, or an empty string. */
export function chargeProblem(charge: { kind?: unknown; amount?: unknown }): string {
  if (!String(charge?.kind ?? "").trim()) return "kind";
  const amount = num(charge?.amount);
  // NOUGHT IS NOT A CHARGE. A zero-value freight line adds nothing and clutters
  // the reconciliation somebody does against the forwarder's invoice.
  if (!(amount > 0)) return "amount";
  return "";
}
