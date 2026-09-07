import { route, refused } from "@/platform/http/route";
import { projectsContext } from "@/modules/projects/projects";
import { listClosures, saveClosure, closeProject } from "@/modules/projects/closure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// NO NEW PERMISSION KEY. Closure IS a project's content, the way a variation is
// a contract's, so this answers to `projects.list` throughout.
const spec = {
  auth: "studio", context: projectsContext, body: true,
  name: "projects-closure",
};

export const GET = route({ ...spec, body: false }, async (projects) => {
  const projectId = new URL(projects.request.url).searchParams.get("projectId") || "";
  const result = await listClosures(projects, projectId);
  if (refused(result)) return result;
  return {
    ok: true,
    closures: result.closures,
    asOf: result.asOf,
    canEdit: result.canEdit,
  };
});

export const PUT = route(spec, async (projects) => {
  if (!projects.body.id) return { error: "missing" };
  const id = String(projects.body.id);

  // CLOSING IS ITS OWN BRANCH AND ITS OWN ACT. It is final, and a final state
  // reachable by writing a date through the edit path is the shape that let a
  // rejected change order approve itself.
  if (projects.body.action === "close") {
    const done = await closeProject(projects, id);
    if (refused(done)) return done;
    return { ok: true, project: done.project };
  }

  const result = await saveClosure(projects, id, projects.body);
  if (refused(result)) return result;
  return { ok: true, project: result.project };
});
