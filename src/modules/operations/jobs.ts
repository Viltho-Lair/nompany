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
import { listCollaborators } from "@/platform/auth/collaborators";
import { notifyNewlyAssigned } from "@/modules/people/holders";
import { NOTIFY, type Notice } from "@/platform/notify/notifications";
import type { Sla } from "@/modules/maintenance/schema";
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
// SERVICE CONTRACTS, filed under `projects-sla` — Maintenance's register, read
// here so a scheduled visit can name the contract it is under.
const Slas = repo<Sla>("slas");
const Projects = repo<{ id: string }>("projects");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const ids = (v: unknown, max = 50) =>
  (Array.isArray(v) ? v : []).map((x) => str(x, 60)).filter(Boolean).slice(0, max);

// A JOB TIME: blank, a date, or a date and time — with or without a zone. What
// the New job form sends is the dispatcher's wall clock with no zone
// ("2026-09-27T08:30"), which dispatch.dayOf reads as the studio's own time.
// Anything else was stored as typed and then read by the board as no day at
// all, so the job vanished from every view while existing. Null means refused.
const TIME = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?)?$/;
const jobTime = (v: unknown): string | null => {
  const raw = str(v, 40);
  if (!raw) return "";
  return TIME.test(raw) && Number.isFinite(Date.parse(raw)) ? raw : null;
};

/**
 * WHAT A JOB NAMES MUST EXIST — the people on it, the project, the contract and
 * the installed unit. Each was stored as typed, so a stale picker or a hand-made
 * request filed a job against a project that had been deleted, staffed it with
 * somebody who had left (who then never saw it on any round), or named a
 * contract nothing could resolve. EXISTENCE ONLY: the pickers already offer
 * only what the reader may open, and a refusal here says nothing about a row
 * beyond "not one of ours". Blank is always allowed — every link is optional.
 * The refusal token, or null.
 */
async function linksProblem(
  ctx: ScheduleContext,
  v: { assignedToCollaboratorIds?: string[]; projectId?: string; contractId?: string; installedUnitId?: string },
): Promise<string | null> {
  const { studio } = ctx;
  if (v.assignedToCollaboratorIds?.length) {
    const known = new Set((await listCollaborators(studio.id)).map((c) => String(c.id)));
    if (v.assignedToCollaboratorIds.some((id) => !known.has(id))) return "person";
  }
  if (v.projectId) {
    const section = ctx.projectsListSection;
    if (!section || !(await Projects.byId({ studio, section }, v.projectId))) return "project";
  }
  if (v.contractId) {
    const section = ctx.slasSection;
    if (!section || !(await Slas.byId({ studio, section }, v.contractId))) return "contract";
  }
  if (v.installedUnitId) {
    const section = ctx.sections.find((s) => s.key === engineSectionKey("installed"));
    const row = section ? await Records.byId({ studio, section }, v.installedUnitId) : null;
    if (!row || row.typeKey !== "installed") return "unit";
  }
  return null;
}

/** The two ends of a visit: each must parse, and it cannot end before it starts. */
function timesProblem(start: string | null, end: string | null): string | null {
  if (start === null || end === null) return "time";
  if (start && end && Date.parse(end) < Date.parse(start)) return "range";
  return null;
}

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
// "A JOB WAS ASSIGNED TO YOU" — the crew hears about the work from the bell,
// not by opening the board (28/09/2026). The time is the stored local
// date-time, printed as data: it reads the same in both languages.
const JOB_RIGHT = "fieldService.schedule.view";
function jobNotice(job: { title?: string; scheduledStart?: string; location?: string }): Notice {
  const when = String(job.scheduledStart || "").replace("T", " ").slice(0, 16);
  const title = String(job.title || "");
  const where = String(job.location || "");
  return {
    type: NOTIFY.jobAssigned,
    title: "A job was assigned to you",
    body: [title, when, where].filter(Boolean).join(" · "),
    params: { title, when, where },
    href: "field-service-schedule",
    tone: "primary",
  };
}

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

  // EVERY DOOR THAT RAISES A JOB tells its crew — the dispatch form and a PM
  // plan falling due alike — except the migration, which carries work that was
  // dispatched long ago and was already known about.
  if (!input.migratedFromRecordId) {
    await notifyNewlyAssigned(scope.studio.id, {
      before: [], after: job.assignedToCollaboratorIds, actorId: actor.type === "collaborator" ? actor.id : "",
      right: JOB_RIGHT, notice: jobNotice(job),
    });
  }

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

  const scheduledStart = jobTime(body?.scheduledStart);
  const scheduledEnd = jobTime(body?.scheduledEnd);
  const badTime = timesProblem(scheduledStart, scheduledEnd);
  if (badTime) return { error: badTime };

  const links = {
    projectId: str(body?.projectId, 60),
    assignedToCollaboratorIds: ids(body?.assignedToCollaboratorIds),
    contractId: str(body?.contractId, 60),
    installedUnitId: str(body?.installedUnitId, 60),
  };
  const badLink = await linksProblem(ctx, links);
  if (badLink) return { error: badLink };

  const job = await insertJob({ studio, section }, {
    title,
    kind,
    dealId: str(body?.dealId, 60),
    location: str(body?.location, 300),
    scheduledStart: scheduledStart || "",
    scheduledEnd: scheduledEnd || "",
    notes: str(body?.notes, 4000),
    ...links,
  }, { id: collaborator.id, type: "collaborator" });

  return { job };
}

