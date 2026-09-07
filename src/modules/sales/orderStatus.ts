// WHAT A SALES ORDER MAY BE, AND WHICH MOVES ARE REAL.
//
// PURE, AND NO IMPORTS, for the reason `modules/sales/pipeline` is: the screen
// draws the buttons and the server refuses the moves, and two copies of the
// rule are two copies free to disagree. This one file is imported by both.
//
// AN ORDER IS NOT A QUOTATION AND NOT A CONTRACT, which is the whole reason it
// exists as a record. A quotation is an OFFER — it may be revised, refused and
// re-issued. A contract is the VALUE BASELINE — one signed agreement a project
// bills against. An order is what the customer actually asked for, on a date,
// in quantities: a call-off against a framework contract has no new quotation
// and does not move the contract's value, and before this it had nowhere to go.

export const ORDER_STATUSES = ["Draft", "Confirmed", "Fulfilled", "Cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * THE ONLY MOVES THERE ARE. Everything absent from this table is refused, which
 * is the point of writing it as data rather than as a chain of ifs.
 *
 * CONFIRMED DOES NOT GO BACK TO DRAFT. Confirming is telling a customer their
 * order is accepted; un-telling them is not an edit, it is a cancellation, and
 * a record that can quietly return to Draft is one nobody can audit.
 *
 * FULFILLED AND CANCELLED ARE TERMINAL, and they are the two ways an order
 * stops being live. `Cancelled` is reachable from either open state because an
 * order can die before or after it is accepted; `Fulfilled` only from
 * `Confirmed`, because delivering something nobody accepted is not fulfilment.
 */
export const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  Draft: ["Confirmed", "Cancelled"],
  Confirmed: ["Fulfilled", "Cancelled"],
  Fulfilled: [],
  Cancelled: [],
};

export const isOrderStatus = (v: unknown): v is OrderStatus =>
  (ORDER_STATUSES as readonly string[]).includes(String(v ?? ""));

/** The moves offered from here — what the screen draws, and nothing more. */
export const movesFrom = (status: unknown): readonly OrderStatus[] =>
  isOrderStatus(status) ? ORDER_TRANSITIONS[status] : [];

export type OrderLine = { description?: unknown; qty?: unknown; unitPrice?: unknown };

/**
 * WHY A MOVE IS REFUSED, or null when it is allowed. A NAME rather than a
 * sentence: the screen turns it into words in whichever language is on, and the
 * route turns it into a status through the shared table.
 *
 * AN ORDER WITH NO LINES CANNOT BE CONFIRMED. A confirmed order is a promise to
 * supply something; nought lines is a promise to supply nothing, and the total
 * agrees — it would read as a real order worth 0.00 rather than as an empty
 * one. Draft is where an order with no lines belongs, and it may stay there.
 */
export function orderProblem(
  from: unknown,
  to: unknown,
  lines: readonly OrderLine[],
): string | null {
  if (!isOrderStatus(to)) return "status";
  if (!isOrderStatus(from)) return "status";
  if (!ORDER_TRANSITIONS[from].includes(to)) return "not-allowed";
  if (to === "Confirmed" && !lines.length) return "no-lines";
  return null;
}

/**
 * WHETHER THE RECORD MAY STILL BE DELETED, and it is the tender register's
 * rule for the tender register's reason. A draft nobody has accepted is a
 * mistake somebody made and may take back. Once it is Confirmed the customer
 * has been told, and what happens next is a state the record HAS — Cancelled,
 * with its reference spent (invariant 10) and its trail intact — rather than
 * the absence of a record.
 */
export const orderDeletable = (status: unknown): boolean => status === "Draft";

/** Whether the lines may still be edited. A confirmed order is what was agreed. */
export const orderLinesEditable = (status: unknown): boolean => status === "Draft";
