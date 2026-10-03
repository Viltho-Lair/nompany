// WHEN A DEAL'S STAGE IS DONE — the agreed order's step 4, "completion rules"
// (04/10/2026). Until now a stage counted as done the moment ONE record of it
// existed: a draft quotation made "Quotation" look finished, and an invoice
// nobody had paid made "Invoice" look settled. A stage is done when its records
// SAY the work is finished.
//
// ONE RULE PER STAGE TYPE, read off the record's own lifecycle — its status,
// its result, its closing stamp — never a field added for this. Three answers:
//   done     every live record of the stage is finished;
//   started  at least one is still under way;
//   void     every record of it was called off (cancelled, rejected, lost) —
//            the stage is not done and not under way, it is as if absent.
// A record that was called off is LEFT OUT of a stage that has others: one
// rejected quotation beside an approved one does not hold the stage open.
//
// TWO ANSWERS ARE NOT ON THE ROW, and the caller supplies them: what is still
// owed on an invoice or a bill (`money`, from `invoiceTotals` — "Paid" is never
// stored), and whether a quotation was approved (`approved`, from the Approvals
// record — a stored "Approved" is only history). Passing them in keeps this
// file pure, so a screen and a test read the same rules.
//
// A STAGE WITH NO LIFECYCLE IS DONE ONCE IT EXISTS — an expense, overtime, a
// project sheet, a fixed asset: they are facts the moment they are filed, and
// inventing a state for them would be a second definition of something the
// product does not track.

export type StageCompletion = {
  state: "done" | "started" | "void";
  /**
   * HOW FAR, 0–1, where it can be said: the share paid on invoices and bills
   * (money-weighted), the share of records finished otherwise. Null for a stage
   * of one record with no measure between started and done.
   */
  progress: number | null;
};

type Row = Record<string, unknown>;
export type CompletionContext = {
  /** What an invoice or bill totals and has had paid, in its own currency. */
  money?: (row: Row) => { total: number; paid: number } | null;
  /** Whether a quotation is approved, by its approval record or a stored status. */
  approved?: (row: Row) => boolean;
};

type Verdict = "done" | "started" | "void";
const text = (v: unknown) => String(v ?? "");
const has = (v: unknown) => text(v).trim() !== "";

/** Each stage's rule: one record → its verdict. */
const RULES: Readonly<Record<string, (row: Row, ctx: CompletionContext) => Verdict>> = {
  ticket: (r) => (r.status === "Closed Won" ? "done"
    : ["Closed Lost", "Cancelled by Client", "Dropped"].includes(text(r.status)) ? "void" : "started"),
  rfq: (r) => (r.status === "Converted" ? "done" : r.status === "Rejected" ? "void" : "started"),
  // APPROVED IS DONE; an offer rejected or closed without approval is void.
  quotation: (r, ctx) => ((ctx.approved ? ctx.approved(r) : r.status === "Approved") ? "done"
    : ["Rejected", "Closed"].includes(text(r.status)) ? "void" : "started"),
  // `closedAt` is the project's real end — set once by closeProject, never
  // unset — and NOT the "Completed" stage, which a studio may rename.
  project: (r) => (has(r.closedAt) ? "done" : "started"),
  // A contract is done once it is signed; one drafted and not signed is under way.
  contract: (r) => (has(r.signedDate) ? "done" : "started"),
  order: (r) => (r.status === "Received" ? "done" : r.status === "Cancelled" ? "void" : "started"),
  sales_order: (r) => (r.status === "Fulfilled" ? "done" : r.status === "Cancelled" ? "void" : "started"),
  delivery: (r) => (r.status === "Issued" ? "done" : r.status === "Cancelled" ? "void" : "started"),
  // Delivered when its tracking says so (AWB code DLV), the rule awbStatus uses.
  shipment: (r) => ((Array.isArray(r.movements) && (r.movements as Row[]).some((m) => text(m?.code) === "DLV")) || r.delivered === true
    ? "done" : "started"),
  invoice: (r, ctx) => moneyVerdict(r, ctx),
  bill: (r, ctx) => moneyVerdict(r, ctx),
  change_order: (r) => (r.status === "approved" ? "done" : r.status === "rejected" ? "void" : "started"),
  timesheet: (r) => (r.status === "approved" ? "done" : r.status === "rejected" ? "void" : "started"),
  job: (r) => (r.status === "completed" ? "done" : r.status === "cancelled" ? "void" : "started"),
  // PASSED IS DONE. A failed inspection is answered but not passed — the work
  // goes round again, and the re-inspection is a new record.
  inspection: (r) => (["pass", "pass-with-comments"].includes(text(r.result)) ? "done" : "started"),
  // A reversed payment is undone; the reversal that undid it is not a payment.
  payment: (r) => (has(r.reversedByPaymentId) || has(r.reversalOfPaymentId) ? "void" : "done"),
};

/** An invoice or bill: void when cancelled, done when nothing is owed on a real total. */
function moneyVerdict(r: Row, ctx: CompletionContext): Verdict {
  if (r.status === "Cancelled") return "void";
  if (r.status === "Draft") return "started";
  const m = ctx.money?.(r);
  if (!m) return "started";
  return m.total > 0 && m.paid >= m.total ? "done" : "started";
}

/** The stage types with a rule of their own; every other stage is done once it exists. */
export const STAGES_WITH_A_RULE: ReadonlySet<string> = new Set(Object.keys(RULES));

/**
 * ONE STAGE OF A DEAL, from its records. Null when it has none — the stage is
 * absent, which the flow already says in its own words.
 */
export function stageCompletion(type: string, rows: readonly Row[], ctx: CompletionContext = {}): StageCompletion | null {
  if (!rows.length) return null;
  const rule = RULES[type];
  if (!rule) return { state: "done", progress: null };
  const judged = rows.map((r) => ({ r, v: rule(r, ctx) }));
  const live = judged.filter((j) => j.v !== "void");
  if (!live.length) return { state: "void", progress: null };
  const state: Verdict = live.every((j) => j.v === "done") ? "done" : "started";

  // MONEY IS WEIGHED BY MONEY: two invoices, one of 100 paid and one of 10,000
  // not, are 1% paid — not halfway.
  if ((type === "invoice" || type === "bill") && ctx.money) {
    let total = 0; let paid = 0;
    for (const { r } of live) { const m = ctx.money(r); if (m && m.total > 0) { total += m.total; paid += Math.min(m.paid, m.total); } }
    return { state, progress: total > 0 ? Math.round((paid / total) * 1000) / 1000 : null };
  }
  if (live.length === 1) return { state, progress: state === "done" ? 1 : null };
  return { state, progress: Math.round((live.filter((j) => j.v === "done").length / live.length) * 1000) / 1000 };
}
