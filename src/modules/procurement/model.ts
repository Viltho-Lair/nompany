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
// ONE IMPORT, deliberately: `shared/money`, which is itself pure and imports
// nothing, so the screen still pulls no server code. (This said the rule was
// "asserted by a test"; no test asserts it.)
import { roundMoney, roundSum } from "@/shared/money";

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
  /**
   * WHETHER A LIVE PURCHASE ORDER NAMES THIS REQUEST — derived by the caller
   * from the orders (a cancelled order does not count), never stored.
   */
  ordered?: unknown;
};

/**
 * THE LADDER AS STORED, and it is its own rather than a reuse of the tender's
 * or the pipeline's. A requisition is refused, cancelled or fulfilled far more
 * often than it is "won", and recording only the ones that became orders is
 * how a studio loses the ability to say what it declines to buy.
 *
 * ORDERED IS NOT HERE, AND THAT IS THE DECISION (27/09/2026). It used to be
 * declared as the terminal stored state while nothing anywhere wrote it — every
 * converted request stayed `Approved` in the store, the ladder's terminal state
 * was unreachable, and the code that treated "Ordered" as decided guarded a
 * value no row could hold. Whether a request has been bought is a fact about
 * the ORDERS, and a stored copy would part company with them the first time an
 * order was cancelled. So it is derived: `requisitionStage` below answers
 * "Ordered" for an approved request that a live order names, for display, and
 * the stored status stays `Approved`.
 */
export const REQUISITION_STATUSES = [
  "Draft", "Submitted", "Approved", "Rejected", "Cancelled",
] as const;

export type RequisitionStatus = (typeof REQUISITION_STATUSES)[number];

/**
 * WHAT A REQUEST'S ROW SAYS IT IS: the stored status, except that an approved
 * request a live order names reads "Ordered". Derived on every read, so
 * cancelling the order puts the request back to "Approved" — orderable again —
 * with nothing written.
 */
export function requisitionStage(req: RequisitionLike | null | undefined): string {
  const status = text(req?.status) || "Draft";
  return status === "Approved" && req?.ordered ? "Ordered" : status;
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
// MONEY FOLLOWS ITS CURRENCY'S DECIMALS — a dinar has three, and a private
// two-place rounding misstated every estimate written in one. A requisition
// carries no currency of its own, so the caller passes the studio's.
const money = (n: number, currency?: unknown) => roundMoney(n, currency);
/** A quantity, not money: two places, as it always was. */
const q2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
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

export function requisitionTotals(lines: unknown, currency?: unknown): RequisitionTotals {
  const rows = (Array.isArray(lines) ? lines : []).filter(lineIsReal) as RequisitionLine[];
  let estimated = 0;
  let qty = 0;
  let complete = true;
  for (const l of rows) {
    const q = num(l.qty);
    const c = num(l.estUnitCost);
    qty = q2(qty + q);
    // EACH LINE IS ROUNDED TO THE CURRENCY and the running total only cleaned
    // of float noise, so the total is exactly the sum of what the lines say.
    estimated = roundSum(estimated + money(q * c, currency));
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

  // TERMINAL MEANS TERMINAL. A cancelled one was withdrawn and a rejected one
  // was answered; moving either would put a request back in front of somebody
  // after the decision it records. (An ORDERED request is an approved one a
  // live order names — see `requisitionStage` — and is handled below.)
  if (from === "Cancelled" || from === "Rejected") return "decided";

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
    case "Cancelled": {
      // A submitted request may be withdrawn by its raiser; an approved one
      // has authority behind it and cancelling it is still honest, because the
      // alternative is an order nobody wanted.
      //
      // BUT NOT ONCE IT HAS BEEN BOUGHT. A request a live purchase order names
      // is the reason that order exists; cancelling the request left the order
      // standing with a cancelled request behind it — money committed on a
      // request that says it was withdrawn. Cancel the ORDER first, and the
      // request is free (a cancelled order answers no request).
      if (req.ordered) return "requisition-ordered";
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
