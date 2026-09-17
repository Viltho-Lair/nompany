// WHAT PEOPLE ARE PAID.
//
// `hr.employees.salary` HAS EXISTED SINCE THE CATALOGUE WAS WRITTEN, labelled
// "See pay and salary", and NOTHING IN THIS PRODUCT STORES A SALARY. The right
// reveals identity and passport numbers — its own comment says so — so a studio
// granting somebody "see pay" got passport numbers and no pay. That is
// invariant 16 from the inside: a right that names something nothing can
// exercise it against.
//
// SO PAY IS A RECORD, AND A RUN IS A SNAPSHOT OF IT. The distinction is the
// whole design:
//
//  - A PAY RECORD is what somebody earns NOW — a monthly basic, plus recurring
//    allowances and deductions. It changes when their pay changes.
//  - A RUN freezes it. The amounts are COPIED onto the run when it is prepared,
//    so a rise next month cannot rewrite last month's payslip. The same rule
//    the approval engine follows by storing the FX rate on the bill it routed:
//    a record of what was decided must not move when the inputs do.
//
// PURE. No store, no clock — a period comes in as a string and every amount
// comes in as a number. The imports are a TYPE, from the pure statutory rules,
// and `shared/money`, which is itself pure and imports nothing.

import type { SocialSecurity } from "./statutory";
import { roundMoney, roundSum } from "@/shared/money";

export type Component = {
  label: string; amount: number; kind: "allowance" | "deduction";
  /** An allowance social security is charged on (housing, under GOSI). */
  insurable?: boolean;
};

export type PayRecord = {
  collaboratorId: string;
  /** Monthly, in the studio's own currency — there is one payroll currency. */
  basic: number;
  components: Component[];
  /**
   * WHERE THE MONEY GOES. On the PAY RECORD rather than on the collaborator,
   * because a bank account is payroll data: `hr.payroll` already gates this
   * row, where a field on the collaborator would be readable by anybody who may
   * read People — which is Managers and Team Leads by default.
   */
  iban: string;
  bankName: string;
  /**
   * SOCIAL SECURITY FOR THIS PERSON: null follows the studio's scheme (which says
   * whether it covers everybody), true or false decides it — a UAE scheme covers
   * Emiratis only, and a Saudi one charges a non-Saudi the employer's 2% alone.
   */
  ssCovered?: boolean | null;
  /** This person's own rates, replacing the scheme's (null = the scheme's). */
  ssEmployeePct?: number | null;
  ssEmployerPct?: number | null;
  /** For the UAE's WPS file: the 14-digit labour-card ID and the 9-digit bank routing code. */
  labourCardId?: string;
  agentId?: string;
};

export type PayslipLine = {
  collaboratorId: string;
  alias: string;
  basic: number;
  allowances: number;
  deductions: number;
  gross: number;
  net: number;
  components: Component[];
  /** Days not worked in the period, from approved unpaid leave. */
  unpaidDays: number;
  unpaidDeduction: number;
  /**
   * DAYS OF THE PERIOD THEY WERE NOT EMPLOYED FOR — hired part way in, or gone
   * before the end — and what that took off the slip. Optional because every
   * line stored before the lifecycle shipped has neither, and a run is frozen:
   * an old payslip must go on reading exactly as it was issued.
   */
  notEmployedDays?: number;
  notEmployedDeduction?: number;
  /** What social security was charged on, the employee's share (in `deductions`), and the employer's. */
  ssBase?: number;
  ssEmployee?: number;
  ssEmployer?: number;
};

export const RUN_STATUSES = ["Draft", "Approved", "Paid"] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
// MONEY FOLLOWS ITS CURRENCY'S DECIMALS — a dinar has three, so a Jordanian
// payslip rounded to cents lost a fils on every line. An amount this file
// CREATES (a day docked, a contribution) is rounded to the studio's currency;
// a sum of amounts already rounded is only cleaned of float noise (`roundSum`),
// which can never cut a decimal the currency uses. `currency` is optional on
// every export: omitted, it is the two decimals these functions always used.
const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/** A payroll period, `YYYY-MM`. */
export const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** What is wrong with this pay record, or an empty array. */
export function payProblems(input: Record<string, unknown>): string[] {
  const problems: string[] = [];
  if (!str(input.collaboratorId, 60)) problems.push("a pay record belongs to somebody");
  const basic = Number(input.basic);
  // A BASIC OF NOUGHT IS LEGAL and a negative one is not. Somebody paid only in
  // commission has a basic of nought; nobody has a negative wage, and letting
  // one through would make every total downstream quietly wrong.
  if (!Number.isFinite(basic) || basic < 0) problems.push("the basic pay cannot be negative");

  for (const c of Array.isArray(input.components) ? input.components : []) {
    const comp = c as Record<string, unknown>;
    if (!str(comp?.label, 80)) problems.push("every allowance and deduction needs a name");
    // AMOUNTS ARE ALWAYS POSITIVE and the KIND carries the sign. A deduction
    // stored as a negative allowance is the same thing said two ways, and the
    // first report that sums "allowances" gets it wrong.
    if (!(num(comp?.amount) > 0)) problems.push(`"${str(comp?.label, 80)}" needs an amount above nought`);
    if (comp?.kind !== "allowance" && comp?.kind !== "deduction") {
      problems.push(`"${str(comp?.label, 80)}" must be an allowance or a deduction`);
    }
  }
  for (const key of ["ssEmployeePct", "ssEmployerPct"]) {
    const v = input[key];
    if (v === undefined || v === null || v === "") continue;
    if (!(Number(v) >= 0 && Number(v) <= 100)) problems.push("a social security rate is a percentage from 0 to 100");
  }
  return problems;
}

