// EARNED VALUE — what the work done is worth, against what it cost and what it
// should have cost by now. Pure, so the screen and the server reach the same
// figures from the same function.
//
// THE JOIN THIS FILE IS. Every input already existed and nothing read two of
// them together: the budget half came with the cost breakdown, the progress half
// has been in the planner since it was built, and AC is the cost report's
// `actual`. Earned value is the one question that needs all three, which is why
// it could not be asked before.
//
// THE DISCIPLINE THROUGHOUT IS NULL RATHER THAN ZERO. Every figure here is a
// ratio or a fraction of a budget, and each has a state where it is genuinely
// undefined — no budget, no plan, no dates, nothing spent. Zero is a real
// answer to all four questions and the wrong one: "0% complete" and "we do not
// know how complete" look identical on a progress bar and mean opposite things.
//
// NO IMPORTS, deliberately, and asserted by a test.

export type EarnedValueInput = {
  /** Budget at completion — the sum of the cost breakdown's allowances. */
  bac?: unknown;
  /** Actual cost: what has been billed, from the same roll-up the codes use. */
  ac?: unknown;
  /**
   * How far the WORK is done, 0-100, from the plan. NULL when there is no plan
   * at all, which is not the same as a plan nobody has started — the second is
   * a real 0 and earns nothing, the first cannot be measured.
   */
  percentComplete?: number | null;
  /** The project's own dates. Both are needed for a planned value. */
  startDate?: unknown;
  endDate?: unknown;
  /** When this answer is true. The screen never reads its own clock. */
  asOf?: unknown;
};

export type EarnedValue = {
  bac: number;
  ac: number;
  /** Budget × how much of the work is done. */
  ev: number | null;
  /** Budget × how much of the schedule has elapsed. */
  pv: number | null;
  /** EV − PV. Negative is behind schedule, in money. */
  sv: number | null;
  /** EV − AC. Negative is over cost, in money. */
  cv: number | null;
  /** EV ÷ PV. Below 1 is behind schedule. */
  spi: number | null;
  /** EV ÷ AC. Below 1 is costing more than the work is worth. */
  cpi: number | null;
  /**
   * BAC ÷ CPI — what the whole job finishes at if it goes on costing what it
   * has so far. A PERFORMANCE forecast, and deliberately not the same number as
   * the cost report's `forecast`, which is a LEDGER one (what is spent plus
   * what is ordered). They answer different questions and a screen showing one
   * while calling it the other is worse than showing neither.
   */
  eac: number | null;
  /** BAC − EAC. Negative is the overrun this performance implies. */
  vac: number | null;
  /** How much of the schedule has gone, 0-1. */
  elapsed: number | null;
  /**
   * Why the answer is partial, as a TOKEN. `no-dates` still yields EV, CV and
   * CPI — a project with a budget and a plan and no dates has a cost story and
   * no schedule story, and saying which half is missing beats withholding both.
   */
  blocked: "no-budget" | "no-plan" | "no-dates" | null;
};

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
/** Two decimals: an index is read, not reconciled. */
const index = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * A yyyy-mm-dd (or ISO) date as a day number, or null.
 *
 * PARSED AS UTC MIDNIGHT rather than through the local zone: every date here is
 * a calendar day the studio typed, and `new Date("2026-03-01")` already means
 * UTC midnight while `new Date("2026-03-01T00:00:00")` means local. Mixing the
 * two makes a project look a day longer or shorter depending on who is reading.
 */
const day = (v: unknown): number | null => {
  const t = String(v ?? "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const ms = Date.parse(`${t}T00:00:00Z`);
  return Number.isFinite(ms) ? ms : null;
};

/**
 * HOW MUCH OF THE SCHEDULE HAS GONE, 0-1.
 *
 * STRAIGHT-LINE, and this is the assumption the whole planned value rests on:
 * the budget is taken to be spread evenly across the calendar. The real curve
 * is the plan's own — each task's budget over its own dates — and the planner
 * does not STORE task dates: it derives them in the browser from durations and
 * dependencies, so a truthful S-curve would mean running the scheduling engine
 * on the server. Until it does, this is the honest approximation and the screen
 * says so rather than implying a curve nobody computed.
 *
 * CLAMPED AT BOTH ENDS. Before the start nothing was planned to be done; after
 * the end everything was, so PV is the whole budget and an unfinished project
 * goes on accruing schedule variance instead of quietly stopping.
 */
export function elapsedFraction(
  startDate: unknown, endDate: unknown, asOf: unknown,
): number | null {
  const from = day(startDate);
  const to = day(endDate);
  const at = day(asOf);
  if (from === null || to === null || at === null) return null;
  // A project that starts and ends on one day is either done or not; there is
  // no fraction of it, and dividing by nought would be an Infinity nobody asked
  // for.
  if (to <= from) return at >= to ? 1 : 0;
  const through = (at - from) / (to - from);
  return Math.min(1, Math.max(0, through));
}

/**
 * THE WHOLE PICTURE, or as much of it as the inputs allow.
 *
 * `blocked` NAMES THE MISSING HALF rather than refusing outright, because the
 * three states send somebody to three different places: set a budget on the
 * cost breakdown, draw a plan in the planner, or put dates on the project.
 */
export function earnedValue(input: EarnedValueInput): EarnedValue {
  const bac = money(num(input?.bac));
  const ac = money(num(input?.ac));
  const elapsed = elapsedFraction(input?.startDate, input?.endDate, input?.asOf);

  const empty: EarnedValue = {
    bac, ac,
    ev: null, pv: null, sv: null, cv: null,
    spi: null, cpi: null, eac: null, vac: null,
    elapsed, blocked: null,
  };

  // NO BUDGET, NO EARNED VALUE. EV is a fraction OF the budget: with none there
  // is nothing to earn, and reporting 0 would say the work is worth nothing
  // rather than that nobody has said what it is worth.
  if (bac <= 0) return { ...empty, blocked: "no-budget" };

  // NO PLAN, NO MEASURE OF THE WORK. Distinct from a plan nobody has started,
  // which is a real 0 and earns nothing — hence `percentComplete` is nullable
  // rather than defaulted.
  const pc = input?.percentComplete;
  if (pc === null || pc === undefined) return { ...empty, blocked: "no-plan" };

  const done = Math.min(1, Math.max(0, num(pc) / 100));
  const ev = money(bac * done);
  const cv = money(ev - ac);
  // NOTHING SPENT IS NOT INFINITE EFFICIENCY. A project that has earned
  // something and been billed for nothing is one whose invoices have not
  // arrived, and an index of Infinity on that screen would be read as a
  // triumph.
  const cpi = ac > 0 ? index(ev / ac) : null;
  const eac = cpi !== null && cpi > 0 ? money(bac / cpi) : null;
  const vac = eac !== null ? money(bac - eac) : null;

  if (elapsed === null) {
    // A COST STORY WITH NO SCHEDULE STORY. Everything that does not need dates
    // still answers; only the planned half is withheld.
    return { ...empty, ev, cv, cpi, eac, vac, blocked: "no-dates" };
  }

  const pv = money(bac * elapsed);
  return {
    bac, ac, ev, pv,
    sv: money(ev - pv),
    cv,
    // BEFORE THE START DATE NOTHING WAS PLANNED, so a schedule index is
    // undefined rather than infinite — the same rule CPI follows for AC.
    spi: pv > 0 ? index(ev / pv) : null,
    cpi, eac, vac, elapsed, blocked: null,
  };
}
