import { route, refused } from "@/platform/http/route";
import { requirePermission } from "@/platform/access";
import { projectsContext } from "@/modules/projects/projects";
import {
  listProjectCosts, addProjectCost, editProjectCost, removeProjectCost, seedCostsFromBill,
} from "@/modules/projects/costs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// `name` IS THE SECTION KEY THE AUDIT TRAIL READS BY. A cost breakdown lives
// with the project it belongs to, so it names the project list's own section.
const spec = { auth: "studio", context: projectsContext, body: true, name: "projects-list" };

export const GET = route({ ...spec, body: false }, async (projects) => {
  const projectId = new URL(projects.request.url).searchParams.get("projectId") || "";
  const result = await listProjectCosts(projects, projectId);
  if (refused(result)) return result;

  return {
    ok: true,
    project: result.project,
    codes: result.codes,
    costing: result.costing,
    // THE RIGHTS TRAVEL WITH THE ANSWER, so the screen draws a control only
    // where the service would accept what is behind it.
    canCreate: !requirePermission(projects.access, "projects.costs.create"),
    canEdit: !requirePermission(projects.access, "projects.costs.edit"),
    canDelete: !requirePermission(projects.access, "projects.costs.delete"),
    // OFFERED ONLY WHERE THERE IS A BILL TO PROPOSE FROM, and only while the
    // breakdown is empty — seeding is a starting point, not a merge.
    canSeedFromBill: Boolean(result.project.tenderId) && result.codes.length === 0
      && !requirePermission(projects.access, "projects.costs.create"),
  };
});

export const POST = route(spec, async (projects) => {
  // SEEDING IS ITS OWN VERB, not a create with extra keys — the same decision
  // the pack made about superseding. It writes a row per bill group and refuses
  // once anything exists, which is nothing like adding one code.
  if (projects.body.seedFromBill) {
    const seeded = await seedCostsFromBill(projects, String(projects.body.projectId || ""));
    if (refused(seeded)) return seeded;
    return { status: 201, body: { ok: true, codes: seeded.codes } };
  }

  const result = await addProjectCost(projects, projects.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, cost: result.cost } };
});

export const PUT = route(spec, async (projects) => {
  if (!projects.body.id) return { error: "missing" };
  const result = await editProjectCost(projects, String(projects.body.id), projects.body);
  if (refused(result)) return result;
  return { ok: true, cost: result.cost };
});

export const DELETE = route(spec, async (projects) => {
  if (!projects.body.id) return { error: "missing" };
  const result = await removeProjectCost(projects, String(projects.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