const pctOrNull = (v: unknown) => (v === undefined || v === null || v === "" || !Number.isFinite(Number(v))
  ? null : Math.max(0, Math.min(100, Number(v))));

export function cleanPay(input: Record<string, unknown>, currency?: unknown): PayRecord {
  return {
    collaboratorId: str(input.collaboratorId, 60),
    // A SALARY IS AN AMOUNT PAID, not a unit rate, so it is held to the
    // currency's own unit: a basic nobody can actually be paid would carry its
    // fraction onto every slip that copies it.
    basic: roundMoney(Math.max(0, num(input.basic)), currency),
    // NOT VALIDATED AS AN IBAN. Formats differ by country and this product is
    // regional; a wrong-looking-but-correct account refused at entry is worse
    // than one the bank rejects with a message the studio can read.
    iban: str(input.iban, 40).replace(/\s+/g, "").toUpperCase(),
    bankName: str(input.bankName, 120),
    ssCovered: input.ssCovered === true ? true : input.ssCovered === false ? false : null,
    ssEmployeePct: pctOrNull(input.ssEmployeePct),
    ssEmployerPct: pctOrNull(input.ssEmployerPct),
    // CHECKED WHEN THE FILE IS WRITTEN, not here: somebody outside the UAE has
    // neither, and the file names whoever is missing one.
    labourCardId: str(input.labourCardId, 20).replace(/\s+/g, ""),
    agentId: str(input.agentId, 20).replace(/\s+/g, ""),
    components: (Array.isArray(input.components) ? input.components : [])
      .map((c) => c as Record<string, unknown>)
      .filter((c) => str(c?.label, 80) && num(c?.amount) > 0
        && (c?.kind === "allowance" || c?.kind === "deduction"))
      .map((c) => ({
        label: str(c.label, 80),
        amount: roundMoney(num(c.amount), currency),
        kind: c.kind as Component["kind"],
        // Only an allowance can be insurable; a deduction is not wage.
        ...(c.kind === "allowance" && c.insurable === true ? { insurable: true } : {}),
      }))
      .slice(0, 20),
  };
}

/**
 * THIS PERSON'S SOCIAL SECURITY FOR A MONTH. Charged on the basic plus the
 * allowances marked insurable — the CONTRACTUAL wage, before any unpaid-leave
 * docking — up to the scheme's ceiling.
 *
 * A PART MONTH OF EMPLOYMENT SCALES THE BASE; A MONTH WITH UNPAID DAYS DOES
 * NOT, and the difference is not an inconsistency. Unpaid leave is a full month
 * of employment with days not worked: the contract stands the whole month and
 * so does the insurable wage. Somebody hired on the 20th has no contract at all
 * for the first nineteen days — there is no wage to insure — so the insurable
 * period is short, not the wage.
 *
 * WHAT IS NOT MODELLED: each scheme's own partial-month rule. Some charge a
 * whole month whenever any part of it is insured. `factor` is the least wrong
 * default rather than a country's answer, and `docs/functionality/payroll.md`
 * says so.
 */
export function socialSecurityOn(
  pay: PayRecord, ss: SocialSecurity | null | undefined, currency?: unknown, factor = 1,
) {
  const covered = pay.ssCovered ?? ss?.coversEveryone ?? false;
  if (!ss || !covered) return { base: 0, employee: 0, employer: 0 };
  const insurable = pay.basic + pay.components
    .filter((c) => c.kind === "allowance" && c.insurable)
    .reduce((t, c) => t + c.amount, 0);
  const capped = ss.ceiling > 0 ? Math.min(insurable, ss.ceiling) : insurable;
  // THE CEILING IS A MONTHLY ONE, so it is applied to the whole wage and the
  // result scaled — not the other way round, which would let a part month slip
  // under a ceiling it never actually fell below.
  const base = roundMoney(capped * (Number.isFinite(factor) ? Math.max(0, Math.min(1, factor)) : 1), currency);
  return {
    base,
    employee: roundMoney((base * (pay.ssEmployeePct ?? ss.employeePct)) / 100, currency),
    employer: roundMoney((base * (pay.ssEmployerPct ?? ss.employerPct)) / 100, currency),
  };
}

