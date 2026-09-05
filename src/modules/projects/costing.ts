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
};

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
  /** What is left of the allowance. NEGATIVE when the code is over. */
  remaining: number;
  /** How much of the budget has been spent, 0–1, or null when there is none. */
  used: number | null;
  over: boolean;
};

export type ProjectCosting = {
  codes: CodeRollUp[];
  budget: number;
  actual: number;
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
  /** True when every code is inside its allowance and nothing is uncoded. */
  clean: boolean;
};

/**
 * ONE PROJECT'S COST REPORT.
 *
 * `bills` IS ALREADY THIS PROJECT'S. Filtering by project here as well would
 * make the caller's `where` look optional, and a caller that then dropped it
 * would silently report the whole studio's spend against one job.
 *
 * THERE IS NO FORECAST COLUMN, and its absence is deliberate rather than
 * pending. A forecast is `actual + committed + cost-to-complete`, and nothing
 * here knows what is COMMITTED — purchase orders are not coded yet — so a
 * forecast computed from actuals alone would read as a full projection while
 * silently ignoring every order already placed. That is worse than no column:
 * it would be most wrong exactly when a project has ordered heavily and
 * invoiced little, which is every project at its start.
 */
export function projectCosting(
  codes: readonly CostCode[],
  bills: readonly CostedBill[],
  projectValue: unknown = 0,
): ProjectCosting {
  const rows = Array.isArray(codes) ? codes : [];
  const spend = (Array.isArray(bills) ? bills : []).filter(isSpend);

  const byCode = new Map<string, number>();
  let uncoded = 0;
  for (const bill of spend) {
    const id = text(bill.costCodeId);
    const amount = num(bill.total);
    if (!id) { uncoded = money(uncoded + amount); continue; }
    byCode.set(id, money((byCode.get(id) || 0) + amount));
  }

  const known = new Set(rows.map((c) => text(c.id)));
  // SPEND CODED TO SOMETHING THAT NO LONGER EXISTS IS STILL SPEND. A code
  // deleted after bills were filed against it would otherwise take their money
  // out of the report entirely — the total would drop and nothing would say
  // why. It rejoins `uncoded`, which is the honest place for money whose code
  // cannot be resolved.
  for (const [id, amount] of byCode) {
    if (!known.has(id)) uncoded = money(uncoded + amount);
  }

  const out: CodeRollUp[] = rows.map((c) => {
    const id = text(c.id);
    const budget = money(num(c.budget));
    const actual = byCode.get(id) || 0;
    return {
      id,
      code: text(c.code),
      name: text(c.name),
      budget,
      actual,
      remaining: money(budget - actual),
      // NULL, NOT ZERO, on a code with no budget. Nought spent against nought
      // allowed is not "0% used" — it is a code nobody has budgeted, and a
      // progress bar reading empty would say the opposite of that.
      used: budget > 0 ? actual / budget : null,
      // A code with no budget is over the moment anything is spent on it: the
      // money went somewhere nobody allowed for.
      over: actual > budget,
    };
  });

  const budget = money(out.reduce((n, c) => n + c.budget, 0));
  const actual = money(out.reduce((n, c) => n + c.actual, 0) + uncoded);

  return {
    codes: out,
    budget,
    actual,
    remaining: money(budget - actual),
    uncoded,
    unallocated: money(num(projectValue) - budget),
    clean: uncoded === 0 && out.every((c) => !c.over),
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
