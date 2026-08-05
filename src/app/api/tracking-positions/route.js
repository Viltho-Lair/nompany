import { getCollection, replaceCollection } from "@/lib/db";
import { requireSection, forbidden } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A field user posts their own location fix. Identity comes ONLY from the
// session (requireSection resolves the current user); the request body is trusted
// only for lat/lng/accuracy — never for the user. Rows are stored in the
// `trackingPositions` collection linked to the user's `id` primary key (userRef).
// Kept bounded per user (latest KEEP rows) so the log can't grow without limit.
//
// NOTE: this lives at /api/tracking-positions (NOT /api/positions) — the latter
// path belongs to the job-"positions" reference collection served by the generic
// /api/[collection] route. A static /api/positions route here would shadow that
// catch-all and break listing/creating job positions in Employees.
const KEEP = 20;

export async function POST(request) {
  const actor = await requireSection("operations-tracking");
  if (!actor) return forbidden();

  const body = await request.json().catch(() => ({}));
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json({ error: "lat and lng are required." }, { status: 400 });
  }
  const accuracy = Number(body.accuracy);

  const row = {
    id: `pos_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    // Identity is stamped from the session — the payload's user (if any) is ignored.
    userRef: actor.id,
    lat,
    lng,
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
    recordedAt: new Date().toISOString(),
  };

  const all = await getCollection("trackingPositions");
  // Keep this user's newest KEEP-1 rows + the new one; leave other users untouched.
  const mineKeep = new Set(
    all.filter((p) => p.userRef === actor.id)
      .sort((a, b) => (b.recordedAt || "").localeCompare(a.recordedAt || ""))
      .slice(0, KEEP - 1)
      .map((p) => p.id)
  );
  const next = [row, ...all.filter((p) => p.userRef !== actor.id || mineKeep.has(p.id))];
  await replaceCollection("trackingPositions", next);

  return Response.json({ ok: true, id: row.id });
}
