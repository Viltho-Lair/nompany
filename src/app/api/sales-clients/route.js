import { getCollection, createItem } from "@/lib/db";
import { currentUser, requireManage, forbidden, unauthorized } from "@/lib/session";
import { canManageSalesClients, normaliseClientName } from "@/lib/salesClients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: any signed-in studio user can read the client directory — it feeds the
// Project page's Client section and the project's client picker, not just Sales.
export async function GET() {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const rows = await getCollection("salesClients");
  return Response.json(rows);
}

// POST: explicit "Add new client" from the UI. Ticket-create also upserts
// via the internal helper in /api/tickets, but the standalone endpoint is
// useful for the Clients page's Add button. Duplicate names (case-insensitive)
// are rejected with 409 so the UI can prompt to pick the existing one.
export async function POST(request) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  if (!canManageSalesClients(actor)) return forbidden();
  if (!(await requireManage("sales-clients"))) return forbidden(); // view-only can't create

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name) return Response.json({ error: "name is required" }, { status: 400 });

  const existing = await getCollection("salesClients");
  const norm = normaliseClientName(name);
  const dupe = existing.find((c) => normaliseClientName(c.name) === norm);
  if (dupe) {
    return Response.json(
      { error: `A client named "${dupe.name}" already exists.`, existing: dupe },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const record = await createItem("salesClients", {
    name,
    logo: String(body.logo || ""),
    contactEmail: String(body.contactEmail || "").trim(),
    contactPhone: String(body.contactPhone || "").trim(),
    createdBy: actor.id,
    createdByUserId: actor.userId,
    createdAt: now,
  });
  return Response.json(record, { status: 201 });
}
