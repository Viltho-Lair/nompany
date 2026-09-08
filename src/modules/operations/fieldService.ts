// THE MOBILE FIELD VIEW — what a technician sees, and the signature they take.
//
// See `./signoff` for why a signature is not a status and why one is never
// replaced. This is the store half.
//
// NO PERMISSION KEY OF ITS OWN. Reading is `fieldService.schedule.view` and
// taking a signature is `fieldService.schedule.edit`, the right that already
// changes a job — a separate right over the signature would be one nobody
// could exercise without the first.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import {
  signoffProblems, signoffProblem, cleanSignoff, myJobs, fieldSummary,
} from "./signoff";
import type { Signoff } from "./signoff";
import type { ScheduleContext } from "./types";
import type { Job } from "./jobSchema";

const Jobs = repo<Job & { signoffs?: Signoff[] }>("jobs");

const scope = (ctx: ScheduleContext) => ({ studio: ctx.studio, section: ctx.section });

/**
 * MY JOBS, AND WHAT I HAVE FINISHED WITHOUT PROOF.
 *
 * ADDRESSED BY COLLABORATORID, never by user (invariant 6). `ctx.collaborator`
 * is the identity inside a studio, and it is what `assignedToCollaboratorIds`
 * holds — so the answer is "mine" without the caller naming themselves, which
 * is also what stops one technician asking for another's round.
 */
export async function fieldView(ctx: ScheduleContext) {
  const denied = requirePermission(ctx.access, "fieldService.schedule.view");
  if (denied) return denied;

  const all = await Jobs.find(scope(ctx));
  const mine = all.filter((j) => (j.assignedToCollaboratorIds || []).includes(ctx.collaborator.id));
  const signoffs = Object.fromEntries(mine.map((j) => [j.id, j.signoffs || []]));
  const summary = fieldSummary(mine, signoffs);

  return {
    // The outstanding round, soonest first — see `myJobs` for why an
    // unscheduled job sorts last rather than first.
    jobs: myJobs(mine, ctx.collaborator.id).map((j) => ({
      id: j.id, number: j.number, title: j.title, status: j.status, kind: j.kind,
      location: j.location, notes: j.notes,
      scheduledStart: j.scheduledStart, scheduledEnd: j.scheduledEnd,
      signoffs: j.signoffs || [],
    })),
    outstanding: summary.outstanding,
    completed: summary.completed,
    // WORK THAT HAS BEEN DONE AND CANNOT BE PROVED. A real state to chase, and
    // nothing in the product could name it before. Carried as a slim row rather
    // than the whole job: the screen lists them to be signed, not to be worked.
    awaitingSignature: summary.awaitingSignature.map((j) => ({
      id: j.id, title: j.title, completedAt: j.completedAt,
    })),
  };
}

/**
 * TAKE THE SIGNATURE.
 *
 * APPENDED UNDER A FUNCTION PATCH (invariant 8), because two people can be
 * signing two visits of one job and a blind whole-array write would drop one.
 */
export async function signJob(ctx: ScheduleContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "fieldService.schedule.edit");
  if (denied) return denied;

  const rows = await Jobs.find(scope(ctx));
  const job = rows.find((j) => j.id === id);
  if (!job) return { error: "notfound" };

  const blocked = signoffProblem(job);
  if (blocked) return { error: blocked };

  const problems = signoffProblems(body);
  if (problems.length) return { error: "refused", detail: problems.join("; ") };

  const entry = cleanSignoff(body, {
    capturedByCollaboratorId: ctx.collaborator.id,
    at: new Date().toISOString(),
  });

  const updated = await Jobs.update(scope(ctx), id, (row) => ({
    signoffs: [...((row as { signoffs?: Signoff[] }).signoffs || []), entry],
    updatedAt: entry.at,
  }));
  return updated ? { job: updated } : { error: "notfound" };
}
