import { getCollection, createItem } from "@/lib/db";
import { requireSection, requireManage, forbidden } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { upsertClientLocation } from "@/lib/clientLocationSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Work permits tracked on the Operations page — a name/number, issue + expiry
// dates, and the employees the permit covers. Gated by the Operations section.
function sanitize(body) {
  const clientName = String(body.clientName || "").slice(0, 200);
  const locationName = String(body.locationName || "").slice(0, 200);
  // A permit is identified by Client + Location; `name` is a composed label kept
  // for the list rendering + expiry watch.
  const name = String(body.name || "").trim() || [clientName, locationName].filter(Boolean).join(" — ");
  return {
    name: name.slice(0, 200),
    clientId: String(body.clientId || "").slice(0, 64),
    clientName,
    locationName,
    city: String(body.city || "").slice(0, 120),
    locationUrl: String(body.locationUrl || "").slice(0, 300),
    number: String(body.number || "").slice(0, 120),
    issueDate: String(body.issueDate || ""),
    expireDate: String(body.expireDate || ""),
    employeeIds: Array.isArray(body.employeeIds) ? [...new Set(body.employeeIds.map(String).filter(Boolean))].slice(0, 50) : [],
    attachmentId: String(body.attachmentId || "").slice(0, 64),
    attachmentUrl: String(body.attachmentUrl || "").slice(0, 300),
    attachmentName: String(body.attachmentName || "").slice(0, 200),
  };
}

export async function GET() {
  const actor = await requireSection("operations");
  if (!actor) return forbidden();
  const rows = await getCollection("permits");
  rows.sort((a, b) => (a.expireDate || "").localeCompare(b.expireDate || ""));
  return Response.json(rows);
}

export async function POST(request) {
  const actor = await requireManage("operations");
  if (!actor) return forbidden();
  const body = await request.json().catch(() => ({}));
  const rec = sanitize(body);
  if (!rec.name) return Response.json({ error: "A permit name is required." }, { status: 400 });
  if (!rec.attachmentUrl) return Response.json({ error: "An attachment is required." }, { status: 400 });
  const now = new Date().toISOString();
  const permit = await createItem("permits", { ...rec, createdBy: actor.id, createdAt: now });
  await upsertClientLocation(rec.clientId, { name: rec.locationName, city: rec.city, url: rec.locationUrl }).catch(() => {});
  logActivity({ actor, verb: "created", sectionKey: "operations", entityType: "permits", entityId: permit.id, label: `Permit “${permit.name}” added`, href: "/studio/operations" }).catch(() => {});
  return Response.json(permit, { status: 201 });
}
