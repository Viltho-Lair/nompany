import { getCollection } from "@/lib/db";
import { requireSection, forbidden } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One-hop "everything about this project" bundle — the project, its sheet
// (tables only, for the completion model), its deliveries, and the completed
// quotations linked to it. Lets ProjectDetail avoid fetching whole collections
// and joining client-side. Gated by Project access.
export async function GET(request, { params }) {
  const actor = await requireSection("projects-list");
  if (!actor) return forbidden();
  const { id } = await params;

  const [projects, sheets, deliveries, quotations, permits] = await Promise.all([
    getCollection("projects"),
    getCollection("projectSheets"),
    getCollection("deliveries"),
    getCollection("quotations"),
    getCollection("permits"),
  ]);

  const project = projects.find((p) => p.id === id) || null;
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });

  // Permits that match this project's city — a project-accessible read (minimal
  // fields) so the Client → Permits box can offer a long-permit dropdown without
  // requiring Operations access.
  const cityKey = String(project.locationCity || "").trim().toLowerCase();
  const cityPermits = cityKey
    ? permits
        .filter((p) => String(p.city || "").trim().toLowerCase() === cityKey)
        .map((p) => ({ id: p.id, name: p.name || "", number: p.number || "", city: p.city || "", expireDate: p.expireDate || "", locationName: p.locationName || "", locationUrl: p.locationUrl || "", attachmentUrl: p.attachmentUrl || "" }))
        .sort((a, b) => (a.expireDate || "").localeCompare(b.expireDate || ""))
    : [];

  const sheet = sheets.find((s) => s.projectId === id) || null;
  const tables = sheet
    ? (sheet.tables || []).map((t) => ({
        id: t.id, title: t.title || "",
        rows: (t.rows || []).map((r) => ({ itemId: r.itemId || "", name: r.name || "", model: r.model || "", qty: Number(r.qty) || 0 })),
      }))
    : [];

  const dels = deliveries
    .filter((d) => d.projectId === id)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  // Completed quotations that belong to this project (by id or shared ticket).
  const seen = new Set();
  const mat = quotations.filter((q) => {
    if (q.status !== "Completed") return false;
    const hit = q.id === project.quotationId || q.projectId === id || (project.fromTicketId && q.fromTicketId === project.fromTicketId);
    if (!hit || seen.has(q.id)) return false;
    seen.add(q.id);
    return true;
  });

  return Response.json({ project, sheet: { tables }, deliveries: dels, quotations: mat, permits: cityPermits });
}
