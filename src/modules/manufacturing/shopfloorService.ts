// THE STORE HALF OF `./shopfloor`.
//
// NO PERMISSION KEY OF ITS OWN, and the two acts answer to different rights on
// purpose: logging a run against a work order is working ON that order, so it
// asks `engine.workorder.edit`; passing or failing a batch is a judgement about
// that batch, so it asks `engine.batch.edit`. An operator who may run a machine
// and a person who may release its output are frequently not the same person,
// and one right over both would make them so.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { listRecords } from "@/platform/engine/records";
import {
  runHours, startProblem, keptRun, orderEffort, qcProblems, batchVerdict, awaitingCheck,
} from "./shopfloor";
import { flatRecord, isOpen } from "./mrp";
import type { RunLog, QcCheck } from "./shopfloor";
import type { PlanningContext } from "./planning";

const Runs = repo<RunLog>("shopfloorRuns");
const Checks = repo<QcCheck>("qcChecks");

const scope = (ctx: PlanningContext) => ({ studio: ctx.studio, section: ctx.section });
const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/**
 * An engine type's rows, flattened WITH THEIR STATUS. Empty when the studio has
 * no such type. This dropped the status too, which is how the terminal offered
 * Completed and Cancelled orders beside the live ones — see `flatRecord`.
 */
async function rowsOf(ctx: PlanningContext, typeKey: string) {
  const result = await listRecords(ctx, typeKey);
  if ("error" in result || !("records" in result)) return [];
  return ((result.records as Record<string, unknown>[]) || []).map(flatRecord);
}

/**
 * THE TERMINAL — the work orders an operator can pick up, their own open run,
 * and the batches nobody has passed or failed.
 *
 * READ BEHIND THE PLANNING RIGHT, because it is the same registers. Writing is
 * gated separately below.
 */
export async function shopFloor(ctx: PlanningContext) {
  const denied = requirePermission(ctx.access, "manufacturing.planning.view");
  if (denied) return denied;

  const [orders, batches, runs, checks] = await Promise.all([
    rowsOf(ctx, "workorder"),
    rowsOf(ctx, "batch"),
    Runs.find(scope(ctx)),
    Checks.find(scope(ctx)),
  ]);

  const openRuns = runs.filter((r) => !r.endedAt);
  // MY OWN OPEN RUN, because that is the only one the terminal can close and
  // the only one that blocks the operator from starting another.
  const mine = keptRun(openRuns, ctx.collaborator.id);
  const titleOf = (id: string) => String(orders.find((o) => o.id === id)?.title || "");

  return {
    // ONLY OPEN ORDERS — nothing can be clocked on to a Completed or Cancelled
    // one (`startProblem` refuses it), so offering them was a button that
    // could only fail.
    orders: orders.filter(isOpen).map((o) => ({
      id: o.id,
      title: String(o.title || ""),
      product: String(o.product || ""),
      quantity: Number(o.quantity) || 0,
      station: String(o.station || ""),
      status: o.status,
      ...orderEffort(runs, String(o.id)),
    })),
    // THE TITLE TRAVELS with my run, because the order it is on may have been
    // closed since I clocked on, and then it is not in the list above — the
    // screen would otherwise name my own job by its internal id.
    myRun: mine ? { ...mine, hours: runHours(mine), title: titleOf(mine.workOrderId) } : null,
    // Somebody else is at that machine. Shown rather than hidden: an operator
    // arriving at a busy station should see that it is taken, not an empty
    // list. It says THAT somebody is on it, not who — the terminal has no
    // reason to hand every operator everybody's whereabouts.
    otherRuns: openRuns
      .filter((r) => r.byCollaboratorId !== ctx.collaborator.id)
      .map((r) => ({ workOrderId: r.workOrderId, station: r.station })),
    batches: batches.map((b) => ({
      id: b.id,
      reference: String(b.reference || ""),
      product: String(b.product || ""),
      madeOn: String(b.madeOn || ""),
      // NULL WHEN NOTHING HAS BEEN CHECKED — "not checked" and "checked and
      // fine" are opposite facts about a batch about to be shipped.
      verdict: batchVerdict(checks, String(b.id)),
    })),
    // MADE AND NOT RELEASABLE — a real state to chase, the counterpart of the
    // field view's `awaitingSignature`.
    awaitingCheck: awaitingCheck(
      batches.map((b) => ({ id: String(b.id), madeOn: String(b.madeOn || ""), reference: String(b.reference || "") })),
      checks,
    ),
    canLog: !requirePermission(ctx.access, "engine.workorder.edit"),
    canCheck: !requirePermission(ctx.access, "engine.batch.edit"),
  };
}

/**
 * Clock on to a work order.
 *
 * THE ORDER IS READ, NOT TRUSTED — it must exist and be open (`startProblem`).
 *
 * AND THE ONE-OPEN-RUN RULE IS CHECKED TWICE, before and after the write. The
 * store offers no unique constraint over "one open run per person" and no lock
 * a service can take, so read-then-create lets a double tap open two runs. The
 * check before the write turns the common case away cheaply; the check after
 * it resolves the race — every request that sees two of my open runs keeps the
 * earliest (`keptRun`, the same answer for every reader) and removes its own if
 * it lost. What remains: if the request that stamped the EARLIER `startedAt`
 * lands its write only AFTER the other request has already re-read, each sees
 * itself as the keeper and both runs stand. That is a window of milliseconds
 * on one person's taps; if it happens, clock-off closes the earliest first and
 * a second tap closes the other.
 */
