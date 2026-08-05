import { deleteItem } from "@/lib/db";
import { currentUser, forbidden, unauthorized } from "@/lib/session";
import { ADMIN_TAG } from "@/lib/authConstants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Only admin can hard-delete a client from the directory. Sales users can add,
// but removing might orphan ticketRefs or contact info still referenced.
export async function DELETE(request, { params }) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const tags = Array.isArray(actor.tags) ? actor.tags : [];
  if (!tags.includes(ADMIN_TAG)) return forbidden();
  const { id } = await params;
  const ok = await deleteItem("salesClients", id);
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}
