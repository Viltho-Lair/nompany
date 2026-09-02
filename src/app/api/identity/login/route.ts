import { refused } from "@/platform/http/route";
import { cookies } from "next/headers";
import {
  login, sessionCookie, otpCookie, requestIsHttps, clientIp, publicUser, deviceFingerprint, DEVICE_COOKIE,
  DEVICE_HEADER, isDesktopClient,
} from "@/platform/auth/identity";

export const runtime = "nodejs";

// Risk-based sign-in. The password is always checked first; a code is only sent
// when the browser isn't already trusted, so an OTP can never be triggered by
// someone who doesn't know the password.
export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { body = {}; }

  // The browser is remembered by a cookie; the desktop client, having none,
  // sends the same id in a header.
  const deviceId = (await cookies()).get(DEVICE_COOKIE)?.value
    || request.headers.get(DEVICE_HEADER)
    || "";
  const desktop = isDesktopClient(request);
  const result = await login({
    email: String(body.email ?? ""),
    password: String(body.password ?? ""),
    remember: Boolean(body.remember),
    deviceId,
    ip: clientIp(request),
    // Everything we can learn about this browser from the request itself —
    // label, type and coarse location — so a recognised device's row is kept
    // current instead of frozen at whenever it was first trusted.
    device: deviceFingerprint(request),
  });

  if (refused(result)) {
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

  // WHY THE DESKTOP CLIENT GETS THESE IN THE BODY. The cookie is what keeps a
  // token out of reach of script in a browser, and it stays the default for that
  // reason. A native client has no cookie jar to put one in — it holds the token
  // in the OS keychain instead — so it asks for the value. Same token, same
  // expiry; only where it is written changes.
  // Unrecognised device → hand back a challenge instead of a session.
  if (result.otpRequired) {
    const res = Response.json({
      ok: true, otpRequired: true, emailSent: result.emailSent,
      ...(desktop ? { challengeId: result.challengeId } : {}),
    });
    res.headers.append("Set-Cookie", otpCookie(result.challengeId, requestIsHttps(request)));
    return res;
  }

  const res = Response.json({
    ok: true, otpRequired: false, user: publicUser(result.user),
    ...(desktop ? { token: result.token, expiresIn: result.ttl } : {}),
  });
  res.headers.append("Set-Cookie", sessionCookie(result.token, result.ttl, requestIsHttps(request)));
  return res;
}
