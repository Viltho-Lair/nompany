// THE SHOP FLOOR — an operator at a station, and what they can record there.
//
// A WORK ORDER COULD BE MOVED THROUGH ITS STATUSES AND NOTHING RECORDED HOW
// LONG IT TOOK. The engine register carries a status ladder, so an order went
// from open to done with a click and the run left no trace: nothing could say
// how many hours went into a batch, which station they were spent at, or who
// was standing there. A factory that cannot answer that cannot cost a product.
//
// AND A PRODUCTION BATCH HAD NO VERDICT. The register records what was made and
// when; nothing said whether it PASSED. So a studio could trace a batch to a
// job and could not say whether the batch was any good — which is the one thing
// traceability exists to let somebody act on.
//
// TWO RECORDS, ONE SCREEN, because they happen at the same place — the machine
// and what came off it. They are NOT assumed to be one person's job: clocking
// on answers to `engine.workorder.edit` and passing a batch to
// `engine.batch.edit` (see `./shopfloorService`), so a studio decides whether
// the operator also signs off, and the screen shows each half only to whoever
// holds its right.
//
// PURE. No store, and every clock reading comes in as an argument; the one
// import is `./mrp`'s rule for what an open work order is, so the terminal and
// the planner cannot disagree about it.

import { isOpen } from "./mrp";

export type RunLog = {
  id: string;
  workOrderId: string;
  station: string;
  byCollaboratorId: string;
  startedAt: string;
  /** Empty while the run is open. */
  endedAt: string;
  notes: string;
};

export type QcCheck = {
  id: string;
  batchId: string;
  result: "pass" | "fail" | "concession";
  reason: string;
  byCollaboratorId: string;
  at: string;
};

export const QC_RESULTS = ["pass", "fail", "concession"] as const;

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const ms = (v: unknown) => { const t = Date.parse(String(v ?? "")); return Number.isFinite(t) ? t : NaN; };
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Hours a run took, or null while it is still open. */
export function runHours(log: Pick<RunLog, "startedAt" | "endedAt">): number | null {
  const start = ms(log.startedAt);
  const end = ms(log.endedAt);
  // OPEN IS NULL, NOT ZERO. A run in progress has taken some time and we do not
  // yet know how much; reporting nought would make a half-finished batch look
  // free, and summing it into a product cost would understate every job on the
  // floor right now.
  if (!Number.isFinite(start) || !log.endedAt) return null;
  if (!Number.isFinite(end) || end <= start) return 0;
  return round1((end - start) / 3600000);
}

/**
 * CAN THIS PERSON START A RUN? A reason, or null.
 *
 * ONE OPEN RUN PER PERSON, ACROSS EVERY ORDER. An operator standing at one
 * machine cannot also be at another, and allowing two open runs is how a day
 * ends up with sixteen hours logged against eight worked. It refuses by name so
 * the terminal can offer to close the other one.
 *
 * AND THE ORDER MUST EXIST AND BE OPEN. `order` is the work order as the
 * register holds it now (null when there is none). A run was accepted against
 * any id at all, and against Completed and Cancelled orders the terminal
 * offered alongside the live ones — hours logged against a job that is shut,
 * which is cost nobody can put anywhere.
 */
export function startProblem(
  workOrderId: string,
  collaboratorId: string,
  open: RunLog[],
  order: { status?: string } | null | undefined,
): string | null {
  if (!workOrderId) return "order";
  if (!order) return "no-order";
  if (!isOpen(order)) return "order-closed";
  const mine = open.find((l) => l.byCollaboratorId === collaboratorId && !l.endedAt);
  if (mine) return mine.workOrderId === workOrderId ? "already-running" : "other-run";
  return null;
}

/**
 * WHICH OF A PERSON'S OPEN RUNS STANDS, when there is more than one.
 *
 * THE ONE-OPEN-RUN RULE IS A READ FOLLOWED BY A WRITE, and the store has no
 * unique constraint to hang it on — a run is a row in a collection, not a key.
 * So a double tap could pass `startProblem` twice and open two runs. The start
 * therefore writes FIRST and reads AFTER: every request that finds more than
 * one open run of the same person keeps the earliest (by `startedAt`, then by
 * id, so every reader picks the same one) and removes its own if it is not
 * that one. Deterministic, so two racing requests cannot both remove
 * themselves and cannot both stay.
 */
