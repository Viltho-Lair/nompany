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
  id?: unknown; assetId?: unknown;
  status?: unknown; resolution?: unknown; startedAt?: unknown; dueOn?: unknown;
  checklist?: unknown; type?: unknown; failure?: unknown; downSince?: unknown; upAt?: unknown;
};

/**
 * THE TWO STATUSES ON THE EQUIPMENT REGISTER THIS SECTION MOVES A MACHINE
 * BETWEEN. Both are declared by the built-in `equipment` type, with transitions
 * each way; a studio that has edited its own type and dropped one is refused at
 * the write rather than having a record stranded at a status nothing leads out
 * of (`moveRecordAsStudio`, platform/engine/records).
 */
export const MACHINE_UNDER_REPAIR = "Under repair";
export const MACHINE_IN_SERVICE = "In service";

/**
 * WHAT THIS MOVE SAYS ABOUT THE MACHINE — a status to write, or null for
 * "nothing to say about it".
 *
 * ONLY A REPAIR MOVES IT. "Under repair" means the machine is not usable, and a
 * routine inspection is not a repair — so preventive and inspection work leave
 * the register alone however long it takes. Work naming no machine says nothing
 * about any machine.
 *
 * AND IT GOES BACK ONLY WHEN NOBODY IS STILL REPAIRING IT. Two corrective
 * orders can be open on one machine at once, and returning it to service the
 * moment the FIRST one finished would report a machine as usable while somebody
 * still had it in pieces. A sibling merely RAISED does not hold it — nobody has
 * started that one — but one in progress or on hold does, because a repair
 * waiting on a part is still a repair.
 */
export function machineStatusAfterMove(
  order: OrderLike,
  next: string,
  othersOnMachine: readonly OrderLike[],
): string | null {
  if (!text(order.assetId)) return null;
  if (text(order.type) !== "corrective") return null;
  if (next === "In progress") return MACHINE_UNDER_REPAIR;
  if (next !== "Completed" && next !== "Closed" && next !== "Cancelled") return null;
  const stillRepairing = othersOnMachine.some((o) =>
    text(o.type) === "corrective" && ["In progress", "On hold"].includes(statusOf(o)));
  return stillRepairing ? null : MACHINE_IN_SERVICE;
}

const failureProblemOf = (o: OrderLike) => text((o.failure as { problem?: unknown } | undefined)?.problem);

// ---- downtime ------------------------------------------------------------------

/**
 * WHY THIS DOWNTIME CANNOT BE SAVED — or null. Instants are ISO strings, so
 * they compare as text. `now` is passed in: downtime in the future is a
 * forecast, and a forecast in the reliability figures is the same lie as one in
 * the labour.
 */
export function downtimeProblem(d: { downSince?: unknown; upAt?: unknown }, now: string): string | null {
  const down = text(d.downSince);
  const up = text(d.upAt);
  if (!down && !up) return null;
  if (!down) return "downtime";
  if (Number.isNaN(Date.parse(down)) || (up && Number.isNaN(Date.parse(up)))) return "downtime";
  if (down > now || (up && up > now)) return "downtime-future";
  if (up && up < down) return "downtime-order";
  return null;
}

/** Hours the machine was down on this order, or null while it still is (or was never down). */
export function downtimeHours(o: OrderLike): number | null {
  const down = Date.parse(text(o.downSince));
  const up = Date.parse(text(o.upAt));
  if (!Number.isFinite(down) || !Number.isFinite(up) || up < down) return null;
  return Math.round(((up - down) / 3_600_000) * 100) / 100;
}

