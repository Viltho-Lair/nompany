import { getCollection } from "@/lib/db";
import { currentUser, unauthorized, forbidden } from "@/lib/session";
import { canSeeTask } from "@/lib/tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Serial-booking readiness for a delivery task: per requested item, how many
// booked serials (from the project sheet, minus those already delivered) are
// available versus the requested quantity. Used by the task detail to show
// progress and gate the "release" button. Gated by task visibility so the
// logistics handler doesn't need Inventory-Sheets access.
export async function GET(request, { params }) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const { id } = await params;
  const task = (await getCollection("tasks")).find((t) => t.id === id);
  if (!task) return Response.json({ error: "Not found" }, { status: 404 });
  if (!canSeeTask(actor, task)) return forbidden();
  if (task.type !== "delivery") return Response.json({ items: [], ready: false });

  const [sheets, deliveries] = await Promise.all([getCollection("projectSheets"), getCollection("deliveries")]);
  const sheet = sheets.find((s) => s.projectId === task.projectId) || sheets.find((s) => s.quotationId === task.quotationId) || null;

  // Booked serials per item from the sheet.
  const bookedByItem = {};
  for (const t of sheet?.tables || []) for (const r of t.rows || []) {
    if (!r.itemId) continue;
    for (const sn of Array.isArray(r.serials) ? r.serials : []) (bookedByItem[r.itemId] ||= new Set()).add(sn);
  }
  // Serials already handed out on earlier deliveries for this project.
  const used = new Set();
  for (const d of deliveries) {
    if (d.projectId !== task.projectId && d.quotationId !== task.quotationId) continue;
    for (const it of d.items || []) for (const sn of it.serials || []) used.add(sn);
  }

  // Aggregate requested items and match against available booked serials.
  const agg = {};
  for (const it of task.items || []) {
    if (!agg[it.itemId]) agg[it.itemId] = { itemId: it.itemId, name: it.name || "", model: it.model || "", qty: 0 };
    agg[it.itemId].qty += Number(it.qty) || 0;
  }
  const items = Object.values(agg).map((a) => {
    const pool = [...(bookedByItem[a.itemId] || new Set())].filter((sn) => !used.has(sn));
    return { ...a, booked: Math.min(pool.length, a.qty), available: pool.length };
  });
  const ready = items.length > 0 && items.every((a) => a.available >= a.qty);
  return Response.json({ items, ready });
}
