// JOBS — the short-form execution unit, dispatched from the Schedule screen.
//
// The record's shape and the reasoning behind each field are in ./jobSchema.
// This file creates and reads them, and does the two things a job does to its
// DEAL: it attaches to one, and it tells it where the work actually happened.
import { repo } from "@/platform/db/repo";
import { requirePermission, engineSectionKey } from "@/platform/access";
import {
  attachRecord, contributeContext, resolveDealId, createEngagement, setDealTemplate, projectEngagementId,
} from "@/platform/db/engagement";
import { stageOf } from "@/platform/engagement/registry";
import type { Section } from "@/platform/db/sections";
import type { EngineRecord } from "@/platform/engine/schema";
import { referencePickers } from "@/modules/procurement/pickers";
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
const Records = repo<EngineRecord>("engineRecords");

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

/** What any door hands the one insert below — the form, the PM run, the migration. */
export type NewJob = {
  title: string;
  kind: JobKind;
  status?: JobStatus;
  dealId?: string;
  projectId?: string;
  location?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  completedAt?: string;
  assignedToCollaboratorIds?: string[];
  notes?: string;
  contractId?: string;
  installedUnitId?: string;
  planId?: string;
  planOccurrence?: string;
  migratedFromRecordId?: string;
  createdAt?: string;
};

/**
 * A DEAL FOR A JOB WITH NOTHING BEHIND IT — Template D, Field Service, headed by
 * the job. The blueprint's own case: "a warranty call is a job with no sale, no
 * quotation and no project behind it". Before tier 5 no screen could create a
 * job at all, and the API refused one without a deal id nobody could get.
 */
export async function openServiceDeal(studioId: string, ref: string): Promise<string> {
  const eng = await createEngagement(studioId, { ref: ref.slice(0, 200) });
  await setDealTemplate(studioId, eng.id, "D");
  return eng.id;
}

/**
 * WHICH DEAL A JOB EXECUTES, in order: the one it was given (through the alias
 * table, Law 3); the one its PROJECT belongs to; else a field-service deal of
 * its own. A job still never exists on no deal (Law 7) — it is never refused
 * for want of one any more.
 */
async function dealForJob(studioId: string, job: Pick<NewJob, "dealId" | "projectId" | "title">) {
  if (job.dealId) return resolveDealId(studioId, job.dealId);
  if (job.projectId) {
    const viaProject = await projectEngagementId(studioId, job.projectId);
    if (viaProject) return viaProject;
  }
  return openServiceDeal(studioId, job.title);
}

/**
 * THE ONE INSERT. No permission of its own — the three doors ask theirs first
 * (the form asks `fieldService.schedule.create`; the daily PM run and the
 * migration act with the studio's authority, as an engine rule does) — so a job
 * raised by a plan and one typed by a dispatcher are the same record, attached
 * and contributed the same way.
 */
export async function insertJob(
  scope: { studio: { id: string }; section: Section },
  input: NewJob,
  actor: { id: string; type: "collaborator" | "system" },
) {
  const dealId = await dealForJob(scope.studio.id, input);
  const at = new Date().toISOString();
  const job = await Jobs.create(scope as never, {
    number: "",              // issued later, exactly as a contract's is
    title: input.title,
    dealId,
    projectId: input.projectId || "",
    kind: input.kind,
    // BORN `scheduled` from every door but the migration, which carries a
    // service order's real state across. A job that arrived already complete
    // would otherwise be work nobody dispatched.
    status: input.status || ("scheduled" satisfies JobStatus),
    location: input.location || "",
    scheduledStart: input.scheduledStart || "",
    scheduledEnd: input.scheduledEnd || "",
    completedAt: input.completedAt || "",
    assignedToCollaboratorIds: input.assignedToCollaboratorIds || [],
    notes: input.notes || "",
    ...(input.contractId ? { contractId: input.contractId } : {}),
    ...(input.installedUnitId ? { installedUnitId: input.installedUnitId } : {}),
    ...(input.planId ? { planId: input.planId, planOccurrence: input.planOccurrence || "" } : {}),
    ...(input.migratedFromRecordId ? { migratedFromRecordId: input.migratedFromRecordId } : {}),
    createdByCollaboratorId: actor.type === "collaborator" ? actor.id : "",
    createdAt: input.createdAt || at,
    updatedAt: at,
  });

  // ATTACH BEFORE CONTRIBUTING, and do not swallow the failure. Attaching is
  // what can be refused — a template that narrows `job` to one on this deal, an
  // id that resolves to nothing — and a contribution to a deal this record
  // turned out not to be able to join would be a fact taught by a membership
  // that does not exist. Unlike the audit trail, whose failure must not fail a
  // write that already happened, a job that could not attach is work whose cost
  // nothing can attract.
  await attachRecord(scope.studio.id, dealId, "job", job.id, job.createdAt);

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
  await contributeContext(scope.studio.id, dealId, { site: input.location || "" }, JOB_SOURCE, {
    actor: actor.id,
    actorType: actor.type,
  });

  return job;
}

/**
 * Dispatch a job — from the New job form on the dispatch board (tier 5).
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

  const kind = str(body?.kind, 30);
  if (!isKind(kind)) return { error: "kind" };

  const job = await insertJob({ studio, section }, {
    title,
    kind,
    dealId: str(body?.dealId, 60),
    projectId: str(body?.projectId, 60),
    location: str(body?.location, 300),
    scheduledStart: str(body?.scheduledStart, 40),
    scheduledEnd: str(body?.scheduledEnd, 40),
    assignedToCollaboratorIds: ids(body?.assignedToCollaboratorIds),
    notes: str(body?.notes, 4000),
    contractId: str(body?.contractId, 60),
    installedUnitId: str(body?.installedUnitId, 60),
  }, { id: collaborator.id, type: "collaborator" });

  return { job };
}

/**
 * WHAT THE NEW JOB FORM OFFERS — projects, maintenance contracts and installed
 * units, names only, each from a register this reader may open. An engine
 * register they may not read is an empty list, not a refusal.
 */
export async function jobFormOptions(ctx: ScheduleContext) {
  const canCreate = !requirePermission(ctx.access, "fieldService.schedule.create");
  if (!canCreate) return { canCreate, pickers: {} };
  const engineNames = async (typeKey: string, field: string) => {
    if (requirePermission(ctx.access, `engine.${typeKey}.view`)) return [];
    const section = ctx.sections.find((s) => s.key === engineSectionKey(typeKey));
    if (!section) return [];
    const rows = await Records.find({ studio: ctx.studio, section }, { where: { typeKey } });
    return rows.map((r) => ({ id: r.id, name: [r.reference, String(r.values?.[field] || "")].filter(Boolean).join(" · ") }));
  };
  const [{ projects = [] }, contracts, units] = await Promise.all([
    referencePickers(ctx.studio, { projects: ctx.projectsListSection }, { projects: true }),
    engineNames("contract", "title"),
    engineNames("installed", "description"),
  ]);
  return { canCreate, pickers: { projects, contracts, units } };
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
  // What the visit is about can be corrected; which plan raised it cannot —
  // that pair is the PM run's idempotency key.
  if (body.contractId !== undefined) patch.contractId = str(body.contractId, 60);
  if (body.installedUnitId !== undefined) patch.installedUnitId = str(body.installedUnitId, 60);
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

  const from = current.status;
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
