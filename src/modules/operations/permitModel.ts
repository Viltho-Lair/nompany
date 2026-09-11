// A PERMIT'S WORKFLOW — pure (tier 5, one permit register).
//
// TWO REGISTERS WERE NOT DUPLICATES, and the one register keeps both halves.
// Field Operations' permits had a CLOCK (valid from/to, derived Valid, Expiring,
// Expired, holders, a place) and no workflow; the engine's "Permits to work" in
// Quality & HSE had a WORKFLOW (Requested → Issued → Closed/Cancelled) and no
// clock. A permit now carries a `status` beside its dates: the status says
// where it stands, the dates say whether it is in force.
//
// A PERMIT IS CANCELLED, NEVER DELETED — the engine permit's own rule, carried
// over: it is the record that work was authorised on a day, and the day
// something goes wrong is the day somebody asks to see it. Only a permit that
// was never issued (still Requested) can be removed, as a mistake.
//
// A PERMIT WRITTEN BEFORE THIS HAS NO STATUS and reads as ISSUED — the Field
// Operations register recorded permits an authority had already issued, so that
// is the truth about every one of them.

export const PERMIT_STATUSES = ["Requested", "Issued", "Closed", "Cancelled"] as const;
export type PermitStatus = (typeof PERMIT_STATUSES)[number];

const MOVES: Readonly<Record<PermitStatus, readonly PermitStatus[]>> = Object.freeze({
  Requested: ["Issued", "Cancelled"],
  Issued: ["Closed", "Cancelled"],
  Closed: [],
  Cancelled: [],
});

const isStatus = (v: unknown): v is PermitStatus => (PERMIT_STATUSES as readonly string[]).includes(String(v ?? ""));

/** Where a permit stands; a legacy permit with none is Issued. */
export const permitStatusOf = (p: { status?: unknown } | null | undefined): PermitStatus =>
  (isStatus(p?.status) ? p!.status : "Issued") as PermitStatus;

/** The moves a permit may make from where it stands. */
export const permitMoves = (p: { status?: unknown } | null | undefined) => MOVES[permitStatusOf(p)];

/** Why a move is refused, or null. Stated, never inferred from an ordering. */
export function permitMoveProblem(p: { status?: unknown } | null | undefined, to: unknown): string | null {
  if (!isStatus(to)) return "status";
  const from = permitStatusOf(p);
  if (from === to) return "already";
  return MOVES[from].includes(to) ? null : "transition";
}

/** Only a permit nobody ever issued may be removed. */
export const permitDeletable = (p: { status?: unknown } | null | undefined) => permitStatusOf(p) === "Requested";

/**
 * WHETHER ITS DATES MATTER — an issued permit is the only one whose expiry is
 * worth a warning. A request not yet issued, and one closed or cancelled, lapse
 * without anybody needing to renew them.
 */
export const permitLive = (p: { status?: unknown } | null | undefined) => permitStatusOf(p) === "Issued";
