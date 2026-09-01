// JOBS — the short-form execution unit, dispatched from the Schedule screen.
//
// The record's shape and the reasoning behind each field are in ./jobSchema.
// This file creates and reads them, and does the two things a job does to its
// DEAL: it attaches to one, and it tells it where the work actually happened.
import { repo } from "@/platform/db/repo";
import { requirePermission } from "@/platform/access";
import { attachRecord, contributeContext, resolveDealId } from "@/platform/db/engagement";
import { stageOf } from "@/platform/engagement/registry";
import type { Job } from "./jobSchema";
import { JOB_KINDS, JOB_STATUSES } from "./jobSchema";

import type { ScheduleContext } from "./types";

type JobKind = (typeof JOB_KINDS)[number];
type JobStatus = (typeof JOB_STATUSES)[number];
// TYPE GUARDS RATHER THAN CASTS. `includes` on a readonly tuple does not narrow
// a `string`, and casting would silence the one check between a typo and a job
// whose kind or state means nothing to the rota that has to draw it.
const isKind = (v: string): v is JobKind => (JOB_KINDS as readonly string[]).includes(v);
const isStatus = (v: string): v is JobStatus => (JOB_STATUSES as readonly string[]).includes(v);

const Jobs = repo<Job>("jobs");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const ids = (v: unknown, max = 50) =>
  (Array.isArray(v) ? v : []).map((x) => str(x, 60)).filter(Boolean).slice(0, max);

/**
 * A JOB'S OBJECT CLASS DECIDES WHAT IT MAY TEACH THE DEAL.
 *
 * Read from the registry rather than written here, so a job contributes at
 * exactly the rank the precedence table gives `execution` — above commitment,
 * which is the whole reason a crew's actual location beats a contract's drafted
 * one — and if that class ever changes, this follows without a second copy.
 */
const JOB_SOURCE = {
  kind: "stage" as const,
  objectClass: stageOf("job")!.objectClass,
};

// THE SCHEDULE SUB-SECTION IS THIS CONTEXT'S ROOT (`field-service-schedule`), so
// `ctx.section` is always present — moduleContext refuses with `no-section`
// before a handler ever runs when the studio has no such row. That is why there
// is no nullable-section guard here of the kind contracts.ts needs for its
// FOREIGN quotations section: the absence is the type saying so.
export async function listJobs(ctx: ScheduleContext, { dealId }: { dealId?: string } = {}) {
  const denied = requirePermission(ctx.access, "fieldService.schedule.view");
  if (denied) return denied;
  const { studio, section } = ctx;
  const where = dealId ? { dealId } : undefined;
  return { jobs: await Jobs.find({ studio, section }, { where, order: "scheduledStart" }) };
}

/**
 * Dispatch a job against a deal.
 *
 * THE GUARD IS HERE, NOT IN THE ROUTE — routes get added and forgotten, and the
 * function that does the work cannot be reached around.
 */
