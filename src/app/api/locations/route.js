import { getCollection, createItem } from "@/lib/db";
import { requireSection, requireManage, forbidden } from "@/lib/session";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Locations tracked on the Operations page — a name, a Google-Maps link, and one
// or more contacts (name + phone). Gated by the Operations section.
function sanitize(body) {
  return {
    name: String(body.name || "").slice(0, 200),
    mapUrl: String(body.mapUrl || "").slice(0, 600),
    contacts: (Array.isArray(body.contacts) ? body.contacts : [])
      .map((c) => ({ name: String(c.name || "").slice(0, 160), phone: String(c.phone || "").slice(0, 60) }))
      .filter((c) => c.name || c.phone)
      .slice(0, 20),
  };
}

export async function GET() {
  const actor = await requireSection("operations");
  if (!actor) return forbidden();
  const rows = await getCollection("locations");
  rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  return Response.json(rows);
}

export async function POST(request) {
  const actor = await requireManage("operations");
  if (!actor) return forbidden();
  const body = await request.json().catch(() => ({}));
  const rec = sanitize(body);
  if (!rec.name) return Response.json({ error: "A location name is required." }, { status: 400 });
  const location = await createItem("locations", { ...rec, createdBy: actor.id, createdAt: new Date().toISOString() });
  logActivity({ actor, verb: "created", sectionKey: "operations", entityType: "locations", entityId: location.id, label: `Location “${location.name}” added`, href: "/studio/operations" }).catch(() => {});
  return Response.json(location, { status: 201 });
}
