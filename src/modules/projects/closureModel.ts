// CLOSING A PROJECT — the punch list, practical completion, and the warranty
// clock that runs from it.
//
// THE PUNCH LIST IS NOT A NEW RECORD. `inspections` has carried a `snag` kind
// since it was written — "a defect found after the fact, raised to be fixed" —
// which is exactly what a punch list is made of. A second collection of defects
// would be two lists of the same snags, free to disagree the first time either
// one was edited, so this READS the inspections and adds nothing.
//
// AND CLOSURE IS NOT A STAGE. `PROJECT_STAGES` is the DEFAULT and a studio may
// replace it — `listProjects` falls back to it only when the studio has none —
// so a rule hung on the word "Completed" would silently stop applying to any
// studio that renamed its stages. Closure is its own dates on the project, and
// they mean the same thing whatever a studio calls its columns.
//
// NO IMPORTS, deliberately, and asserted by a test.

export type SnagLike = {
  id?: unknown;
  reference?: unknown;
  title?: unknown;
  projectId?: unknown;
  kind?: unknown;
  result?: unknown;
  scheduledDate?: unknown;
  inspectedAt?: unknown;
  createdAt?: unknown;
};

export type ClosureLike = {
  /** The day the works became usable. New; nothing recorded this before. */
  practicalCompletionAt?: unknown;
  /** THE WARRANTY CLOCK RUNS FROM HERE — see `supportPeriodDays`. */
  handoverAt?: unknown;
  /**
   * THE PERIOD THIS PROJECT IS SUPPORTED FOR, IN DAYS, AND IT ALREADY EXISTED.
   *
   * `ProjectSchema` has carried it since before this slice, with a studio-level
   * default of 365, editable per project — and NOTHING HAS EVER READ IT. It was
   * stored, shown in a form, and computed into no answer at all.
   *
   * So the tracker consumes it rather than minting a `warrantyMonths` beside
   * it. A third period field in this area would be one too many: `ProjectSchema`
   * also carries `retentionReleaseDate`, whose own comment already calls itself
   * "the defects-liability end". Two names for one idea disagree the first time
   * either is edited, and there would have been three.
   *
   * IT IS MEASURED FROM HANDOVER because that is what its own comment says —
   * "how long the studio supports it after handover". A defects liability period
   * in a construction contract conventionally runs from PRACTICAL COMPLETION
   * instead, which is a real difference and is written down in the functionality
   * file rather than fixed by silently re-basing a number every existing
   * project already stores.
   */
  supportPeriodDays?: unknown;
  finalAccountAt?: unknown;
  closedAt?: unknown;
  closedByCollaboratorId?: unknown;
};

const text = (v: unknown) => String(v ?? "");
const day = (v: unknown) => text(v).slice(0, 10);
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? v : []) as T[];

/**
 * A SNAG IS OPEN UNTIL IT PASSES. `pending` is the state an inspection is
 * RAISED in and `fail` is a defect that was checked and is still wrong, so both
 * are outstanding work. `pass-with-comments` CLOSES it — the comment is on
 * record and the gate is through, which is precisely the distinction
 * `INSPECTION_RESULTS` was given two values to draw.
 */
export const snagIsOpen = (s: SnagLike | null | undefined): boolean =>
  text(s?.kind) === "snag" && (text(s?.result) === "pending" || text(s?.result) === "fail");

export const snagIsClosed = (s: SnagLike | null | undefined): boolean =>
  text(s?.kind) === "snag" && (text(s?.result) === "pass" || text(s?.result) === "pass-with-comments");

/** Whole days between two ISO dates. UTC midnight, as everywhere else here. */
export function daysBetween(from: unknown, to: unknown): number | null {
  const a = day(from);
  const b = day(to);
  if (!a || !b) return null;
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  if (!Number.isFinite(ms)) return null;
  return Math.round(ms / 86400000);
}

/**
 * A DATE N DAYS AFTER ANOTHER, in UTC. Days rather than months because that is
 * the unit `supportPeriodDays` already stores, and converting between the two
 * would introduce the month-length question for no reason.
 */
export function addDays(from: unknown, days: unknown): string {
  const a = day(from);
  const n = Math.trunc(num(days));
  if (!a || !Number.isFinite(n)) return "";
  const ms = Date.parse(`${a}T00:00:00Z`);
  if (!Number.isFinite(ms)) return "";
  return new Date(ms + (n * 86400000)).toISOString().slice(0, 10);
}

export type WarrantyState = "unknown" | "running" | "expiring" | "expired" | "none";

export type PunchList = {
  open: number;
  closed: number;
  total: number;
  /** Days since the oldest open snag was raised. Null when none are open. */
  oldestOpenDays: number | null;
  openIds: string[];
};

export function punchList(snags: unknown, projectId: unknown, asOf: unknown): PunchList {
  const mine = list<SnagLike>(snags).filter((s) => text(s.projectId) === text(projectId));
  const open = mine.filter(snagIsOpen);
  const raised = open
    .map((s) => day(s.scheduledDate) || day(s.createdAt))
    .filter(Boolean)
    .sort();
  return {
    open: open.length,
    closed: mine.filter(snagIsClosed).length,
    total: mine.filter((s) => text(s.kind) === "snag").length,
    oldestOpenDays: raised.length ? daysBetween(raised[0], asOf) : null,
    openIds: open.map((s) => text(s.id)),
  };
}

