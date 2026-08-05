import { getCollection } from "@/lib/db";
import { currentUser, unauthorized } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The current user's PERSONAL notifications, newest first, plus the per-item
// unread counts (for the sidebar) and a total unread. One call powers both the
// bell and the sidebar counters.
export async function GET() {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const all = await getCollection("notifications");
  const mine = all
    .filter((n) => n.userId === actor.id)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const counts = {};
  let unread = 0;
  for (const n of mine) {
    if (n.read) continue;
    unread++;
    const key = n.itemKey || "";
    if (key) counts[key] = (counts[key] || 0) + 1;
  }
  return Response.json({ items: mine.slice(0, 40), counts, unread });
}
