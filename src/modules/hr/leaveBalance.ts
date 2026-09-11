// LEAVE BALANCES, PURELY (tier 6) — how much leave somebody has left, from the
// studio's rules and the leave they have already taken.
//
// BEFORE THIS there was a request and an approval and nothing else: no
// entitlement, no carry-over, and nothing subtracted a day taken from anything,
// so "how much annual leave do I have left" had no answer anywhere in the
// product. Every country this is sold in legislates a minimum (Jordan 14 days,
// 21 after five years; Saudi Arabia 21, 30 after five; the UAE 30), so a
// regional HR tool without a balance is not one.
//
// THE RULES ARE THE STUDIO'S, stored on the studio record as `employmentRules`
// and edited in Studio settings; nothing here knows a country. A leave type
// with no rule keeps no balance — unpaid leave is a type most studios will
// never want counted down.
//
// No imports, no store, no clock: the caller hands in the year and the rows, so
// the screen and the server give the same answer and every rule is asserted
// without a database.

export type LeaveRule = {
  /** Days a year. */
  days: number;
  /** Completed years of service after which `daysAfter` applies (0 = never). */
  afterYears: number;
  daysAfter: number;
  /** The most unused leave that carries into the next year (0 = none). */
  carryOver: number;
};

export type EmploymentRules = {
  leave: Record<string, LeaveRule>;
  /** Count leave in the studio's working days rather than calendar days. */
  workingDays: boolean;
};

export type RuleProblem = { type: string; field: "type" | "days" | "afterYears" | "daysAfter" | "carryOver" };

type LeaveRow = {
  collaboratorId?: string; type?: string; status?: string;
  from?: string; to?: string; days?: unknown;
};

const MAX_DAYS = 366;
const blank = (v: unknown) => v === undefined || v === null || String(v).trim() === "";
// HALF DAYS, NOT CENTS: a pro-rated allowance of 10.5 is an answer somebody can
// take; 10.4166 is not.
const half = (n: number) => Math.round(n * 2) / 2;
function amount(v: unknown, max: number): number | null {
  if (blank(v)) return 0;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= max ? half(n) : null;
}

// ---- the rules --------------------------------------------------------------

/** What a studio's rules say, tolerant of anything stored. */
export function employmentRulesOf(studio: unknown): EmploymentRules {
  const raw = (studio as { employmentRules?: unknown } | null | undefined)?.employmentRules;
  const r = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const src = r.leave && typeof r.leave === "object" ? r.leave as Record<string, unknown> : {};
  const leave: Record<string, LeaveRule> = {};
  for (const [type, v] of Object.entries(src)) {
    const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
    const days = amount(o.days, MAX_DAYS);
    if (!days) continue;
    leave[type] = {
      days,
      afterYears: Math.floor(amount(o.afterYears, 50) ?? 0),
      daysAfter: amount(o.daysAfter, MAX_DAYS) ?? 0,
      carryOver: amount(o.carryOver, MAX_DAYS) ?? 0,
    };
  }
  return { leave, workingDays: r.workingDays === true };
}

/**
 * WHY A SUBMITTED SET OF RULES CANNOT BE STORED, per type and field, so the
 * screen can say it in the reader's language. A type with blank days is not a
 * problem — it is "keep no balance for this type", and it is dropped.
 */
export function employmentRuleProblems(v: unknown, leaveTypes: readonly string[]): RuleProblem[] {
  const r = v && typeof v === "object" ? v as Record<string, unknown> : {};
  const src = r.leave && typeof r.leave === "object" ? r.leave as Record<string, unknown> : {};
  const problems: RuleProblem[] = [];
  for (const [type, value] of Object.entries(src)) {
    const o = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
    if (blank(o.days)) continue;
    // A rule for a type the studio does not admit would never match a request.
    if (!leaveTypes.includes(type)) problems.push({ type, field: "type" });
    const days = amount(o.days, MAX_DAYS);
    if (!days) problems.push({ type, field: "days" });
    const after = amount(o.afterYears, 50);
    const daysAfter = amount(o.daysAfter, MAX_DAYS);
    if (after === null || (after && !Number.isInteger(after))) problems.push({ type, field: "afterYears" });
    if (daysAfter === null) problems.push({ type, field: "daysAfter" });
    // HALF A TIER IS NO TIER: "after 5 years" with no new figure, or a new
    // figure that never starts, is a rule that silently does nothing.
    if (after && daysAfter === 0) problems.push({ type, field: "daysAfter" });
    if (daysAfter && !after) problems.push({ type, field: "afterYears" });
    if (amount(o.carryOver, MAX_DAYS) === null) problems.push({ type, field: "carryOver" });
  }
  return problems;
}

export function cleanEmploymentRules(v: unknown, leaveTypes: readonly string[]):
  { rules: EmploymentRules } | { problems: RuleProblem[] } {
  const problems = employmentRuleProblems(v, leaveTypes);
  if (problems.length) return { problems };
  return { rules: employmentRulesOf({ employmentRules: v }) };
}

/**
 * ONE PERSON'S OWN ALLOWANCES, which replace the rule's days for them — a
 * contract that grants more than the law is the commonest case. Only types the
 * studio has a rule for; blank means "use the rule" and is not stored.
 */
export function cleanAllowances(v: unknown, types: readonly string[]): Record<string, number> {
  const src = v && typeof v === "object" ? v as Record<string, unknown> : {};
  const out: Record<string, number> = {};
  for (const type of types) {
    if (blank(src[type])) continue;
    const n = amount(src[type], MAX_DAYS);
    if (n !== null) out[type] = n;
  }
  return out;
}

