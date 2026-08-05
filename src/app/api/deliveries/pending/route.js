import { getCollection } from "@/lib/db";
import { currentUser, unauthorized } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Open (not-yet-released) delivery requests for a quotation. Used by the
// Quotation viewer to lock items that already have a delivery request in flight
// — a PM can't re-request an item until that request is released or rejected.
// Returns { items: { [itemId]: qty }, tasks: [{ id, items }] }.
export async function GET(request) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const { searchParams } = new URL(request.url);
  const quotationId = searchParams.get("quotationId");
  const projectId = searchParams.get("projectId");

  const tasks = await getCollection("tasks");
  const open = tasks.filter(
    (t) => t.type === "delivery" && !t.done &&
      ((quotationId && t.quotationId === quotationId) || (projectId && t.projectId === projectId))
  );
  const items = {};
  for (const t of open) for (const it of t.items || []) {
    if (!it.itemId) continue;
    items[it.itemId] = (items[it.itemId] || 0) + (Number(it.qty) || 0);
  }
  return Response.json({ items, tasks: open.map((t) => ({ id: t.id, items: t.items || [], qtyChange: t.qtyChange || null })) });
}
