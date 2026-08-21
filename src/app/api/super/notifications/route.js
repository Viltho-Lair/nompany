import { route } from "@/lib/route";
import { listSuper, markSuperRead } from "@/lib/data/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "super", name: "super/notifications" };

// What was already waiting when an owner opened the console. The stream carries
// what arrives afterwards; this is the starting state the bell's count is built
// from, so a reload does not reset it to zero.
export const GET = route(spec, async () => {
  const notifications = await listSuper();
  return { notifications, unread: notifications.filter((n) => !n.readAt).length };
});

// Mark read. Body { ids: [] } or {} for "all".
//
// Read state is shared, deliberately: the console's notifications are addressed
// to nompany rather than to one owner, so one of them clearing an alert clears
// it for all of them. That is the intent — a handled alert is handled — not an
// oversight.
//
// A MISSING BODY MEANS "EVERYTHING", which is why the empty-object default the
// wrapper supplies is exactly right here rather than something to guard against.
export const PATCH = route({ ...spec, body: true }, async ({ body }) => {
  const ids = Array.isArray(body?.ids) ? body.ids.filter((v) => typeof v === "string") : [];
  return { ok: true, changed: await markSuperRead(ids) };
});
