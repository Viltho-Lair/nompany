// WHAT A PROJECT WAS ALLOWED, AND WHAT IT HAS SPENT — pure, so the screen and
// the server arrive at the same figures from the same function.
//
// THE GAP THIS CLOSES. A project has ONE number, `value`: what the studio will
// be paid. Nothing said what any of it was allowed to cost, so "are we over on
// this trade" was a question the product could not be asked. The handover made
// that sharper rather than better — it now carries a bill's total into a
// project as the value, and the bill's own groups are exactly the breakdown
// nobody could record.
//
// NO IMPORTS, deliberately, and asserted by a test.

export type CostCode = {
  id?: unknown;
  code?: unknown;
  name?: unknown;
  budget?: unknown;
  sortOrder?: unknown;
};

/** Only what a bill has to expose for this to sum. */
export type CostedBill = {
  costCodeId?: unknown;
  projectId?: unknown;
  status?: unknown;
  total?: unknown;
  /** The purchase order this invoice answers, when it answers one. */
  orderId?: unknown;
};

/** Only what a purchase order has to expose. */
export type CostedOrder = {
  id?: unknown;
  costCodeId?: unknown;
  status?: unknown;
  total?: unknown;
};

/**
 * AN ORDER THAT IS NOT A COMMITMENT. `Draft` was never placed with anybody and
 * `Cancelled` was withdrawn, so neither is money the studio has promised.
 * Everything else is — including `Received`, whose goods have arrived and whose
 * invoice may not have: an order stops being a commitment when it is INVOICED,
 * not when it is delivered, which is why what is left of it is netted below
 * rather than switched off by a status.
 */
const NOT_COMMITTED = new Set(["Draft", "Cancelled"]);

export const isPlaced = (order: CostedOrder | null | undefined): boolean =>
  Boolean(order) && !NOT_COMMITTED.has(text(order?.status));

/**
 * A BILL THAT IS NOT SPEND. `Draft` was never raised against anybody and
 * `Cancelled` was withdrawn, so counting either would report money as gone that
 * nobody owes. Everything else counts — INCLUDING a bill that has not been
 * approved yet, which is the distinction that matters: approval authorises
 * PAYMENT, and a cost is incurred when the supplier invoices, not when Finance
 * gets round to signing. A cost report that waited for approval would say a
 * project was under budget for exactly as long as its paperwork was behind.
 */
const NOT_SPEND = new Set(["Draft", "Cancelled"]);

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const text = (v: unknown) => String(v ?? "");

export const isSpend = (bill: CostedBill | null | undefined): boolean =>
  Boolean(bill) && !NOT_SPEND.has(text(bill?.status));

export type CodeRollUp = {
  id: string;
  code: string;
  name: string;
  budget: number;
  /** Billed against this code, whatever its approval state. */
  actual: number;
  /**
   * Ordered and not yet invoiced. Money the studio has promised somebody and
   * has not been asked for — the half a spend report cannot see, and the reason
   * there was no forecast until purchase orders carried a code.
   */
  committed: number;
  /**
   * What this code is expected to finish at: `actual + committed`, or the
   * budget, whichever is LARGER.
   *
   * The asymmetry is the point. A code that has spent and committed less than
   * its allowance is still expected to spend it — the work is not done, and
   * reporting the money not yet promised as a saving would show every project
   * under budget on the day it opened. A code already past its allowance will
   * not come back down, so there the two sums are the forecast.
   *
   * WHAT IT IS NOT is a judgement. Nobody has been asked for an
   * estimate-to-complete; this is what the ledger implies, and a studio that
   * knows better revises the budget.
   */
  forecast: number;
  /** What is left of the allowance. NEGATIVE when the code is over. */
  remaining: number;
  /** Budget less forecast. Negative is an overrun this code is heading for. */
  variance: number;
  /** How much of the budget has been spent, 0–1, or null when there is none. */
  used: number | null;
  /** Already spent past the allowance. */
  over: boolean;
  /** Not yet past it, but will be once what is ordered arrives. */
  willOverrun: boolean;
};

