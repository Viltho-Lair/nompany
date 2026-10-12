// WHAT A NUMBER OF SEATS COSTS — the owner, 12/10/2026: "a company owner must
// select how many users he needs … not a full package where owner must pay for
// users even if they do not use the system."
//
// BEFORE THIS, A BAND WAS SOLD WHOLE. A band's price was its per-seat rate
// times its TOP (modules/marketing/pricing), so a company of 22 on the 21–50
// band paid for fifty people. Now the owner picks a seat count and pays for
// exactly that many.
//
// EACH BAND PRICES ONLY ITS OWN SEATS (graduated, like a tax bracket). 25 seats
// on 1–20 at 38 and 21–50 at 34 is 20 × 38 + 5 × 34. Pricing every seat at the
// rate of the band the LAST one falls in would make 21 seats (21 × 34 = 714)
// cheaper than 20 (20 × 38 = 760), and an owner who needs twenty would buy
// twenty-one — a price list that rewards buying what you do not need.
//
// A GAP BETWEEN BANDS BELONGS TO THE BAND ABOVE IT. Bands are typed by a person
// in /super, and 5–20 followed by 25–50 leaves 21–24 in neither; counting them
// nowhere would make four seats free.
//
// PURE — the dialog that shows the price, the server that stores the quote and
// the daily job that bills a renewal all run this one file.

import { roundMoney } from "./money";
import { addDays, addMonths, daysBetween } from "./subscription";

export type SeatBand = {
  id: string;
  label: string;
  /** The first seat this band can price (the band's own minimum). */
  min: number;
  /** The last seat it prices; 0 means no upper limit. */
  max: number;
  /** Per seat, per month, in the price list's currency. */
  rate: number;
};

type BandLike = { id?: unknown; label?: unknown; minEmployees?: unknown; maxEmployees?: unknown; perEmployee?: unknown };
export type SeatCard = BandLike & { type?: unknown; categories?: BandLike[] };

const n = (v: unknown) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);

/**
 * A PACKAGE'S BANDS, lowest first. A package with bands uses them; a package
 * with one per-seat rate is one band from its minimum to its maximum.
 */
export function seatBands(card: SeatCard | null | undefined): SeatBand[] {
  if (!card) return [];
  const raw = card.type === "compound" && Array.isArray(card.categories) && card.categories.length ? card.categories : [card];
  return raw
    .map((b) => {
      const min = Math.max(1, Math.trunc(n(b.minEmployees)) || 1);
      const max = Math.trunc(n(b.maxEmployees));
      return { id: String(b.id ?? ""), label: String(b.label || (max ? `${min}–${max}` : `${min}+`)), min, max, rate: n(b.perEmployee) };
    })
    .sort((a, b) => a.min - b.min);
}

/** The fewest seats the package sells (its lowest band's minimum), and the most (0 = no limit). */
export function seatRange(bands: readonly SeatBand[]): { min: number; max: number } {
  if (!bands.length) return { min: 0, max: 0 };
  const top = bands[bands.length - 1].max;
  return { min: bands[0].min, max: bands.some((b) => b.max === 0) ? 0 : top };
}

export type SeatLine = { bandId: string; label: string; seats: number; rate: number; amount: number };

/**
 * THE MONTHLY PRICE OF `seats`, band by band — or why there is none. Rounded
 * per line to the currency's own decimals (a dinar keeps three), and the total
 * is the sum of the rounded lines, so the lines on the paper add up.
 */
export function priceSeats(
  bands: readonly SeatBand[],
  seats: number,
  currency: string,
): { lines: SeatLine[]; monthly: number } | { error: "no-bands" | "below-minimum" | "above-maximum" | "unpriced" } {
  const want = Math.trunc(Number(seats) || 0);
  if (!bands.length) return { error: "no-bands" };
  const { min, max } = seatRange(bands);
  if (want < min) return { error: "below-minimum" };
  if (max && want > max) return { error: "above-maximum" };

  // THE MINIMUM IS HOW FEW CAN BE BOUGHT, NOT SEATS THAT COST NOTHING: the
  // first band prices every seat from the first, so 10 seats on a "5–20" band
  // are ten seats, not six.
  const lines: SeatLine[] = [];
  let below = 0;
  for (const band of bands) {
    if (want <= below) break;
    const top = band.max === 0 ? want : Math.min(want, band.max);
    const count = top - below;
    if (count > 0) {
      if (!(band.rate > 0)) return { error: "unpriced" };
      lines.push({ bandId: band.id, label: band.label, seats: count, rate: band.rate, amount: roundMoney(count * band.rate, currency) });
    }
    below = band.max === 0 ? want : Math.max(below, band.max);
  }
  return { lines, monthly: roundMoney(lines.reduce((s, l) => s + l.amount, 0), currency) };
}

/**
 * ONE WHOLE PERIOD'S PRICE for a monthly figure. A year is twelve months with
 * the yearly discount taken off — the same arithmetic the price list uses for
 * every card (`yearlyPrice` there), so a yearly seat plan and a yearly card
 * agree.
 */
export function periodPrice(monthly: number, cycle: "monthly" | "yearly", yearlyDiscountPct: number, currency: string) {
  if (cycle !== "yearly") return roundMoney(monthly, currency);
  const d = Math.min(100, Math.max(0, Number(yearlyDiscountPct) || 0));
  return roundMoney(roundMoney(monthly - monthly * (d / 100), currency) * 12, currency);
}

/** The period a day falls in, for a subscription renewing on `anchorDay` from `paidUntil`. */
export function periodAround(paidUntil: string, months: number, anchorDay: number, today: string) {
  let to = paidUntil;
  // Walk forward when the paid-for period is behind today (a renewal not paid
  // yet), back when it is ahead (a yearly plan in its third month).
  while (to <= today) to = addMonths(to, months, anchorDay);
  let from = addMonths(to, -months, anchorDay);
  while (from > today) { to = from; from = addMonths(to, -months, anchorDay); }
  return { from, to };
}

/**
 * WHAT ADDING SEATS PART-WAY THROUGH A PERIOD COSTS — the difference between
 * the period's price with the new seats and with the old, for the days left.
 * The day it is added counts: somebody can be invited that afternoon.
 *
 * THE DIFFERENCE, NOT THE NEW SEATS AT ONE RATE. Going from 18 to 25 seats
 * crosses a band, and only the difference between the two whole prices charges
 * each new seat at the rate of the band it actually lands in.
 *
 * Never negative: a reduction waits for the renewal and refunds nothing.
 */
export function prorate(input: {
  before: number; after: number; from: string; to: string; today: string; currency: string;
}): { amount: number; days: number; periodDays: number } {
  const periodDays = Math.max(1, daysBetween(input.from, input.to));
  const days = Math.max(0, Math.min(periodDays, daysBetween(input.today, input.to)));
  const diff = Math.max(0, input.after - input.before);
  return { amount: roundMoney((diff * days) / periodDays, input.currency), days, periodDays };
}

/** The last day a charge covers, for its description (`to` is the first day NOT covered). */
export const lastDayOf = (to: string) => addDays(to, -1);