// ---- counting days ----------------------------------------------------------

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/**
 * THE DAYS OF THE WEEK THE STUDIO WORKS, as JavaScript day numbers (0 = Sunday),
 * read off Studio settings' working hours. Null when none is open, so a studio
 * that never set its hours counts calendar days rather than no days at all.
 */
export function openWeekdays(workingHours: unknown): number[] | null {
  const h = workingHours && typeof workingHours === "object" ? workingHours as Record<string, { open?: unknown }> : {};
  const open = WEEKDAY_KEYS.map((k, i) => (h[k]?.open ? i : -1)).filter((i) => i >= 0);
  return open.length ? open : null;
}

const utc = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));

/**
 * INCLUSIVE — a one-day leave is one day. Calendar days when `open` is null,
 * otherwise only the days the studio works. Public holidays are not known to
 * the product, so they count.
 */
export function countLeaveDays(from: string, to: string, open: readonly number[] | null): number {
  if (!from || !to || to < from) return 0;
  const a = utc(from);
  const b = utc(to);
  const span = Math.round((b - a) / 86400000) + 1;
  if (!open) return span;
  const set = new Set(open);
  let n = 0;
  for (let i = 0; i < span; i++) if (set.has(new Date(a + i * 86400000).getUTCDay())) n += 1;
  return n;
}

// ---- the balance -------------------------------------------------------------

/** Completed years of service on a date. */
export function serviceYearsAt(dateOfJoin: string, at: string): number {
  if (!dateOfJoin || at < dateOfJoin) return 0;
  let years = Number(at.slice(0, 4)) - Number(dateOfJoin.slice(0, 4));
  if (at.slice(5) < dateOfJoin.slice(5)) years -= 1;
  return Math.max(0, years);
}

/**
 * WHAT ONE YEAR ALLOWS. The longer-service figure applies from the first year
 * that STARTS with the service completed — somebody reaching five years in June
 * gets it from the next January, the conservative reading, stated rather than
 * guessed at. The year somebody joins is PRO-RATED by the months left in it,
 * counting the month they joined.
 */
export function allowanceFor(rule: LeaveRule, dateOfJoin: string, year: number, override: number | null = null): number {
  const joinYear = dateOfJoin ? Number(dateOfJoin.slice(0, 4)) : 0;
  if (joinYear > year) return 0;
  const longer = rule.afterYears > 0 && rule.daysAfter > 0 && dateOfJoin
    && serviceYearsAt(dateOfJoin, `${year}-01-01`) >= rule.afterYears;
  const base = override ?? (longer ? rule.daysAfter : rule.days);
  if (joinYear === year) return half((base * (12 - (Number(dateOfJoin.slice(5, 7)) - 1))) / 12);
  return base;
}

/** Leave of one type and status taken by one person inside a calendar year. */
function takenIn(rows: readonly LeaveRow[], personId: string, type: string, year: number,
  status: string, open: readonly number[] | null): number {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  let total = 0;
  for (const v of rows) {
    if (v.collaboratorId !== personId || v.type !== type || v.status !== status) continue;
    const from = String(v.from || "");
    const to = String(v.to || from);
    if (!from || to < start || from > end) continue;
    const inside = from >= start && to <= end;
    // THE STORED COUNT WHEN THE WHOLE REQUEST IS IN THE YEAR — it is what the
    // person was told they were asking for. A request across New Year is split
    // and each half recounted, since no stored figure says how it divides.
    const stored = Number(v.days);
    total += inside && Number.isFinite(stored) && stored > 0
      ? stored
      : countLeaveDays(from < start ? start : from, to > end ? end : to, open);
  }
  return half(total);
}

export type LeaveBalance = {
  type: string; allowance: number; carried: number; taken: number;
  pending: number; remaining: number; afterPending: number;
};

/**
 * EVERY RULED TYPE'S BALANCE FOR ONE PERSON IN ONE YEAR. What carried in is
 * worked forward from the year they joined (at most ten years back) — each
 * year's unused leave, capped at the rule's carry-over, and never negative: an
 * overdrawn year is not a debt carried into the next one.
 */
export function leaveBalances(input: {
  rules: EmploymentRules;
  person: { id: string; dateOfJoin?: unknown; leaveAllowances?: unknown };
  vacations: readonly LeaveRow[];
  year: number;
  open: readonly number[] | null;
}): LeaveBalance[] {
  const { rules, person, vacations, year, open } = input;
  const join = /^\d{4}-\d{2}-\d{2}$/.test(String(person.dateOfJoin || "")) ? String(person.dateOfJoin) : "";
  const own = cleanAllowances(person.leaveAllowances, Object.keys(rules.leave));
  const joinYear = join ? Number(join.slice(0, 4)) : year;
  return Object.entries(rules.leave).map(([type, rule]) => {
    const override = type in own ? own[type] : null;
    let carried = 0;
    for (let y = Math.max(joinYear, year - 10); y < year; y++) {
      const left = allowanceFor(rule, join, y, override) + carried - takenIn(vacations, person.id, type, y, "Approved", open);
      carried = Math.min(rule.carryOver, Math.max(0, left));
    }
    const allowance = allowanceFor(rule, join, year, override);
    const taken = takenIn(vacations, person.id, type, year, "Approved", open);
    const pending = takenIn(vacations, person.id, type, year, "Pending", open);
    const remaining = half(allowance + carried - taken);
    return { type, allowance, carried, taken, pending, remaining, afterPending: half(remaining - pending) };
  });
}