export async function startRun(ctx: PlanningContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "engine.workorder.edit");
  if (denied) return denied;

  const workOrderId = str(body?.workOrderId, 60);
  const [runs, orders] = await Promise.all([Runs.find(scope(ctx)), rowsOf(ctx, "workorder")]);
  const order = orders.find((o) => o.id === workOrderId) || null;
  const open = runs.filter((r) => !r.endedAt);
  const problem = startProblem(workOrderId, ctx.collaborator.id, open, order);
  if (problem) return refusal(problem, open, orders, ctx.collaborator.id);

  const run = await Runs.create(scope(ctx), {
    workOrderId,
    // THE ORDER'S OWN STATION when the body names none — the terminal sends it,
    // and a hand-made call that forgot it should not log a run at nowhere.
    station: str(body?.station, 120) || String(order?.station || "").slice(0, 120),
    byCollaboratorId: ctx.collaborator.id,
    startedAt: new Date().toISOString(),
    endedAt: "",
    notes: str(body?.notes, 500),
  });

  const after = (await Runs.find(scope(ctx))).filter((r) => !r.endedAt);
  const kept = keptRun(after, ctx.collaborator.id);
  if (kept && kept.id !== run.id) {
    await Runs.remove(scope(ctx), run.id);
    const code = kept.workOrderId === workOrderId ? "already-running" : "other-run";
    return refusal(code, after, orders, ctx.collaborator.id);
  }
  return { run };
}

/**
 * A refusal to start, NAMING THE JOB when the reason is another open run — the
 * terminal says which one to clock off rather than "clock off first".
 */
function refusal(
  code: string, open: RunLog[], orders: Record<string, unknown>[], me: string,
): { error: string; workOrderId?: string; title?: string } {
  if (code !== "other-run" && code !== "already-running") return { error: code };
  const run = keptRun(open, me);
  if (!run) return { error: code };
  return {
    error: code,
    workOrderId: run.workOrderId,
    title: String(orders.find((o) => o.id === run.workOrderId)?.title || ""),
  };
}

/**
 * CLOCK OFF. Only your OWN run, and that is not a convenience — a run is a
 * claim about who was standing at a machine and for how long, so somebody else
 * closing it would be signing a timesheet in another person's name.
 *
 * A FUNCTION PATCH (invariant 8), and the guard is re-checked INSIDE it: a
 * double tap on Clock off found the same open run twice, and an object patch
 * wrote the second tap's later `endedAt` over the first, stretching the run. The
 * function leaves a run that is already closed exactly as it is.
 */
export async function endRun(ctx: PlanningContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "engine.workorder.edit");
  if (denied) return denied;

  const runs = await Runs.find(scope(ctx));
  const mine = keptRun(runs.filter((r) => !r.endedAt), ctx.collaborator.id);
  if (!mine) return { error: "no-run" };

  const at = new Date().toISOString();
  let closed = false;
  const updated = await Runs.update(scope(ctx), mine.id, (row) => {
    // Re-applied to the row as it now is on a contended write, so the flag is
    // reset each time and describes the attempt that landed.
    closed = false;
    if (row.endedAt || row.byCollaboratorId !== ctx.collaborator.id) return {};
    closed = true;
    return { endedAt: at, notes: body?.notes === undefined ? row.notes : str(body.notes, 500) };
  });
  if (!updated) return { error: "notfound" };
  if (!closed) return { error: "no-run" };
  return { run: updated, hours: runHours(updated) };
}

/**
 * PASS, FAIL OR CONCEDE A BATCH.
 *
 * APPENDED, NEVER REPLACED — a batch that failed, was reworked and passed has
 * two checks and the second is its verdict. Overwriting the first would destroy
 * the record of the rework, which is the half a traceability system exists for.
 *
 * THE BATCH IS READ, NOT TRUSTED. Any `batchId` was accepted, so a verdict
 * could be recorded against a batch that never existed — a pass for nothing,
 * which `batchVerdict` would then report for an id no screen shows.
 */
export async function checkBatch(ctx: PlanningContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "engine.batch.edit");
  if (denied) return denied;

  const problems = qcProblems(body);
  // `detail` carries every token, and the screen says each in its language.
  if (problems.length) return { error: "refused", detail: problems.join(";") };

  const batchId = str(body?.batchId, 60);
  const batches = await rowsOf(ctx, "batch");
  if (!batches.some((b) => b.id === batchId)) return { error: "no-batch" };

  return {
    check: await Checks.create(scope(ctx), {
      batchId,
      result: str(body?.result, 20) as QcCheck["result"],
      reason: str(body?.reason, 1000),
      byCollaboratorId: ctx.collaborator.id,
      at: new Date().toISOString(),
    }),
  };
}
