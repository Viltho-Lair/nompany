import { getCollection, updateItem, deleteItem } from "@/lib/db";
import { requireManage, forbidden } from "@/lib/session";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROWS = 28;
const LOCK_MS = 15 * 60 * 1000; // a locked sheet can't be unlocked for 15 minutes

function sanitizeRows(rows) {
  const arr = Array.isArray(rows) ? rows : [];
  const out = [];
  for (let i = 0; i < ROWS; i++) {
    const r = arr[i] || {};
    out.push({
      invoiceDate: String(r.invoiceDate || ""),
      category: String(r.category || "").slice(0, 120),
      description: String(r.description || "").slice(0, 500),
      paidBy: String(r.paidBy || "").slice(0, 64),
      projectId: String(r.projectId || "").slice(0, 64),
      amount: r.amount === "" || r.amount == null ? "" : (Number(r.amount) || 0),
    });
  }
  return out;
}

// Only the sheet's owner (or admin) may edit/delete it — cash sheets are per-user.
async function ownSheet(actor, id) {
  const sheet = (await getCollection("cashSheets")).find((s) => s.id === id);
  if (!sheet) return { error: "notfound" };
  const isAdmin = Array.isArray(actor.tags) && actor.tags.includes("admin");
  if (sheet.createdBy !== actor.id && !isAdmin) return { error: "forbidden" };
  return { sheet };
}

export async function PUT(request, { params }) {
  const actor = await requireManage("cash");
  if (!actor) return forbidden();
  const { id } = await params;
  const { sheet, error } = await ownSheet(actor, id);
  if (error === "notfound") return Response.json({ error: "Not found" }, { status: 404 });
  if (error === "forbidden") return forbidden();

  const body = await request.json().catch(() => ({}));
  const now = new Date().toISOString();

  // Lock / unlock. A locked sheet can't be unlocked until 15 minutes have passed.
  if (body.action === "lock") {
    const updated = await updateItem("cashSheets", id, { locked: true, lockedAt: now, updatedAt: now });
    logActivity({ actor, verb: "status", sectionKey: "cash", entityType: "cashSheets", entityId: id, label: `Cash ${sheet.name || "sheet"} locked`, href: "/studio/finance/cash" }).catch(() => {});
    return Response.json(updated);
  }
  if (body.action === "unlock") {
    const elapsed = sheet.lockedAt ? Date.now() - new Date(sheet.lockedAt).getTime() : LOCK_MS;
    if (sheet.locked && elapsed < LOCK_MS) {
      return Response.json({ error: "This sheet is locked and can't be unlocked yet.", retryAfterMs: LOCK_MS - elapsed }, { status: 423 });
    }
    const updated = await updateItem("cashSheets", id, { locked: false, updatedAt: now });
    logActivity({ actor, verb: "status", sectionKey: "cash", entityType: "cashSheets", entityId: id, label: `Cash ${sheet.name || "sheet"} unlocked`, href: "/studio/finance/cash" }).catch(() => {});
    return Response.json(updated);
  }

  // Content edits are blocked while the sheet is locked.
  if (sheet.locked) return Response.json({ error: "This sheet is locked and can't be edited." }, { status: 423 });

  const patch = { updatedAt: now };
  if ("rows" in body) patch.rows = sanitizeRows(body.rows);
  if ("includeAllProjects" in body) patch.includeAllProjects = !!body.includeAllProjects;
  if ("notes" in body) patch.notes = String(body.notes || "").slice(0, 2000);
  if ("origin" in body) patch.origin = body.origin === "" || body.origin == null ? "" : (Number(body.origin) || 0);
  if ("extraCash" in body) patch.extraCash = body.extraCash === "" || body.extraCash == null ? "" : (Number(body.extraCash) || 0);

  const updated = await updateItem("cashSheets", id, patch);
  logActivity({ actor, verb: "updated", sectionKey: "cash", entityType: "cashSheets", entityId: id, label: `Cash ${sheet.name || "sheet"} updated`, href: "/studio/finance/cash" }).catch(() => {});
  return Response.json(updated);
}

export async function DELETE(request, { params }) {
  const actor = await requireManage("cash");
  if (!actor) return forbidden();
  const { id } = await params;
  const { sheet, error } = await ownSheet(actor, id);
  if (error === "notfound") return Response.json({ error: "Not found" }, { status: 404 });
  if (error === "forbidden") return forbidden();
  await deleteItem("cashSheets", id);
  logActivity({ actor, verb: "deleted", sectionKey: "cash", entityType: "cashSheets", entityId: id, label: `Cash ${sheet.name || "sheet"} deleted`, href: "/studio/finance/cash" }).catch(() => {});
  return Response.json({ ok: true });
}
