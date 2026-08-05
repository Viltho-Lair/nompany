import { getCollection, createItem } from "@/lib/db";
import { requireSection, requireManage, forbidden } from "@/lib/session";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Scheduled work tasks shown on the Operations calendar. Each carries a project,
// a task name, a legend type (colour), the assigned employees, and a start/end
// datetime. Gated by the Operations section.
function sanitize(body) {
  return {
    projectId: String(body.projectId || ""),
    projectName: String(body.projectName || "").slice(0, 200),
    taskName: String(body.taskName || "").slice(0, 200),
    typeId: String(body.typeId || ""),
    assigneeIds: Array.isArray(body.assigneeIds) ? [...new Set(body.assigneeIds.map(String).filter(Boolean))].slice(0, 20) : [],
    start: String(body.start || ""),
    end: String(body.end || ""),
  };
}

export async function GET() {
  const actor = await requireSection("operations");
  if (!actor) return forbidden();
  const rows = await getCollection("workTasks");
  rows.sort((a, b) => (a.start || "").localeCompare(b.start || ""));
  return Response.json(rows);
}

export async function POST(request) {
  const actor = await requireManage("operations");
  if (!actor) return forbidden();
  const body = await request.json().catch(() => ({}));
  const rec = sanitize(body);
  if (!rec.taskName) return Response.json({ error: "A task name is required." }, { status: 400 });
  if (!rec.start || !rec.end) return Response.json({ error: "Start and end times are required." }, { status: 400 });
  const now = new Date().toISOString();
  const task = await createItem("workTasks", { ...rec, createdBy: actor.id, createdByLabel: actor.fullName || actor.userId, createdAt: now });
  logActivity({ actor, verb: "created", sectionKey: "operations", entityType: "workTasks", entityId: task.id, label: `Work task “${task.taskName}” scheduled`, href: "/studio/operations" }).catch(() => {});
  return Response.json(task, { status: 201 });
}
