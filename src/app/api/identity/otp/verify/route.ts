import { refused } from "@/platform/http/route";
import { cookies } from "next/headers";
import {
  verifyOtp, sessionCookie, clearedOtpCookie, deviceCookie, deviceFingerprint,
  requestIsHttps, publicUser, OTP_COOKIE, DEVICE_COOKIE,
  DEVICE_HEADER, isDesktopClient,
} from "@/platform/auth/identity";

export const runtime = "nodejs";

// Step 2 of both signup and an untrusted login: exchange the one-time code for
// a session. Success also proves the address, so it stamps email verification
// either way, and optionally remembers this browser for 30 days.
export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { body = {}; }

  const jar = await cookies();
  const desktop = isDesktopClient(request);
  // The challenge rides in a short-lived cookie so a browser never exposes it to
  // script. The desktop client was handed the id in the login body instead, and
  // sends it back here — the same challenge either way.
  const challengeId = jar.get(OTP_COOKIE)?.value
    || (desktop ? String(body.challenge_id ?? body.challengeId ?? "") : "")
    || "";
  if (!challengeId) return Response.json({ error: "expired" }, { status: 400 });

  const result = await verifyOtp({
    challengeId,
    code: body.code,
    remember: Boolean(body.remember),
    // The desktop client spells these the other way; accept both rather than
    // making one of the two clients wrong.
    trustThisDevice: Boolean(body.trustThisDevice ?? body.trust_this_device),
    device: deviceFingerprint(request),
    // Reuse this client's existing row rather than adding a duplicate — cookie
    // for a browser, header for the desktop app.
    deviceId: jar.get(DEVICE_COOKIE)?.value || request.headers.get(DEVICE_HEADER) || "",
  });
  if (refused(result)) {
    const status = result.error === "suspended" ? 403 : result.error === "notfound" ? 404 : 400;
    return Response.json({ error: result.error, attemptsLeft: result.attemptsLeft }, { status });
  }

  const isHttps = requestIsHttps(request);
  const res = Response.json({
    ok: true, user: publicUser(result.user), deviceTrusted: !!result.deviceId,
    // Same reasoning as the login route: a client with no cookie jar is told the
    // values instead of being handed cookies it cannot keep.
    ...(desktop ? { token: result.token, expiresIn: result.ttl, deviceId: result.deviceId || "" } : {}),
  });
  res.headers.append("Set-Cookie", sessionCookie(result.token, result.ttl, isHttps));
  res.headers.append("Set-Cookie", clearedOtpCookie()); // the challenge is spent
  if (result.deviceId) res.headers.append("Set-Cookie", deviceCookie(result.deviceId, isHttps));
  return res;
}
