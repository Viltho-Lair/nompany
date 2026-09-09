import { route, refused } from "@/platform/http/route";
import { requirePermission } from "@/platform/access";
import { projectsContext } from "@/modules/projects/projects";
import {
  listProjectCosts, addProjectCost, editProjectCost, removeProjectCost, seedCostsFromBill,
  seedCostsFromLibrary, libraryHasCodes,
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
    // THE CLOCK TRAVELS WITH THE ANSWER, so "how much of the schedule has gone"
    // is measured from one instant rather than from whenever the screen
    // rendered.
    asOf: result.asOf,
    earned: result.earned,
    // THE RIGHTS TRAVEL WITH THE ANSWER, so the screen draws a control only
    // where the service would accept what is behind it.
    canCreate: !requirePermission(projects.access, "projects.costs.create"),
    canEdit: !requirePermission(projects.access, "projects.costs.edit"),
    canDelete: !requirePermission(projects.access, "projects.costs.delete"),
    // OFFERED ONLY WHERE THERE IS A BILL TO PROPOSE FROM, and only while the
    // breakdown is empty — seeding is a starting point, not a merge.
    canSeedFromBill: Boolean(result.project.tenderId) && result.codes.length === 0
      && !requirePermission(projects.access, "projects.costs.create"),
    // THE SECOND SOURCE, and the library is READ only when it could be offered
    // — a breakdown with a single code in it never asks. Both may be true at
    // once on a handed-over project, and that is the choice worth having: the
    // bill is how the work was sold, the library is how the studio buys.
    canSeedFromLibrary: result.codes.length === 0
      && !requirePermission(projects.access, "projects.costs.create")
      && await libraryHasCodes(projects),
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
  // THE SECOND SOURCE, and it is a second flag rather than a `source` string
  // for one reason: the two write different things. The bill carries what each
  // group was SOLD for and seeds a budget; the library carries a vocabulary and
  // seeds nought. Collapsing them into one parameter would hide that.
  if (projects.body.seedFromLibrary) {
    const seeded = await seedCostsFromLibrary(projects, String(projects.body.projectId || ""));
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