export type ProjectCosting = {
  codes: CodeRollUp[];
  budget: number;
  actual: number;
  committed: number;
  forecast: number;
  variance: number;
  remaining: number;
  /**
   * Spend on this project that names no code. NOT an error and not hidden: a
   * bill raised before the breakdown existed, or one nobody has coded yet, is
   * real money and a report that dropped it would understate the project by
   * however much nobody had filed properly.
   */
  uncoded: number;
  /**
   * The project's value less what has been budgeted. Positive means the
   * breakdown does not yet account for the whole job; negative means more has
   * been allowed for than the job is worth, which is a decision somebody should
   * be looking at rather than an error.
   */
  unallocated: number;
  /**
   * Ordered against this project and coded to nothing — or to a code somebody
   * has deleted. Kept apart from `uncoded` because the two are fixed in
   * different places: one is a bill Finance has not filed, the other a purchase
   * order Procurement has not.
   */
  uncommitted: number;
  /** True when every code is inside its allowance and nothing is unfiled. */
  clean: boolean;
};

/**
 * ONE PROJECT'S COST REPORT.
 *
 * `bills` IS ALREADY THIS PROJECT'S. Filtering by project here as well would
 * make the caller's `where` look optional, and a caller that then dropped it
 * would silently report the whole studio's spend against one job.
 *
 * A BILL AGAINST AN ORDER INHERITS THE ORDER'S CODE when it carries none of its
 * own. Somebody codes the purchase order once and every invoice answering it
 * follows, which is both what a person expects and the thing that keeps
 * `uncoded` down to what genuinely has not been filed. A bill with a code of its
 * own keeps it — the invoice is the later and more specific decision.
 */