/**
 * A PERIOD'S FIRST AND LAST DAY, as ISO days — what `employedBetween` is asked
 * about. `["", ""]` when it is not a period, so a caller that forgot to check
 * gets a window nothing was employed in rather than a window of everything.
 */
export function periodRange(period: string): [string, string] {
  const days = daysInPeriod(period);
  return days ? [`${period}-01`, `${period}-${String(days).padStart(2, "0")}`] : ["", ""];
}

/** The days in a `YYYY-MM` period. Null when it is not a period. */
export function daysInPeriod(period: string): number | null {
  if (!PERIOD_RE.test(period)) return null;
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * ONE PERSON'S SLIP FOR ONE PERIOD.
 *
 * UNPAID LEAVE IS PRO-RATED ON THE BASIC ALONE, not on the gross. An allowance
 * for a phone or a car does not stop because somebody took a week unpaid; a
 * studio that wanted it to would be describing a different allowance. Doing it
 * on the gross is the common shortcut and it silently docks the wrong amount.
 *
 * A PART MONTH OF EMPLOYMENT IS PRO-RATED ON THE WHOLE SLIP, and that is the
 * opposite decision on purpose. Unpaid leave is a month somebody WAS employed
 * for with days they did not work, so the car allowance stands; a person hired
 * on the 20th was not employed at all until the 20th, and paying them a full
 * month's car allowance for a fortnight before they had a contract is not a
 * generous reading of the allowance, it is a wrong number.
 *
 * AND IT IS CARRIED AS A DEDUCTION rather than by shrinking `basic`, which is
 * what keeps every slip's arithmetic reconciling: basic + allowances −
 * deductions = net holds on a part month exactly as it does on a full one, and
 * `basic` goes on meaning the contractual monthly figure on every line of every
 * run. The clerk sees the days and the amount, beside the unpaid-leave pair
 * they already read the same way.
 *
 * THE NET CAN BE NEGATIVE AND IS NOT FLOORED. Deductions exceeding pay is a
 * real situation — a repaid advance, a month almost entirely unpaid — and
 * clamping it to nought would quietly forgive the difference and leave the
 * ledger short by exactly the amount nobody noticed. It is reported instead.
 */
export function payslipFor(
  pay: PayRecord,
  { alias, period, unpaidDays = 0, ss = null, employedDays = null }: {
    alias: string; period: string; unpaidDays?: number;
    /** The studio's social security scheme; null charges none. */
    ss?: SocialSecurity | null;
    /**
     * DAYS OF THE PERIOD THIS PERSON WAS EMPLOYED FOR (modules/hr/lifecycle's
     * `employedBetween`). NULL means the whole period — which is what every
     * caller meant before the lifecycle existed, so an unchanged caller gets an
     * unchanged slip.
     */
    employedDays?: number | null;
  },
  /** The studio's currency: the decimals a docked day and a contribution round to. */
  currency?: unknown,
): PayslipLine {
  const days = daysInPeriod(period);
  const allowances = roundSum(pay.components.filter((c) => c.kind === "allowance")
    .reduce((sum, c) => sum + c.amount, 0));
  const recurring = roundSum(pay.components.filter((c) => c.kind === "deduction")
    .reduce((sum, c) => sum + c.amount, 0));

  // EMPLOYED FOR THE WHOLE PERIOD UNLESS TOLD OTHERWISE, and never for more of
  // it than it has.
  const served = employedDays === null || days === null
    ? days
    : Math.max(0, Math.min(Math.round(employedDays), days));
  const notEmployedDays = days === null || served === null ? 0 : days - served;
  const factor = days && served !== null ? served / days : 1;

  // A PERIOD THAT IS NOT A PERIOD DOCKS NOTHING rather than dividing by null.
  const perDay = days ? pay.basic / days : 0;
  // UNPAID DAYS CANNOT OUTRUN THE DAYS SOMEBODY WAS HERE. A month where they
  // were employed for ten days cannot carry twenty unpaid ones, and docking
  // both would take the same money twice.
  const docked = roundMoney(Math.min(Math.max(0, unpaidDays), served || 0) * perDay, currency);
  const unemployed = roundMoney(notEmployedDays * (days ? (pay.basic + allowances) / days : 0), currency);

  const gross = roundSum(pay.basic + allowances - docked - unemployed);
  // THE EMPLOYEE'S SHARE IS WITHHELD, the employer's is a cost on top of gross —
  // so only the first touches the net.
  const social = socialSecurityOn(pay, ss, currency, factor);
  return {
    collaboratorId: pay.collaboratorId,
    alias,
    basic: pay.basic,
    allowances,
    deductions: roundSum(recurring + docked + unemployed + social.employee),
    gross,
    net: roundSum(gross - recurring - social.employee),
    components: pay.components,
    unpaidDays: Math.max(0, unpaidDays),
    unpaidDeduction: docked,
    /** Days of the period they were NOT employed, and what that took off. */
    notEmployedDays,
    notEmployedDeduction: unemployed,
    ssBase: social.base,
    ssEmployee: social.employee,
    ssEmployer: social.employer,
  };
}

export type RunTotals = {
  people: number;
  basic: number;
  allowances: number;
  deductions: number;
  gross: number;
  net: number;
  /** Social security: the employees' share (inside `deductions`) and the employer's, on top. */
  ssEmployee: number;
  ssEmployer: number;
  /** Slips whose net came out below nought — reported, never clamped. */
  negative: PayslipLine[];
};

export function runTotals(lines: PayslipLine[]): RunTotals {
  // Every line was rounded to its currency when the run was prepared, so a
  // total only needs the float noise taken off — no currency, no decimal lost.
  const sum = (pick: (l: PayslipLine) => number) => roundSum(lines.reduce((t, l) => t + pick(l), 0));
  return {
    people: lines.length,
    basic: sum((l) => l.basic),
    allowances: sum((l) => l.allowances),
    deductions: sum((l) => l.deductions),
    gross: sum((l) => l.gross),
    net: sum((l) => l.net),
    ssEmployee: sum((l) => l.ssEmployee || 0),
    ssEmployer: sum((l) => l.ssEmployer || 0),
    negative: lines.filter((l) => l.net < 0),
  };
}

/**
 * WHY THIS RUN CANNOT MOVE FROM WHERE IT IS. A reason, or null.
 *
 * A RUN IS PREPARED, APPROVED, THEN PAID, and the ladder never runs backwards.
 * A payroll that could be reopened after approval is a payroll whose payslips
 * are not evidence of anything — which is the same argument the controlled
 * document ladder makes, and the reason `Approved` freezes the amounts.
 */
export function runProblem(status: RunStatus, next: RunStatus): string | null {
  const NEXT: Record<RunStatus, RunStatus[]> = {
    Draft: ["Approved"],
    Approved: ["Paid"],
    Paid: [],
  };
  if (!NEXT[status]?.includes(next)) return "transition";
  return null;
}

/**
 * MAY THIS PERSON APPROVE IT? Invariant 7, at the transition rather than in the
 * permission model: holding both rights is legitimate, using both on one run is
 * not. Preparing payroll and authorising it are the two halves of the oldest
 * control there is.
 */
export function approvalProblem(
  run: { status: RunStatus; preparedByCollaboratorId: string },
  collaboratorId: string,
  opts: { admin?: boolean } = {},
): string | null {
  if (run.status !== "Draft") return "already-approved";
  // THE ADMIN IS THE EXCEPTION — the owner's instruction, 10/09/2026. The
  // studio's owner or a holder of the Admin role has full authority, and a
  // studio run by one person could otherwise never pay itself. Everybody else
  // still needs a second person: preparing and authorising stay two acts.
  if (run.preparedByCollaboratorId === collaboratorId && !opts.admin) return "same-signer";
  return null;
}

/**
 * THE BANK FILE'S ROWS.
 *
 * A SLIP WITH NO ACCOUNT IS LEFT OUT AND NAMED, never written with a blank
 * field: a payment file with an empty account number is rejected by the bank as
 * a whole, so one missing detail would silently fail everybody's pay rather
 * than one person's. `missing` is what the studio fixes before it sends.
 *
 * A NEGATIVE OR NOUGHT NET IS ALSO LEFT OUT. A bank cannot take money out of
 * somebody's account through a salary file, and a zero-value line is a
 * rejection in most WPS formats.
 */
export function bankRows(
  lines: PayslipLine[],
  accountOf: (collaboratorId: string) => { iban: string; bank: string } | null,
): { rows: { alias: string; iban: string; bank: string; net: number }[]; missing: PayslipLine[] } {
  const rows: { alias: string; iban: string; bank: string; net: number }[] = [];
  const missing: PayslipLine[] = [];
  for (const line of lines) {
    const account = accountOf(line.collaboratorId);
    if (!account?.iban || line.net <= 0) { missing.push(line); continue; }
    rows.push({ alias: line.alias, iban: account.iban, bank: account.bank, net: line.net });
  }
  return { rows, missing };
}
