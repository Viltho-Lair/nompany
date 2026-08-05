import crypto from "crypto";
import { getCollection, updateItem, deleteItem } from "@/lib/db";
import { currentUser, requireManage, forbidden, unauthorized } from "@/lib/session";
import { ADMIN_TAG } from "@/lib/authConstants";
import { RFQ_STATUSES, canEditRfq } from "@/lib/rfqs";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EDITABLE = ["assignedToTechnical"];

async function loadRfq(id) {
  const rows = await getCollection("rfqs");
  return rows.find((r) => r.id === id) || null;
}

export async function PUT(request, { params }) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  if (!canEditRfq(actor)) return forbidden();
  if (!(await requireManage("technical-rfq"))) return forbidden(); // view-only can't edit
  const { id } = await params;
  const existing = await loadRfq(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const patch = {};
  for (const f of EDITABLE) if (f in body) patch[f] = String(body[f] ?? "");
  if (typeof body.status === "string" && body.status !== existing.status) {
    if (!RFQ_STATUSES.includes(body.status)) return Response.json({ error: "Invalid status" }, { status: 400 });
    patch.status = body.status;
  }
  if (typeof body.newComment === "string" && body.newComment.trim()) {
    const comments = Array.isArray(existing.comments) ? existing.comments : [];
    patch.comments = [
      ...comments,
      {
        id: crypto.randomUUID(),
        text: body.newComment.trim(),
        authorId: actor.id,
        authorUserId: actor.userId,
        createdAt: new Date().toISOString(),
      },
    ];
  }
  const updated = await updateItem("rfqs", id, patch);
  if (patch.status) {
    await logActivity({ actor, verb: "status", sectionKey: "technical-rfq", entityType: "rfqs", entityId: id, label: `${updated.reference} is now ${patch.status}`, href: "/studio/technical/rfq" }).catch(() => {});
  }
  if (patch.comments) {
    await logActivity({ actor, verb: "commented", sectionKey: "technical-rfq", entityType: "rfqs", entityId: id, label: `New comment on ${updated.reference}`, href: "/studio/technical/rfq" }).catch(() => {});
  }
  return Response.json(updated);
}

export async function DELETE(request, { params }) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const tags = Array.isArray(actor.tags) ? actor.tags : [];
  if (!tags.includes(ADMIN_TAG)) return forbidden();
  const { id } = await params;
  const ok = await deleteItem("rfqs", id);
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}