/** Checklist items still unticked on an order — none when it has no checklist. */
export const checklistOpen = (o: OrderLike) =>
  (Array.isArray(o.checklist) ? o.checklist : []).filter((i) => !(i as { done?: unknown })?.done).length;

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
  given: { holdReason?: unknown; resolution?: unknown; failureProblem?: unknown } = {},
): string | null {
  if (!order) return "notfound";
  if (!isStatus(next)) return "status";
  const from = statusOf(order);
  if (from === next) return "already";
  if (!ORDER_MOVES[from].includes(next)) return "transition";
  if (next === "On hold" && !(HOLD_REASONS as readonly string[]).includes(text(given.holdReason))) return "hold-reason";
  if (next === "Completed" && !text(given.resolution) && !text(order.resolution)) return "resolution";
  // CORRECTIVE WORK NAMES WHAT FAILED. It is the only thing a failure count can
  // be grouped by, and "the pump failed nine times" is useless without knowing
  // it was the seal eight of them. Preventive and inspection work have no
  // failure to name. Cause and remedy stay optional: often nobody knows yet.
  if (next === "Completed" && text(order.type) === "corrective" && !text(given.failureProblem) && !failureProblemOf(order)) {
    return "failure";
  }
  // A PLAN'S CHECKLIST IS THE PLAN. Completing with an item unticked records a
  // service that skipped a step nobody can now name.
  if (next === "Completed" && checklistOpen(order) > 0) return "checklist";
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
  // THE MACHINE IS BACK WHEN THE WORK IS DONE, unless somebody said otherwise —
  // and it is down again when the work is reopened, because a reopened repair
  // is one that did not hold.
  if (next === "Completed" && text(order.downSince) && !text(order.upAt)) out.upAt = at;
  if (from === "Completed" && next === "In progress" && text(order.downSince)) out.upAt = "";
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

/**
 * OPEN WORK, GROUPED BY THE PLACE IT IS AT — what the map draws. Work with no
 * place is left out rather than grouped under "", which would be a pin for
 * nowhere; the screen counts it separately so nothing open goes unmentioned.
 */
export function openWorkByPlace<T extends { locationId?: unknown; status?: unknown }>(orders: readonly T[]): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const o of orders) {
    const place = text(o.locationId);
    if (!place || !orderOpen(o)) continue;
    const list = out.get(place) || [];
    list.push(o);
    out.set(place, list);
  }
  return out;
}

// ---- labour ------------------------------------------------------------------

/**
 * WHERE THE TIME WENT. Kept apart because the planned-maintenance and
 * wrench-time figures are made of exactly this split: time on the job, time
 * getting there, and time standing waiting for a part or a permit.
 */
export const LABOUR_KINDS = ["work", "travel", "wait"] as const;
export type LabourKind = (typeof LABOUR_KINDS)[number];

/** One entry is at most a day. A longer shift is two entries on two dates. */
export const MAX_ENTRY_HOURS = 24;

/**
 * A quarter of an hour is the finest anybody books in. BLANK IS NOT NOUGHT: an
 * empty field is "nobody said" and returns null, so it can be refused rather
 * than stored as a zero-hour entry.
 */
export function quarterHours(v: unknown): number | null {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 4) / 4 : null;
}

/**
 * WHY THIS TIME ENTRY IS REFUSED — or null. `today` is the server's
 * `YYYY-MM-DD`: time not yet worked is a forecast, and a forecast among the
 * actuals is how a job reads as costing what somebody expected.
 */
export function labourProblem(entry: { hours?: unknown; workedOn?: unknown }, today: string): string | null {
  const h = quarterHours(entry.hours);
  if (h === null || h <= 0 || h > MAX_ENTRY_HOURS) return "hours";
  const d = text(entry.workedOn);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d > today) return "date";
  return null;
}

/**
 * THE HOURS ON A WORK ORDER, in total and by kind. An unknown kind is still
 * time and is counted as work — dropping it would make the total disagree with
 * the entries listed beneath it.
 */
export function labourTotals(entries: readonly { hours?: unknown; kind?: unknown }[]) {
  const byKind: Record<LabourKind, number> = { work: 0, travel: 0, wait: 0 };
  let total = 0;
  for (const e of entries) {
    const h = quarterHours(e.hours) || 0;
    const k = (LABOUR_KINDS as readonly string[]).includes(text(e.kind)) ? (text(e.kind) as LabourKind) : "work";
    byKind[k] += h;
    total += h;
  }
  return { total, byKind };
}

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
