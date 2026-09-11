// MAINTENANCE'S RULES, purely — no store, no routes, no imports.
//
// The screen and the server both read this file, so a button is offered only
// where the move would be accepted and a refusal names the same rule on both
// sides. tests/maintenance-model.mjs asserts every line of it.
//
// TWO RECORDS, AND THE SPLIT IS THE POINT. A WORK REQUEST is anybody's report
// that something is wrong; a WORK ORDER is work somebody authorised, planned and
// assigned. Keeping them apart is what lets a studio take faults from everyone
// without letting everyone dispatch technicians — the shape MaintainX, UpKeep
// and SAP (notification → order) all share.

export const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

/** EN 13306's three, in the words a technician uses. */
export const ORDER_TYPES = ["corrective", "preventive", "inspection"] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const ORDER_STATUSES = ["Open", "In progress", "On hold", "Completed", "Closed", "Cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * WHY WORK IS WAITING — the reason a backlog report is sorted by. Tokens, so the
 * screen chooses the words; a free-text reason is one nobody can count.
 */
export const HOLD_REASONS = ["parts", "access", "vendor", "other"] as const;
export type HoldReason = (typeof HOLD_REASONS)[number];

/**
 * THE LADDER. Condensed from IBM Maximo's reference flow (WAPPR → APPR → WMATL
 * → INPRG → COMP → CLOSE): approval happens on the REQUEST, so an order is born
 * Open, and Maximo's "waiting on material" is one of the hold reasons.
 *
 * - Completed is reached only through In progress, because a repair nobody
 *   started has no start time and so no repair time — MTTR would be fiction.
 * - In progress cannot be Cancelled: somebody spent time on it. The honest
 *   exits are a hold and completion.
 * - Completed reopens until somebody Closes it. Completed is the technician's
 *   word; Closed is the reviewer's, and after it nothing moves.
 */
export const ORDER_MOVES: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = Object.freeze({
  Open: ["In progress", "On hold", "Cancelled"],
  "In progress": ["On hold", "Completed"],
  "On hold": ["In progress", "Cancelled"],
  Completed: ["Closed", "In progress"],
  Closed: [],
  Cancelled: [],
});

type OrderLike = {
  status?: unknown; resolution?: unknown; startedAt?: unknown; dueOn?: unknown;
};

const text = (v: unknown) => String(v ?? "").trim();
const isStatus = (v: string): v is OrderStatus => (ORDER_STATUSES as readonly string[]).includes(v);
const statusOf = (o: OrderLike): OrderStatus => {
  const s = text(o.status);
  return isStatus(s) ? s : "Open";
};

/**
 * WHY THIS MOVE IS REFUSED, as a token — or null when it is allowed.
 *
 * Two moves carry something: a hold names its reason, and completion says what
 * was done. A completed order with nothing written about it is a closed ticket
 * with no history, and that history is exactly what the machine's next failure
 * needs. A reopened order already carries its resolution, which counts.
 */
export function orderMoveProblem(
  order: OrderLike | null | undefined,
  next: string,
  given: { holdReason?: unknown; resolution?: unknown } = {},
): string | null {
  if (!order) return "notfound";
  if (!isStatus(next)) return "status";
  const from = statusOf(order);
  if (from === next) return "already";
  if (!ORDER_MOVES[from].includes(next)) return "transition";
  if (next === "On hold" && !(HOLD_REASONS as readonly string[]).includes(text(given.holdReason))) return "hold-reason";
  if (next === "Completed" && !text(given.resolution) && !text(order.resolution)) return "resolution";
  return null;
}

/**
 * WHAT A MOVE WRITES BESIDE THE STATUS. `at` is passed in, never read here —
 * the caller captures it once outside the function patch (invariant 8).
 *
 * THE FIRST START IS THE REPAIR'S START, so resuming after a hold leaves
 * `startedAt` alone; moving it would make every order that waited on a part
 * read as a quick fix.
 */
export function moveStamps(order: OrderLike, next: OrderStatus, at: string): Record<string, string> {
  const from = statusOf(order);
  const out: Record<string, string> = {};
  if (next === "In progress" && !text(order.startedAt)) out.startedAt = at;
  if (from === "On hold" && next !== "On hold") out.holdReason = "";
  if (next === "Completed") out.completedAt = at;
  if (from === "Completed" && next === "In progress") out.completedAt = "";
  if (next === "Closed") out.closedAt = at;
  if (next === "Cancelled") out.cancelledAt = at;
  return out;
}

/** Still somebody's job — the three states a backlog counts. */
export const orderOpen = (o: OrderLike) => ["Open", "In progress", "On hold"].includes(statusOf(o));

/** Closed and Cancelled are history; everything else can still be corrected. */
export const orderEditable = (o: OrderLike) => !["Closed", "Cancelled"].includes(statusOf(o));

/**
 * DELETE ONLY WHAT NOBODY WORKED ON. Once started there is time and history
 * against it, and the honest end is Cancelled (from a hold) or Closed.
 */
export const orderDeletable = (o: OrderLike) => statusOf(o) === "Open" && !text(o.startedAt);

/**
 * PAST ITS DUE DATE AND STILL OPEN. `today` is the caller's `YYYY-MM-DD` —
 * the list carries `asOf` and the screen never reads its own clock. On hold
 * counts: the machine is still broken whatever the reason.
 */
export const orderOverdue = (o: OrderLike, today: string) =>
  orderOpen(o) && Boolean(text(o.dueOn)) && text(o.dueOn) < today;

// ---- requests ----------------------------------------------------------------

export const REQUEST_STATES = ["Open", "Accepted", "Declined"] as const;
export type RequestState = (typeof REQUEST_STATES)[number];

/**
 * A REQUEST'S STATE. Only Declined is stored; Accepted is DERIVED from a work
 * order naming the request — the requisition's `Ordered` rule, for its reason:
 * a stored flag and a real order are two answers, and deleting the order would
 * leave the request reading as handled for ever.
 */
export function requestState(req: { status?: unknown }, hasOrder: boolean): RequestState {
  if (text(req.status) === "Declined") return "Declined";
  return hasOrder ? "Accepted" : "Open";
}

/** Why a request cannot be turned into work (or declined) — or null. */
export function requestProblem(req: { status?: unknown } | null | undefined, hasOrder: boolean): string | null {
  if (!req) return "notfound";
  const state = requestState(req, hasOrder);
  if (state === "Declined") return "declined";
  if (state === "Accepted") return "accepted";
  return null;
}
