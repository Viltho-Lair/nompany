import { refused } from "@/platform/http/route";
import { signup, otpCookie, requestIsHttps, clientIp, publicUser } from "@/platform/auth/identity";

export const runtime = "nodejs";

// TEMPORARY LOCK — registration is closed until further notice. Flip this back
// to `false` (or delete the flag and the guard below) to reopen sign-ups; this
// is the whole switch, kept as one greppable constant so lifting it is a
// one-line change with nothing else to unwind. Only the email+password route is
// locked: the OAuth path (signInWithProvider) both signs in AND creates, so
// closing it would lock returning users out of their own accounts.
const REGISTRATION_LOCKED = true;

// Create a User (and ONLY a User) and send a one-time code. NO session is
// issued here — access begins after the code is verified, so an unproven email
// address can never hold a logged-in session.
export async function POST(request: Request) {
  // Refuse before reading the body or touching Redis — a closed door costs
  // nothing to hold shut. 403, not 503: this is a deliberate policy, not the
  // server being briefly unable to serve the request.
  if (REGISTRATION_LOCKED) {
    return Response.json({ error: "closed" }, { status: 403 });
  }

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