export function projectCosting(
  codes: readonly CostCode[],
  bills: readonly CostedBill[],
  orders: readonly CostedOrder[] = [],
  projectValue: unknown = 0,
): ProjectCosting {
  const rows = Array.isArray(codes) ? codes : [];
  const spend = (Array.isArray(bills) ? bills : []).filter(isSpend);
  const placed = (Array.isArray(orders) ? orders : []).filter(isPlaced);
  const orderById = new Map(placed.map((o) => [text(o.id), o] as const));

  const codeOf = (bill: CostedBill): string =>
    text(bill.costCodeId) || text(orderById.get(text(bill.orderId))?.costCodeId);

  const byCode = new Map<string, number>();
  let uncoded = 0;
  for (const bill of spend) {
    const id = codeOf(bill);
    const amount = num(bill.total);
    if (!id) { uncoded = money(uncoded + amount); continue; }
    byCode.set(id, money((byCode.get(id) || 0) + amount));
  }

  // WHAT IS LEFT OF EACH ORDER, netted against what has been invoiced on it.
  // An order stops being a commitment as it is billed, not when it is
  // delivered — counting a fully invoiced order as still committed would
  // double every cost the moment its goods arrived.
  //
  // FLOORED AT ZERO: over-invoicing an order is a real thing and it is not a
  // negative commitment. The excess is already in `actual`, where it belongs.
  const billedOnOrder = new Map<string, number>();
  for (const bill of spend) {
    const oid = text(bill.orderId);
    if (!oid) continue;
    billedOnOrder.set(oid, money((billedOnOrder.get(oid) || 0) + num(bill.total)));
  }
  const committedByCode = new Map<string, number>();
  let uncommitted = 0;
  for (const order of placed) {
    const open = Math.max(0, money(num(order.total) - (billedOnOrder.get(text(order.id)) || 0)));
    if (!open) continue;
    const id = text(order.costCodeId);
    if (!id) { uncommitted = money(uncommitted + open); continue; }
    committedByCode.set(id, money((committedByCode.get(id) || 0) + open));
  }

  const known = new Set(rows.map((c) => text(c.id)));
  // SPEND CODED TO SOMETHING THAT NO LONGER EXISTS IS STILL SPEND. A code
  // deleted after bills were filed against it would otherwise take their money
  // out of the report entirely — the total would drop and nothing would say
  // why. It rejoins `uncoded`, which is the honest place for money whose code
  // cannot be resolved. The same holds for an order.
  for (const [id, amount] of byCode) {
    if (!known.has(id)) uncoded = money(uncoded + amount);
  }
  for (const [id, amount] of committedByCode) {
    if (!known.has(id)) uncommitted = money(uncommitted + amount);
  }

  const out: CodeRollUp[] = rows.map((c) => {
    const id = text(c.id);
    const budget = money(num(c.budget));
    const actual = byCode.get(id) || 0;
    const committed = committedByCode.get(id) || 0;
    const forecast = Math.max(budget, money(actual + committed));
    return {
      id,
      code: text(c.code),
      name: text(c.name),
      budget,
      actual,
      committed,
      forecast,
      remaining: money(budget - actual),
      variance: money(budget - forecast),
      // NULL, NOT ZERO, on a code with no budget. Nought spent against nought
      // allowed is not "0% used" — it is a code nobody has budgeted, and a
      // progress bar reading empty would say the opposite of that.
      used: budget > 0 ? actual / budget : null,
      // A code with no budget is over the moment anything is spent on it: the
      // money went somewhere nobody allowed for.
      over: actual > budget,
      // NOT YET OVER, BUT HEADING THERE. Distinct from `over` because they are
      // acted on differently: one is a number to explain, the other is an
      // order somebody could still stop.
      willOverrun: !(actual > budget) && money(actual + committed) > budget,
    };
  });

  const budget = money(out.reduce((n, c) => n + c.budget, 0));
  const actual = money(out.reduce((n, c) => n + c.actual, 0) + uncoded);
  const committed = money(out.reduce((n, c) => n + c.committed, 0) + uncommitted);
  // THE PROJECT'S FORECAST IS THE SUM OF ITS CODES' — not `max(budget, actual +
  // committed)` over the totals. Taking the maximum at the top would let a code
  // running under its allowance cancel out one running over, and the whole
  // point of a breakdown is that those two do not cancel. The unfiled money has
  // no budget to be under, so it joins at face value.
  const forecast = money(out.reduce((n, c) => n + c.forecast, 0) + uncoded + uncommitted);

  return {
    codes: out,
    budget,
    actual,
    committed,
    forecast,
    variance: money(budget - forecast),
    remaining: money(budget - actual),
    uncoded,
    uncommitted,
    unallocated: money(num(projectValue) - budget),
    clean: uncoded === 0 && uncommitted === 0 && out.every((c) => !c.over && !c.willOverrun),
  };
}

/**
 * A COST BREAKDOWN PROPOSED FROM A BILL OF QUANTITIES.
 *
 * THE BILL'S GROUPS ARE ALREADY A BREAKDOWN — preliminaries, substructure,
 * frame — priced by the person who worked out what the job was worth. Making a
 * studio retype them to budget against them would be asking for the same list
 * twice.
 *
 * PROPOSED, NEVER IMPOSED: this returns rows for somebody to accept, and the
 * budget it suggests is what the group was SOLD for. That is a starting point
 * and not a cost — a studio that expects to spend less than it charged should
 * edit these down, which is the whole point of having a budget separate from a
 * price. The screen says so where it offers the action.
 */
export function codesFromBill(
  groups: readonly { group?: unknown; totals?: { total?: unknown } }[],
): Array<{ code: string; name: string; budget: number }> {
  return (Array.isArray(groups) ? groups : []).map((g, i) => ({
    // The studio's own reference is theirs to set; a number is a starting
    // point that sorts correctly and cannot collide with a name.
    code: String(i + 1).padStart(2, "0"),
    name: text(g?.group) || `Section ${i + 1}`,
    budget: money(num(g?.totals?.total)),
  }));
}
