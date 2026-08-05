import { getCollection } from "@/lib/db";
import { requireSection, forbidden } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Inventory Project Sheets — one per project, mirrored from the approved
// quotation. Gated by the inventory-sheets section.
export async function GET(request) {
  const actor = await requireSection("inventory-sheets");
  if (!actor) return forbidden();
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const quotationId = searchParams.get("quotationId");
  let rows = await getCollection("projectSheets");
  if (projectId) rows = rows.filter((r) => r.projectId === projectId);
  if (quotationId) rows = rows.filter((r) => r.quotationId === quotationId);
  return Response.json([...rows].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
}
