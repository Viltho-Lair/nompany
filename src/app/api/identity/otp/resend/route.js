import { cookies } from "next/headers";
import { resendOtp, clientIp, OTP_COOKIE } from "@/platform/auth/identity";

export const runtime = "nodejs";

// Re-send the code for the in-flight challenge. Issues a BRAND-NEW code (the
// previous one stops working) and resets the attempt counter. Guarded by a
// 60s cooldown plus the per-email / per-IP hourly limits.
export async function POST(request) {
  const challengeId = (await cookies()).get(OTP_COOKIE)?.value || "";
  if (!challengeId) return Response.json({ error: "expired" }, { status: 400 });

  const result = await resendOtp({ challengeId, ip: clientIp(request) });
  if (result.error) {
    const status = result.error === "cooldown" || result.error === "rate-email" || result.error === "rate-ip" ? 429 : 400;
    return Response.json({ error: result.error, retryInMs: result.retryInMs }, { status });
  }
  return Response.json({ ok: true, emailSent: result.emailSent });
}
