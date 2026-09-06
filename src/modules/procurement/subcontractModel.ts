// WHAT A SUBCONTRACTOR HAS EARNED, WHAT IS HELD BACK, AND WHAT IS DEDUCTED —
// pure, so the screen and the server value a certificate identically.
//
// THE MIRROR OF `modules/projects/billing.ts`, and `billing-milestones.md` says
// so: that slice built retention on the CLIENT side — money a customer withholds
// from what the studio invoices. This is the same arithmetic with the roles
// reversed, money the studio withholds from what a subcontractor invoices, and
// the retention itself is computed by billing's own `retentionOn` rather than a
// second copy that would be free to disagree about what ten per cent means.
//
// A PACKAGE OF WORK IS NOT A PURCHASE ORDER. An order buys goods against a line
// list and is received; a subcontract buys work against a value and is VALUED,
// periodically, as a percentage of something nobody can count in a warehouse.
// That is why it is its own record rather than a status on `materialOrders`.
//
// ONE IMPORT, and it is the shared retention arithmetic. Asserted by a test.
import { retentionOn, type Retention } from "@/modules/projects/billing";

export type BackCharge = {
  description?: unknown;
  amount?: unknown;
};

export type PaymentCertificate = {
  id?: unknown;
  number?: unknown;
  /**
   * WORK VALUED TO DATE, cumulative — not the amount for this period.
   *
   * Every certificate in this trade values the whole job to date and pays the
   * difference; storing the increment instead would let a mistake in one period
   * ride silently through every later one, because nothing would ever restate
   * the total. Cumulative is self-correcting: get period three wrong and period
   * four puts it right.
   */
  cumulativeValue?: unknown;
  backCharges?: unknown;
  status?: unknown;
  periodEnd?: unknown;
};

export type SubcontractLike = {
  value?: unknown;
  retentionPercent?: unknown;
  retentionReleaseDate?: unknown;
  status?: unknown;
};

/**
 * THE LADDER. `Certified` is somebody agreeing the valuation; `Paid` follows the
 * money and is not asserted — the same rule an invoice's `Paid` follows, and for
 * the same reason: a status you can declare is a status that can contradict the
 * ledger.
 */
export const CERTIFICATE_STATUSES = ["Draft", "Certified", "Paid"] as const;
export const SUBCONTRACT_STATUSES = ["Draft", "Live", "Complete", "Terminated"] as const;

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const text = (v: unknown) => String(v ?? "");

/** A deduction with no reason is not a deduction anybody can answer. */
export const backChargeIsReal = (b: BackCharge | null | undefined): boolean =>
  Boolean(b) && text(b?.description).trim().length > 0;

export const backChargeTotal = (raw: unknown): number =>
  (Array.isArray(raw) ? raw : [])
    .filter(backChargeIsReal)
    .reduce((n, b) => money(n + num((b as BackCharge).amount)), 0);

/** A certificate nobody has agreed is not money owed. */
const COUNTED = new Set(["Certified", "Paid"]);
export const isCounted = (c: PaymentCertificate | null | undefined): boolean =>
  Boolean(c) && COUNTED.has(text(c?.status));

export type CertificateValuation = {
  id: string;
  number: string;
  status: string;
  periodEnd: string;
  cumulativeValue: number;
  /**
   * What THIS certificate is worth: cumulative less everything certified
   * before it. Derived, never stored — two numbers for one fact are two numbers
   * that will disagree the first time somebody corrects a period.
   */
  thisPeriod: number;
  /** Retention withheld from this period's value. */
  retentionHeld: number;
  backCharges: number;
  /**
   * What the subcontractor is actually owed for this period. NEGATIVE is a real
   * answer and is not clamped: a period of back-charges larger than the work
   * done means the studio is owed money, and hiding that behind a zero would
   * lose it.
   */
  netPayable: number;
};

export type SubcontractPosition = {
  certificates: CertificateValuation[];
  /** The agreed value of the package. */
  value: number;
  /** Work valued to date, from the LAST counted certificate rather than a sum. */
  certifiedToDate: number;
  /** Value less certified. Negative means the package has been over-valued. */
  remaining: number;
  /** How much of the package has been valued, 0-1, or null when it has no value. */
  completeFraction: number | null;
  retention: Retention;
  totalBackCharges: number;
  /** Certified less retention less back-charges — what has actually been earned. */
  netCertified: number;
  /**
   * True when the package has been valued past its own value. NOT an error: a
   * variation agreed off-system is the usual cause, and refusing the figure
   * would make the screen lie about what has been certified. Flagged so
   * somebody looks.
   */
  overValued: boolean;
  blocked: "no-certificates" | null;
};

