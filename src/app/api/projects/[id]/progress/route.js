import { getCollection } from "@/lib/db";
import { requireSection, forbidden } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Completion-relevant progress for one project, readable by anyone with Project
// access — so the project page can compute Delivery/Installation/Programming %
// without needing Inventory / Project-Sheets access. Returns the project sheet's
// tables (titles + item rows with model, for the Installation/Programming views).
// Deliveries are read separately via /api/deliveries?projectId= (open to any
// signed-in user) since they carry the delivered serial numbers.
export async function GET(request, { params }) {
  const actor = await requireSection("projects-list");
  if (!actor) return forbidden();
  const { id } = await params;
  const sheets = await getCollection("projectSheets");
  const sheet = sheets.find((s) => s.projectId === id) || null;
  const tables = sheet
    ? (sheet.tables || []).map((t) => ({
        id: t.id,
        title: t.title || "",
        rows: (t.rows || []).map((r) => ({
          itemId: r.itemId || "",
          name: r.name || "",
          model: r.model || "",
          qty: Number(r.qty) || 0,
        })),
      }))
    : [];
  return Response.json({ sheet: { tables } });
}
