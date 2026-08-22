import { route } from "@/platform/http/route";
import { loginSuper, superCookie, publicSuperAdmin } from "@/platform/auth/superAuth";
import { requestIsHttps, clientIp, deviceFingerprint } from "@/platform/auth/identity";
import { incrWithTTL } from "@/platform/db/store";
import { RL } from "@/platform/db/keys";

export const runtime = "nodejs";

// The owner's door. Deliberately plainer than /api/identity/login: no OTP, no
// trusted devices, no "remember me" — a super-admin session is short-lived and
// re-established by typing the password again.
//
// PUBLIC, obviously: there is no session yet. This is the one route under /super
// that cannot ask for one, which is exactly why it carries the rate limit.
const MAX_ATTEMPTS = 10;
const WINDOW_SEC = 10 * 60;

export const POST = route(
  {
    auth: "public",
    body: true,
    name: "super/login",
    // `invalid` HERE MEANS "that credential was rejected", which is a 401. The
    // same name means "that field is malformed" everywhere else, which is a 400.
    // Identity's password route carries the same override for the same reason,
    // and both go away when the services stop reusing one name for two meanings.
    status: { invalid: 401 },
  },
  async ({ request, body }) => {
    // Counted per IP and BEFORE the password is checked, so a wrong guess costs
    // an attempt whether or not the address exists.
    const tries = await incrWithTTL(RL.superLoginIp(clientIp(request)), WINDOW_SEC);
    if (tries > MAX_ATTEMPTS) return { error: "rate" };

    const admin = await loginSuper(body.email, body.password, {
      code: String(body.code || ""),
      // The browser and the city, so the Security screen can answer "is that
      // one me?" rather than listing six identical timestamps.
      device: deviceFingerprint(request),
    });

    // One generic failure for "no such admin", "wrong password" and "wrong
    // code" alike — the console never confirms who holds an account on it.
    if (!admin) return { error: "invalid" };

    // THE SECOND FACTOR IS ASKED FOR ONLY AFTER THE PASSWORD WAS RIGHT, which
    // is unavoidable — the form has to know whether to show the field — and is
    // why the rate limit above counts every attempt rather than only failures.
    // Somebody who learns that an address has MFA has already supplied its
    // password; the code is what stands between them and the console.
    if (admin.mfaRequired) return { status: 401, body: { error: "mfa-required" } };

    const res = Response.json({ ok: true, admin: publicSuperAdmin(admin) });
    res.headers.append("Set-Cookie", superCookie(admin.token, requestIsHttps(request)));
    return res;
  },
);
