import { currentUser } from "@/lib/identity";
import {
  projectsContext, listProjects, approvedQuotations, projectPeople,
  listSlas, listOvertimes, overtimeDirectory, readProjectsSettings, saveProjectsSettings,
  openProject, updateProject, removeProject, PROJECT_STAGES,
} from "@/lib/projects";
import { REQUIREMENT_WEIGHTS } from "@/lib/projectSchedule";
import { listProjectSheets } from "@/lib/inventory";
import { can } from "@/lib/access";

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

  const [projects, quotations, people, slas, overtimes, directory, sheets] = await Promise.all([
    listProjects(c), approvedQuotations(c), projectPeople(c),
    listSlas(c), listOvertimes(c), overtimeDirectory(c),
    // THE SHEETS, composed by the module that owns them. Projects reads them —
    // a project's sheets are part of its own story — and never writes them from
    // here; the per-row columns Projects owns are written on Inventory's route,
    // which is where the shared record lives.
    listProjectSheets(c),
  ]);
  return Response.json({
    canManage: c.canManage,
    // Whether the module's OWN screen may be opened. The dashboard summarises
    // everything underneath it, so it is withheld on a right of its own.
    canViewDashboard: c.canViewDashboard,
    canManageList: c.canManageList,
    // Whether this viewer may write INVENTORY'S columns on a shared sheet row.
    // Asked here because the sheet viewer opens from Projects but writes to
    // Inventory's route, and a control nobody may use should render as text
    // rather than as a disabled dropdown on every line.
    canWriteInventoryColumns: can(c.access, "inventory.sheets.edit"),
    canManageSla: c.canManageSla,
    canManageOvertimes: c.canManageOvertimes,
    canManageSettings: c.canManageSettings,
    nav: c.nav,
    // Manage per section key, so each screen can ask about itself rather
    // than being handed the parent section's answer.
    manage: c.manage,
    projects,
    sheets,
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
  if (result.error) {
    // A refusal is not a malformed request. 403 so a client can tell "you may
    // not" from "you sent nonsense" — they need different handling.
    const status = result.error === "forbidden" ? 403 : result.error === "unknown-permission" ? 500 : 400;
    return Response.json({ error: result.error }, { status });
  }
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
  // The sheets travel back so the caller can say they were drawn up. Empty in
  // a studio with no Inventory section, which is not an error.
  return Response.json({ ok: true, project: result.project, sheets: result.sheets }, { status: 201 });
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
