import { getCollection, updateItem } from "@/lib/db";
import { requireSection, requireManage, forbidden } from "@/lib/session";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const actor = await requireSection("inventory-sheets");
  if (!actor) return forbidden();
  const { id } = await params;
  const rows = await getCollection("projectSheets");
  const row = rows.find((r) => r.id === id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(row);
}

// Editable per row: the serial numbers, and the Installed / Programmed status.
//   • Serial free-text:   { serials: { rowId: "..." } }
//   • Item status toggle: { rowStatus: { rowId, field: "installed"|"programmed", value: bool } }
// Image/model/quantity stay a read-only snapshot of the approved quotation.
export async function PUT(request, { params }) {
  const actor = await requireManage("inventory-sheets");
  if (!actor) return forbidden();
  const { id } = await params;
  const body = await request.json();

  const rows = await getCollection("projectSheets");
  const sheet = rows.find((r) => r.id === id);
  if (!sheet) return Response.json({ error: "Not found" }, { status: 404 });

  // --- Installed / Programmed status for a single item row -----------------
  if (body.rowStatus && typeof body.rowStatus === "object") {
    const { rowId, field } = body.rowStatus;
    if (field !== "installed" && field !== "programmed") return Response.json({ error: "Bad field" }, { status: 400 });
    const value = !!body.rowStatus.value;
    const atField = field === "installed" ? "installedAt" : "programmedAt";
    let hit = null;
    const tables = (sheet.tables || []).map((t) => ({
      ...t,
      rows: (t.rows || []).map((r) => {
        if (r.id !== rowId) return r;
        hit = r;
        return { ...r, [field]: value, [atField]: value ? new Date().toISOString() : "" };
      }),
    }));
    if (!hit) return Response.json({ error: "Row not found" }, { status: 404 });
    const updated = await updateItem("projectSheets", id, { tables });
    // First sign of on-site work moves the project off "Received".
    if (value && sheet.projectId) {
      const projects = await getCollection("projects");
      const proj = projects.find((p) => p.id === sheet.projectId);
      if (proj && (proj.stage || "Received") === "Received") {
        const plog = Array.isArray(proj.log) ? proj.log : [];
        await updateItem("projects", proj.id, { stage: "In Progress", log: [...plog, { id: `${Date.now()}-st`, desc: "Status → In Progress", at: new Date().toISOString() }] });
      }
    }
    logActivity({ actor, verb: "updated", sectionKey: "inventory-sheets", entityType: "projectSheets", entityId: id, label: `${hit.name || "Item"} marked ${value ? field : `not ${field}`} on ${updated.projectTitle || "a project sheet"}`, href: "/studio/inventory/sheets" }).catch(() => {});
    return Response.json(updated);
  }

  // --- Serial free-text (legacy path) -------------------------------------
  const serials = body.serials && typeof body.serials === "object" ? body.serials : {};
  const tables = (sheet.tables || []).map((t) => ({
    ...t,
    rows: (t.rows || []).map((r) => (r.id in serials ? { ...r, serials: String(serials[r.id] || "").slice(0, 4000) } : r)),
  }));
  const updated = await updateItem("projectSheets", id, { tables });
  logActivity({ actor, verb: "updated", sectionKey: "inventory-sheets", entityType: "projectSheets", entityId: id, label: `Serials updated on ${updated.projectTitle || "a project sheet"}`, href: "/studio/inventory/sheets" }).catch(() => {});
  return Response.json(updated);
}
