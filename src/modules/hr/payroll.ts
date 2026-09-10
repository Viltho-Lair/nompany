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
// PURE. No imports, no store, no clock — a period comes in as a string and
// every amount comes in as a number.

export type Component = { label: string; amount: number; kind: "allowance" | "deduction" };

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
};

export const RUN_STATUSES = ["Draft", "Approved", "Paid"] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const money = (n: number) => Math.round(n * 100) / 100;
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
  return problems;
}

export function cleanPay(input: Record<string, unknown>): PayRecord {
  return {
    collaboratorId: str(input.collaboratorId, 60),
    basic: money(Math.max(0, num(input.basic))),
    // NOT VALIDATED AS AN IBAN. Formats differ by country and this product is
    // regional; a wrong-looking-but-correct account refused at entry is worse
    // than one the bank rejects with a message the studio can read.
    iban: str(input.iban, 40).replace(/\s+/g, "").toUpperCase(),
    bankName: str(input.bankName, 120),
    components: (Array.isArray(input.components) ? input.components : [])
      .map((c) => c as Record<string, unknown>)
      .filter((c) => str(c?.label, 80) && num(c?.amount) > 0
        && (c?.kind === "allowance" || c?.kind === "deduction"))
      .map((c) => ({
        label: str(c.label, 80),
        amount: money(num(c.amount)),
        kind: c.kind as Component["kind"],
      }))
      .slice(0, 20),
  };
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
 * THE NET CAN BE NEGATIVE AND IS NOT FLOORED. Deductions exceeding pay is a
 * real situation — a repaid advance, a month almost entirely unpaid — and
 * clamping it to nought would quietly forgive the difference and leave the
 * ledger short by exactly the amount nobody noticed. It is reported instead.
 */
export function payslipFor(
  pay: PayRecord,
  { alias, period, unpaidDays = 0 }: { alias: string; period: string; unpaidDays?: number },
): PayslipLine {
  const days = daysInPeriod(period);
  const allowances = money(pay.components.filter((c) => c.kind === "allowance")
    .reduce((sum, c) => sum + c.amount, 0));
  const recurring = money(pay.components.filter((c) => c.kind === "deduction")
    .reduce((sum, c) => sum + c.amount, 0));

  // A PERIOD THAT IS NOT A PERIOD DOCKS NOTHING rather than dividing by null.
  const perDay = days ? pay.basic / days : 0;
  const docked = money(Math.min(Math.max(0, unpaidDays), days || 0) * perDay);

  const gross = money(pay.basic - docked + allowances);
  return {
    collaboratorId: pay.collaboratorId,
    alias,
    basic: pay.basic,
    allowances,
    deductions: money(recurring + docked),
    gross,
    net: money(gross - recurring),
    components: pay.components,
    unpaidDays: Math.max(0, unpaidDays),
    unpaidDeduction: docked,
  };
}

export type RunTotals = {
  people: number;
  basic: number;
  allowances: number;
  deductions: number;
  gross: number;
  net: number;
  /** Slips whose net came out below nought — reported, never clamped. */
  negative: PayslipLine[];
};

export function runTotals(lines: PayslipLine[]): RunTotals {
  const sum = (pick: (l: PayslipLine) => number) => money(lines.reduce((t, l) => t + pick(l), 0));
  return {
    people: lines.length,
    basic: sum((l) => l.basic),
    allowances: sum((l) => l.allowances),
    deductions: sum((l) => l.deductions),
    gross: sum((l) => l.gross),
    net: sum((l) => l.net),
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
