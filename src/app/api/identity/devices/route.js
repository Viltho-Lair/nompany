import { currentUser } from "@/lib/identity";
import { listDevices, revokeDevice, revokeAllDevices } from "@/lib/data/otp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The signed-in person's trusted browsers (u:<UserID>:devices — user data).
// Revoking one forces an OTP on its next sign-in; revoking all is the recovery
// lever when a device is lost.
export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const devices = (await listDevices(user.id)).map((d) => ({
    id: d.id, label: d.label, deviceType: d.deviceType || "", location: d.location || "",
    // The address itself is never stored — only a keyed digest, surfaced as a
    // short fingerprint so two sign-ins can be told apart without exposing it.
    ipFingerprint: (d.ipHash || "").slice(0, 8),
    createdAt: d.createdAt, lastSeenAt: d.lastSeenAt, expiresAt: d.expiresAt,
  }));
  return Response.json({ devices });
}

export async function DELETE(request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  let body = {};
  try { body = await request.json(); } catch { body = {}; }

  if (body.all) { await revokeAllDevices(user.id); return Response.json({ ok: true, revoked: "all" }); }
  if (!body.deviceId) return Response.json({ error: "missing" }, { status: 400 });
  await revokeDevice(user.id, body.deviceId);
  return Response.json({ ok: true, revoked: body.deviceId });
}
