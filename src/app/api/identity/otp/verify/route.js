import { cookies } from "next/headers";
import {
  verifyOtp, sessionCookie, clearedOtpCookie, deviceCookie, deviceFingerprint,
  requestIsHttps, publicUser, OTP_COOKIE, DEVICE_COOKIE,
} from "@/lib/identity";

export const runtime = "nodejs";

// Step 2 of both signup and an untrusted login: exchange the one-time code for
// a session. Success also proves the address, so it stamps email verification
// either way, and optionally remembers this browser for 30 days.
export async function POST(request) {
  let body = {};
  try { body = await request.json(); } catch { body = {}; }

  const jar = await cookies();
  const challengeId = jar.get(OTP_COOKIE)?.value || "";
  if (!challengeId) return Response.json({ error: "expired" }, { status: 400 });

  const result = await verifyOtp({
    challengeId,
    code: body.code,
    remember: body.remember,
    trustThisDevice: body.trustThisDevice,
    device: deviceFingerprint(request),
    // Reuse this browser's existing row rather than adding a duplicate.
    deviceId: jar.get(DEVICE_COOKIE)?.value || "",
  });
  if (result.error) {
    const status = result.error === "suspended" ? 403 : result.error === "notfound" ? 404 : 400;
    return Response.json({ error: result.error, attemptsLeft: result.attemptsLeft }, { status });
  }

  const isHttps = requestIsHttps(request);
  const res = Response.json({ ok: true, user: publicUser(result.user), deviceTrusted: !!result.deviceId });
  res.headers.append("Set-Cookie", sessionCookie(result.token, result.ttl, isHttps));
  res.headers.append("Set-Cookie", clearedOtpCookie()); // the challenge is spent
  if (result.deviceId) res.headers.append("Set-Cookie", deviceCookie(result.deviceId, isHttps));
  return res;
}
