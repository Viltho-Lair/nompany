// THE PIPELINE — the ticket's stages read as a funnel rather than as a string.
//
// Every stage named here already existed. `TICKET_STATUSES` in ./tickets has
// carried "Lead", "Opportunity" and "Commit" since the beginning, and that file
// is still where the vocabulary lives. What did not exist was anything that
// treated them AS a pipeline: which stage follows which, which are still live,
// which move is a lie, and how long a deal has been sitting where it is.
//
// TWO DEAD SCHEMA FIELDS RECORDED THE ABSENCE. `closedAt` and `lostReason` are
// declared on SalesTicketSchema and were written by nothing and read by
// nothing — so a deal closed and the studio could not say when, or why. A field
// nothing can exercise is the record-level shape of invariant 16, and the way
// to fix it is to make the close that writes them a real transition instead of
// an assignment.
//
// NO SERVER IMPORTS, DELIBERATELY. The board validates a move with the SAME
// function the server refuses it with — the flow editor's rule. Two copies of
// "you may not reopen a closed deal" are two copies free to disagree, and the
// one in the browser is the copy somebody would be reading while they did.
import { TICKET_STATUSES } from "./tickets";

/**
 * OPEN, PAUSED, CLOSED — three kinds, not two.
 *
 * "On-Hold" is the reason. A deal on hold has not been lost and has not been
 * won: the client stopped it, and it is still the studio's to reopen. Calling
 * it closed would erase it from the pipeline; calling it open would leave it in
 * the weighted forecast at a probability nobody has revisited since the day it
 * stalled, which is how a forecast quietly becomes fiction. It gets a column
 * and no forecast weight.
 */
export type StageKind = "open" | "paused" | "closed";

export type StageDef = {
  kind: StageKind;
  /** Board order. Open stages ascend left to right; the rest follow. */
  order: number;
  /** Won is the one closed stage that is a success, and the only one counted in a win rate. */
  won?: boolean;
  /**
   * A LOSING CLOSE MUST SAY WHY. This is the whole reason `lostReason` exists,
   * and until now nothing asked for it. "Closed Won" needs no reason; the three
   * ways of losing do, because "why do we lose" is a question a studio can only
   * answer from reasons somebody was made to give at the time.
   */
  needsReason?: boolean;
  /**
   * COMMIT AND A WIN MEAN A QUOTATION EXISTS. ./tickets says post-approval
   * statuses are pickable "only after the quotation approval is complete", and
   * nothing enforced it — `editTicket` checked membership of the status list
   * and no more. This is that sentence, enforced.
   *
   * Only these two. Dropping, cancelling and holding a deal must stay available
   * to a bare Lead, or every dead lead is trapped in the pipeline forever
   * waiting for a quotation nobody will ever raise.
   */
  needsQuotation?: boolean;
};

const STAGES: Record<string, StageDef> = {
  "Lead": { kind: "open", order: 1 },
  "Opportunity": { kind: "open", order: 2 },
  "Commit": { kind: "open", order: 3, needsQuotation: true },
  "On-Hold": { kind: "paused", order: 4 },
  "Closed Won": { kind: "closed", order: 5, won: true, needsQuotation: true },
  "Closed Lost": { kind: "closed", order: 6, needsReason: true },
  "Cancelled by Client": { kind: "closed", order: 7, needsReason: true },
  "Dropped": { kind: "closed", order: 8, needsReason: true },
};

export function stageDef(status: string): StageDef | undefined {
  return STAGES[status];
}

/**
 * THE ASSERTION THAT COSTS NOTHING TO RUN.
 *
 * A status added to TICKET_STATUSES and not classified here would not throw and
 * would not fail a type check — it would simply never appear on the board, and
 * every deal in it would vanish from the funnel while still existing. A pure
 * function that names the gap is how the suite catches that without a write,
 * the same shape as SWEEP_SCOPES and templateProblems.
 */
export function unclassifiedStatuses(): string[] {
  return TICKET_STATUSES.filter((s) => !STAGES[s]);
}

const ordered = (kinds: StageKind[]) =>
  TICKET_STATUSES.filter((s) => STAGES[s] && kinds.includes(STAGES[s].kind))
    .sort((a, b) => STAGES[a].order - STAGES[b].order);

/** The board's columns: everything still live, in funnel order. */
export const BOARD_COLUMNS = ordered(["open", "paused"]);
/** The ways a deal ends. Summarised beneath the board rather than given columns. */
export const CLOSED_STAGES = ordered(["closed"]);
/**
 * THE CLIMB, without the pause. A deal in these stages is progressing, which is
 * what a funnel counts — On-Hold is live but going nowhere, so a funnel that
 * included it would report movement that is not happening.
 *
 * Exported rather than filtered at the call site because the dashboard's funnel
 * needs exactly this list, and a second `filter(kind === "open")` somewhere else
 * is a second definition of "progressing".
 */
export const OPEN_STAGES = ordered(["open"]);
/** The one closed stage that is a success. Empty-string only if nothing is won-flagged. */
export const WON_STAGE = CLOSED_STAGES.find((s) => STAGES[s]?.won) || "";

export const isClosed = (status: string) => STAGES[status]?.kind === "closed";
export const isWon = (status: string) => STAGES[status]?.won === true;

