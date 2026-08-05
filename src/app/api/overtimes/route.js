import { getCollection, createItem, getSettings } from "@/lib/db";
import { currentUser, requireSection, requireManage, forbidden, unauthorized } from "@/lib/session";
import { hhmmToHours, normalizeSchedule } from "@/lib/operations";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Overtime hours per user per project. GET returns the records plus the
// supporting directory (projects, users-by-department) so the page needs only
// the projects-overtimes section to work.
function hoursBetween(from, to) {
  const a = hhmmToHours(from, NaN), b = hhmmToHours(to, NaN);
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return 0;
  return Math.round((b - a) * 100) / 100;
}

export async function GET() {
  const actor = await requireSection("projects-overtimes");
  if (!actor) return forbidden();
  const [items, projects, employees, departments, users, workTasks, settings] = await Promise.all([
    getCollection("overtimes"),
    getCollection("projects"),
    getCollection("employees"),
    getCollection("departments"),
    getCollection("users"),
    getCollection("workTasks"),
    getSettings(),
  ]);
  const usersById = Object.fromEntries(users.map((u) => [u.id, u]));
  const deptName = Object.fromEntries(departments.map((d) => [d.id, d.name || ""]));
  const proj = projects
    .map((p) => ({ id: p.id, title: p.title_en || p.title_ar || "Untitled", projectNumber: p.projectNumber || "", ownerId: p.ownerId || "" }))
    .sort((a, b) => a.title.localeCompare(b.title));
  const dir = employees
    .map((e) => ({ id: e.id, fullName: e.fullName || usersById[e.userId]?.fullName || "—", departmentId: e.departmentId || "", department: deptName[e.departmentId] || "" }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
  const depts = departments.map((d) => ({ id: d.id, name: d.name || "" })).sort((a, b) => a.name.localeCompare(b.name));
  // Minimal work-task windows (for the Add-OT busy guard) + the base work
  // schedule (for the outside-hours "From" default) + default OT department.
  const tasks = workTasks.map((t) => ({ start: t.start || "", end: t.end || "", assigneeIds: Array.isArray(t.assigneeIds) ? t.assigneeIds : [] }));
  return Response.json({ items, projects: proj, users: dir, departments: depts, meId: actor.id, workTasks: tasks, workSchedule: normalizeSchedule(settings.workSchedule), defaultDept: settings.overtimeDefaultDept || "" });
}

// Create one OT record per selected user.
export async function POST(request) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  if (!(await requireManage("projects-overtimes"))) return forbidden();
  const body = await request.json().catch(() => ({}));
  const projectId = String(body.projectId || "");
  const date = String(body.date || "").trim();
  const from = String(body.from || "").trim();
  const to = String(body.to || "").trim();
  const userIds = Array.isArray(body.userIds) ? [...new Set(body.userIds.map(String).filter(Boolean))] : [];
  if (!projectId) return Response.json({ error: "Select a project." }, { status: 400 });
  if (!date) return Response.json({ error: "A date is required." }, { status: 400 });
  const hours = hoursBetween(from, to);
  if (hours <= 0) return Response.json({ error: "End time must be after start time." }, { status: 400 });
  if (!userIds.length) return Response.json({ error: "Select at least one user." }, { status: 400 });

  const [projects, employees, departments] = await Promise.all([getCollection("projects"), getCollection("employees"), getCollection("departments")]);
  const project = projects.find((p) => p.id === projectId);
  if (!project) return Response.json({ error: "Project not found." }, { status: 404 });
  const empById = Object.fromEntries(employees.map((e) => [e.id, e]));
  const deptName = Object.fromEntries(departments.map((d) => [d.id, d.name || ""]));
  const now = new Date().toISOString();
  const created = [];
  for (const uid of userIds) {
    const emp = empById[uid];
    if (!emp) continue;
    const rec = await createItem("overtimes", {
      projectId, projectName: project.title_en || project.title_ar || "Untitled",
      userId: uid, userName: emp.fullName || "—",
      departmentId: emp.departmentId || "", department: deptName[emp.departmentId] || "",
      date, from, to, hours,
      createdBy: actor.id, createdByLabel: actor.fullName || actor.userId, createdAt: now,
    });
    created.push(rec);
  }
  logActivity({ actor, verb: "created", sectionKey: "projects-overtimes", entityType: "overtimes", entityId: created[0]?.id || "", label: `Overtime added for ${created.length} user${created.length === 1 ? "" : "s"} on ${project.title_en || "a project"}`, href: "/studio/projects/overtime" }).catch(() => {});
  return Response.json({ ok: true, created }, { status: 201 });
}
