// CHASING WHAT HAS BEEN ORDERED — which orders are late, by how long, and who
// has already been chased. Pure, so the screen and the server sort the same
// list into the same buckets.
//
// THE GAP THIS CLOSES. A purchase order has carried `expectedAt` since it was
// built and NOTHING HAS EVER COMPARED IT TO TODAY. An order three weeks late
// looks exactly like one placed this morning: same row, same status, no signal.
// So "what is overdue" was a question a studio answered by opening every order
// and doing the arithmetic in its head, and "have we chased them yet" had no
// answer at all.
//
// THE ORIGINAL PROMISE MUST SURVIVE THE SECOND ONE. When a supplier re-promises,
// overwriting `expectedAt` erases the fact that they slipped — and that fact is
// the entire input to supplier rating, which is this section's fifth bullet. So
// `expectedAt` stays what was promised when the order was placed, `promisedAt`
// carries the current promise, and every revision is a chase with a date on it.
// A supplier who has re-promised four times is then visible; one whose date was
// overwritten four times is indistinguishable from one who was always on time.
//
// NO IMPORTS, deliberately, and asserted by a test.

export type ChaseRecord = {
  at?: unknown;
  byCollaboratorId?: unknown;
  note?: unknown;
  /** What they promised this time, if they promised anything. */
  promisedAt?: unknown;
};

export type ExpeditableOrder = {
  id?: unknown;
  reference?: unknown;
  vendorId?: unknown;
  projectId?: unknown;
  status?: unknown;
  /** What was promised when the order was placed. Never overwritten. */
  expectedAt?: unknown;
  /** The current promise, where it has moved. Blank means it has not. */
  promisedAt?: unknown;
  chases?: unknown;
  lines?: unknown;
  receivedAt?: unknown;
};

/**
 * AN ORDER NOBODY IS WAITING FOR. `Draft` was never placed, `Cancelled` was
 * withdrawn, and `Received` has arrived — chasing any of the three is chasing
 * nothing. Everything else is outstanding, which is `Ordered` and `Partly
 * received`.
 */
const NOT_OUTSTANDING = new Set(["Draft", "Cancelled", "Received"]);

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const text = (v: unknown) => String(v ?? "");
const day = (v: unknown) => text(v).slice(0, 10);

export const isOutstanding = (o: ExpeditableOrder | null | undefined): boolean =>
  Boolean(o) && !NOT_OUTSTANDING.has(text(o?.status));

/**
 * WHOLE DAYS BETWEEN TWO ISO DATES, positive when `to` is after `from`.
 *
 * Parsed as UTC midnight rather than through the local clock: a studio in
 * Amman and a server in Iowa must agree about whether something is one day late
 * or two, and `new Date("2031-03-01")` is already UTC while
 * `new Date(2031, 2, 1)` is not.
 */
export function daysBetween(from: unknown, to: unknown): number | null {
  const a = day(from);
  const b = day(to);
  if (!a || !b) return null;
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  if (!Number.isFinite(ms)) return null;
  return Math.round(ms / 86400000);
}

export type ExpeditedOrder = {
  id: string;
  reference: string;
  vendorId: string;
  projectId: string;
  status: string;
  /** What was promised when it was placed. */
  expectedAt: string;
  /** The promise in force now — `promisedAt` where there is one, else `expectedAt`. */
  dueAt: string;
  /**
   * How many days that promise has slipped since the order was placed. Null
   * when it has not moved, or when either date is missing. THIS IS THE SUPPLIER
   * RATING INPUT, and it is only knowable because the original survives.
   */
  slippedDays: number | null;
  /**
   * Days past `dueAt` as at `asOf`. Negative means still to come, so the same
   * number sorts "three weeks late" above "due tomorrow" without a second field.
   * Null when there is no date to be late against.
   */
  lateDays: number | null;
  /** How many times somebody has chased, and when the last one was. */
  chases: number;
  lastChasedAt: string;
  /**
   * SEPARATED FROM `late` BECAUSE THEY ARE ACTED ON DIFFERENTLY. An order 90%
   * delivered and three weeks late is a conversation about the remainder; one
   * untouched and three weeks late is a conversation about whether it is coming
   * at all. Sorting both under "overdue" hides which is which.
   */
  partly: boolean;
  /** What is still to come, as a fraction 0-1, or null when the order has no lines. */
  outstandingFraction: number | null;
  bucket: "late" | "due-soon" | "on-track" | "undated";
};

