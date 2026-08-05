import crypto from "crypto";
import { getCollection, updateItem, deleteItem } from "@/lib/db";
import { currentUser, requireManage, forbidden, unauthorized } from "@/lib/session";
import { ADMIN_TAG } from "@/lib/auth";
import { QUOTATION_STATUSES, canChangeStatus, canEditFields } from "@/lib/quotations";
import { computeSheet } from "@/lib/quotationSheet";
import { projectSizeFromValue } from "@/lib/projectKpis";
import { logActivity } from "@/lib/activity";
import { notifyUsers, notifyMentions } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadQuotation(id) {
  const rows = await getCollection("quotations");
  return rows.find((q) => q.id === id) || null;
}

// PUT accepts a merge of field updates + status change + a new comment
// (`newComment`). Each mutation is auth-gated separately:
//   • status change → canChangeStatus (admin | Technical | creator)
//   • other fields  → canEditFields (admin | Technical)
//   • new comment   → any Technical/admin user
// createdAt / createdBy are immutable; ignored if present in the body.
export async function PUT(request, { params }) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  if (!(await requireManage("technical-quotations"))) return forbidden(); // view-only can't edit
  const { id } = await params;
  const existing = await loadQuotation(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const patch = {};

  // A LOCKED quotation is permanently view-only — reject every edit. (The lock
  // itself is set below, allowed only while still unlocked.)
  if (existing.locked) {
    return Response.json({ error: "This quotation is locked and can no longer be modified." }, { status: 403 });
  }

  // Lock the quotation permanently (Completed quotations only). Once set it can
  // never be edited again — there is no unlock.
  if (body.locked === true) {
    if (!canEditFields(actor)) return forbidden();
    if (existing.status !== "Completed") {
      return Response.json({ error: "Only a completed quotation can be locked." }, { status: 400 });
    }
    patch.locked = true;
    patch.lockedAt = new Date().toISOString();
  }

  // Status change
  if (typeof body.status === "string" && body.status !== existing.status) {
    if (!QUOTATION_STATUSES.includes(body.status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }
    if (!canChangeStatus(actor, existing)) return forbidden();
    patch.status = body.status;
    patch.completedAt = body.status === "Completed" ? new Date().toISOString() : null;
  }

  // The quotation number is LOCKED once assigned — it can never be changed
  // (guarantees numbers stay unique and can't be mis-reassigned by an
  // accidental edit). Reject any attempt to change it; an unchanged value is
  // fine (the edit form still submits it).
  if ("number" in body && String(body.number).trim() !== String(existing.number || "")) {
    return Response.json({ error: "The quotation number is locked once assigned and cannot be changed." }, { status: 400 });
  }

  // Field edits (description / handledBy only).
  const editFields = ["description", "handledBy"];
  const hasEdit = editFields.some((f) => f in body && String(body[f]).trim() !== String(existing[f] || ""));
  if (hasEdit) {
    if (!canEditFields(actor)) return forbidden();
    for (const f of editFields) {
      if (f in body) patch[f] = String(body[f]).trim();
    }
  }

  // The quotation "sheet" — the itemised tables built in the full-screen
  // builder ({ itc, tables:[{ id, title, rows:[{ id, itemId, qty, margin }] }] }).
  // Persisted whole on each autosave. Only Technical/admin may edit it. We keep
  // the shape lean (item image/model/price are resolved live from the catalogue)
  // and store just enough to reconstruct the quote.
  if (body.sheet && typeof body.sheet === "object" && !Array.isArray(body.sheet)) {
    if (!canEditFields(actor)) return forbidden();
    const s = body.sheet;
    // Preserve an empty IT&C / discount ("" = not set) rather than coercing to 0.
    const itc = s.itc === "" || s.itc == null ? "" : (Number.isFinite(Number(s.itc)) ? Number(s.itc) : "");
    const discount = s.discount === "" || s.discount == null ? "" : (Number.isFinite(Number(s.discount)) ? Number(s.discount) : "");
    patch.sheet = {
      itc,
      discount,
      tables: Array.isArray(s.tables)
        ? s.tables.map((t) => ({
            id: String(t.id || crypto.randomUUID()),
            title: String(t.title || "").slice(0, 200),
            rows: Array.isArray(t.rows)
              ? t.rows.map((r) => ({
                  id: String(r.id || crypto.randomUUID()),
                  itemId: r.itemId ? String(r.itemId) : "",
                  qty: Number(r.qty) || 0,
                  margin: Number(r.margin) || 0,
                  discount: Number(r.discount) || 0,
                  free: !!r.free,
                }))
              : [],
          }))
        : [],
      updatedAt: new Date().toISOString(),
    };
  }

  // Append a comment (comments are additive; we never mutate historic ones).
  if (typeof body.newComment === "string" && body.newComment.trim()) {
    if (!canEditFields(actor)) return forbidden();
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

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await updateItem("quotations", id, patch);

  // Awaited sequentially — multiple writes in one request race against each
  // other on the shared JSON document if fired concurrently.
  if (patch.status) {
    await logActivity({ actor, verb: "status", sectionKey: "technical-quotations", entityType: "quotations", entityId: id, label: `${updated.number} is now ${patch.status}`, href: "/studio/technical/quotations" }).catch(() => {});
    // Also notify Sales when a quotation that traces back to their ticket
    // changes status (e.g. Completed) — that's exactly when they need to act.
    if (updated.fromTicketId) {
      await logActivity({ actor, verb: "status", sectionKey: "sales-list", entityType: "salesTickets", entityId: updated.fromTicketId, label: `Quotation ${updated.number} is now ${patch.status}`, href: "/studio/sales/tickets" }).catch(() => {});
    }
    // When a quotation is Completed, stamp its total (incl. VAT, after any grand
    // discount) onto the linked ticket as the auto "Value" — the latest
    // completed quotation always wins, and Value drives the ticket's project
    // size and the eventual project deal value.
    if (patch.status === "Completed" && updated.fromTicketId) {
      try {
        const invItems = await getCollection("inventoryItems");
        const invById = Object.fromEntries(invItems.map((i) => [i.id, i]));
        const c = computeSheet(updated.sheet, invById);
        const val = Math.round((c.discountProvided ? c.discountedTotal : c.totalInclVat) * 100) / 100;
        await updateItem("salesTickets", updated.fromTicketId, {
          value: val,
          projectSize: val > 0 ? projectSizeFromValue(val) : "",
          updatedAt: new Date().toISOString(),
        });
      } catch { /* value stamping is best-effort */ }
    }
  }
  if (patch.comments) {
    await logActivity({ actor, verb: "commented", sectionKey: "technical-quotations", entityType: "quotations", entityId: id, label: `New comment on ${updated.number}`, href: "/studio/technical/quotations" }).catch(() => {});
    const mentions = Array.isArray(body.mentions) ? body.mentions.map(String) : [];
    const owners = [updated.createdBy, updated.handledBy].filter(Boolean).filter((uid) => !mentions.includes(uid));
    const href = `/studio/quotations/${id}/builder`;
    await notifyUsers({ actor, userIds: owners, kind: "comment", entityType: "quotations", entityId: id, label: `New comment on ${updated.number}`, href }).catch(() => {});
    await notifyMentions({ actor, mentions, sectionKey: "technical-quotations", entityType: "quotations", entityId: id, label: `You were mentioned on ${updated.number}`, href }).catch(() => {});
  }

  return Response.json(updated);
}

// Only admin can hard-delete. Others should change status to "Dropped" instead.
export async function DELETE(request, { params }) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const tags = Array.isArray(actor.tags) ? actor.tags : [];
  if (!tags.includes(ADMIN_TAG)) return forbidden();
  const { id } = await params;
  // Don't orphan a project by deleting the quotation it was built from.
  const projects = await getCollection("projects");
  if (projects.some((p) => p.quotationId === id)) {
    return Response.json({ error: "This quotation is linked to a project and can't be deleted." }, { status: 409 });
  }
  const ok = await deleteItem("quotations", id);
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}
