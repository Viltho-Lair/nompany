// INSPECTIONS — the quality gate, and the proof it was walked.
//
// The record's shape and the reasoning behind each field are in
// ./inspectionSchema. This file creates and reads them, and does the two things
// an inspection does to its DEAL: it attaches to one, and it tells it where the
// work was actually found to be.
import { repo } from "@/platform/db/repo";
import { requirePermission } from "@/platform/access";
import { attachRecord, contributeContext, resolveDealId } from "@/platform/db/engagement";
import { stageOf } from "@/platform/engagement/registry";
import type { Inspection } from "./inspectionSchema";
import { INSPECTION_KINDS, INSPECTION_RESULTS } from "./inspectionSchema";

import type { ProjectsContext } from "./types";

type InspectionKind = (typeof INSPECTION_KINDS)[number];
type InspectionResult = (typeof INSPECTION_RESULTS)[number];
// TYPE GUARDS RATHER THAN CASTS. `includes` on a readonly tuple does not narrow
// a `string`, and casting would silence the one check standing between a typo
// and a kind or a result that means nothing to any later reader — including the
// quality register that will eventually count them.
const isKind = (v: string): v is InspectionKind => (INSPECTION_KINDS as readonly string[]).includes(v);
const isResult = (v: string): v is InspectionResult => (INSPECTION_RESULTS as readonly string[]).includes(v);

const Inspections = repo<Inspection>("inspections");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/**
 * AN INSPECTION'S OBJECT CLASS DECIDES WHAT IT MAY TEACH THE DEAL.
 *
 * Read from the registry rather than written here, so an inspection contributes
 * at exactly the rank the precedence table gives its class — and if that class
 * ever changes, this follows without anybody remembering a second copy.
 */
const INSPECTION_SOURCE = {
  kind: "stage" as const,
  objectClass: stageOf("inspection")!.objectClass,
};

// `listSection` is a SUB-section and therefore always present (it falls back to
// the Projects root), so there is no nullable-section guard here of the kind
// contracts.ts needs for its foreign quotations section.
export async function listInspections(ctx: ProjectsContext, { dealId }: { dealId?: string } = {}) {
  const denied = requirePermission(ctx.access, "projects.list.view");
  if (denied) return denied;
  const { studio, listSection } = ctx;
  const where = dealId ? { dealId } : undefined;
  return { inspections: await Inspections.find({ studio, section: listSection }, { where }) };
}

/**
 * Raise a check against a deal.
 *
 * THE GUARD IS HERE, NOT IN THE ROUTE — routes get added and forgotten, and the
 * function that does the work cannot be reached around.
 *
 * BORN `pending`, ALWAYS. A hold point is scheduled before it is walked and a
 * snag exists from the moment it is noticed, so an inspection that arrived
 * already passed would be a result nobody recorded — which is the one thing a
 * quality record must never be able to be.
 */
