import { currentUser } from "@/lib/identity";
import {
  projectsContext, listProjects, approvedQuotations, projectPeople,
  listSlas, listOvertimes, overtimeDirectory, readProjectsSettings, saveProjectsSettings,
  openProject, updateProject, removeProject, PROJECT_STAGES,
} from "@/lib/projects";
import { REQUIREMENT_WEIGHTS } from "@/lib/projectSchedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function context(paramsPromise, { write } = {}) {
  const user = await currentUser();
  if (!user) return { fail: Response.json({ error: "unauthorized" }, { status: 401 }) };
  const { slug } = await paramsPromise;
  const ctx = await projectsContext(user, slug);
  if (ctx.error) {
    const status = ctx.error === "notfound" || ctx.error === "no-section" ? 404 : 403;
    return { fail: Response.json({ error: ctx.error }, { status }) };
  }
  if (write && !ctx.canManage) return { fail: Response.json({ error: "read-only" }, { status: 403 }) };
  return ctx;
}
const body = async (r) => { try { return await r.json(); } catch { return {}; } };

// One read for the whole Projects screen — the list, its SLA contracts, the
// overtime logged against it, and the directory the pickers need.
export async function GET(request, ctx) {
  const c = await context(ctx.params);
  if (c.fail) return c.fail;

  const [projects, quotations, people, slas, overtimes, directory] = await Promise.all([
    listProjects(c), approvedQuotations(c), projectPeople(c),
    listSlas(c), listOvertimes(c), overtimeDirectory(c),
  ]);
  return Response.json({
    canManage: c.canManage,
    canManageList: c.canManageList,
    canManageSla: c.canManageSla,
    canManageOvertimes: c.canManageOvertimes,
    canManageSettings: c.canManageSettings,
    nav: c.nav,
    projects,
    // Only approved, not-yet-delivering quotations can open a project.
    approvedQuotations: quotations,
    people,
    slas,
    overtimes,
    directory,
    settings: readProjectsSettings(c.settingsSection),
    vocabulary: { stages: PROJECT_STAGES, requirementWeights: REQUIREMENT_WEIGHTS },
  });
}

// Projects Settings — requirement weights, the default overtime department and
// the stage vocabulary.
export async function PATCH(request, ctx) {
  const c = await context(ctx.params);
  if (c.fail) return c.fail;
  if (!c.canManageSettings) return Response.json({ error: "read-only" }, { status: 403 });

  const result = await saveProjectsSettings(c, await body(request));
  if (result.error) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true, settings: readProjectsSettings({ settings: result.settings }) });
}

export async function POST(request, ctx) {
  const c = await context(ctx.params, { write: true });
  if (c.fail) return c.fail;

  const result = await openProject(c, await body(request));
  if (result.error) {
    const status = result.error === "already" ? 409
      : result.error === "quotation" || result.error === "no-technical" ? 404
      : result.error === "not-approved" ? 422 : 400;
    return Response.json({ error: result.error }, { status });
  }
  return Response.json({ ok: true, project: result.project }, { status: 201 });
}

export async function PUT(request, ctx) {
  const c = await context(ctx.params, { write: true });
  if (c.fail) return c.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });

  const result = await updateProject(c, b.id, b);
  if (result.error) return Response.json({ error: result.error }, { status: result.error === "notfound" ? 404 : 400 });
  return Response.json({ ok: true, project: result.project });
}

export async function DELETE(request, ctx) {
  const c = await context(ctx.params, { write: true });
  if (c.fail) return c.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });

  const result = await removeProject(c, b.id);
  if (result.error) return Response.json({ error: result.error }, { status: 404 });
  return Response.json({ ok: true });
}
