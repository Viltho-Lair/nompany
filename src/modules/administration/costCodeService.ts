// THE STORE HALF OF `./costCodes` — the studio's standard cost codes.
//
// MASTER DATA'S COLLECTION, guarded by `administration.master.*`, which is the
// same argument locations and departments already carry: a standard breakdown
// is read by Projects (which copies it into a budget) and by Finance (which
// codes a bill against it) and is owned by neither. It mints NO permission key
// — the catalogue is unchanged.
//
// A COLLECTION RATHER THAN A FIELD OF THE STUDIO RECORD, which is where units
// and the numbering series went. Those are short and closed — eight units,
// seventeen series — and this is a register a studio grows to a couple of
// hundred rows. The studio record is read on EVERY request in the product; a
// library living on it would be carried into all of them to serve one screen.
//
// THE DRIFT REPORT IS GATED SEPARATELY AND NEVER READ WITHOUT THE RIGHT. It is
// assembled from project cost rows, which answer to `projects.costs.view` — so
// a reader holding Master data alone gets the library and no drift, and the
// projects are not read at all rather than read and hidden. The customer-360
// rule, in Administration.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import {
  libraryProblems, cleanLibraryCode, libraryGroups, libraryView, codeDrift,
  type LibraryCode as PureCode,
} from "./costCodes";
import type { LibraryCostCode, MasterContext } from "./types";

const Library = repo<LibraryCostCode>("costCodeLibrary");
// READ ACROSS THE BOUNDARY, deliberately, for exactly one question: which codes
// the projects are actually using. That is a scope rather than a second owner —
// the shape Master data already uses to ask whether a rota still names a place.
const ProjectCosts = repo<{ code?: string; projectId?: string }>("projectCosts");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const scope = (ctx: MasterContext) => ({ studio: ctx.studio, section: ctx.section });

/** The library, its groups, and — for a reader who may see them — the drift. */
export async function listCostCodeLibrary(ctx: MasterContext) {
  const denied = requirePermission(ctx.access, "administration.master.view");
  if (denied) return denied;

  const rows = await Library.find(scope(ctx));
  const codes = libraryView(rows) as LibraryCostCode[];

  // GATED, AND THEREFORE NOT READ. A figure derived from records somebody
  // cannot open would leak the very thing the gate is for, and reading them to
  // throw the answer away would cost a round trip for nothing.
  const mayReadProjects =
    Boolean(ctx.projectsListSection) && !requirePermission(ctx.access, "projects.costs.view");

  const drift = mayReadProjects
    ? codeDrift(rows, await ProjectCosts.find(
      { studio: ctx.studio, section: ctx.projectsListSection! }))
    : null;

  return {
    codes,
    // Derived rather than stored so it cannot go stale — rename every row in a
    // group and the group is renamed.
    groups: libraryGroups(rows),
    drift,
    canManage: !requirePermission(ctx.access, "administration.master.edit"),
    canCreate: !requirePermission(ctx.access, "administration.master.create"),
    canDelete: !requirePermission(ctx.access, "administration.master.delete"),
  };
}

export async function createCostCode(ctx: MasterContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "administration.master.create");
  if (denied) return denied;

  const rows = await Library.find(scope(ctx));
  // UNIQUENESS IS THE MODEL'S QUESTION, not this function's. An edit that
  // collides with a sibling is the same defect as a create that does, and one
  // function answering both is one place to be right.
  const problems = libraryProblems(body, rows as PureCode[]);
  if (problems.length) return { error: "refused", detail: problems.join("; ") };

  const code = await Library.create(scope(ctx), {
    ...cleanLibraryCode(body),
    createdByCollaboratorId: ctx.collaborator.id,
    createdAt: new Date().toISOString(),
  });
  return { code };
}

export async function editCostCode(ctx: MasterContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "administration.master.edit");
  if (denied) return denied;

  const rows = await Library.find(scope(ctx));
  const current = rows.find((r) => r.id === id);
  if (!current) return { error: "notfound" };

  const merged = { ...current, ...body, id };
  const problems = libraryProblems(merged, rows as PureCode[]);
  if (problems.length) return { error: "refused", detail: problems.join("; ") };

  // RENAMING A LIBRARY CODE REPRICES NOTHING AND RENAMES NOTHING. A project's
  // breakdown holds the code STRING it was given, so an edit here changes what
  // the NEXT project is offered and leaves every running job exactly as it was
  // — the BOQ rate rule, for the BOQ rate's reason. The consequence is that a
  // renamed code reads as drift on the projects that took the old one, which is
  // true and is what the report is for.
  const code = await Library.update(scope(ctx), id, cleanLibraryCode(merged));
  return code ? { code } : { error: "notfound" };
}

/**
 * DELETE ONE, and only one nobody has used.
 *
 * A CODE IN USE IS RETIRED, NOT DELETED — `archived`, through the edit above.
 * Deleting one a project names would not break the project (the code is a
 * copied string, so the budget keeps working), which is precisely the danger:
 * nothing would fail, the code would silently become drift on every job that
 * holds it, and the studio would lose the only record of what it once meant.
 *
 * The refusal names the COUNT, so the screen can say how many projects would be
 * orphaned rather than a bare "no" — the courtesy the locations and departments
 * routes beside this one already extend.
 */
export async function removeCostCode(ctx: MasterContext, id: string) {
  const denied = requirePermission(ctx.access, "administration.master.delete");
  if (denied) return denied;

  const rows = await Library.find(scope(ctx));
  const row = rows.find((r) => r.id === id);
  if (!row) return { error: "notfound" };

  if (ctx.projectsListSection) {
    const used = await ProjectCosts.find({ studio: ctx.studio, section: ctx.projectsListSection });
    const projects = new Set(
      used.filter((c) => str(c.code, 24).toLowerCase() === str(row.code, 24).toLowerCase())
        .map((c) => str(c.projectId, 60)));
    if (projects.size) return { error: "in-use", projects: projects.size };
  }

  const gone = await Library.remove(scope(ctx), id);
  return gone ? { ok: true } : { error: "notfound" };
}
