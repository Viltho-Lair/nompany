// CASH THAT HAS NOT MOVED YET.
//
// THE PRODUCT KNOWS WHAT IT IS OWED AND WHAT IT OWES, and has never been able
// to say when the bank account runs out. Receivables have due dates and
// payables have due dates and nothing put them on a timeline — so "can we pay
// the subcontractors on the 30th" was answered by somebody adding up
// spreadsheets, and answered again next week.
//
// THREE THINGS LIVE HERE, and they are one feature because they are all the
// same question — what is going to happen to the bank balance:
//
//  - POST-DATED CHEQUES. Ubiquitous across this product's region and modelled
//    nowhere. A cheque dated the 30th is not cash and is not a receivable
//    either: the debt is settled, the money has not arrived, and the paper can
//    still bounce.
//  - THE FORECAST. Today's bank balance, walked forward through what is due.
//  - LETTERS OF GUARANTEE. Not cash and not a liability — a commitment against
//    the studio's facility that expires, and expires silently.
//
// PURE. No imports, no store, and every date comes in as an argument.

export const CHEQUE_DIRECTIONS = ["in", "out"] as const;
export type ChequeDirection = (typeof CHEQUE_DIRECTIONS)[number];

// HELD -> DEPOSITED -> CLEARED, with BOUNCED off the deposit and RETURNED off
// the hold. Five states because a bounced cheque and a returned one are
// different events: one is the bank refusing it, the other is the studio giving
// it back — and a register that called both "cancelled" could not tell a studio
// which customers pay in paper that fails.
export const CHEQUE_STATUSES = ["held", "deposited", "cleared", "bounced", "returned"] as const;
export type ChequeStatus = (typeof CHEQUE_STATUSES)[number];

/** Statuses where the money is still expected to move. */
export const PENDING: readonly ChequeStatus[] = ["held", "deposited"];

export type Cheque = {
  id: string;
  direction: ChequeDirection;
  party: string;
  number: string;
  amount: number;
  dueOn: string;
  status: ChequeStatus;
  bank: string;
  notes: string;
};

