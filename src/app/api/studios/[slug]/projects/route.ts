import { route, refused } from "@/platform/http/route";
import {
  projectsContext, listProjects, approvedQuotations, projectPeople,
  listSlas, listOvertimes, overtimeDirectory, readProjectsSettings, saveProjectsSettings,
  openProject, updateProject, removeProject, PROJECT_STAGES,
} from "@/modules/projects/projects";
import { REQUIREMENT_WEIGHTS } from "@/modules/projects/projectSchedule";
import { listProjectSheets } from "@/modules/inventory/inventory";
import { can } from "@/platform/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// AUTH AND ERROR MAPPING BOTH LEAVE THIS FILE. What stays is the one thing the
// services cannot do for themselves — refusing a write at the door — because a
// permission check belongs beside the thing it protects, not in a wrapper.
//
// The hand-written ladder this replaces sent `not-approved` as 422 while
// technical sent the same name as 400. Neither was wrong on its own; having two
// answers to one question was.
const spec = { auth: "studio", context: projectsContext, body: true, name: "projects" };
const writeSpec = { ...spec, body: true };
const manageable = (c: { canManage: boolean }) => (c.canManage ? null : { error: "read-only" });

// One read for the whole Projects screen — the list, its SLA contracts, the
// overtime logged against it, and the directory the pickers need.
export const GET = route({ ...spec, body: false }, async (c) => {
  const [projects, quotations, people, slas, overtimes, directory, sheets] = await Promise.all([
    listProjects(c), approvedQuotations(c), projectPeople(c),
    listSlas(c), listOvertimes(c), overtimeDirectory(c),
    // THE SHEETS, composed by the module that owns them. Projects reads them —
    // a project's sheets are part of its own story — and never writes them from
    // here; the per-row columns Projects owns are written on Inventory's route,
    // which is where the shared record lives.
    listProjectSheets(c),
  ]);
  return {
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
  };
});

// Projects Settings — requirement weights, the default overtime department and
// the stage vocabulary.
export const PATCH = route(spec, async (c) => {
  if (!c.canManageSettings) return { error: "read-only" };

  const result = await saveProjectsSettings(c, c.body);
  if (refused(result)) return result;
  // readProjectsSettings reads only `.settings`, and this is the object that
  // was just written — not the section row it will next be read from.
  return { ok: true, settings: readProjectsSettings({ settings: result.settings }) };
});

export const POST = route(writeSpec, async (c) => {
  const refusal = manageable(c);
  if (refusal) return refusal;

  const result = await openProject(c, c.body);
  if (refused(result)) return result;
  // The sheets travel back so the caller can say they were drawn up. Empty in
  // a studio with no Inventory section, which is not an error.
  return { status: 201, body: { ok: true, project: result.project, sheets: result.sheets } };
});

export const PUT = route(writeSpec, async (c) => {
  const refusal = manageable(c);
  if (refusal) return refusal;
  if (!c.body.id) return { error: "missing" };

  const result = await updateProject(c, c.body.id, c.body);
  if (refused(result)) return result;
  return { ok: true, project: result.project };
});

// THIS USED TO ANSWER 404 TO EVERY ERROR, so being refused for lack of
// permission was indistinguishable from the project not existing — the one
// answer that tells a client to stop asking rather than to go and ask for
// access. removeProject only returns `notfound`, so the table gives the same
// 404 for the real case and the honest status for everything else.
export const DELETE = route(writeSpec, async (c) => {
  const refusal = manageable(c);
  if (refusal) return refusal;
  if (!c.body.id) return { error: "missing" };

  const result = await removeProject(c, c.body.id);
  if (refused(result)) return result;
  return { ok: true };
});
