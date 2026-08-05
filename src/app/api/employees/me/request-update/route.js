import { getCollection, createItem, getSettings } from "@/lib/db";
import { currentUser, unauthorized } from "@/lib/session";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST — an employee asks HR/the assigned handler to update their information
// (their ID expiry date) after they replace their ID image. This raises an
// "id-update" task addressed to the people picked in Task Management.
export async function POST() {
  const actor = await currentUser();
  if (!actor) return unauthorized();

  const employees = await getCollection("employees");
  const mine = employees.find((e) => e.userId === actor.id) || null;
  if (!mine) return Response.json({ error: "No employee profile is linked to your account." }, { status: 404 });

  const settings = await getSettings();
  const assigneeIds = ((settings.taskManagers && settings.taskManagers["id-update"]) || []).filter(Boolean);
  if (!assigneeIds.length) return Response.json({ error: "No one is assigned to handle information updates yet. Ask an admin to set it in Tasks → settings." }, { status: 400 });

  // One open request per employee at a time.
  const tasks = await getCollection("tasks");
  if (tasks.some((t) => t.type === "id-update" && t.employeeId === mine.id && !t.done)) {
    return Response.json({ error: "You already have an information update request in progress." }, { status: 409 });
  }

  const task = await createItem("tasks", {
    type: "id-update",
    name: `Information update · ${mine.fullName || "employee"}`,
    departments: [],
    assigneeIds,
    employeeId: mine.id,
    employeeName: mine.fullName || "",
    employeeUserId: actor.id,
    currentIdExpiry: mine.idExpiry || "",
    done: false,
    createdBy: actor.id,
    createdByLabel: actor.fullName || actor.userId,
    createdAt: new Date().toISOString(),
  });
  logActivity({ actor, verb: "created", sectionKey: "tasks", entityType: "tasks", entityId: task.id, label: `${mine.fullName || "An employee"} requested an information update`, href: "/studio/tasks" }).catch(() => {});
  return Response.json(task, { status: 201 });
}
