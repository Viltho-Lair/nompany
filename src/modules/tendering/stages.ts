// A TENDER'S STAGES — and the moves that would be a lie.
//
// DELIBERATELY THE SAME SHAPE AS modules/sales/pipeline, AND DELIBERATELY NOT
// SHARED WITH IT. The program design says P4a's four sections are "built by hand
// deliberately, so P4b's abstraction is extracted from real screens" (D13): two
// honest ladders written out are what tells the extraction which parts are
// genuinely common and which only look alike. Sharing one now would be guessing
// at that from a single example.
//
// They are NOT the same ladder. A deal is chased and may stall anywhere; a
// tender has a date on it, is either bid or not, and cannot be won unless it was
// submitted. The rules below are about submission, which the pipeline has no
// concept of.
//
// NO SERVER IMPORTS, so the register offers a move only where the service would
// accept one — the same reason pipeline.ts has none.

export type TenderKind = "open" | "submitted" | "closed";

export type TenderStageDef = {
  kind: TenderKind;
  order: number;
  /** The one closed stage that is a success. */
  won?: boolean;
  /**
   * A decision that goes against us has to say why. Winning does not: the
   * field exists to answer "why do we lose tenders", and asking it of a win
   * would make the answer meaningless.
   */
  needsReason?: boolean;
  /** Won and Lost are decisions about a bid, so there must have BEEN a bid. */
  needsSubmission?: boolean;
};

const STAGES: Record<string, TenderStageDef> = {
  "Identified": { kind: "open", order: 1 },
  "Preparing": { kind: "open", order: 2 },
  "Submitted": { kind: "submitted", order: 3 },
  "Won": { kind: "closed", order: 4, won: true, needsSubmission: true },
  "Lost": { kind: "closed", order: 5, needsReason: true, needsSubmission: true },
  // NO BID IS A DECISION, NOT A FAILURE, and it is the one a register earns its
  // keep by recording: the tenders a studio chose to skip, with the reason,
  // are the evidence behind "we do not bid this kind of work any more".
  "No Bid": { kind: "closed", order: 6, needsReason: true },
  "Withdrawn": { kind: "closed", order: 7, needsReason: true },
};

export const TENDER_STAGES = Object.keys(STAGES);
export const DEFAULT_TENDER_STAGE = "Identified";

export function tenderStage(status: string): TenderStageDef | undefined {
  return STAGES[status];
}

const ordered = (kinds: TenderKind[]) =>
  TENDER_STAGES.filter((s) => kinds.includes(STAGES[s].kind))
    .sort((a, b) => STAGES[a].order - STAGES[b].order);

/** Still live: the register's columns, in order. */
export const LIVE_TENDER_STAGES = ordered(["open", "submitted"]);
/** The ways a tender ends. */
export const DECIDED_TENDER_STAGES = ordered(["closed"]);

export const isDecided = (status: string) => STAGES[status]?.kind === "closed";
export const isWonTender = (status: string) => STAGES[status]?.won === true;
export const isSubmitted = (status: string) => STAGES[status]?.kind === "submitted";

/**
 * WHY A MOVE IS REFUSED, or null when it is allowed. A token, not a sentence —
 * the screens translate it and the route hands it back unchanged.
 */
export function tenderProblem(input: {
  from: string;
  to: string;
  reason?: string;
}): string | null {
  const { from, to } = input;
  const target = STAGES[to];
  if (!target) return "unknown-stage";
  if (from === to) return null;

  // A DECIDED TENDER IS HISTORY, the same rule a closed deal follows and for
  // the same reason: the outcome has been counted, reported and probably told
  // to somebody, and unseeing that is not an edit.
  if (isDecided(from)) return "already-decided";

  // YOU CANNOT WIN WHAT YOU DID NOT BID. This is the rule a tender register
  // exists for and the one a status field alone cannot hold — "Won" straight
  // from "Preparing" reads as a win and means the bid was never sent.
  if (target.needsSubmission && !isSubmitted(from)) return "not-submitted";

  // AND YOU CANNOT DECLINE ONE YOU HAVE ALREADY SENT. After submission the
  // honest exit is Withdrawn, which says something different to a client and
  // to whoever reads the register later.
  if (to === "No Bid" && isSubmitted(from)) return "already-submitted";

  if (target.needsReason && !String(input.reason || "").trim()) return "reason-required";
  return null;
}

/** One line of a tender's stage history. */
export type TenderStageEntry = {
  status: string;
  at: string;
  byCollaboratorId: string;
};

/**
 * EVERY FIELD A STAGE CHANGE IMPLIES, decided in one place — so `submittedAt`
 * and `decidedAt` cannot drift from the status the way a hand-set pair does.
 */
export function tenderPatch(input: {
  from: string;
  to: string;
  at: string;
  byCollaboratorId: string;
  reason?: string;
  history?: unknown;
}): Record<string, unknown> {
  const prior: TenderStageEntry[] = Array.isArray(input.history) ? (input.history as TenderStageEntry[]) : [];
  const patch: Record<string, unknown> = {
    status: input.to,
    stageHistory: [...prior, { status: input.to, at: input.at, byCollaboratorId: input.byCollaboratorId }].slice(-200),
  };
  // STAMPED WHEN IT HAPPENS, not derived later from the history. The submission
  // date is a fact a studio is asked about — by a client, by an auditor — and
  // reading it back out of an array is how it becomes approximate.
  if (isSubmitted(input.to)) patch.submittedAt = input.at;
  if (isDecided(input.to)) {
    patch.decidedAt = input.at;
    const reason = String(input.reason || "").trim().slice(0, 400);
    // Cleared on a win for the same reason a deal's lostReason is: a tender
    // withdrawn and re-entered must not carry the old excuse.
    patch.decisionReason = STAGES[input.to]?.needsReason ? reason : "";
  }
  return patch;
}

/**
 * WHOLE DAYS UNTIL A SUBMISSION CLOSES. Negative once it has passed.
 *
 * Its own function rather than projects/sla's `daysUntil` because that one
 * reads the clock itself, and a register that sorts by urgency has to be able
 * to say what "now" is — a list whose order depends on an untestable global is
 * a list nobody can assert.
 */
export function daysToDeadline(deadline: string, nowMs: number): number | null {
  if (!deadline) return null;
  const due = Date.parse(`${String(deadline).slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(due)) return null;
  const today = new Date(nowMs);
  const midnight = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((due - midnight) / 86400000);
}

/**
 * A TENDER THE STUDIO IS ABOUT TO MISS: still un-submitted, with the deadline
 * today or already gone.
 *
 * This is the whole point of a register. A missed submission is not a loss —
 * it is nothing at all, it appears in no win rate, and the only thing that ever
 * catches it is a list that puts it at the top before the day arrives.
 */
export function isAtRisk(status: string, deadline: string, nowMs: number): boolean {
  if (isDecided(status) || isSubmitted(status)) return false;
  const days = daysToDeadline(deadline, nowMs);
  return days !== null && days <= 0;
}
