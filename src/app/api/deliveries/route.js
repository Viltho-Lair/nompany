import { getCollection } from "@/lib/db";
import { currentUser, unauthorized } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Delivery notes, newest first. Optionally filtered by ?quotationId= or
// ?projectId= (used to show deliveries attached under a quotation). Any
// authenticated studio user can read.
export async function GET(request) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const { searchParams } = new URL(request.url);
  const quotationId = searchParams.get("quotationId");
  const projectId = searchParams.get("projectId");
  let rows = await getCollection("deliveries");
  if (quotationId) rows = rows.filter((d) => d.quotationId === quotationId);
  if (projectId) rows = rows.filter((d) => d.projectId === projectId);
  rows.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return Response.json(rows);
}
