import { getCollection, updateItem, deleteItem } from "@/lib/db";
import { requireTag, forbidden, publicUser } from "@/lib/session";
import { ADMIN_TAG } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fields an admin can edit here. Password changes go through the sibling
// /reset-password route so we always generate a fresh one server-side and
// return the plaintext exactly once.
const EDITABLE = ["userId", "tags"];

export async function PUT(request, { params }) {
  const actor = await requireTag(ADMIN_TAG);
  if (!actor) return forbidden();
  const { id } = await params;
  const body = await request.json();
  const patch = {};
  for (const k of EDITABLE) if (k in body) patch[k] = body[k];

  if (patch.userId !== undefined) {
    const desired = String(patch.userId || "").trim();
    if (!desired) return Response.json({ error: "userId cannot be empty" }, { status: 400 });
    // Enforce uniqueness (case-insensitive) excluding this user.
    const users = await getCollection("users");
    if (users.some((u) => u.id !== id && (u.userId || "").toLowerCase() === desired.toLowerCase())) {
      return Response.json({ error: "That User ID is already taken" }, { status: 409 });
    }
    patch.userId = desired;
  }
  if (patch.tags !== undefined) {
    // Only "admin" is ever stored directly — department/Leader access comes
    // from the user's linked Employee record, not from tags assigned here.
    patch.tags = Array.isArray(patch.tags) ? patch.tags.filter((t) => t === ADMIN_TAG) : [];
    // Safety: don't let the last admin lose their admin tag.
    if (!patch.tags.includes(ADMIN_TAG)) {
      const users = await getCollection("users");
      const target = users.find((u) => u.id === id);
      const wasAdmin = Array.isArray(target?.tags) && target.tags.includes(ADMIN_TAG);
      if (wasAdmin) {
        const otherAdmins = users.filter((u) => u.id !== id && Array.isArray(u.tags) && u.tags.includes(ADMIN_TAG));
        if (otherAdmins.length === 0) {
          return Response.json({ error: "Can't remove the admin tag from the only remaining admin." }, { status: 400 });
        }
      }
    }
  }

  const updated = await updateItem("users", id, patch);
  if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
  logActivity({ actor, verb: "updated", sectionKey: "users", entityType: "users", entityId: id, label: `User ${updated.userId} updated`, href: "/studio/users" }).catch(() => {});
  return Response.json(publicUser(updated));
}

export async function DELETE(request, { params }) {
  const actor = await requireTag(ADMIN_TAG);
  if (!actor) return forbidden();
  const { id } = await params;
  // Refuse to delete the last admin so the studio can never be locked out.
  const users = await getCollection("users");
  const target = users.find((u) => u.id === id);
  if (!target) return Response.json({ error: "Not found" }, { status: 404 });
  if (target.id === actor.id) {
    return Response.json({ error: "You can't delete your own account." }, { status: 400 });
  }
  if (Array.isArray(target.tags) && target.tags.includes(ADMIN_TAG)) {
    const otherAdmins = users.filter((u) => u.id !== id && Array.isArray(u.tags) && u.tags.includes(ADMIN_TAG));
    if (otherAdmins.length === 0) {
      return Response.json({ error: "Can't delete the only remaining admin." }, { status: 400 });
    }
  }
  const ok = await deleteItem("users", id);
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
  logActivity({ actor, verb: "deleted", sectionKey: "users", entityType: "users", entityId: id, label: `User ${target.userId} removed`, href: "/studio/users" }).catch(() => {});
  return Response.json({ ok: true });
}
