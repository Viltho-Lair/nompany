import { refused } from "@/platform/http/route";
import { signup, otpCookie, requestIsHttps, clientIp, publicUser } from "@/platform/auth/identity";

export const runtime = "nodejs";

// Create a User (and ONLY a User) and send a one-time code. NO session is
// issued here — access begins after the code is verified, so an unproven email
// address can never hold a logged-in session.
export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { body = {}; }

  const result = await signup({
    email: String(body.email ?? ""),
    password: String(body.password ?? ""),
    fullName: String(body.fullName ?? ""),
    ip: clientIp(request),
  });
  if (refused(result)) {
    const status = result.error === "exists" ? 409
      : result.error === "rate-email" || result.error === "rate-ip" ? 429
      : 400;
    // `failed` names the specific unmet password rules so the form can say why.
    return Response.json({ error: result.error, failed: result.failed }, { status });
  }

  // `emailSent:false` lets the UI say "we couldn't send the code" instead of
  // leaving someone staring at an empty inbox.
  const res = Response.json(
    { ok: true, otpRequired: true, emailSent: result.emailSent, user: publicUser(result.user) },
    { status: 201 }
  );
  res.headers.append("Set-Cookie", otpCookie(result.challengeId, requestIsHttps(request)));
  return res;
}
