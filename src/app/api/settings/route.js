import { getSettings, updateSettings, getCollection } from "@/lib/db";
import { requireManage, forbidden } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { resolveTaskAssignees } from "@/lib/tasks";
import { notifyUsers } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getSettings());
}

export async function PUT(request) {
  const actor = await requireManage("settings");
  if (!actor) return forbidden();
  const patch = await request.json();
  const prev = await getSettings();
  const updated = await updateSettings(patch);
  logActivity({ actor, verb: "updated", sectionKey: "settings", entityType: "settings", entityId: "settings", label: "Company Info updated", href: "/studio/settings" }).catch(() => {});

  // Task settings changed → notify anyone NEWLY appointed to a task type about
  // that type's currently-open tasks (so they "own" existing work immediately).
  if (patch.taskAssignees && typeof patch.taskAssignees === "object") {
    try {
      const tasks = await getCollection("tasks");
      for (const type of Object.keys(patch.taskAssignees)) {
        const before = resolveTaskAssignees({ type }, prev).assigneeIds;
        const after = resolveTaskAssignees({ type }, updated).assigneeIds;
        const added = after.filter((uid) => !before.includes(uid));
        if (!added.length) continue;
        for (const t of tasks.filter((x) => x.type === type && !x.done)) {
          await notifyUsers({ actor, userIds: added, kind: "task-appointed", entityType: "tasks", entityId: t.id, label: `You were appointed to: ${t.name}`, href: "/studio/tasks", settings: updated });
        }
      }
    } catch { /* best-effort */ }
  }
  return Response.json(updated);
}
