import { loginSuper, superCookie, publicSuperAdmin } from "@/lib/superAuth";
import { requestIsHttps, clientIp } from "@/lib/identity";
import { incrWithTTL } from "@/lib/data/store";
import { RL } from "@/lib/data/keys";

export const runtime = "nodejs";

// The owner's door. Deliberately plainer than /api/identity/login: no OTP, no
// trusted devices, no "remember me" — a super-admin session is short-lived and
// re-established by typing the password again.
const MAX_ATTEMPTS = 10;
const WINDOW_SEC = 10 * 60;

export async function POST(request) {
  let body = {};
  try { body = await request.json(); } catch { body = {}; }

  // Counted per IP and BEFORE the password is checked, so a wrong guess costs
  // an attempt whether or not the address exists.
  const tries = await incrWithTTL(RL.superLoginIp(clientIp(request)), WINDOW_SEC);
  if (tries > MAX_ATTEMPTS) return Response.json({ error: "rate" }, { status: 429 });

  const admin = await loginSuper(body.email, body.password);
  // One generic failure for "no such admin" and "wrong password" alike — the
  // console never confirms who holds an account on it.
  if (!admin) return Response.json({ error: "invalid" }, { status: 401 });

  const res = Response.json({ ok: true, admin: publicSuperAdmin(admin) });
  res.headers.append("Set-Cookie", superCookie(admin.token, requestIsHttps(request)));
  return res;
}
