import { route, refused } from "@/platform/http/route";
import { projectsContext } from "@/modules/projects/projects";
import {
  listInspections, createInspection, recordInspectionResult, updateInspection,
} from "@/modules/projects/inspections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// FILED UNDER PROJECTS, AND THAT IS TEMPORARY. An inspection belongs to Quality
// & HSE by subject — an ITP hold point, a snag — but that section is in
// NO_SCREEN_YET and holds no rights by design, and a right nothing can exercise
// is a bug (invariant 16). The blueprint puts this work in project execution
// either way, so it sits here until Quality has a screen, and moves then.
const spec = { auth: "studio", context: projectsContext, body: true, name: "projects-inspections" };

export const GET = route({ ...spec, body: false }, async (projects) => {
  const result = await listInspections(projects);
  if (refused(result)) return result;
  return { ok: true, inspections: result.inspections };
});

export const POST = route(spec, async (projects) => {
  const result = await createInspection(projects, projects.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, inspection: result.inspection } };
});

export const PUT = route(spec, async (projects) => {
  if (!projects.body.id) return { error: "missing" };
  const result = await updateInspection(projects, String(projects.body.id), projects.body);
  if (refused(result)) return result;
  return { ok: true, inspection: result.inspection };
});

// A RESULT IS RECORDED ONCE, so it is its own verb rather than a field on PUT.
// An inspection that passed and then passed differently is not an edit — it is
// a second inspection, which is why the service refuses to overwrite one.
export const PATCH = route(spec, async (projects) => {
  const id = String(projects.body.id || "");
  if (!id) return { error: "missing" };
  const result = await recordInspectionResult(projects, id, projects.body);
  if (refused(result)) return result;
  return { ok: true, inspection: result.inspection };
});
