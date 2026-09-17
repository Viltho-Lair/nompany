// THE EMPLOYMENT LIFECYCLE, PURELY — what state somebody is in, what contract
// they are on, which moves are legal, and what is owed when they leave.
//
// WHY THIS EXISTS. HR could describe a person and could not describe their
// EMPLOYMENT. There was no hire date that meant anything beyond a field, no
// probation, no notice, no leaving date and no leaving reason — so `endOfService`
// (statutory.ts) computed a settlement that nothing in the product could ever
// trigger, and payroll had no way to know that the person it was about to pay
// left in March. A right nothing can exercise is a bug (invariant 16); an
// ARITHMETIC nothing can reach is the same bug one layer down.
//
// TWO RECORDS AND ONE FIELD, which is the whole model:
//
//   the contract       — versioned and effective-dated. An amendment is a NEW
//                        row superseding the old one, never an edit, because
//                        "what were they on in May" has to keep answering.
//   the lifecycle event — append-only history. Every move writes one.
//   employmentStatus    — the LIVE state, on the collaborator row, so that
//                        payroll, leave and the roll do not each replay the
//                        event log to find out whether somebody still works here.
//
// The field could be derived from the events and deliberately is not: the plan's
// own rule is that "every transition writes a lifecycle event row that payroll,
// leave and analytics read later, so no downstream subsection has to infer
// state". Storing the answer is what keeps the inference out of every reader;
// the events are what make it auditable.
//
// NO STORE AND NO CLOCK. Every date arrives as an argument, which is what lets
// the model test assert a probation ending on a Tuesday in 2027.

import { roundMoney } from "@/shared/money";
// The award itself is statutory.ts's — imported rather than reimplemented, so a
// country's end-of-service formula has exactly one home.
import { serviceYearsBetween, endOfService as endOfServiceAward, type EndOfService } from "./statutory";
import { employmentPackFor, CONTRACT_TYPES, type EmploymentPack } from "./packs/employment";

export type { EmploymentPack } from "./packs/employment";
export { employmentPackFor, CONTRACT_TYPES } from "./packs/employment";

// ---- the states -------------------------------------------------------------

/**
 * THE SIX STATES, and the plan's state diagram is the whole of the argument for
 * each one:
 *
 *   Onboarding — hired, paperwork running, not yet started. Payroll must not pay
 *                them and leave must not accrue: they are not at work.
 *   Probation  — started, and either party may end it on the short notice the
 *                country pack names.
 *   Active     — confirmed.
 *   Suspended  — a disciplinary state. Still employed, which is why it is not
 *                Exited, and not at work, which is why it is not Active.
 *   Notice     — leaving on a known day and still owed pay until it.
 *   Exited     — gone. The row stays; the employment is over.
 */
export const EMPLOYMENT_STATUSES = [
  "Onboarding", "Probation", "Active", "Suspended", "Notice", "Exited",
] as const;

export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

/**
 * WHAT COUNTS AS EMPLOYED — the question payroll, leave and the headcount all
 * ask, asked once here so the three cannot answer it differently.
 *
 * Onboarding IS employed and Exited is not. Somebody on notice is still on the
 * payroll until their last day, which is exactly the case a `status !== "Exited"`
 * test written inline in three places would get right twice.
 */
export const EMPLOYED: readonly EmploymentStatus[] = [
  "Onboarding", "Probation", "Active", "Suspended", "Notice",
];

/** At work today — narrower than employed, and what a roster or a rota asks. */
export const AT_WORK: readonly EmploymentStatus[] = ["Probation", "Active", "Notice"];

/**
 * THE STATUS OF SOMEBODY WHOSE ROW PREDATES THIS FEATURE, read rather than
 * written: every collaborator in every live studio has no `employmentStatus`,
 * and the truth about them is that they are working here. Absent reads as
 * Active — never as Onboarding, which would tell payroll to skip them.
 */
export const DEFAULT_STATUS: EmploymentStatus = "Active";

export function statusOf(row: { employmentStatus?: unknown } | null | undefined): EmploymentStatus {
  const s = String(row?.employmentStatus || "");
  return (EMPLOYMENT_STATUSES as readonly string[]).includes(s) ? s as EmploymentStatus : DEFAULT_STATUS;
}

// ---- the moves --------------------------------------------------------------

/**
 * EVERY LEGAL MOVE, as data rather than as a switch statement. `from` is
 * exhaustive: a move is refused unless the current state is named, so a state
 * added to the ladder without deciding what leads out of it fails the model test
 * rather than quietly stranding whoever is sitting in it.
 *
 * EVERY MOVE CARRIES AN EFFECTIVE DATE OF ITS OWN, which is why none of them is
 * "now": a confirmation happens on the probation end and an exit on the last
 * working day, and both are routinely recorded days after the fact.
 */