export type ClosurePosition = {
  practicalCompletionAt: string;
  handoverAt: string;
  supportPeriodDays: number;
  /**
   * When the support period ends. NULL when handover has not been recorded —
   * the clock has not started, which is not the same as it having run out, and
   * defaulting to "today plus a year" would invent a date nobody agreed.
   */
  warrantyEndsAt: string | null;
  /** Days until that, negative once past. Null when there is no end date. */
  warrantyDaysLeft: number | null;
  warrantyState: WarrantyState;
  closedAt: string;
  isClosed: boolean;
  punch: PunchList;
  /** Why this project may not be closed yet, in tokens the screen turns into words. */
  blockers: string[];
  canClose: boolean;
};

/**
 * WHERE A PROJECT HAS GOT TO IN CLOSING, as at `asOf`.
 *
 * THE WARRANTY CLOCK RUNS FROM HANDOVER, which is what `supportPeriodDays`
 * says it measures, and never from the day somebody typed the record. Practical
 * completion is recorded separately because it is a different event and the
 * thing that gates closing, not because it starts this clock.
 *
 * `expiringDays` is how far ahead the warning reaches. Sixty by default,
 * because a defects liability period ending is something somebody has to act on
 * — a final inspection, a retention release — and a month is not enough notice
 * to arrange either.
 */
export function closurePosition(
  closure: ClosureLike | null | undefined,
  snags: unknown,
  projectId: unknown,
  asOf: unknown,
  expiringDays = 60,
): ClosurePosition {
  const practicalCompletionAt = day(closure?.practicalCompletionAt);
  const handoverAt = day(closure?.handoverAt);
  const supportPeriodDays = Math.max(0, Math.trunc(num(closure?.supportPeriodDays)));
  const closedAt = day(closure?.closedAt);
  const punch = punchList(snags, projectId, asOf);

  const warrantyEndsAt = handoverAt && supportPeriodDays > 0
    ? addDays(handoverAt, supportPeriodDays)
    : null;
  const warrantyDaysLeft = warrantyEndsAt ? daysBetween(asOf, warrantyEndsAt) : null;

  let warrantyState: WarrantyState = "unknown";
  if (handoverAt && supportPeriodDays === 0) {
    // A DELIBERATE NOUGHT IS AN ANSWER: this job carries no support period,
    // which is different from nobody having said.
    warrantyState = "none";
  } else if (warrantyDaysLeft !== null) {
    warrantyState = warrantyDaysLeft < 0
      ? "expired"
      : warrantyDaysLeft <= expiringDays ? "expiring" : "running";
  }

  // WHAT STOPS A PROJECT BEING CLOSED. Closing is the last act and it is final,
  // so the list is the point rather than the flag: a screen that says "cannot
  // close" without saying why sends somebody hunting.
  const blockers: string[] = [];
  if (!practicalCompletionAt) blockers.push("no-practical-completion");
  // THE PUNCH LIST IS WHAT MAKES THE PUNCH LIST MATTER. A job closed over open
  // defects is a job whose remaining work has just been deleted from the only
  // place it was written down.
  if (punch.open > 0) blockers.push("open-snags");

  return {
    practicalCompletionAt,
    handoverAt,
    supportPeriodDays,
    warrantyEndsAt,
    warrantyDaysLeft,
    warrantyState,
    closedAt,
    isClosed: Boolean(closedAt),
    punch,
    blockers,
    canClose: !closedAt && blockers.length === 0,
  };
}

/**
 * WHAT THE SERVER REFUSES when the closure dates are written.
 *
 * A CLOSED PROJECT DOES NOT REOPEN HERE, the same posture a closed deal takes:
 * closing is a statement about the job's whole life, and un-saying it quietly
 * is how a warranty period restarts without anybody deciding to restart it.
 */
export function closureProblem(
  existing: ClosureLike | null | undefined,
  patch: ClosureLike,
): string | null {
  if (day(existing?.closedAt)) return "closed";

  const pc = patch?.practicalCompletionAt === undefined
    ? day(existing?.practicalCompletionAt)
    : day(patch.practicalCompletionAt);
  const handover = patch?.handoverAt === undefined
    ? day(existing?.handoverAt)
    : day(patch.handoverAt);

  // HANDOVER CANNOT PREDATE PRACTICAL COMPLETION. Handing over works that are
  // not complete is a different event with a different name, and stored this
  // way round it would put the warranty clock behind the handover.
  if (pc && handover && handover < pc) return "handover-before-completion";

  if (patch?.supportPeriodDays !== undefined) {
    const days = num(patch.supportPeriodDays);
    if (days < 0) return "warranty-negative";
    if (!Number.isInteger(days)) return "warranty-fraction";
    // A decade of support is already unusual; beyond that it is a typo.
    if (days > 3650) return "warranty-range";
  }
  return null;
}
