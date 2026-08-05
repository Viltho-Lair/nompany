import { updateItem, deleteItem, getCollection } from "@/lib/db";
import { deleteMedia, expireMedia } from "@/lib/media";
import { requireManage, forbidden } from "@/lib/session";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEVEN_DAYS = 7 * 24 * 60 * 60;

// Admin: update an application's status (e.g. mark rejected).
export async function PUT(request, { params }) {
  const actor = await requireManage("applications");
  if (!actor) return forbidden();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const patch = {};
  if (body.status) patch.status = body.status;
  if (body.status === "rejected") patch.rejectedAt = new Date().toISOString();

  const updated = await updateItem("applications", id, patch);
  if (!updated) return Response.json({ error: "Not found" }, { status: 404 });

  if (patch.status) {
    logActivity({ actor, verb: "status", sectionKey: "applications", entityType: "applications", entityId: id, label: `${updated.name}'s application is now ${patch.status}`, href: "/studio/applications" }).catch(() => {});
  }

  // On rejection the record lingers 7 days for review; expire the CV bytes so
  // they are gone by then even if the record is never revisited.
  if (body.status === "rejected" && updated.cvId) {
    await expireMedia(updated.cvId, SEVEN_DAYS);
  }
  return Response.json(updated);
}

// Admin: delete an application and its CV immediately.
export async function DELETE(request, { params }) {
  if (!(await requireManage("applications"))) return forbidden();
  const { id } = await params;

  const app = (await getCollection("applications")).find((a) => a.id === id);
  if (app?.cvId) await deleteMedia(app.cvId);

  const ok = await deleteItem("applications", id);
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}
