import { route, refused } from "@/platform/http/route";
import { projectsContext } from "@/modules/projects/projects";
import {
  listSiteReports, createSiteReport, editSiteReport, submitSiteReport,
} from "@/modules/projects/siteReports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = {
  auth: "studio", context: projectsContext, body: true,
  name: "projects-reports",
};

export const GET = route({ ...spec, body: false }, async (projects) => {
  // SCOPED TO ONE PROJECT WHEN ASKED, because the diary's gaps only mean
  // something against a single site's run of days — a gap across every project
  // at once is just the days nobody built anything.
  const projectId = new URL(projects.request.url).searchParams.get("projectId") || "";
  const result = await listSiteReports(projects, projectId);
  if (refused(result)) return result;
  return {
    ok: true,
    reports: result.reports,
    diary: result.diary,
    asOf: result.asOf,
    causes: result.causes,
    canCreate: result.canCreate,
    canEdit: result.canEdit,
  };
});

export const POST = route(spec, async (projects) => {
  const result = await createSiteReport(projects, projects.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, report: result.report } };
});

export const PUT = route(spec, async (projects) => {
  if (!projects.body.id) return { error: "missing" };
  const id = String(projects.body.id);

  // SUBMITTING IS ITS OWN BRANCH AND ITS OWN ACT. It can never be reached by
  // editing a status — the shape that let a rejected change order approve
  // itself was exactly an answer routed through a generic write.
  if (projects.body.action === "submit") {
    const done = await submitSiteReport(projects, id);
    if (refused(done)) return done;
    return { ok: true, report: done.report };
  }

  const result = await editSiteReport(projects, id, projects.body);
  if (refused(result)) return result;
  return { ok: true, report: result.report };
});
