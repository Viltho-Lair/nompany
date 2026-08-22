import { resetPassword, clearedSessionCookie, clientIp } from "@/platform/auth/identity";

export const runtime = "nodejs";

// Complete a reset with the emailed code. All sessions are revoked, so the
// person signs in fresh with the new password.
export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { body = {}; }

  const result = await resetPassword({
    email: String(body.email ?? ""),
    code: String(body.code ?? ""),
    newPassword: String(body.newPassword ?? ""),
    ip: clientIp(request),
  });
  if (result.error) {
    // A code is a credential, so guessing it is rate-limited exactly as a
    // password is — and 429 is a different answer from "wrong code", which the
    // client needs in order to stop retrying rather than retry harder.
    const limited = result.error === "rate-limited";
    const res = Response.json(
      { error: result.error, ...(result.retryAfter ? { retryAfter: result.retryAfter } : {}) },
      { status: limited ? 429 : 400 },
    );
    if (limited && result.retryAfter) res.headers.set("Retry-After", String(result.retryAfter));
    return res;
  }

  const res = Response.json({ ok: true });
  res.headers.append("Set-Cookie", clearedSessionCookie());
  return res;
}
