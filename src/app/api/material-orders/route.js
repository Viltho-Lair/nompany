import { getCollection, createItem, updateItem, getSettings } from "@/lib/db";
import { requireSection, requireManage, forbidden } from "@/lib/session";
import { isProjectLocked } from "@/lib/tasks";
import { logActivity } from "@/lib/activity";
import { notifyUsers } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Material purchase requests raised from Orders & Tracking — one per vendor,
// listing the items (and quantities) logistics needs to order to cover a
// project's shortfall. Gated by the Orders & Tracking section.
export async function GET(request) {
  const actor = await requireSection("inventory-sheets");
  if (!actor) return forbidden();
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  let rows = await getCollection("materialOrders");
  if (projectId) rows = rows.filter((o) => o.projectId === projectId);
  rows.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return Response.json(rows);
}

export async function POST(request) {
  const actor = await requireManage("inventory-sheets");
  if (!actor) return forbidden();
  const body = await request.json().catch(() => ({}));
  let items = (Array.isArray(body.items) ? body.items : [])
    .map((it) => ({ itemId: String(it.itemId || ""), name: String(it.name || ""), model: String(it.model || ""), qty: Math.max(1, parseInt(it.qty, 10) || 1) }))
    .filter((it) => it.itemId && it.qty > 0);
  if (!items.length) return Response.json({ error: "Select at least one item with a quantity to order." }, { status: 400 });

  // No material orders while the project is frozen pending PO approval.
  const projectId = String(body.projectId || "");
  if (projectId) {
    const project = (await getCollection("projects")).find((p) => p.id === projectId);
    if (isProjectLocked(project)) return Response.json({ error: "This project is locked pending PO approval." }, { status: 403 });
  }

  // Guard against re-ordering a shortfall that's already on order: clamp each
  // item so (already ordered for this project + new qty) never exceeds the
  // quantity needed on the project sheet.
  if (projectId) {
    const [sheets, orders] = await Promise.all([getCollection("projectSheets"), getCollection("materialOrders")]);
    const needed = {};
    for (const s of sheets.filter((s) => s.projectId === projectId)) {
      for (const t of s.tables || []) for (const r of t.rows || []) { if (r.itemId) needed[r.itemId] = (needed[r.itemId] || 0) + (Number(r.qty) || 0); }
    }
    const already = {};
    for (const o of orders.filter((o) => o.projectId === projectId)) {
      for (const it of o.items || []) { if (it.itemId) already[it.itemId] = (already[it.itemId] || 0) + (Number(it.qty) || 0); }
    }
    items = items
      .map((it) => ({ ...it, qty: Math.min(it.qty, Math.max(0, (needed[it.itemId] ?? it.qty) - (already[it.itemId] || 0))) }))
      .filter((it) => it.qty > 0);
    if (!items.length) return Response.json({ error: "These items have already been fully ordered." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const vendorName = String(body.vendorName || "");
  const projectName = String(body.projectName || "");
  // The order waits on a two-party (Finance + Management) approval before the PO
  // is issued to the vendor.
  const order = await createItem("materialOrders", {
    projectId,
    projectName,
    vendorId: String(body.vendorId || ""),
    vendorName,
    items,
    status: "pending-approval",
    createdBy: actor.id,
    createdByLabel: actor.fullName || actor.userId,
    createdAt: now,
  });

  // Raise the approval task to Finance + Management.
  const settings = await getSettings();
  const assigneeIds = (settings.taskManagers?.["material-po"] || []).filter(Boolean);
  const task = await createItem("tasks", {
    type: "material-po",
    name: `Vendor PO · ${vendorName || "vendor"}${projectName ? ` (${projectName})` : ""}`,
    departments: ["Finance", "Management"],
    assigneeIds,
    projectId,
    projectName,
    vendorId: order.vendorId,
    vendorName,
    items,
    orderId: order.id,
    approvals: {},
    done: false,
    createdBy: actor.id,
    createdByLabel: actor.fullName || actor.userId,
    createdAt: now,
  });
  await updateItem("materialOrders", order.id, { taskId: task.id });

  logActivity({ actor, verb: "created", sectionKey: "inventory-tracking", entityType: "materialOrders", entityId: order.id, label: `Vendor PO approval requested for ${vendorName || "a vendor"} (${items.length} item${items.length === 1 ? "" : "s"})`, href: "/studio/inventory/tracking" }).catch(() => {});
  if (assigneeIds.length) await notifyUsers({ actor, userIds: assigneeIds, kind: "material-awaiting", entityType: "tasks", entityId: task.id, label: `Vendor PO approval · ${vendorName || "vendor"}`, href: "/studio/tasks" }).catch(() => {});
  return Response.json({ ...order, taskId: task.id }, { status: 201 });
}
