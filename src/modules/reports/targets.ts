// A NUMBER SOMEBODY IS ACCOUNTABLE FOR.
//
// EVERY FIGURE IN THIS PRODUCT IS A FACT AND NONE OF THEM IS A TARGET. A studio
// can see what it invoiced, what it is short of, how many deals it lost — and
// nothing anywhere says what any of those was SUPPOSED to be. So a dashboard
// full of correct numbers still cannot tell anybody whether the month went
// well, which is the question a dashboard is opened to answer.
//
// A TARGET IS A SAVED REPORT PLUS A LINE. It reuses the builder rather than
// growing its own query language: the metric is whatever a report's aggregate
// produces, so anything a studio can measure it can also set a target on, and
// there is exactly one definition of each number. A separate metric catalogue
// would be a second place "revenue" is defined, free to disagree with the first.
//
// PURE. No imports, no store, no clock.

export const DIRECTIONS = ["atLeast", "atMost"] as const;
export type Direction = (typeof DIRECTIONS)[number];

export type Target = {
  id: string;
  label: string;
  /** The saved report whose aggregate is the measurement. */
  reportId: string;
  direction: Direction;
  value: number;
  /** Warn before it breaches: a fraction of the way to the line, 0 to 1. */
  warnAt: number;
};

export type TargetState = "met" | "warning" | "breached" | "unknown";

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

/** What is wrong with this target, or an empty array. */
export function targetProblems(input: Record<string, unknown>): string[] {
  const problems: string[] = [];
  if (!str(input.label, 120)) problems.push("a target needs a name");
  // A TARGET WITHOUT A REPORT MEASURES NOTHING. It is not a target with a
  // missing field; it is a line drawn across no number.
  if (!str(input.reportId, 60)) problems.push("a target needs a report to measure");
  if (!(DIRECTIONS as readonly string[]).includes(str(input.direction, 10))) {
    problems.push("say whether it is a floor or a ceiling");
  }
  if (num(input.value) === null) problems.push("a target needs a number");
  const warn = num(input.warnAt);
  if (warn !== null && (warn < 0 || warn > 1)) problems.push("the warning point is between 0 and 1");
  return problems;
}

export function cleanTarget(input: Record<string, unknown>): Omit<Target, "id"> {
  return {
    label: str(input.label, 120),
    reportId: str(input.reportId, 60),
    direction: str(input.direction, 10) as Direction,
    value: num(input.value) ?? 0,
    // 0.9 BY DEFAULT: warn at nine tenths of the way to the line. A target that
    // only speaks once it is missed is a post-mortem, not a control.
    warnAt: num(input.warnAt) ?? 0.9,
  };
}

/**
 * WHERE A MEASUREMENT SITS AGAINST ITS LINE.
 *
 * `unknown` IS A REAL STATE AND IT IS NOT `breached`. A report that returned no
 * numeric rows measures nothing this period — a sales target with no closed
 * deals yet, a defect ceiling with nothing inspected — and calling that a
 * breach would raise an alarm about an absence of data. It is also not `met`,
 * which is the mistake in the other direction and the more dangerous one.
 *
 * A CEILING WARNS AS IT IS APPROACHED FROM BELOW; a floor warns as it is
 * approached from above. Same fraction, opposite sides, one rule.
 */
export function targetState(target: Target, measured: number | null): TargetState {
  if (measured === null) return "unknown";
  if (target.direction === "atLeast") {
    if (measured >= target.value) return "met";
    // A floor of nought is met by anything and warns about nothing; guarding it
    // keeps the fraction from dividing by zero.
    if (target.value > 0 && measured >= target.value * target.warnAt) return "warning";
    return "breached";
  }
  if (measured <= target.value) {
    return target.value > 0 && measured >= target.value * target.warnAt ? "warning" : "met";
  }
  return "breached";
}

/** How far along the way to the line, as a fraction. Null when nothing was measured. */
export function progress(target: Target, measured: number | null): number | null {
  if (measured === null || target.value === 0) return null;
  return Math.round((measured / target.value) * 1000) / 1000;
}

/**
 * WHAT TO PUT IN FRONT OF SOMEBODY — breached first, then warning, then the
 * ones nothing could measure, then what is met.
 *
 * `unknown` OUTRANKS `met` deliberately. A target nobody can measure is a
 * question to answer; a target that is met is news that can wait.
 */
const RANK: Record<TargetState, number> = { breached: 0, warning: 1, unknown: 2, met: 3 };

export function rankTargets<T extends { state: TargetState }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => RANK[a.state] - RANK[b.state]);
}
