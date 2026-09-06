// WHAT A REQUISITION IS, AND WHAT MAY HAPPEN TO ONE — pure, so the screen
// refuses exactly what the server refuses.
//
// THE GAP THIS CLOSES. A purchase order appears in this product with nobody
// having asked for it: `materialOrders` records a vendor, a project, lines and
// a cost code, and nothing about who needed the goods or who said yes. So the
// question "why did we buy this" has no answer in the system, and the control
// that answers it — a second signature above a limit — had nowhere to attach,
// because there was no document standing before the commitment.
//
// A REQUISITION IS A REQUEST, NOT AN ORDER, and the distinction is the point of
// the record. It names what somebody needs and what they expect it to cost; it
// binds the studio to nobody. The order is what binds, and it is created FROM
// an approved requisition rather than instead of one.
//
// NO IMPORTS, deliberately, and asserted by a test.

export type RequisitionLine = {
  description?: unknown;
  unit?: unknown;
  qty?: unknown;
  /** What the requester expects it to cost. An estimate, never a quoted price. */
  estUnitCost?: unknown;
  itemId?: unknown;
};

export type RequisitionLike = {
  status?: unknown;
  lines?: unknown;
  createdByCollaboratorId?: unknown;
  orderId?: unknown;
};

/**
 * THE LADDER, and it is its own rather than a reuse of the tender's or the
 * pipeline's. A requisition is refused, cancelled or fulfilled far more often
 * than it is "won", and recording only the ones that became orders is how a
 * studio loses the ability to say what it declines to buy.
 *
 * `Ordered` IS THE TERMINAL STATE, not `Approved`: approval authorises the
 * purchase, and the purchase is the order. A requisition that stopped at
 * Approved would look outstanding for ever once its order existed.
 */
export const REQUISITION_STATUSES = [
  "Draft", "Submitted", "Approved", "Rejected", "Ordered", "Cancelled",
] as const;

export type RequisitionStatus = (typeof REQUISITION_STATUSES)[number];

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const text = (v: unknown) => String(v ?? "");

/** A line that says nothing is not a line. */
export const lineIsReal = (l: RequisitionLine | null | undefined): boolean =>
  Boolean(l) && text(l?.description).trim().length > 0;

export type RequisitionTotals = {
  lines: number;
  qty: number;
  /** What the requester expects the whole request to cost. */
  estimated: number;
  /**
   * True only when every real line carries an estimate. It travels with the
   * total for the reason `boqTotals.complete` does: the total of a
   * part-estimated request is a number and it is NOT what the request is worth,
   * and a signature given against it authorises a figure that will change.
   */
  complete: boolean;
};

export function requisitionTotals(lines: unknown): RequisitionTotals {
  const rows = (Array.isArray(lines) ? lines : []).filter(lineIsReal) as RequisitionLine[];
  let estimated = 0;
  let qty = 0;
  let complete = true;
  for (const l of rows) {
    const q = num(l.qty);
    const c = num(l.estUnitCost);
    qty = money(qty + q);
    estimated = money(estimated + q * c);
    // NOUGHT IS A PRICE AND A BLANK IS NOT. A line whose estimate was never
    // typed is what makes the total provisional; a line genuinely expected to
    // cost nothing is complete.
    if (l.estUnitCost === undefined || l.estUnitCost === null || text(l.estUnitCost).trim() === "") {
      complete = false;
    }
  }
  return { lines: rows.length, qty, estimated, complete: rows.length > 0 && complete };
}

/**
 * WHY A MOVE IS REFUSED, as a TOKEN rather than a sentence — the studio is
 * bilingual and refusals are translated on display, keyed by what was stored.
 *
 * Returns null when the move is allowed.
 */
export function requisitionProblem(
  req: RequisitionLike | null | undefined,
  next: string,
): string | null {
  if (!req) return "notfound";
  const from = text(req.status) || "Draft";
  if (!(REQUISITION_STATUSES as readonly string[]).includes(next)) return "status";
  if (from === next) return "already";

  // TERMINAL MEANS TERMINAL. An ordered requisition has a purchase order
  // hanging off it and a cancelled one was withdrawn; moving either would put
  // a request back in front of somebody after the decision it records.
  if (from === "Ordered" || from === "Cancelled" || from === "Rejected") return "decided";

  switch (next) {
    case "Submitted": {
      if (from !== "Draft") return "not-draft";
      // NOTHING TO APPROVE IS NOT A REQUEST. An empty requisition submitted
      // for signature asks somebody to authorise the purchase of nothing.
      if (!requisitionTotals(req.lines).lines) return "no-lines";
      return null;
    }
    // Approved and Rejected are ANSWERS and are reached through the approval
    // walk, never by assignment: routing them through a generic status edit
    // would skip invariant 7 entirely. `editRequisition` refuses them by name.
    case "Approved":
    case "Rejected":
      return "not-answerable";
    case "Ordered": {
      // ONLY AN APPROVED REQUEST BECOMES AN ORDER, and only once. The second
      // half is derived from the order rather than from a flag, so deleting
      // the order frees the requisition again.
      if (from !== "Approved") return "not-approved";
      return null;
    }
    case "Cancelled": {
      // A submitted request may be withdrawn by its raiser; an approved one
      // has authority behind it and cancelling it is still honest, because the
      // alternative is an order nobody wanted.
      return null;
    }
    case "Draft":
      // Nothing returns to draft. Once somebody has been asked, the thing they
      // were asked about must not change underneath them — the same rule a
      // variation follows.
      return "no-return";
    default:
      return "status";
  }
}

/** A draft is the only thing that edits, for the reason above. */
export const requisitionEditable = (req: RequisitionLike | null | undefined): boolean =>
  text(req?.status || "Draft") === "Draft";

/**
 * MAY THIS BE DELETED? Only while it is a draft nobody has seen.
 *
 * A submitted requisition is a question somebody was asked, and a decided one
 * is the answer; deleting either erases a decision rather than a mistake.
 * Cancelling is the honest exit and it is always available.
 */
export const requisitionDeletable = (req: RequisitionLike | null | undefined): boolean =>
  text(req?.status || "Draft") === "Draft";
