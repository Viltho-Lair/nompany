import { getCollection, updateItem, deleteItem } from "@/lib/db";
import { requireManage, forbidden } from "@/lib/session";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EDITABLE = ["projectId", "projectName", "taskName", "typeId", "assigneeIds", "start", "end"];

export async function PUT(request, { params }) {
  const actor = await requireManage("operations");
  if (!actor) return forbidden();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const patch = {};
  for (const f of EDITABLE) {
    if (!(f in body)) continue;
    if (f === "assigneeIds") patch[f] = Array.isArray(body[f]) ? [...new Set(body[f].map(String).filter(Boolean))].slice(0, 20) : [];
    else patch[f] = String(body[f] || "").slice(0, 200);
  }
  const updated = await updateItem("workTasks", id, patch);
  if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
  logActivity({ actor, verb: "updated", sectionKey: "operations", entityType: "workTasks", entityId: id, label: `Work task “${updated.taskName || ""}” updated`.trim(), href: "/studio/operations" }).catch(() => {});
  return Response.json(updated);
}

export async function DELETE(request, { params }) {
  const actor = await requireManage("operations");
  if (!actor) return forbidden();
  const { id } = await params;
  const ok = await deleteItem("workTasks", id);
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
  logActivity({ actor, verb: "deleted", sectionKey: "operations", entityType: "workTasks", entityId: id, label: "A work task was removed", href: "/studio/operations" }).catch(() => {});
  return Response.json({ ok: true });
}
