// WHAT MAY HAPPEN TO A PURCHASE ORDER'S STATUS — pure, so the order register,
// the requisition row and Inventory's `editOrder` refuse exactly the same moves.
//
// THE ORDERS STAY UNDER INVENTORY (`materialOrders`, see CLAUDE.md), and so
// does the write. This file holds only the RULE, in Procurement because the
// buying side is where an order's life is decided and because the screens that
// offer the moves are Procurement's. No import at all, so any screen may use it.
//
// THE DEFECT THIS CLOSES. `editOrder` accepted any status other than the two
// receiving derives, FROM ANY STATE: a partly or fully received order could be
// cancelled (stock in the warehouse explained by an order that says it never
// happened), a Cancelled order could be reopened after the supplier was told
// it was off, and a Received one could be put back to Draft and re-priced.

export type OrderLike = {
  status?: unknown;
  lines?: unknown;
};

const text = (v: unknown) => String(v ?? "");

/** Something has been received against at least one line. */
export function anythingReceived(order: OrderLike | null | undefined): boolean {
  return (Array.isArray(order?.lines) ? order.lines : [])
    .some((l) => Number((l as { received?: unknown })?.received || 0) > 0);
}

/**
 * IS THIS ORDER STILL AN ORDER? A cancelled one bought nothing, so it answers
 * no requisition: counting it as "already ordered" left a request whose order
 * was cancelled stuck for ever, with no way to order it again.
 */
export const orderIsLive = (order: { status?: unknown } | null | undefined): boolean =>
  Boolean(order) && text(order?.status) !== "Cancelled";

/**
 * WHY A STATUS MOVE IS REFUSED, as a token. Null when it is allowed; the
 * caller treats a move to the status the order already has as no move at all.
 *
 *   Draft   → Ordered | Cancelled
 *   Ordered → Cancelled, only while nothing has been received
 *   anything else → refused
 *
 * `Received` and `Partly received` are never targets: they are consequences of
 * booking goods in, and asserting them would let the status contradict the
 * ledger.
 */
export function orderMoveProblem(order: OrderLike | null | undefined, next: string): string | null {
  if (!order) return "notfound";
  const from = text(order.status) || "Draft";
  if (next === "Received" || next === "Partly received") return "derived-status";
  if (!["Draft", "Ordered", "Cancelled"].includes(next)) return "status";
  if (from === next) return null;

  // CANCELLED IS FINAL. The supplier has been told it is off; reopening the
  // same order would re-commit money under a reference they have already
  // written off. A new need is a new order.
  if (from === "Cancelled") return "order-cancelled";
  // GOODS HAVE ARRIVED. The order now explains real stock and a real bill, so
  // it can neither go back to Draft nor be cancelled. What was not delivered
  // is a conversation with the supplier, not a status on this order.
  if (from === "Received" || from === "Partly received" || anythingReceived(order)) {
    return "received-already";
  }
  // PLACED IS PLACED. Once the supplier holds it, putting it back to Draft
  // would re-open prices they have already been sent.
  if (from === "Ordered" && next === "Draft") return "order-placed";
  return null;
}
