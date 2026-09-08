// WHAT A MACHINE COST THE JOB IT WAS ON.
//
// THE EQUIPMENT REGISTER HAS HELD `hireRate` SINCE IT SHIPPED AND NOTHING READ
// IT. Its own declaration said so out loud — *"the hire rate lives on the asset
// because it is what the studio charges ITSELF to put this machine on a job.
// Nothing consumes it yet — charging a deal for utilisation is its own slice."*
// This is that slice.
//
// WHY IT MATTERS MORE THAN IT LOOKS: a contractor that owns its plant and does
// not charge it to jobs reports every job as more profitable than it is, and
// discovers the fleet's real cost only as a lump nobody can attribute. The
// number this produces is the difference between "that excavator" and "that
// excavator cost the Riyadh job £14,000".
//
// PURE. No imports, no store, no clock — the caller hands in the allocations and
// the rate, so the screen and the server cost the same days identically and
// every rule below is asserted without a database.

/** One machine on one deal, between two dates. */
export type Allocation = {
  id: string;
  assetId: string;
  dealId: string;
  /** Inclusive `YYYY-MM-DD`. */
  from: string;
  /** Inclusive. Blank means still out — see `openEndedTo`. */
  to?: string;
  /** What this asset is charged at per day, copied when the allocation is made. */
  dailyRate?: number;
};

export type AssetPeriod = { from: string; to: string };

const DAY_MS = 86_400_000;