/**
 * WHY A MOVE IS REFUSED, or null when it is allowed.
 *
 * Returns a token rather than a sentence: the screens translate it, and the
 * route hands it back unchanged so the same refusal reads the same in both
 * languages. Every branch here is a move somebody can make today.
 */
export function stageProblem(input: {
  from: string;
  to: string;
  lostReason?: string;
  hasQuotation?: boolean;
}): string | null {
  const { from, to } = input;
  const target = STAGES[to];
  if (!target) return "unknown-stage";
  if (from === to) return null;

  // A CLOSED DEAL IS HISTORY. Dragging a Closed Won back to Lead does not
  // correct a mistake — it deletes a win from every count that has already
  // been taken off it, and leaves the ticket claiming to be in a stage its own
  // closedAt contradicts. Reference numbers only move forward for the same
  // reason (invariant 10): once the outside world has seen a fact, unseeing it
  // is not an edit.
  if (isClosed(from)) return "already-closed";

  if (target.needsQuotation && !input.hasQuotation) return "no-quotation";
  if (target.needsReason && !String(input.lostReason || "").trim()) return "reason-required";
  return null;
}

/**
 * THE ONE REASON THE CHAIN ITSELF GIVES, as a token rather than a sentence.
 *
 * Technical turning an RFQ down closes the deal, and that close needs a reason
 * like every other losing close does — but a sentence written here would be
 * English stored in the database, which the studio's Arabic reader would then
 * be shown verbatim. Statuses already translate on DISPLAY keyed by a stored
 * token; a system-written reason is the same problem and takes the same answer.
 * A reason a PERSON typed is data and is shown exactly as typed.
 */
export const CHAIN_LOST_REASON = "rfq-rejected";

/** One line of a deal's stage history. */
export type StageEntry = {
  status: string;
  at: string;
  byCollaboratorId: string;
};

/**
 * EVERY FIELD A STAGE CHANGE IMPLIES, decided in one place.
 *
 * `editTicket` is not the only writer of a ticket's status: requesting an RFQ
 * moves a Lead to Opportunity and a rejected RFQ closes the deal, both from
 * modules/technical. If each of them appended its own history entry and set its
 * own closedAt, the three would drift, and the one that forgot would produce a
 * deal whose history has a hole exactly where the interesting move was.
 *
 * The caller decides WHETHER the move is allowed (`stageProblem`, on the manual
 * path only — the chain's own moves are the chain doing its job). This decides
 * what the move WRITES.
 */
export function stagePatch(input: {
  from: string;
  to: string;
  at: string;
  byCollaboratorId: string;
  lostReason?: string;
  history?: unknown;
}): Record<string, unknown> {
  const prior: StageEntry[] = Array.isArray(input.history) ? (input.history as StageEntry[]) : [];
  const patch: Record<string, unknown> = {
    status: input.to,
    // CAPPED, like comments are. A deal bounced between two stages by an
    // indecisive week must not grow a row without bound.
    stageHistory: [...prior, { status: input.to, at: input.at, byCollaboratorId: input.byCollaboratorId }].slice(-200),
  };
  if (isClosed(input.to)) {
    patch.closedAt = input.at;
    const reason = String(input.lostReason || "").trim().slice(0, 400);
    // The reason is written for a losing close and cleared for a win, so a deal
    // that was dropped and later re-raised cannot carry the old excuse.
    patch.lostReason = STAGES[input.to]?.needsReason ? reason : "";
  }
  return patch;
}

/**
 * WHAT THE FORECAST IS WORTH. Value times the studio's own read on likelihood.
 *
 * Both numbers were already on the ticket and nothing multiplied them, which is
 * the difference between a list of deals and a pipeline. Paused deals are
 * excluded by the caller, not here — this is arithmetic, not policy.
 */
export function weightedValue(value: unknown, probability: unknown): number {
  const v = Number(value);
  const p = Number(probability);
  if (!Number.isFinite(v) || !Number.isFinite(p)) return 0;
  return Math.round(v * Math.min(100, Math.max(0, p))) / 100;
}

/**
 * WHEN THIS DEAL ENTERED THE STAGE IT IS IN.
 *
 * Falls back through `updatedAt` to `createdAt` because the tickets that exist
 * today have no history at all — this ships to a live studio, and a board that
 * showed "—" for every deal until somebody moved it would be useless on the one
 * day it most needs to be read. A ticket sitting in Lead since it was raised
 * genuinely has been there since it was raised, so the fallback is not a guess.
 */
export function enteredStageAt(ticket: {
  status?: string;
  stageHistory?: unknown;
  updatedAt?: string;
  createdAt?: string;
}): string {
  const history: StageEntry[] = Array.isArray(ticket.stageHistory) ? (ticket.stageHistory as StageEntry[]) : [];
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i]?.status === ticket.status && history[i]?.at) return history[i].at;
  }
  return ticket.updatedAt || ticket.createdAt || "";
}

/** Whole days between an ISO instant and now. Negative clamps to zero. */
export function daysSince(iso: string, nowMs: number): number {
  const t = Date.parse(iso || "");
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((nowMs - t) / 86400000));
}
