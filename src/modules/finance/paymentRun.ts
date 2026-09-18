// A PAYMENT RUN — the approved bills due by a date, paid together.
//
// PURE. The store half is ./paymentRunService; asserted in
// tests/payment-run-model.mjs.
//
// A RUN IS NOT A SECOND WAY TO PAY. Each bill in it is paid through
// `recordBillPayment`, the one door every bill payment passes — approval, the
// payment hold, the overpayment check against the NET, the foreign rate, the
// posting and the withholding settlement all happen there, bill by bill. What
// a run adds is the choosing: which bills are due, what they come to, and a
// record of what the run did, including what it could not pay and why.

export type RunBill = {
  id: string;
  reference?: string;
  vendorName?: string;
  status?: string;
  dueDate?: string;
  outstanding?: number;
  currency?: string;
  hold?: { held?: boolean; reasons?: unknown[] } | null;
};

export type Candidate = {
  id: string;
  reference: string;
  vendorName: string;
  dueDate: string;
  outstanding: number;
  currency: string;
  /** A held bill is listed so nobody wonders where it went, and is not payable. */
  held: boolean;
  reasons: unknown[];
};

const text = (v: unknown, max = 160) => String(v ?? "").trim().slice(0, max);
const isDay = (v: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(text(v, 10));

/**
 * THE BILLS A RUN DUE BY `dueBy` WOULD PAY: approved, with something still
 * owed, and due on or before the date. A bill with NO due date is included —
 * it is payable now, and leaving it out would let a bill nobody dated wait
 * for ever. Oldest due first, undated last.
 */
export function runCandidates(bills: RunBill[], dueBy: string): Candidate[] {
  const cutoff = isDay(dueBy) ? dueBy : "";
  return bills
    .filter((b) => b.status === "Approved" && (Number(b.outstanding) || 0) > 0)
    .filter((b) => !cutoff || !isDay(b.dueDate) || text(b.dueDate, 10) <= cutoff)
    .map((b) => ({
      id: b.id,
      reference: text(b.reference, 60),
      vendorName: text(b.vendorName),
      dueDate: isDay(b.dueDate) ? text(b.dueDate, 10) : "",
      outstanding: Number(b.outstanding) || 0,
      currency: text(b.currency, 8),
      held: Boolean(b.hold?.held),
      reasons: Array.isArray(b.hold?.reasons) ? b.hold!.reasons! : [],
    }))
    .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999") || a.reference.localeCompare(b.reference));
}

/** What the payable part of a selection comes to, per currency. */
export function runTotals(candidates: Candidate[], chosen: Iterable<string>): Record<string, number> {
  const want = new Set(chosen);
  const out: Record<string, number> = {};
  for (const c of candidates) {
    if (!want.has(c.id) || c.held) continue;
    const key = c.currency || "";
    out[key] = Math.round(((out[key] || 0) + c.outstanding) * 1000) / 1000;
  }
  return out;
}