export const MOVES = Object.freeze({
  hire: { to: "Onboarding", from: ["Exited"], label: "Hired" },
  start: { to: "Probation", from: ["Onboarding"], label: "Started" },
  confirm: { to: "Active", from: ["Probation", "Onboarding"], label: "Confirmed" },
  suspend: { to: "Suspended", from: ["Active", "Probation"], label: "Suspended" },
  reinstate: { to: "Active", from: ["Suspended"], label: "Reinstated" },
  giveNotice: { to: "Notice", from: ["Active", "Probation", "Suspended"], label: "Notice given" },
  withdrawNotice: { to: "Active", from: ["Notice"], label: "Notice withdrawn" },
  exit: { to: "Exited", from: ["Onboarding", "Probation", "Active", "Suspended", "Notice"], label: "Exited" },
} as const satisfies Record<string, { to: EmploymentStatus; from: readonly EmploymentStatus[]; label: string }>);

export type Move = keyof typeof MOVES;
export const MOVE_KEYS = Object.keys(MOVES) as Move[];

/**
 * EVENTS THAT ARE HISTORY WITHOUT BEING A MOVE. A transfer and a promotion
 * change what somebody does and not whether they are employed; a contract
 * signing is the paper behind a move that has its own row. They are in the same
 * log because "what happened to this person, in order" is one question.
 */
export const RECORD_EVENTS = Object.freeze({
  contract: "Contract signed",
  amendment: "Contract amended",
  transfer: "Transferred",
  promotion: "Promoted",
  note: "Note",
} as const);

export type RecordEvent = keyof typeof RECORD_EVENTS;

export const EVENT_TYPES: readonly string[] = [...MOVE_KEYS, ...Object.keys(RECORD_EVENTS)];

/** The move a state may legally take, for a screen that offers buttons. */
export function movesFrom(status: EmploymentStatus): Move[] {
  return MOVE_KEYS.filter((m) => (MOVES[m].from as readonly string[]).includes(status));
}

/**
 * WHY A MOVE IS REFUSED, or null. The two refusals are different facts and the
 * screen says different things about them: `unknown-move` is a bad request, and
 * `illegal-move` is a real state somebody is in that this move does not leave.
 */
export function moveProblem(status: EmploymentStatus, move: string): string | null {
  if (!(MOVE_KEYS as readonly string[]).includes(move)) return "unknown-move";
  if (!(MOVES[move as Move].from as readonly string[]).includes(status)) return "illegal-move";
  return null;
}

// ---- the reasons somebody leaves ---------------------------------------------

/**
 * WHY THE LIST MATTERS BEYOND REPORTING: end of service is REDUCED on
 * resignation in some countries (Saudi art. 85 pays nothing under two years, a
 * third under five) and is not reduced on anything else. So the reason picked on
 * an exit screen decides money, which is why it is a closed list rather than a
 * free-text box, and why `reasonKind` below is the only place the mapping lives.
 */
export const EXIT_REASONS = [
  "Resignation", "Termination", "End of contract", "Redundancy", "Retirement", "Death",
] as const;

export type ExitReason = (typeof EXIT_REASONS)[number];

/**
 * WHICH END-OF-SERVICE FACTOR A REASON TAKES. Only a resignation is reduced.
 *
 * RETIREMENT AND DEATH ARE NOT RESIGNATIONS even though nobody was dismissed —
 * reading them as one would cut a thirty-year employee's award to two thirds for
 * reaching pension age, which is neither the law nor anything a studio would
 * intend. END OF CONTRACT is not one either: the contract ran its term.
 */
export function reasonKind(reason: unknown): "resignation" | "termination" {
  return String(reason) === "Resignation" ? "resignation" : "termination";
}

// ---- the contract -------------------------------------------------------------

export type EmploymentContract = {
  id: string;
  studioId: string;
  sectionId: string;
  collaboratorId: string;
  type: string;
  jobTitle: string;
  startDate: string;
  /** Required on a fixed term and empty otherwise — see `contractProblems`. */
  endDate: string;
  probationMonths: number;
  noticeDays: number;
  /** Hours a normal week, for the day Time & Attendance derives overtime from it. */
  weeklyHours: number;
  /** The row this one replaces. "" on a first contract. */
  supersedesId: string;
  /** Why it was amended, which is the one thing a version compare cannot show. */
  note: string;
  createdAt: string;
  createdByCollaboratorId: string;
};

