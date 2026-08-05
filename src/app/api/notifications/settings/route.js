import { getSettings, updateSettings } from "@/lib/db";
import { currentUser, unauthorized } from "@/lib/session";
import { sanitizePrefs } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The caller's OWN notification preferences (which kinds they receive), stored
// under settings.notificationPrefs[userId]. Unset kind ⇒ enabled by default.
export async function GET() {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const s = await getSettings();
  return Response.json({ prefs: (s.notificationPrefs || {})[actor.id] || {} });
}

export async function PUT(request) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const prefs = sanitizePrefs(body.prefs);
  const s = await getSettings();
  const all = { ...(s.notificationPrefs || {}) };
  all[actor.id] = prefs;
  await updateSettings({ notificationPrefs: all });
  return Response.json({ prefs });
}
