import { getCollection, createItem, replaceCollection } from "@/lib/db";
import { requireSection, requireManage, forbidden } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { AWB_AIRLINES_SEED } from "@/lib/awbAirlinesSeed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const makeId = () => `awl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function sanitize(body) {
  return {
    prefix: String(body.prefix || "").replace(/\D/g, "").slice(0, 3),
    name: String(body.name || "").trim().slice(0, 160),
    iata: String(body.iata || "").trim().toUpperCase().slice(0, 3),
    icao: String(body.icao || "").trim().toUpperCase().slice(0, 4),
    logo: String(body.logo || "").slice(0, 300),
    // Tier-1 deep link; tokens {AWB} {PREFIX} {SERIAL} are substituted client-side.
    trackUrlTemplate: String(body.trackUrlTemplate || "").slice(0, 500),
    aggregatorSupported: body.aggregatorSupported !== false,
    active: body.active !== false,
  };
}

// GET — the airline registry. Seeds the collection from AWB_AIRLINES_SEED on the
// first read (when empty) so the list is populated out of the box, then stays
// admin-editable. Gated by AWB Tracking view access.
export async function GET() {
  const actor = await requireSection("inventory-awb");
  if (!actor) return forbidden();
  let rows = await getCollection("awbAirlines");
  if (!rows.length) {
    rows = AWB_AIRLINES_SEED.map((a) => ({
      id: makeId(),
      ...a,
      icao: "",
      logo: "",
      trackUrlTemplate: "",
      aggregatorSupported: true,
      active: true,
    }));
    await replaceCollection("awbAirlines", rows);
  }
  rows.sort((a, b) => (a.prefix || "").localeCompare(b.prefix || ""));
  return Response.json(rows);
}

// POST — add an airline prefix (admin/manage). Prefix must be 3 digits + unique.
export async function POST(request) {
  const actor = await requireManage("inventory-awb");
  if (!actor) return forbidden();
  const rec = sanitize(await request.json().catch(() => ({})));
  if (rec.prefix.length !== 3) return Response.json({ error: "Prefix must be 3 digits." }, { status: 400 });
  if (!rec.name) return Response.json({ error: "Airline name is required." }, { status: 400 });
  const rows = await getCollection("awbAirlines");
  if (rows.some((a) => a.prefix === rec.prefix)) {
    return Response.json({ error: `Prefix ${rec.prefix} already exists.` }, { status: 409 });
  }
  const airline = await createItem("awbAirlines", { ...rec, createdBy: actor.id, createdAt: new Date().toISOString() });
  logActivity({ actor, verb: "created", sectionKey: "inventory-awb", entityType: "awbAirlines", entityId: airline.id, label: `AWB airline ${rec.prefix} ${rec.name} added`, href: "/studio/inventory/awb" }).catch(() => {});
  return Response.json(airline, { status: 201 });
}