/**
 * ONE THING THAT HAPPENED TO AN EMPLOYMENT — append-only, and the reason no
 * downstream reader has to infer state.
 *
 * `payload` is open because what a transfer records (a department, before and
 * after) has nothing in common with what an exit records (a settlement
 * snapshot), and a union naming both would be edited every time a move is added.
 *
 * `status` is the state AFTER a move, and absent on the record-only events —
 * a transfer, a promotion, a note — which change what somebody does without
 * changing whether they are employed.
 */
export type LifecycleEvent = {
  id: string;
  studioId: string;
  sectionId: string;
  collaboratorId: string;
  type: string;
  status?: string;
  /** The day it TOOK EFFECT, which is routinely not the day it was recorded. */
  effectiveDate: string;
  note: string;
  payload?: Record<string, unknown>;
  createdAt: string;
  actorCollaboratorId: string;
};

const str = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
const day = (v: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "").trim()) ? String(v).trim() : "";
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export type ContractProblem =
  | "collaborator" | "type" | "start" | "end" | "term" | "probation" | "notice" | "hours";

/**
 * WHAT A CONTRACT MUST SAY, judged against the pack in force ON ITS OWN START
 * DATE. Passing today's pack would refuse a 2019 contract for a probation that
 * was legal in 2019, which is the exact failure effective dating exists to
 * prevent — so the caller resolves the pack from `startDate` and hands it in.
 */
export function contractProblems(input: Record<string, unknown>, pack: EmploymentPack): ContractProblem[] {
  const out: ContractProblem[] = [];
  if (!str(input?.collaboratorId, 60)) out.push("collaborator");

  const type = str(input?.type, 40);
  // AGAINST THE PACK, not against CONTRACT_TYPES: an Emirati studio may not
  // write a permanent contract at all (Decree-Law 33/2021 art. 8), and the
  // refusal has to be the country's rather than the product's.
  if (!type || !pack.contractTypes.includes(type)) out.push("type");

  const start = day(input?.startDate);
  if (!start) out.push("start");

  const end = day(input?.endDate);
  const fixed = type === "Fixed term" || type === "Internship" || type === "Secondment";
  // A FIXED TERM WITH NO END IS NOT FIXED. And an end date on an open contract
  // is a leaving date written in the wrong place — the exit is what records
  // that, and accepting it here would give the studio two answers to "when does
  // this end", one of which nothing reads.
  if (fixed && !end) out.push("term");
  if (!fixed && end) out.push("end");
  if (end && start && end <= start) out.push("end");

  const probation = num(input?.probationMonths);
  if (probation < 0 || probation > pack.probation.maxMonths) out.push("probation");

  const notice = num(input?.noticeDays);
  if (notice < 0 || (pack.notice.maxDays > 0 && notice > pack.notice.maxDays)) out.push("notice");

  const hours = num(input?.weeklyHours);
  if (hours < 0 || hours > 168) out.push("hours");

  return out;
}

/** The stored shape, with the pack's defaults filling what nobody typed. */
export function cleanContract(
  input: Record<string, unknown>, pack: EmploymentPack,
): Omit<EmploymentContract, "id" | "studioId" | "sectionId" | "createdAt"> {
  const type = str(input?.type, 40);
  const fixed = type === "Fixed term" || type === "Internship" || type === "Secondment";
  return {
    collaboratorId: str(input?.collaboratorId, 60),
    type,
    jobTitle: str(input?.jobTitle, 140),
    startDate: day(input?.startDate),
    endDate: fixed ? day(input?.endDate) : "",
    probationMonths: input?.probationMonths === undefined || input.probationMonths === ""
      ? pack.probation.months : Math.max(0, num(input.probationMonths)),
    noticeDays: input?.noticeDays === undefined || input.noticeDays === ""
      ? pack.notice.days : Math.max(0, Math.round(num(input.noticeDays))),
    weeklyHours: Math.max(0, num(input?.weeklyHours)),
    supersedesId: str(input?.supersedesId, 60),
    note: str(input?.note, 500),
    createdByCollaboratorId: str(input?.createdByCollaboratorId, 60),
  };
}

/**
 * THE CONTRACT SOMEBODY WAS ON, ON A GIVEN DAY — the effective-dated read, and
 * the reason contracts are versioned rather than edited.
 *
 * SUPERSEDED ROWS ARE NOT EXCLUDED, and that is the point: an amendment signed
 * in June with a start date in June does not change what was in force in May,
 * so the answer is simply the latest contract whose `startDate` is at or before
 * the day asked about. A row created later but starting later still does not
 * answer for today.
 *
 * Ties break on `createdAt`: two amendments effective the same morning are
 * ordered by which was written second, which is the only fact available.
 */
