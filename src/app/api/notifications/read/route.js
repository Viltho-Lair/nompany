import { getCollection, replaceCollection } from "@/lib/db";
import { currentUser, unauthorized } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mark the caller's own notifications read — { ids: [...] } for specific ones,
// or { all: true } for every unread one. Read state is server-side.
export async function POST(request) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? new Set(body.ids.map(String)) : null;
  const markAll = !!body.all;
  if (!markAll && !ids) return Response.json({ error: "Nothing to mark." }, { status: 400 });

  const all = await getCollection("notifications");
  const now = new Date().toISOString();
  let changed = false;
  const next = all.map((n) => {
    if (n.userId !== actor.id || n.read) return n;
    if (markAll || (ids && ids.has(n.id))) { changed = true; return { ...n, read: true, readAt: now }; }
    return n;
  });
  if (changed) await replaceCollection("notifications", next);
  return Response.json({ ok: true });
}
