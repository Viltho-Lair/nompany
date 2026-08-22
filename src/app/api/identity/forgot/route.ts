import { requestPasswordReset, clientIp } from "@/platform/auth/identity";

export const runtime = "nodejs";

// Send a reset code. ALWAYS returns ok — never reveals whether the email exists,
// and never reveals whether the request was rate-limited either: a different
// reply for "too many" would answer, over enough tries, the same question the
// uniform response exists to refuse.
export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { body = {}; }
  await requestPasswordReset({ email: String(body.email ?? ""), ip: clientIp(request) });
  return Response.json({ ok: true });
}