export type Guarantee = {
  id: string;
  reference: string;
  beneficiary: string;
  kind: string;
  amount: number;
  issuedOn: string;
  expiresOn: string;
  /** What the bank holds against it — cash margin or a facility line. */
  margin: number;
  released: boolean;
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const money = (n: number) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// POST-DATED CHEQUES
// ---------------------------------------------------------------------------

export function chequeProblems(input: Record<string, unknown>): string[] {
  const problems: string[] = [];
  if (!(CHEQUE_DIRECTIONS as readonly string[]).includes(str(input.direction, 4))) {
    problems.push("say whether it is coming in or going out");
  }
  if (!str(input.party, 160)) problems.push("say who it is from or to");
  // A CHEQUE WITHOUT ITS NUMBER cannot be found at the bank, chased, or told
  // apart from the next one for the same amount from the same customer.
  if (!str(input.number, 40)) problems.push("a cheque needs its number");
  // ALWAYS POSITIVE. The DIRECTION carries the sign, for the reason an
  // allowance and a deduction do on a payslip: one field meaning two things is
  // the first report that sums them getting it wrong.
  if (!(num(input.amount) > 0)) problems.push("a cheque needs an amount above nought");
  if (!DAY_RE.test(str(input.dueOn, 10))) problems.push("a cheque needs the date on it");
  return problems;
}

export function cleanCheque(input: Record<string, unknown>): Omit<Cheque, "id"> {
  return {
    direction: str(input.direction, 4) as ChequeDirection,
    party: str(input.party, 160),
    number: str(input.number, 40),
    amount: money(Math.abs(num(input.amount))),
    dueOn: str(input.dueOn, 10),
    status: (CHEQUE_STATUSES as readonly string[]).includes(str(input.status, 12))
      ? (str(input.status, 12) as ChequeStatus)
      : "held",
    bank: str(input.bank, 120),
    notes: str(input.notes, 300),
  };
}

/**
 * WHY THIS CHEQUE CANNOT MOVE THERE. A reason, or null.
 *
 * A CLEARED CHEQUE IS FINISHED. Money arrived; the only correction is a new
 * record of what actually happened, not a rewrite of this one — the rule the
 * approval ladders and the payroll run already follow.
 */
export function chequeProblem(from: ChequeStatus, to: ChequeStatus): string | null {
  const NEXT: Record<ChequeStatus, ChequeStatus[]> = {
    held: ["deposited", "returned"],
    // A DEPOSITED CHEQUE GOES BACK TO HELD when the bank hands it back
    // unpresented — which is not a bounce, and calling it one would mark a
    // customer as having failed to pay when nothing was ever presented.
    deposited: ["cleared", "bounced", "held"],
    cleared: [],
    bounced: ["deposited"],
    returned: [],
  };
  return NEXT[from]?.includes(to) ? null : "transition";
}

// ---------------------------------------------------------------------------
// THE FORECAST
// ---------------------------------------------------------------------------

export type Due = { date: string; amount: number; label: string; kind: string };

export type Bucket = {
  from: string;
  to: string;
  in: number;
  out: number;
  net: number;
  /** The balance at the END of this bucket. */
  closing: number;
  items: Due[];
};

const addDays = (day: string, n: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

/**
 * THE BANK BALANCE, WALKED FORWARD.
 *
 * BUCKETS RATHER THAN A DAILY LINE, because nobody schedules a payment run by
 * the day three months out — and a daily series would draw ninety points of
 * false precision over data whose dates are mostly "end of month".
 *
 * THE CLOSING BALANCE IS CUMULATIVE, which is the whole point: a week that is
 * net positive can still be the week the account goes under, and a chart of
 * per-bucket nets would not show it.
 *
 * ANYTHING DATED BEFORE THE START IS COUNTED IN THE FIRST BUCKET rather than
 * dropped. An invoice that was due last month is still expected, and a forecast
 * that silently ignored overdue money would be optimistic by exactly the amount
 * a studio is worried about.
 */
export function forecast(
  opening: number,
  dues: Due[],
  { from, buckets = 12, days = 7 }: { from: string; buckets?: number; days?: number },
): Bucket[] {
  if (!DAY_RE.test(from)) return [];
  const out: Bucket[] = [];
  let closing = money(opening);

  for (let i = 0; i < buckets; i++) {
    const start = addDays(from, i * days);
    const end = addDays(from, (i + 1) * days - 1);
    const items = dues.filter((d) => {
      if (!DAY_RE.test(d.date)) return false;
      // The first bucket sweeps up everything already overdue.
      if (i === 0) return d.date <= end;
      return d.date >= start && d.date <= end;
    });
    const cashIn = money(items.filter((d) => d.amount > 0).reduce((s, d) => s + d.amount, 0));
    const cashOut = money(items.filter((d) => d.amount < 0).reduce((s, d) => s - d.amount, 0));
    closing = money(closing + cashIn - cashOut);
    out.push({ from: start, to: end, in: cashIn, out: cashOut, net: money(cashIn - cashOut), closing, items });
  }
  return out;
}

/**
 * THE FIRST BUCKET WHERE THE BALANCE GOES UNDER, or null.
 *
 * NULL IS NOT "FINE". It means nothing in the horizon takes the account
 * negative, which is a different statement from "the business is healthy" — and
 * the screen says which by naming the horizon.
 */
export function shortfall(buckets: Bucket[]): Bucket | null {
  return buckets.find((b) => b.closing < 0) || null;
}

// ---------------------------------------------------------------------------
// LETTERS OF GUARANTEE
// ---------------------------------------------------------------------------

export function guaranteeProblems(input: Record<string, unknown>): string[] {
  const problems: string[] = [];
  if (!str(input.reference, 80)) problems.push("a guarantee needs its reference");
  if (!str(input.beneficiary, 160)) problems.push("say who it is in favour of");
  if (!(num(input.amount) > 0)) problems.push("a guarantee needs an amount above nought");
  if (!DAY_RE.test(str(input.expiresOn, 10))) problems.push("a guarantee needs an expiry date");
  const issued = str(input.issuedOn, 10);
  const expires = str(input.expiresOn, 10);
  if (issued && !DAY_RE.test(issued)) problems.push("the issue date must be a date");
  // BOTH DATES MUST BE REAL BEFORE THEY ARE COMPARED. A missing expiry sorts
  // before every issue date, so without this guard an empty one produced TWO
  // messages — "needs an expiry date" and "cannot expire before it was issued"
  // — and the second sends somebody looking at a field that is fine.
  if (issued && DAY_RE.test(issued) && DAY_RE.test(expires) && expires < issued) {
    problems.push("a guarantee cannot expire before it was issued");
  }
  // THE MARGIN CANNOT EXCEED THE GUARANTEE. A bank holding more than the
  // instrument is worth is a typo, and it would overstate the cash a studio
  // thinks is locked up.
  if (num(input.margin) > num(input.amount)) problems.push("the margin cannot exceed the guarantee");
  return problems;
}

export function cleanGuarantee(input: Record<string, unknown>): Omit<Guarantee, "id"> {
  return {
    reference: str(input.reference, 80),
    beneficiary: str(input.beneficiary, 160),
    kind: str(input.kind, 80),
    amount: money(Math.max(0, num(input.amount))),
    issuedOn: DAY_RE.test(str(input.issuedOn, 10)) ? str(input.issuedOn, 10) : "",
    expiresOn: str(input.expiresOn, 10),
    margin: money(Math.max(0, num(input.margin))),
    released: input.released === true,
  };
}

export type GuaranteeState = "released" | "expired" | "expiring" | "live";

/**
 * WHERE A GUARANTEE STANDS.
 *
 * `expired` IS NOT `released`, and the difference is money. An expired
 * guarantee has lapsed at the bank; a RELEASED one has been given back and the
 * margin returned. A studio whose register conflated them would think its cash
 * was free when the bank still holds it — which is the exact failure a
 * guarantee register exists to prevent.
 */
export function guaranteeState(g: Guarantee, asOf: string, withinDays = 30): GuaranteeState {
  if (g.released) return "released";
  if (!DAY_RE.test(g.expiresOn) || !DAY_RE.test(asOf)) return "live";
  if (g.expiresOn < asOf) return "expired";
  const days = (Date.parse(`${g.expiresOn}T00:00:00Z`) - Date.parse(`${asOf}T00:00:00Z`)) / 86400000;
  return days <= withinDays ? "expiring" : "live";
}

/**
 * WHAT THE BANK IS HOLDING — the margin on every guarantee not yet released.
 *
 * AN EXPIRED GUARANTEE STILL COUNTS. Expiry at the bank does not return the
 * margin; somebody has to ask for it back, and that asking is what `released`
 * records. Dropping expired ones would tell a studio its cash was free on the
 * day it stopped being at risk and long before it came back.
 */
export function lockedUp(guarantees: Guarantee[]): { count: number; amount: number; margin: number } {
  const live = guarantees.filter((g) => !g.released);
  return {
    count: live.length,
    amount: money(live.reduce((s, g) => s + num(g.amount), 0)),
    margin: money(live.reduce((s, g) => s + num(g.margin), 0)),
  };
}
