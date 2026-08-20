import { cookies } from "next/headers";
import {
  login, sessionCookie, otpCookie, requestIsHttps, clientIp, publicUser, deviceFingerprint, DEVICE_COOKIE,
} from "@/lib/identity";

export const runtime = "nodejs";

// Risk-based sign-in. The password is always checked first; a code is only sent
// when the browser isn't already trusted, so an OTP can never be triggered by
// someone who doesn't know the password.
export async function POST(request) {
  let body = {};
  try { body = await request.json(); } catch { body = {}; }

  const deviceId = (await cookies()).get(DEVICE_COOKIE)?.value || "";
  const result = await login({
    email: body.email,
    password: body.password,
    remember: body.remember,
    deviceId,
    ip: clientIp(request),
    // Everything we can learn about this browser from the request itself —
    // label, type and coarse location — so a recognised device's row is kept
    // current instead of frozen at whenever it was first trusted.
    device: deviceFingerprint(request),
  });

  if (result.error) {
    const limited = result.error === "rate-limited" || result.error === "rate-email" || result.error === "rate-ip";
    const status = result.error === "suspended" ? 403 : limited ? 429 : 401;
    const res = Response.json(
      { error: result.error, ...(result.retryAfter ? { retryAfter: result.retryAfter } : {}) },
      { status },
    );
    // Tell the client HOW LONG rather than leaving it to guess and hammer.
    if (limited && result.retryAfter) res.headers.set("Retry-After", String(result.retryAfter));
    return res;
  }

  // Unrecognised device → hand back a challenge instead of a session.
  if (result.otpRequired) {
    const res = Response.json({ ok: true, otpRequired: true, emailSent: result.emailSent });
    res.headers.append("Set-Cookie", otpCookie(result.challengeId, requestIsHttps(request)));
    return res;
  }

  const res = Response.json({ ok: true, otpRequired: false, user: publicUser(result.user) });
  res.headers.append("Set-Cookie", sessionCookie(result.token, result.ttl, requestIsHttps(request)));
  return res;
}
