import { currentSuperAdmin } from "@/lib/superAuth";
import { listSuper, markSuperRead } from "@/lib/data/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// What was already waiting when an owner opened the console. The stream carries
// what arrives afterwards; this is the starting state the bell's count is built
// from, so a reload does not reset it to zero.

export async function GET() {
  const admin = await currentSuperAdmin();
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });

  const notifications = await listSuper();
  return Response.json({
    notifications,
    unread: notifications.filter((n) => !n.readAt).length,
  });
}

// Mark read. Body { ids: [] } or {} for "all".
//
// Read state is shared, deliberately: the console's notifications are addressed
// to nompany rather than to one owner, so one of them clearing an alert clears
// it for all of them. That is the intent — a handled alert is handled — not an
// oversight.
export async function PATCH(request) {
  const admin = await currentSuperAdmin();
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });

  let ids = [];
  try {
    const body = await request.json();
    ids = Array.isArray(body?.ids) ? body.ids.filter((v) => typeof v === "string") : [];
  } catch {
    // No body — "mark everything read".
  }

  const changed = await markSuperRead(ids);
  return Response.json({ ok: true, changed });
}
