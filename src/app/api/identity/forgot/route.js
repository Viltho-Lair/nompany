import { requestPasswordReset } from "@/lib/identity";

export const runtime = "nodejs";

// Send a reset code. ALWAYS returns ok — never reveals whether the email exists.
export async function POST(request) {
  let body = {};
  try { body = await request.json(); } catch { body = {}; }
  await requestPasswordReset(body.email);
  return Response.json({ ok: true });
}