export type ExpeditingView = {
  orders: ExpeditedOrder[];
  late: number;
  dueSoon: number;
  undated: number;
  /**
   * Late and never chased. The number the screen exists to make small — an
   * order nobody has rung about is the one where the studio is the problem.
   */
  unchased: number;
  asOf: string;
};

/**
 * ONE STUDIO'S OUTSTANDING ORDERS, bucketed.
 *
 * `asOf` is passed in and never read here, for the reason every other model in
 * this product states: the screen and the server must agree about what "late"
 * means, and two clocks are two answers.
 *
 * `soonDays` is how far ahead "due soon" reaches. Seven by default because a
 * week is the horizon somebody chasing suppliers actually works to, and it is a
 * parameter rather than a constant so the screen can widen it without a second
 * copy of the arithmetic appearing on the client.
 */
export function expediteOrders(
  orders: unknown,
  asOf: unknown,
  soonDays = 7,
): ExpeditingView {
  const today = day(asOf);
  const rows = (Array.isArray(orders) ? orders : []).filter(isOutstanding) as ExpeditableOrder[];

  const out: ExpeditedOrder[] = rows.map((o) => {
    const expectedAt = day(o.expectedAt);
    const promisedAt = day(o.promisedAt);
    const dueAt = promisedAt || expectedAt;
    const chases = (Array.isArray(o.chases) ? o.chases : []) as ChaseRecord[];

    const lines = (Array.isArray(o.lines) ? o.lines : []) as { qty?: unknown; received?: unknown }[];
    let ordered = 0;
    let received = 0;
    for (const l of lines) {
      ordered += num(l.qty);
      // FLOORED AT THE ORDERED QUANTITY: over-delivery happens and it is not
      // negative outstanding. The excess is a stock question, not an
      // expediting one.
      received += Math.min(num(l.received), num(l.qty));
    }
    const outstandingFraction = ordered > 0
      ? Math.max(0, Math.min(1, (ordered - received) / ordered))
      : null;

    const lateDays = dueAt ? daysBetween(dueAt, today) : null;
    const lastChasedAt = chases
      .map((c) => day(c.at))
      .filter(Boolean)
      .sort()
      .pop() || "";

    return {
      id: text(o.id),
      reference: text(o.reference),
      vendorId: text(o.vendorId),
      projectId: text(o.projectId),
      status: text(o.status),
      expectedAt,
      dueAt,
      // NULL WHEN IT HAS NOT MOVED, never 0: a supplier who never re-promised
      // and one who re-promised by nothing are different, and only the first is
      // silence.
      slippedDays: promisedAt && expectedAt ? daysBetween(expectedAt, promisedAt) : null,
      lateDays,
      chases: chases.length,
      lastChasedAt,
      // PARTLY RECEIVED IS A STATUS THE ORDER ALREADY HAS, but it is derived
      // here from the lines too: a studio that receives without moving the
      // status still gets the distinction.
      partly: text(o.status) === "Partly received"
        || (outstandingFraction !== null && outstandingFraction > 0 && outstandingFraction < 1),
      outstandingFraction,
      bucket: lateDays === null
        ? "undated"
        : lateDays > 0
          ? "late"
          : lateDays >= -soonDays
            ? "due-soon"
            : "on-track",
    };
  });

  // LATEST FIRST WITHIN LATE, and undated last. `lateDays` already sorts
  // correctly on its own because it is signed, so an order three weeks late
  // outranks one due tomorrow without a second comparison.
  out.sort((a, b) => {
    if (a.lateDays === null && b.lateDays === null) return 0;
    if (a.lateDays === null) return 1;
    if (b.lateDays === null) return -1;
    return b.lateDays - a.lateDays;
  });

  return {
    orders: out,
    late: out.filter((o) => o.bucket === "late").length,
    dueSoon: out.filter((o) => o.bucket === "due-soon").length,
    undated: out.filter((o) => o.bucket === "undated").length,
    // LATE AND NEVER CHASED. Not "late and not chased recently" — a studio that
    // has rung once about a three-week delay has done something, and a studio
    // that has rung about nothing is the case worth counting.
    unchased: out.filter((o) => o.bucket === "late" && o.chases === 0).length,
    asOf: today,
  };
}