export function keptRun(open: RunLog[], collaboratorId: string): RunLog | null {
  const mine = open
    .filter((l) => l.byCollaboratorId === collaboratorId && !l.endedAt)
    .sort((a, b) => String(a.startedAt).localeCompare(String(b.startedAt)) || String(a.id).localeCompare(String(b.id)));
  return mine[0] || null;
}

/**
 * WHAT ONE WORK ORDER HAS COST IN TIME — closed runs only, and the count of
 * open ones stated separately.
 *
 * SEPARATED RATHER THAN ESTIMATED. An open run's hours are unknown (see
 * `runHours`), and folding a guess into the total would produce a number that
 * moves when nobody has done anything. A reader who needs to know the figure is
 * provisional is told how many runs are still going.
 */
export function orderEffort(logs: RunLog[], workOrderId: string): {
  hours: number; runs: number; openRuns: number;
} {
  const mine = logs.filter((l) => l.workOrderId === workOrderId);
  const closed = mine.filter((l) => Boolean(l.endedAt));
  return {
    hours: round1(closed.reduce((sum, l) => sum + (runHours(l) || 0), 0)),
    runs: closed.length,
    openRuns: mine.length - closed.length,
  };
}

/**
 * What is wrong with this QC check, as TOKENS, or an empty array.
 *
 * TOKENS, NOT SENTENCES. These were English phrases joined into the refusal's
 * `detail`, so an Arabic terminal printed "say why it failed" — the words are
 * the screen's (`shopFloorDict().problem`), keyed by what this returns.
 */
export function qcProblems(input: { batchId?: unknown; result?: unknown; reason?: unknown }): string[] {
  const problems: string[] = [];
  const batchId = str(input.batchId, 60);
  const result = str(input.result, 20);

  if (!batchId) problems.push("batch");
  if (!(QC_RESULTS as readonly string[]).includes(result)) problems.push("result");
  // A FAIL WITHOUT A REASON IS NOT A RECORD. "This batch failed" that does not
  // say why cannot be acted on, cannot be argued with, and cannot be counted
  // into anything — the same rule a losing deal follows, where `lostReason` is
  // required precisely so a studio can be told what it keeps losing on.
  //
  // A CONCESSION NEEDS ONE TOO, and more so: accepting material that did not
  // meet the spec is a decision somebody has to be able to defend later.
  if ((result === "fail" || result === "concession") && !str(input.reason, 1000)) {
    problems.push(result === "fail" ? "fail-reason" : "concession-reason");
  }
  return problems;
}

/**
 * A BATCH'S VERDICT — the LATEST check, not a tally.
 *
 * A batch that failed and was reworked and passed is a PASSING batch, and a
 * screen that showed both verdicts equally would leave the reader to guess
 * which is current. The history stays; the verdict is the last word.
 *
 * NULL RATHER THAN "pass" WHEN NOTHING HAS BEEN CHECKED. "Not checked" and
 * "checked and fine" are opposite facts about a batch about to be shipped, and
 * defaulting to the safe-sounding one is how an uninspected batch leaves the
 * building looking approved.
 */
export function batchVerdict(checks: QcCheck[], batchId: string): QcCheck | null {
  const mine = checks
    .filter((c) => c.batchId === batchId)
    .sort((a, b) => String(a.at).localeCompare(String(b.at)));
  return mine[mine.length - 1] || null;
}

/**
 * WHAT THE FLOOR SHOULD LOOK AT — batches nobody has checked, oldest first.
 *
 * The counterpart of `awaitingSignature` on the field view: material that was
 * made and cannot be released, which is a real state to chase rather than an
 * absence in the data.
 */
export function awaitingCheck<T extends { id: string; madeOn?: string }>(
  batches: T[],
  checks: QcCheck[],
): T[] {
  return batches
    .filter((b) => !batchVerdict(checks, b.id))
    .sort((a, b) => String(a.madeOn || "").localeCompare(String(b.madeOn || "")));
}