/**
 * ONE SUBCONTRACT'S POSITION.
 *
 * `asOf` is passed in and never read here — retention release is a comparison
 * against an instant, and the screen and the server must agree which.
 */
export function subcontractPosition(
  subcontract: SubcontractLike | null | undefined,
  certificates: unknown,
  asOf: unknown = "",
): SubcontractPosition {
  const value = money(num(subcontract?.value));
  const today = text(asOf).slice(0, 10);

  // IN PERIOD ORDER, because `thisPeriod` is a difference from the one before
  // and a list in arrival order would compute it against the wrong predecessor.
  // Ties break on number, so two certificates ending the same day still have a
  // defined order.
  const rows = (Array.isArray(certificates) ? certificates : []) as PaymentCertificate[];
  const ordered = [...rows].sort((a, b) =>
    text(a.periodEnd).localeCompare(text(b.periodEnd))
    || text(a.number).localeCompare(text(b.number)));

  const pct = num(subcontract?.retentionPercent);
  let previousCounted = 0;
  const out: CertificateValuation[] = ordered.map((c) => {
    const cumulative = money(num(c.cumulativeValue));
    // MEASURED AGAINST THE LAST COUNTED ONE, not the last one in the list: a
    // draft sitting between two certified periods must not absorb the value of
    // the period after it.
    const thisPeriod = money(cumulative - previousCounted);
    const backCharges = backChargeTotal(c.backCharges);
    const retentionHeld = money(thisPeriod * (Math.min(100, Math.max(0, pct)) / 100));
    if (isCounted(c)) previousCounted = cumulative;
    return {
      id: text(c.id),
      number: text(c.number),
      status: text(c.status) || "Draft",
      periodEnd: text(c.periodEnd),
      cumulativeValue: cumulative,
      thisPeriod,
      retentionHeld,
      backCharges,
      netPayable: money(thisPeriod - retentionHeld - backCharges),
    };
  });

  const counted = out.filter((c) => COUNTED.has(c.status));
  // THE LAST COUNTED CERTIFICATE'S CUMULATIVE, not the sum of the periods.
  // Summing would double-count the moment somebody corrected an earlier period,
  // which is the whole reason certificates are cumulative.
  const certifiedToDate = counted.length ? counted[counted.length - 1].cumulativeValue : 0;
  const totalBackCharges = money(counted.reduce((n, c) => n + c.backCharges, 0));

  return {
    certificates: out,
    value,
    certifiedToDate,
    remaining: money(value - certifiedToDate),
    // NULL, NOT ZERO, on a package with no value: nought certified against
    // nought agreed is not "0% complete", it is a subcontract nobody has priced.
    completeFraction: value > 0 ? certifiedToDate / value : null,
    retention: retentionOn(
      certifiedToDate, pct, subcontract?.retentionReleaseDate, today),
    totalBackCharges,
    netCertified: money(
      certifiedToDate
      - retentionOn(certifiedToDate, pct, subcontract?.retentionReleaseDate, today).held
      - totalBackCharges),
    overValued: value > 0 && certifiedToDate > value,
    blocked: counted.length ? null : "no-certificates",
  };
}

/**
 * WHY A CERTIFICATE CANNOT BE WRITTEN, as a token. Null when it can.
 *
 * `previousCumulative` is the last COUNTED certificate's value, which the caller
 * already has — passing it keeps this pure and keeps the rule in one place.
 */
export function certificateProblem(
  subcontract: SubcontractLike | null | undefined,
  cumulativeValue: unknown,
  previousCumulative: number,
): string | null {
  if (!subcontract) return "notfound";
  const status = text(subcontract.status) || "Draft";
  // A DRAFT SUBCONTRACT HAS BEEN AGREED WITH NOBODY, and a terminated one is
  // over — certifying work against either values work that has no agreement
  // behind it.
  if (status === "Draft") return "not-live";
  if (status === "Terminated") return "terminated";

  const value = num(cumulativeValue);
  if (!Number.isFinite(value) || value < 0) return "value";
  // CUMULATIVE MEANS IT CANNOT GO BACKWARDS. A period valuing LESS than the one
  // before it would pay a negative amount for work already agreed — which is
  // what a back-charge is for, and a back-charge says why while a reversed
  // valuation says nothing.
  if (value < previousCumulative) return "below-previous";
  return null;
}
