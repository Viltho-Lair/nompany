import { cookies } from "next/headers";
import { currentUser, DEVICE_COOKIE, DEVICE_HEADER } from "@/platform/auth/identity";
import { listDevices, revokeDevice, revokeAllDevices } from "@/platform/auth/otp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The signed-in person's trusted browsers (u:<UserID>:devices — user data).
// Revoking one forces an OTP on its next sign-in; revoking all is the recovery
// lever when a device is lost.
export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  // WHICH ROW IS THE ONE YOU ARE HOLDING. Without it a person tidying the list
  // could not tell their own browser from the one they meant to remove — the
  // labels are "Chrome on Windows" for every office machine. The browser is
  // known by its cookie, the desktop client by the header it sends instead.
  const here = (await cookies()).get(DEVICE_COOKIE)?.value || request.headers.get(DEVICE_HEADER) || "";
  const devices = (await listDevices(user.id)).map((d) => ({
    current: Boolean(here) && d.id === here,
    id: d.id, label: d.label, deviceType: d.deviceType || "", location: d.location || "",
    // Missing flag = written before recording and trusting were separated, and
    // those rows only ever existed when the person ticked trust.
    trusted: d.trusted !== false,
    // The address itself is never stored — only a keyed digest, surfaced as a
    // short fingerprint so two sign-ins can be told apart without exposing it.
    ipFingerprint: (d.ipHash || "").slice(0, 8),
    createdAt: d.createdAt, lastSeenAt: d.lastSeenAt, expiresAt: d.expiresAt,
  }));
  // This device first; the rest keep the store's order (most recently recorded first).
  devices.sort((a, b) => Number(b.current) - Number(a.current));
  return Response.json({ devices });
}

export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { body = {}; }

  if (body.all) { await revokeAllDevices(user.id); return Response.json({ ok: true, revoked: "all" }); }
  if (!body.deviceId) return Response.json({ error: "missing" }, { status: 400 });
  await revokeDevice(user.id, String(body.deviceId));
  return Response.json({ ok: true, revoked: body.deviceId });
}