export function contractAt(
  contracts: readonly EmploymentContract[], collaboratorId: string, on: string,
): EmploymentContract | null {
  const mine = contracts
    .filter((c) => c.collaboratorId === collaboratorId && c.startDate && c.startDate <= on)
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || String(a.createdAt).localeCompare(String(b.createdAt)));
  return mine[mine.length - 1] || null;
}

/** The whole chain for one person, newest first — what a version compare reads. */
export function contractsOf(
  contracts: readonly EmploymentContract[], collaboratorId: string,
): EmploymentContract[] {
  return contracts
    .filter((c) => c.collaboratorId === collaboratorId)
    .sort((a, b) => b.startDate.localeCompare(a.startDate) || String(b.createdAt).localeCompare(String(a.createdAt)));
}

// ---- dates the contract implies -----------------------------------------------

/** `from` plus whole months, clamped to the month's length (31 Jan + 1 = 28 Feb). */
export function addMonths(from: string, months: number): string {
  if (!day(from) || !Number.isFinite(months)) return "";
  const [y, m, d] = from.split("-").map(Number);
  const whole = Math.trunc(months);
  const target = new Date(Date.UTC(y, m - 1 + whole, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}

export function addDays(from: string, days: number): string {
  if (!day(from) || !Number.isFinite(days)) return "";
  const at = new Date(`${from}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + Math.trunc(days));
  return at.toISOString().slice(0, 10);
}

/** Whole days between two ISO days, negative when `to` is in the past. */
export function daysBetween(from: string, to: string): number {
  if (!day(from) || !day(to)) return 0;
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

/**
 * WHEN PROBATION ENDS — "" where there is none, which is a different answer from
 * a date in the past and is what stops a no-probation contract appearing on the
 * "probation ending" list for ever.
 */
export function probationEndsOn(contract: EmploymentContract | null): string {
  if (!contract || !contract.startDate || !(contract.probationMonths > 0)) return "";
  return addMonths(contract.startDate, contract.probationMonths);
}

/**
 * THE LAST DAY OF NOTICE GIVEN ON A DAY. The pack's shortened probation notice
 * applies where the country names one and the person is still on probation —
 * the UAE's fourteen days (art. 9) rather than the contract's thirty.
 */
export function noticeEndsOn(
  from: string, contract: EmploymentContract | null, pack: EmploymentPack, status: EmploymentStatus,
): string {
  const probation = status === "Probation" && pack.notice.probationDays > 0;
  const days = probation ? pack.notice.probationDays : (contract?.noticeDays ?? pack.notice.days);
  return addDays(from, days);
}

// ---- what needs attention ------------------------------------------------------

export type Attention = {
  collaboratorId: string;
  alias: string;
  kind: "probation" | "contract" | "notice";
  date: string;
  daysLeft: number;
};

type PersonRef = { id: string; alias?: string; employmentStatus?: unknown; noticeEndsOn?: unknown };

/**
 * THE THREE DATES THAT RUN OUT ON SOMEBODY — one list rather than three, because
 * the attention queue the plan describes is one list sorted by due date and a
 * screen merging three arrays would sort them three times.
 *
 * OVERDUE ROWS ARE INCLUDED, with a negative `daysLeft`. A probation that ended
 * last week is the most urgent row on the screen, not an expired one to drop:
 * an unconfirmed probation is somebody working under terms both sides think
 * have lapsed.
 */
export function attentionList(
  people: readonly PersonRef[],
  contracts: readonly EmploymentContract[],
  asOf: string,
  withinDays = 45,
): Attention[] {
  const out: Attention[] = [];
  for (const p of people) {
    const status = statusOf(p);
    if (status === "Exited") continue;
    const alias = String(p.alias || "");
    const current = contractAt(contracts, p.id, asOf);

    if (status === "Probation") {
      const ends = probationEndsOn(current);
      if (ends) {
        const left = daysBetween(asOf, ends);
        if (left <= withinDays) out.push({ collaboratorId: p.id, alias, kind: "probation", date: ends, daysLeft: left });
      }
    }

    // A FIXED TERM RUNNING OUT is the one nobody remembers until the day after:
    // the contract simply ends, and an employee still turning up on an expired
    // fixed term is a legal problem rather than an administrative one.
    if (current?.endDate) {
      const left = daysBetween(asOf, current.endDate);
      if (left <= withinDays) out.push({ collaboratorId: p.id, alias, kind: "contract", date: current.endDate, daysLeft: left });
    }

    if (status === "Notice") {
      const ends = day(p.noticeEndsOn);
      if (ends) out.push({ collaboratorId: p.id, alias, kind: "notice", date: ends, daysLeft: daysBetween(asOf, ends) });
    }
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft || a.alias.localeCompare(b.alias));
}

// ---- the final settlement -------------------------------------------------------

/**
 * A MONTH IS THIRTY DAYS when a monthly wage is turned into a daily one. That is
 * the divisor Jordan, Saudi Arabia and the UAE all use for end-of-service, leave
 * encashment and pay in lieu of notice, and using the calendar month's own
 * length instead would pay a February leaver more per day than a March one for
 * the same salary.
 */
export const DAYS_IN_MONTH = 30;

export type SettlementInput = {
  dateOfJoin: string;
  lastWorkingDay: string;
  reason: ExitReason | string;
  /** Monthly basic and monthly gross — which one end of service uses is the rule's. */
  basic: number;
  wage: number;
  eosRule: EndOfService | null;
  /** Leave not taken, in days. NULL where the studio counts no balance for them. */
  unusedLeaveDays: number | null;
  noticeDaysRequired: number;
  noticeDaysServed: number;
  /**
   * ANYTHING COMING OFF — an advance, a loan, unreturned kit. TYPED rather than
   * read: this product models no loans yet, and a nought it computed itself
   * would read as "they owe nothing" when the truth is "nothing here knows".
   */
  deductions: number;
};

export type Settlement = {
  years: number;
  dailyWage: number;
  /** NULL where the studio has no end-of-service rule at all — Jordan has none. */
  endOfService: { years: number; months: number; factor: number; amount: number } | null;
  /** NULL where the leave balance is unknown, which is not the same as nought. */
  encashment: number | null;
  unusedLeaveDays: number | null;
  noticeShortfallDays: number;
  /** Signed: owed TO a dismissed employee, owed BY one who resigned — see below. */
  noticeInLieu: number;
  deductions: number;
  total: number;
  /**
   * WHETHER EVERY LINE IS KNOWN. The BOQ's rule, for the BOQ's reason: the sum
   * of a part-known settlement is a number and is not the settlement, and a
   * screen that prints it without this flag is telling a leaver what they are
   * owed on figures it could not read.
   */
  complete: boolean;
};

/**
 * WHAT SOMEBODY IS OWED ON LEAVING. End of service, plus leave they never took,
 * plus or minus notice nobody served, less what they still owe on a loan.
 *
 * NOTICE IN LIEU HAS A SIGN, and it is the reason this is not four additions.
 * When the EMPLOYER ends it without serving the notice, the shortfall is PAID to
 * the employee; when the employee RESIGNS and walks out early, the same
 * shortfall is owed the other way and comes off the settlement. One number, two
 * directions, decided by the reason — and a settlement that always added it
 * would pay somebody for the notice they failed to give.
 */
export function settlement(input: SettlementInput, currency?: unknown): Settlement {
  const years = serviceYearsBetween(input.dateOfJoin, input.lastWorkingDay);
  const dailyWage = roundMoney(input.wage / DAYS_IN_MONTH, currency);

  const eos = input.eosRule
    ? endOfServiceAward(input.eosRule, {
      dateOfJoin: input.dateOfJoin, asOf: input.lastWorkingDay,
      basic: input.basic, wage: input.wage, reason: reasonKind(input.reason),
    }, currency)
    : null;

  const encashment = input.unusedLeaveDays === null || !Number.isFinite(input.unusedLeaveDays)
    ? null
    : roundMoney(Math.max(0, input.unusedLeaveDays) * dailyWage, currency);

  const shortfall = Math.max(0, Math.round(input.noticeDaysRequired - input.noticeDaysServed));
  const direction = reasonKind(input.reason) === "resignation" ? -1 : 1;
  const noticeInLieu = roundMoney(shortfall * dailyWage * direction, currency);

  const deductions = Math.max(0, Number(input.deductions) || 0);
  // ROUNDED ONCE, AT THE END. Each line is already at the currency's decimals,
  // so this only clears the float dust that summing them leaves behind.
  const total = roundMoney((eos ? eos.amount : 0) + (encashment ?? 0) + noticeInLieu - deductions, currency);

  return {
    years: Math.round(years * 100) / 100,
    dailyWage,
    endOfService: eos,
    encashment,
    unusedLeaveDays: input.unusedLeaveDays,
    noticeShortfallDays: shortfall,
    noticeInLieu,
    deductions,
    total,
    complete: encashment !== null,
  };
}