/**
 * WHAT THE NEW JOB FORM OFFERS — projects, service contracts and installed
 * units, names only, each from a register this reader may open. A register they
 * may not read is an empty list, not a refusal.
 *
 * THE CONTRACTS ARE MAINTENANCE'S, NOT AN ENGINE REGISTER'S (12/09/2026). This
 * read `engine.contract`, Field Service's old maintenance-contracts register,
 * which stopped being seeded when the three old registers were folded into
 * Maintenance — so on every studio created since, the picker could only ever
 * come back empty, and an empty picker reads as "this studio has no contracts"
 * rather than as one aimed at a register that no longer exists. Every contract
 * any studio has written is in `slas` under `projects-sla`.
 *
 * IT IS LABELLED AND FILTERED EXACTLY AS MAINTENANCE LABELS IT — the title, and
 * never a cancelled one, because nothing new is raised under a cancelled
 * contract. Two spellings of one contract across two screens is two answers.
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
  // The contract register's own right, the one every role that had the Projects
  // SLA screen already holds. No section, or no right: an empty list.
  const contractNames = async () => {
    if (!ctx.slasSection || requirePermission(ctx.access, "projects.sla.view")) return [];
    const rows = await Slas.find({ studio: ctx.studio, section: ctx.slasSection });
    return rows
      .filter((c) => String(c.status ?? "").trim() !== "Cancelled")
      .map((c) => ({ id: c.id, name: String(c.title ?? "").trim().slice(0, 200) || "—" }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };
  const [{ projects = [] }, contracts, units] = await Promise.all([
    referencePickers(ctx.studio, { projects: ctx.projectsListSection }, { projects: true }),
    contractNames(),
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
  if (body.title !== undefined) {
    // A title is required at create, so an edit may not blank it either.
    const title = str(body.title, 200);
    if (!title) return { error: "title" };
    patch.title = title;
  }
  if (body.projectId !== undefined) patch.projectId = str(body.projectId, 60);
  if (body.location !== undefined) patch.location = str(body.location, 300);
  if (body.scheduledStart !== undefined || body.scheduledEnd !== undefined) {
    // BOTH ENDS JUDGED TOGETHER, the one sent against the one stored, so moving
    // the start past a stored end is refused rather than written.
    const start = body.scheduledStart !== undefined ? jobTime(body.scheduledStart) : current.scheduledStart || "";
    const end = body.scheduledEnd !== undefined ? jobTime(body.scheduledEnd) : current.scheduledEnd || "";
    const badTime = timesProblem(start, end);
    if (badTime) return { error: badTime };
    if (body.scheduledStart !== undefined) patch.scheduledStart = start || "";
    if (body.scheduledEnd !== undefined) patch.scheduledEnd = end || "";
  }
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
  // ONLY THE LINKS THIS EDIT CARRIES are checked — an edit to the title is not
  // refused because a contract named months ago has since been removed.
  const badLink = await linksProblem(ctx, {
    assignedToCollaboratorIds: patch.assignedToCollaboratorIds,
    projectId: patch.projectId, contractId: patch.contractId, installedUnitId: patch.installedUnitId,
  });
  if (badLink) return { error: badLink };

  if (!Object.keys(patch).length) return { error: "nothing" };
  patch.updatedAt = new Date().toISOString();

  // CLOSED IS ASKED AGAIN OF THE ROW BEING WRITTEN (invariant 8): a job
  // completed on site while the office was editing it must not be re-scheduled
  // by the edit that read it open. A patch that no longer holds writes nothing.
  // Reset per invocation, because a CAS retry runs the patch again.
  let closed = "";
  const job = await Jobs.update({ studio, section }, id, (row) => {
    closed = row.status === "completed" || row.status === "cancelled" ? row.status : "";
    return closed ? {} : patch;
  });
  if (!job) return { error: "notfound" };
  if (closed) return { error: "closed", status: closed };
  // Only the people this edit ADDED hear about it; the crew already on the job
  // was told when they were put on it.
  if (patch.assignedToCollaboratorIds) {
    await notifyNewlyAssigned(studio.id, {
      before: current.assignedToCollaboratorIds, after: job.assignedToCollaboratorIds,
      actorId: ctx.collaborator.id, right: JOB_RIGHT, notice: jobNotice(job),
    });
  }
  return { job };
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
  // THE MOVE IS JUDGED AGAIN AGAINST THE ROW BEING WRITTEN (invariant 8), not
  // only the one read above: a technician tapping Finish while the office
  // cancels would otherwise both "win", and a cancelled job would come back
  // completed — billable under Template D's signoff trigger. A move that no
  // longer holds writes nothing (`{}`) and is refused with the status the row
  // really has. Reset per invocation, because a CAS retry runs the patch again.
  let movedFrom = null as JobStatus | null;
  const job = await Jobs.update({ studio, section }, id, (row) => {
    movedFrom = NEXT_STATUS[row.status]?.includes(next) ? null : row.status;
    if (movedFrom) return {};
    return {
      status: next,
      // STAMPED ONLY ON COMPLETION, and never typed. A cancelled job did not
      // complete, so giving it a completion time would make it count as work
      // done in every report that asks how much was delivered.
      ...(next === "completed" ? { completedAt: at } : {}),
      updatedAt: at,
    };
  });
  if (!job) return { error: "notfound" };
  if (movedFrom) return { error: "transition", from: movedFrom, to: next };
  return { job };
}
