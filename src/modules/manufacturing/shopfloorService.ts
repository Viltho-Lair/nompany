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
  runHours, startProblem, orderEffort, qcProblems, batchVerdict, awaitingCheck,
} from "./shopfloor";
import type { RunLog, QcCheck } from "./shopfloor";
import type { PlanningContext } from "./planning";

const Runs = repo<RunLog>("shopfloorRuns");
const Checks = repo<QcCheck>("qcChecks");

const scope = (ctx: PlanningContext) => ({ studio: ctx.studio, section: ctx.section });
const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/** An engine type's rows, flattened. Empty when the studio has no such type. */
async function rowsOf(ctx: PlanningContext, typeKey: string) {
  const result = await listRecords(ctx, typeKey);
  if ("error" in result || !("records" in result)) return [];
  return ((result.records as Record<string, unknown>[]) || []).map((r) => ({
    id: String(r.id ?? ""), ...((r.values as Record<string, unknown>) || {}),
  })) as Record<string, unknown>[];
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
  const mine = openRuns.find((r) => r.byCollaboratorId === ctx.collaborator.id) || null;

  return {
    orders: orders.map((o) => ({
      id: o.id,
      title: String(o.title || ""),
      product: String(o.product || ""),
      quantity: Number(o.quantity) || 0,
      station: String(o.station || ""),
      ...orderEffort(runs, String(o.id)),
    })),
    myRun: mine ? { ...mine, hours: runHours(mine) } : null,
    // Somebody else is at that machine. Shown rather than hidden: an operator
    // arriving at a busy station should see who is on it, not an empty list.
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

/** Clock on to a work order. */
export async function startRun(ctx: PlanningContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "engine.workorder.edit");
  if (denied) return denied;

  const workOrderId = str(body?.workOrderId, 60);
  const runs = await Runs.find(scope(ctx));
  const problem = startProblem(workOrderId, ctx.collaborator.id, runs.filter((r) => !r.endedAt));
  if (problem) return { error: problem };

  return {
    run: await Runs.create(scope(ctx), {
      workOrderId,
      station: str(body?.station, 120),
      byCollaboratorId: ctx.collaborator.id,
      startedAt: new Date().toISOString(),
      endedAt: "",
      notes: str(body?.notes, 500),
    }),
  };
}

/**
 * CLOCK OFF. Only your OWN run, and that is not a convenience — a run is a
 * claim about who was standing at a machine and for how long, so somebody else
 * closing it would be signing a timesheet in another person's name.
 */
export async function endRun(ctx: PlanningContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "engine.workorder.edit");
  if (denied) return denied;

  const runs = await Runs.find(scope(ctx));
  const mine = runs.find((r) => !r.endedAt && r.byCollaboratorId === ctx.collaborator.id);
  if (!mine) return { error: "no-run" };

  const updated = await Runs.update(scope(ctx), mine.id, {
    endedAt: new Date().toISOString(),
    notes: body?.notes === undefined ? mine.notes : str(body.notes, 500),
  });
  return updated ? { run: updated, hours: runHours(updated) } : { error: "notfound" };
}

/**
 * PASS, FAIL OR CONCEDE A BATCH.
 *
 * APPENDED, NEVER REPLACED — a batch that failed, was reworked and passed has
 * two checks and the second is its verdict. Overwriting the first would destroy
 * the record of the rework, which is the half a traceability system exists for.
 */
export async function checkBatch(ctx: PlanningContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "engine.batch.edit");
  if (denied) return denied;

  const problems = qcProblems(body);
  if (problems.length) return { error: "refused", detail: problems.join("; ") };

  return {
    check: await Checks.create(scope(ctx), {
      batchId: str(body?.batchId, 60),
      result: str(body?.result, 20) as QcCheck["result"],
      reason: str(body?.reason, 1000),
      byCollaboratorId: ctx.collaborator.id,
      at: new Date().toISOString(),
    }),
  };
}
