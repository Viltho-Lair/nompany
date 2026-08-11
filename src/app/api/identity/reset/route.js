import { resetPassword, clearedSessionCookie } from "@/lib/identity";

export const runtime = "nodejs";

// Complete a reset with the emailed code. All sessions are revoked, so the
// person signs in fresh with the new password.
export async function POST(request) {
  let body = {};
  try { body = await request.json(); } catch { body = {}; }

  const result = await resetPassword({ email: body.email, code: body.code, newPassword: body.newPassword });
  if (result.error) return Response.json({ error: result.error }, { status: 400 });

  const res = Response.json({ ok: true });
  res.headers.append("Set-Cookie", clearedSessionCookie());
  return res;
}
