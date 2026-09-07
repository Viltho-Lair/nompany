// CLOSING A PROJECT — the punch list, practical completion, and the support
// clock that runs from handover.
//
// IT ADDS NO PERMISSION KEY. Closure IS a project's content, the way a
// variation is a contract's, so it answers to `projects.list` — recording
// practical completion is running the job, and a second right over the same act
// would be free to disagree with the first about who runs it.
//
// THE PUNCH LIST IS READ, NOT KEPT. `inspections` has carried a `snag` kind
// since it was written and that is what a punch list is made of; a second
// collection of defects would be two lists of the same snags.
//
// THE ARITHMETIC IS IN ./closureModel and nothing is decided here.
import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { listCollaborators } from "@/platform/auth/collaborators";
import { closurePosition, closureProblem } from "./closureModel";
import type { Project } from "./schema";
import type { Inspection } from "./inspectionSchema";
import type { ProjectsContext } from "./types";

const Projects = repo<Project>("projects");
const Inspections = repo<Inspection>("inspections");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const day = (v: unknown) => str(v, 10);
const now = () => new Date().toISOString();

export async function listClosures(ctx: ProjectsContext, projectId = "") {
  const denied = requirePermission(ctx.access, "projects.list.view");
  if (denied) return denied;

  const { studio, listSection } = ctx;
  const [projects, inspections, people] = await Promise.all([
    Projects.find({ studio, section: listSection }),
    Inspections.find({ studio, section: listSection }),
    listCollaborators(studio.id),
  ]);
  const aliasOf = new Map(
    (people as { id?: unknown; alias?: unknown }[])
      .map((c) => [String(c?.id ?? ""), String(c?.alias ?? "")] as const),
  );

  const mine = projectId ? projects.filter((p) => p.id === projectId) : projects;
  const asOf = now();
  const today = asOf.slice(0, 10);

  // THE SNAGS THEMSELVES TRAVEL WITH THE POSITION, not only their count: a
  // screen that says "three open" and cannot say which three sends somebody to
  // another screen to find out, and the whole point of a punch list is the list.
  const snagOf = new Map<string, Inspection[]>();
  for (const i of inspections) {
    if (String(i.kind || "") !== "snag") continue;
    const key = String(i.projectId || "");
    const at = snagOf.get(key) || [];
    at.push(i);
    snagOf.set(key, at);
  }

  const closures = mine.map((p) => ({
    id: p.id,
    number: p.number,
    title: p.title,
    clientName: p.clientName,
    stage: p.stage,
    // RETURNED BESIDE THE POSITION, not inside it: `closurePosition` computes
    // and the final-account date computes nothing — it is recorded and gates
    // nothing, so it stays a plain field rather than joining a derived shape.
    finalAccountAt: p.finalAccountAt || "",
    position: closurePosition(p, inspections, p.id, today),
    snags: (snagOf.get(p.id) || [])
      .sort((a, b) => String(a.scheduledDate || "").localeCompare(String(b.scheduledDate || "")))
      .map((i) => ({
        id: i.id,
        reference: i.reference,
        title: i.title,
        result: i.result,
        location: i.location,
        scheduledDate: i.scheduledDate,
        inspectedAt: i.inspectedAt,
      })),
    closedByAlias: aliasOf.get(String(p.closedByCollaboratorId || "")) || "",
  }));

  return {
    closures,
    asOf,
    canEdit: !requirePermission(ctx.access, "projects.list.edit"),
  };
}

/**
 * RECORD THE CLOSURE DATES. Practical completion, handover, the support period
 * and the final account — every one of them a fact about the job rather than a
 * decision about it, which is why they are an ordinary edit and closing is not.
 */
export async function saveClosure(ctx: ProjectsContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "projects.list.edit");
  if (denied) return denied;

  const { studio, listSection } = ctx;
  const rows = await Projects.find({ studio, section: listSection });
  const existing = rows.find((p) => p.id === id);
  if (!existing) return { error: "notfound" };

  const patch: Record<string, unknown> = {};
  if (body?.practicalCompletionAt !== undefined) patch.practicalCompletionAt = day(body.practicalCompletionAt);
  if (body?.handoverAt !== undefined) patch.handoverAt = day(body.handoverAt);
  if (body?.finalAccountAt !== undefined) patch.finalAccountAt = day(body.finalAccountAt);
  if (body?.supportPeriodDays !== undefined) patch.supportPeriodDays = Number(body.supportPeriodDays);

  const problem = closureProblem(existing, patch);
  if (problem) return { error: problem };

  return {
    project: await Projects.update({ studio, section: listSection }, id, (row) => ({
      ...row,
      ...patch,
    })),
  };
}

/**
 * CLOSING IS ITS OWN ACT, never a date written through the edit path. It is
 * final — `closureProblem` refuses every later write once `closedAt` is set —
 * and a final state reachable by a generic write is the shape that let a
 * rejected change order approve itself.
 */
export async function closeProject(ctx: ProjectsContext, id: string) {
  const denied = requirePermission(ctx.access, "projects.list.edit");
  if (denied) return denied;

  const { studio, listSection, collaborator } = ctx;
  const [rows, inspections] = await Promise.all([
    Projects.find({ studio, section: listSection }),
    Inspections.find({ studio, section: listSection }),
  ]);
  const existing = rows.find((p) => p.id === id);
  if (!existing) return { error: "notfound" };

  const position = closurePosition(existing, inspections, id, now().slice(0, 10));
  if (position.isClosed) return { error: "closed" };
  // THE BLOCKERS ARE THE ANSWER, not a bare refusal: a screen told "cannot
  // close" without being told why sends somebody hunting through the record.
  if (!position.canClose) return { error: "blocked", blockers: position.blockers };

  const at = now();
  return {
    project: await Projects.update({ studio, section: listSection }, id, (row) => ({
      ...row,
      closedAt: at,
      closedByCollaboratorId: collaborator.id,
    })),
  };
}
