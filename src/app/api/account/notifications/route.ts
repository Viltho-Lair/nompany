import { route } from "@/platform/http/route";
import { readPrefs, savePrefs } from "@/platform/notify/prefs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE PERSON'S NOTIFICATION SETTINGS — email mode, per-category channels,
// quiet hours. `auth: "user"` rather than "studio": they are chosen once on
// /account and apply in every studio the person belongs to (the owner,
// 28/09/2026). Nothing here widens what anybody is told — every notice is
// still addressed and gated per studio; a setting can only narrow where it goes.

export const GET = route({ auth: "user", name: "account/notifications" }, async ({ user }) => ({
  prefs: await readPrefs(String(user.id)),
}));

export const PUT = route({ auth: "user", name: "account/notifications", body: true }, async ({ user, body }) => ({
  prefs: await savePrefs(String(user.id), (body as { prefs?: unknown })?.prefs ?? body),
}));
