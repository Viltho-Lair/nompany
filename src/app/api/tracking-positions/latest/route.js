import { getCollection } from "@/lib/db";
import { currentUser, forbidden, unauthorized } from "@/lib/session";
import { enrichUsers } from "@/lib/employeeAuth";
import { ADMIN_TAG } from "@/lib/authConstants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Dispatch view: the latest position per user. ADMIN ONLY — checked server-side
// against the STORED admin tag (currentUser() enriches tags, and admin is only
// ever granted via the stored flag). Names/avatars resolve through enrichUsers
// (employee record → real name + photo); we never return passwordHash or
// sessionToken, only a curated shape.
//
// Lives at /api/tracking-positions/latest (NOT /api/positions/latest) — see the
// note in ../route.js for why the tracking endpoints avoid the /api/positions path.
export async function GET() {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  if (!(Array.isArray(actor.tags) && actor.tags.includes(ADMIN_TAG))) return forbidden();

  const positions = await getCollection("trackingPositions");
  // Latest row per userRef (equivalent of SELECT DISTINCT ON (userRef) … ORDER BY recordedAt DESC).
  const latest = {};
  for (const p of positions) {
    if (!p.userRef) continue;
    const cur = latest[p.userRef];
    if (!cur || (p.recordedAt || "") > (cur.recordedAt || "")) latest[p.userRef] = p;
  }
  const refs = Object.keys(latest);
  if (!refs.length) return Response.json([]);

  const users = await getCollection("users");
  const usersById = Object.fromEntries(users.map((u) => [u.id, u]));
  const enriched = await enrichUsers(refs.map((id) => usersById[id]).filter(Boolean));
  const enrichedById = Object.fromEntries(enriched.map((u) => [u.id, u]));

  const out = refs.map((id) => {
    const p = latest[id];
    const eu = enrichedById[id];
    return {
      userRef: id,
      // Enriched name/avatar (employee → real name + photo), never the raw stored fields.
      name: eu?.fullName || eu?.userId || "Unknown",
      avatarUrl: eu?.avatarUrl || "",
      lat: p.lat,
      lng: p.lng,
      accuracy: p.accuracy,
      recordedAt: p.recordedAt,
    };
  });
  return Response.json(out);
}