const day = (v: unknown): string => {
  const s = String(v ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : "";
};

const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);
const round = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * DAYS IN AN ALLOCATION, CLIPPED TO A WINDOW, INCLUSIVE OF BOTH ENDS.
 *
 * INCLUSIVE, and that is a decision rather than an off-by-one. A machine that
 * went out on Monday and came back on Monday was on that job for a day and is
 * charged for one — an exclusive count would make it nought, and a studio would
 * find single-day hires costing nothing.
 *
 * @param openEndedTo - what a blank `to` means. The CALLER supplies it (usually
 *   the window's end) because this file reads no clock: an allocation still
 *   open runs to the end of whatever period is being asked about, and asking
 *   about last month must not charge it up to today.
 */
export function daysOf(
  allocation: Allocation,
  period: AssetPeriod,
  openEndedTo: string,
): number {
  const from = day(allocation.from);
  const to = day(allocation.to) || day(openEndedTo);
  if (!from || !to) return 0;

  const windowFrom = day(period.from);
  const windowTo = day(period.to);
  const start = windowFrom && windowFrom > from ? windowFrom : from;
  const end = windowTo && windowTo < to ? windowTo : to;
  if (!start || !end || ms(end) < ms(start)) return 0;

  return Math.round((ms(end) - ms(start)) / DAY_MS) + 1;
}

export type AssetCost = {
  assetId: string;
  days: number;
  cost: number;
  /**
   * DAYS CHARGED AT NOTHING. An allocation whose asset carries no hire rate
   * costs nought and is COUNTED here, so a studio sees utilisation it is not
   * billing for rather than a total that quietly omits it.
   */
  unratedDays: number;
};

export type DealUtilisation = {
  dealId: string;
  assets: AssetCost[];
  days: number;
  cost: number;
  unratedDays: number;
};

export type UtilisationReport = {
  period: AssetPeriod;
  deals: DealUtilisation[];
  /** Every asset's days across every deal — what the fleet actually did. */
  byAsset: AssetCost[];
  cost: number;
  days: number;
  unratedDays: number;
};

const addTo = (map: Map<string, AssetCost>, assetId: string, days: number, rate: number) => {
  const row = map.get(assetId) || { assetId, days: 0, cost: 0, unratedDays: 0 };
  row.days += days;
  row.cost = round(row.cost + days * rate);
  if (!rate) row.unratedDays += days;
  map.set(assetId, row);
};

/**
 * WHAT EVERY DEAL WAS CHARGED FOR PLANT, over a window.
 *
 * @param rateFor - the asset's hire rate. A FUNCTION rather than a map so the
 *   caller decides whether an allocation's own copied rate wins over the
 *   register's current one — it does, and `stockValue`'s note explains the
 *   general rule: a rate applied by COPY must not be re-priced by a later edit.
 */
export function utilisation(
  allocations: readonly Allocation[],
  period: AssetPeriod,
  rateFor: (assetId: string) => number,
  openEndedTo: string,
): UtilisationReport {
  const byDeal = new Map<string, Map<string, AssetCost>>();
  const fleet = new Map<string, AssetCost>();

  for (const a of allocations || []) {
    const days = daysOf(a, period, openEndedTo);
    if (days <= 0) continue;

    // THE ALLOCATION'S OWN RATE WINS. It was copied when the machine went out,
    // and re-pricing a finished hire because somebody edited the register three
    // months later would change a cost already reported on a job — the BOQ rate
    // rule, and the reason a quotation line keeps its price.
    const rate = Number(a.dailyRate) > 0 ? Number(a.dailyRate) : Number(rateFor(a.assetId)) || 0;

    const dealId = String(a.dealId || "");
    if (!byDeal.has(dealId)) byDeal.set(dealId, new Map());
    addTo(byDeal.get(dealId)!, String(a.assetId || ""), days, rate);
    addTo(fleet, String(a.assetId || ""), days, rate);
  }

  const deals: DealUtilisation[] = [...byDeal.entries()].map(([dealId, assets]) => {
    const rows = [...assets.values()].sort((x, y) => y.cost - x.cost || x.assetId.localeCompare(y.assetId));
    return {
      dealId,
      assets: rows,
      days: rows.reduce((n, r) => n + r.days, 0),
      cost: round(rows.reduce((n, r) => n + r.cost, 0)),
      unratedDays: rows.reduce((n, r) => n + r.unratedDays, 0),
    };
  }).sort((x, y) => y.cost - x.cost || x.dealId.localeCompare(y.dealId));

  const byAsset = [...fleet.values()].sort((x, y) => y.days - x.days || x.assetId.localeCompare(y.assetId));

  return {
    period: { from: day(period.from), to: day(period.to) },
    deals,
    byAsset,
    cost: round(deals.reduce((n, d) => n + d.cost, 0)),
    days: deals.reduce((n, d) => n + d.days, 0),
    unratedDays: deals.reduce((n, d) => n + d.unratedDays, 0),
  };
}

/**
 * WHY THIS ALLOCATION CANNOT BE MADE, or an empty string.
 *
 * THE ONE RULE THAT MATTERS IS DOUBLE-BOOKING. A machine cannot be on two jobs
 * at once, and an ERP that lets somebody allocate it twice will happily charge
 * both — two jobs each paying full rate for one excavator, which overstates
 * cost on both and is invisible until somebody adds the fleet up.
 */
export function allocationProblem(
  proposed: Allocation,
  existing: readonly Allocation[],
): string {
  const from = day(proposed.from);
  if (!from) return "from";
  const to = day(proposed.to);
  // An open-ended allocation is legitimate — the machine is out and nobody knows
  // when it comes back — but a `to` BEFORE the `from` is a typo.
  if (to && ms(to) < ms(from)) return "order";
  if (!String(proposed.assetId || "")) return "asset";
  if (!String(proposed.dealId || "")) return "deal";

  // OPEN-ENDED OVERLAPS EVERYTHING AFTER IT. Treating a blank `to` as "no end"
  // is what makes the clash check honest: a machine booked out indefinitely is
  // not available next week either.
  const FAR = "9999-12-31";
  const pTo = to || FAR;
  for (const a of existing) {
    if (a.id && a.id === proposed.id) continue;      // editing itself
    if (String(a.assetId) !== String(proposed.assetId)) continue;
    const aFrom = day(a.from);
    const aTo = day(a.to) || FAR;
    if (!aFrom) continue;
    // Inclusive at both ends, matching how the days are counted: a machine
    // returning on the 10th is not available to another job on the 10th.
    if (ms(aFrom) <= ms(pTo) && ms(from) <= ms(aTo)) return "clash";
  }
  return "";
}
