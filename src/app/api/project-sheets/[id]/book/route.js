import { getCollection, updateItem } from "@/lib/db";
import { requireManage, forbidden } from "@/lib/session";
import { isProjectLocked } from "@/lib/tasks";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Reconcile the serial numbers BOOKED to one project-sheet row against the
// item's stock record. Booking a serial moves it out of the item's available
// `serials` into a `booked` list (with project/sheet/row refs); un-booking moves
// it back. A row can never book more serials than its ordered `qty`, and can only
// book serials that are actually available in stock.
// Body: { rowId, serials: [desired serial strings] }.
export async function PUT(request, { params }) {
  const actor = await requireManage("inventory-sheets");
  if (!actor) return forbidden();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const rowId = String(body.rowId || "");
  const desiredRaw = Array.isArray(body.serials) ? body.serials.map((s) => String(s).trim()).filter(Boolean) : [];

  const sheets = await getCollection("projectSheets");
  const sheet = sheets.find((r) => r.id === id);
  if (!sheet) return Response.json({ error: "Not found" }, { status: 404 });

  // No serial booking while the project is frozen pending PO approval.
  if (sheet.projectId) {
    const project = (await getCollection("projects")).find((p) => p.id === sheet.projectId);
    if (isProjectLocked(project)) return Response.json({ error: "This project is locked pending PO approval." }, { status: 403 });
  }

  let targetRow = null;
  for (const t of sheet.tables || []) for (const r of t.rows || []) if (r.id === rowId) targetRow = r;
  if (!targetRow) return Response.json({ error: "Row not found" }, { status: 404 });

  const itemId = targetRow.itemId;
  const qty = Number(targetRow.qty) || 0;
  const current = Array.isArray(targetRow.serials) ? targetRow.serials : [];

  const stockAll = await getCollection("inventoryStock");
  const stock = stockAll.find((s) => s.itemId === itemId);
  const available = stock && Array.isArray(stock.serials) ? [...stock.serials] : [];
  let booked = stock && Array.isArray(stock.booked) ? [...stock.booked] : [];

  // Desired set: unique, capped at qty. A serial may stay if it's currently
  // booked to this row, or become booked if it's available in stock.
  const seen = new Set();
  const desired = [];
  for (const sn of desiredRaw) {
    if (seen.has(sn) || desired.length >= qty) continue;
    if (current.includes(sn) || available.includes(sn)) { desired.push(sn); seen.add(sn); }
  }

  const toBook = desired.filter((sn) => !current.includes(sn));
  const toUnbook = current.filter((sn) => !desired.includes(sn));

  if (stock) {
    // Book: remove from available, add booked entry.
    for (const sn of toBook) {
      const i = available.indexOf(sn);
      if (i >= 0) available.splice(i, 1);
      booked.push({ serial: sn, projectSheetId: id, rowId, projectId: sheet.projectId || "", at: new Date().toISOString() });
    }
    // Un-book: drop this row's booked entry, return serial to available.
    for (const sn of toUnbook) {
      const bi = booked.findIndex((b) => b.serial === sn && b.rowId === rowId && b.projectSheetId === id);
      if (bi >= 0) booked.splice(bi, 1);
      if (!available.includes(sn)) available.push(sn);
    }
    await updateItem("inventoryStock", stock.id, { serials: available, booked });
  }

  // Persist the row's booked serials.
  const tables = (sheet.tables || []).map((t) => ({
    ...t,
    rows: (t.rows || []).map((r) => (r.id === rowId ? { ...r, serials: desired } : r)),
  }));
  const updated = await updateItem("projectSheets", id, { tables });

  if (toBook.length || toUnbook.length) {
    logActivity({ actor, verb: "updated", sectionKey: "inventory-sheets", entityType: "projectSheets", entityId: id, label: `Serials ${toBook.length ? `booked (${toBook.length})` : ""}${toBook.length && toUnbook.length ? " / " : ""}${toUnbook.length ? `released (${toUnbook.length})` : ""} on ${sheet.projectTitle || "a project sheet"}`.trim(), href: "/studio/inventory/sheets" }).catch(() => {});
  }

  return Response.json({ ok: true, sheet: updated, serials: desired, available: stock ? available.length : 0 });
}