export async function createInspection(ctx: ProjectsContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "projects.list.create");
  if (denied) return denied;

  const { studio, listSection, collaborator } = ctx;

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

  const inspection = await Inspections.create({ studio, section: listSection }, {
    reference: "",           // issued later, exactly as a contract's number is
    title,
    dealId: resolved,
    projectId: str(body?.projectId, 60),
    jobId: str(body?.jobId, 60),
    kind,
    result: "pending" satisfies InspectionResult,
    location,
    scheduledDate: str(body?.scheduledDate, 40),
    inspectedAt: "",
    inspectedByCollaboratorId: "",
    findings: "",
    notes: str(body?.notes, 4000),
    createdByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // ATTACH BEFORE CONTRIBUTING, and do not swallow the failure. Attaching is
  // what can be refused, and a contribution to a deal this record turned out not
  // to be able to join would be a fact taught by a membership that does not
  // exist. Unlike the audit trail — whose failure must not fail a write that
  // already happened — an inspection that could not attach is evidence about
  // nothing.
  await attachRecord(studio.id, resolved, "inspection", inspection.id, inspection.createdAt);

  // WHAT AN INSPECTION KNOWS: where it happened. Offered as the deal's `site`,
  // where it FILLS A BLANK and can never overwrite — `evidence` sits below
  // intent, execution and commitment in the precedence table, which is right:
  // an inspection reports one visit, and a deal executed across three locations
  // must not be renamed after whichever one was checked last.
  await contributeContext(studio.id, resolved, { site: location }, INSPECTION_SOURCE, {
    actor: collaborator.id,
    actorType: "collaborator",
  });

  return { inspection };
}

/**
 * RECORD WHAT WAS FOUND — the transition an inspection exists for.
 *
 * SEPARATE FROM `updateInspection` on purpose. Editing the title of a scheduled
 * check and declaring that it failed are not the same act, and a single verb
 * that did both would let a result be set as a side effect of a correction.
 *
 * A RESULT IS RECORDED ONCE. Re-walking a failed hold point produces a NEW
 * inspection — that is why the type is `many` per deal — because overwriting the
 * failure would erase the fact that the work failed the first time, which is
 * precisely what a quality register exists to remember.
 */
export async function recordInspectionResult(ctx: ProjectsContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "projects.list.edit");
  if (denied) return denied;

  const { studio, listSection, collaborator } = ctx;
  const current = await Inspections.byId({ studio, section: listSection }, id);
  if (!current) return { error: "notfound" };
  if (current.result !== "pending") return { error: "already", result: current.result };

  const result = str(body?.result, 30);
  if (!isResult(result) || result === "pending") return { error: "result" };

  // A FAILURE MUST SAY WHY. A passed check needs no words; a failure with no
  // findings is a stop order nobody can act on, and the person who has to fix
  // the work is not the person who saw it.
  const findings = str(body?.findings, 4000);
  if (result === "fail" && !findings) return { error: "findings" };

  // CAPTURED ONCE, OUTSIDE THE CLOSURE. This is a function patch (invariant 8),
  // so updateRow may invoke it more than once — a CAS retry under contention, or
  // once per store under NOMPANY_DB=parity — and a `new Date()` inside would
  // disagree between those invocations.
  const at = new Date().toISOString();
  const inspection = await Inspections.update({ studio, section: listSection }, id, () => ({
    result,
    findings,
    inspectedAt: at,
    // WHO WALKED IT, taken from the actor rather than from the body. A quality
    // record whose inspector could be typed in is a record that can name
    // somebody who was never there.
    inspectedByCollaboratorId: collaborator.id,
    updatedAt: at,
  }));
  return inspection ? { inspection } : { error: "notfound" };
}

export async function updateInspection(ctx: ProjectsContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "projects.list.edit");
  if (denied) return denied;

  const { studio, listSection } = ctx;
  const current = await Inspections.byId({ studio, section: listSection }, id);
  if (!current) return { error: "notfound" };

  // AN ANSWERED INSPECTION IS CLOSED. Once a result is recorded the record is
  // evidence, and evidence that can still be edited is not evidence.
  if (current.result !== "pending") return { error: "answered", result: current.result };

  // THE FIELDS AN INSPECTION MAY NOT CHANGE:
  //   dealId     — re-rooting is what Law 3 forbids.
  //   reference  — invariant 10: a reference only moves forward.
  //   result     — a transition, not a field. See recordInspectionResult.
  const patch: Partial<Inspection> = {};
  if (body.title !== undefined) patch.title = str(body.title, 200);
  if (body.projectId !== undefined) patch.projectId = str(body.projectId, 60);
  if (body.jobId !== undefined) patch.jobId = str(body.jobId, 60);
  if (body.location !== undefined) patch.location = str(body.location, 300);
  if (body.scheduledDate !== undefined) patch.scheduledDate = str(body.scheduledDate, 40);
  if (body.notes !== undefined) patch.notes = str(body.notes, 4000);
  if (body.kind !== undefined) {
    const kind = str(body.kind, 30);
    if (!isKind(kind)) return { error: "kind" };
    patch.kind = kind;
  }

  if (!Object.keys(patch).length) return { error: "nothing" };
  patch.updatedAt = new Date().toISOString();

  const inspection = await Inspections.update({ studio, section: listSection }, id, patch);
  return inspection ? { inspection } : { error: "notfound" };
}
