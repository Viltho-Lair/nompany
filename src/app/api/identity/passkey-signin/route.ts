import { cookies } from "next/headers";
import { route, refused } from "@/platform/http/route";
import { beginSignIn } from "@/platform/auth/passkeys";
import {
  signInWithPasskey, sessionCookie, pendingCookie, deviceCookie, requestIsHttps, deviceFingerprint,
  publicUser, DEVICE_COOKIE,
} from "@/platform/auth/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// SIGN IN WITH A PASSKEY (platform/auth/passkeys.ts). PUBLIC, as every sign-in
// door is: `begin` hands out a challenge and the ticket holding it, `finish`
// checks what the device signed and opens a session — or, at the session limit,
// asks which session to end like every other sign-in.
const spec = { auth: "public", name: "identity/passkey-signin", status: { "passkey-invalid": 401 } };

export const POST = route({ ...spec, body: true }, async ({ request, body }) => {
  if (body.action === "begin") return { ok: true, ...(await beginSignIn(request)) };

  const jar = await cookies();
  const result = await signInWithPasskey(String(body.ticketId || ""), request, body.response, {
    deviceId: jar.get(DEVICE_COOKIE)?.value || "",
    device: deviceFingerprint(request),
  });
  if (refused(result)) return result;
  const isHttps = requestIsHttps(request);
  if (result.chooseSession) {
    const res = Response.json({ ok: true, chooseSession: true, sessions: result.sessions });
    res.headers.append("Set-Cookie", pendingCookie(result.ticketId, isHttps));
    if (result.deviceId) res.headers.append("Set-Cookie", deviceCookie(result.deviceId, isHttps));
    return res;
  }
  const res = Response.json({ ok: true, user: publicUser(result.user) });
  res.headers.append("Set-Cookie", sessionCookie(result.token, result.ttl, isHttps));
  if (result.deviceId) res.headers.append("Set-Cookie", deviceCookie(result.deviceId, isHttps));
  return res;
});