export async function createJob(ctx: ScheduleContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "fieldService.schedule.create");
  if (denied) return denied;

  const { studio, section, collaborator } = ctx;

  const title = str(body?.title, 200);
  if (!title) return { error: "title" };

  const dealId = str(body?.dealId, 60);
  if (!dealId) return { error: "deal" };

  const kind = str(body?.kind, 30);
  if (!isKind(kind)) return { error: "kind" };

  const location = str(body?.location, 300);

  // Through the alias table, so a caller holding a derived id lands on the deal
  // that exists rather than on one nothing else can find (Law 3).
  const resolved = await resolveDealId(studio.id, dealId);

  const job = await Jobs.create({ studio, section }, {
    number: "",              // issued later, exactly as a contract's is
    title,
    dealId: resolved,
    projectId: str(body?.projectId, 60),
    kind,
    // BORN `scheduled`. A job that arrived already complete would be work nobody
    // dispatched, and the rota would have no record it was ever going to happen.
    status: "scheduled" satisfies JobStatus,
    location,
    scheduledStart: str(body?.scheduledStart, 40),
    scheduledEnd: str(body?.scheduledEnd, 40),
    completedAt: "",
    assignedToCollaboratorIds: ids(body?.assignedToCollaboratorIds),
    notes: str(body?.notes, 4000),
    createdByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // ATTACH BEFORE CONTRIBUTING, and do not swallow the failure. Attaching is
  // what can be refused — a template that narrows `job` to one on this deal, an
  // id that resolves to nothing — and a contribution to a deal this record
  // turned out not to be able to join would be a fact taught by a membership
  // that does not exist. Unlike the audit trail, whose failure must not fail a
  // write that already happened, a job that could not attach is work whose cost
  // nothing can attract.
  await attachRecord(studio.id, resolved, "job", job.id, job.createdAt);

  // WHAT A JOB KNOWS: where the crew went. This is §2.3's own example — "a
  // service job knows the site" — and it is why entry-at-Execution is lossless:
  // a warranty call opened with no sale behind it still gives the deal a site.
  //
  // THE SCHEDULED DATES ARE DELIBERATELY NOT CONTRIBUTED as the deal's
  // `deadline`. A deal has many jobs and `execution` outranks `commitment`, so
  // each new job would drag the deal's deadline to its own date and overwrite
  // the end date the contract actually agreed. `site` does not have that
  // problem: two jobs are equal rank, so the first one's location stands and
  // later ones are refused rather than fighting over it.
  await contributeContext(studio.id, resolved, { site: location }, JOB_SOURCE, {
    actor: collaborator.id,
    actorType: "collaborator",
  });

  return { job };
}

export async function updateJob(ctx: ScheduleContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "fieldService.schedule.edit");
  if (denied) return denied;

  const { studio, section } = ctx;
  const current = await Jobs.byId({ studio, section }, id);
  if (!current) return { error: "notfound" };

  // A CLOSED JOB IS CLOSED. Its hours are booked against it and its evidence
  // points at it; re-scheduling something that already happened would make the
  // rota disagree with the timesheets.
  if (current.status === "completed" || current.status === "cancelled") {
    return { error: "closed", status: current.status };
  }

  // THE FIELDS A JOB MAY NOT CHANGE:
  //   dealId  — moving executed work between deals falsifies two profit figures
  //             at once. Re-rooting is what Law 3 forbids.
  //   number  — invariant 10: a reference only moves forward.
  //   status  — a transition, not a field. See setJobStatus.
  const patch: Partial<Job> = {};
  if (body.title !== undefined) patch.title = str(body.title, 200);
  if (body.projectId !== undefined) patch.projectId = str(body.projectId, 60);
  if (body.location !== undefined) patch.location = str(body.location, 300);
  if (body.scheduledStart !== undefined) patch.scheduledStart = str(body.scheduledStart, 40);
  if (body.scheduledEnd !== undefined) patch.scheduledEnd = str(body.scheduledEnd, 40);
  if (body.notes !== undefined) patch.notes = str(body.notes, 4000);
  if (body.assignedToCollaboratorIds !== undefined) {
    patch.assignedToCollaboratorIds = ids(body.assignedToCollaboratorIds);
  }
  if (body.kind !== undefined) {
    const kind = str(body.kind, 30);
    if (!isKind(kind)) return { error: "kind" };
    patch.kind = kind;
  }

  if (!Object.keys(patch).length) return { error: "nothing" };
  patch.updatedAt = new Date().toISOString();

  const job = await Jobs.update({ studio, section }, id, patch);
  return job ? { job } : { error: "notfound" };
}

/**
 * MOVE THE JOB ALONG — its own verb, because a state change is an event and an
 * edit is a correction, and a single function doing both would let a job be
 * completed as a side effect of fixing its title.
 *
 * THE LEGAL MOVES ARE STATED, not inferred from an ordering. `scheduled` may go
 * to `in-progress` or straight to `cancelled` (a call-off before anyone left);
 * `in-progress` may complete or be cancelled (an abandoned visit); the two
 * terminal states go nowhere. Nothing reopens: a job that has to happen again is
 * a new job, which is what `many` cardinality is for and what keeps the second
 * visit's hours from being booked against the first one's record.
 */
const NEXT_STATUS: Readonly<Record<JobStatus, readonly JobStatus[]>> = Object.freeze({
  scheduled: ["in-progress", "cancelled"],
  "in-progress": ["completed", "cancelled"],
  completed: [],
  cancelled: [],
});

export async function setJobStatus(ctx: ScheduleContext, id: string, next: string) {
  const denied = requirePermission(ctx.access, "fieldService.schedule.edit");
  if (denied) return denied;

  const { studio, section } = ctx;
  if (!isStatus(next)) return { error: "status" };

  const current = await Jobs.byId({ studio, section }, id);
  if (!current) return { error: "notfound" };

  const from = current.status as JobStatus;
  if (!NEXT_STATUS[from]?.includes(next)) return { error: "transition", from, to: next };

  // CAPTURED ONCE, OUTSIDE THE CLOSURE. This is a function patch (invariant 8),
  // so updateRow may invoke it more than once — a CAS retry under contention, or
  // once per store under NOMPANY_DB=parity — and a `new Date()` inside would
  // disagree between those invocations.
  const at = new Date().toISOString();
  const job = await Jobs.update({ studio, section }, id, () => ({
    status: next,
    // STAMPED ONLY ON COMPLETION, and never typed. A cancelled job did not
    // complete, so giving it a completion time would make it count as work done
    // in every report that asks how much was delivered.
    ...(next === "completed" ? { completedAt: at } : {}),
    updatedAt: at,
  }));
  return job ? { job } : { error: "notfound" };
}
