import {
  logout, logoutEverywhere, clearedSessionCookie, requestSessionToken,
} from "@/platform/auth/identity";

export const runtime = "nodejs";

// Revokes only THIS session (other devices stay signed in) and clears the cookie.
//
// THE TOKEN IS READ THE SAME WAY EVERY OTHER ROUTE READS IT. This used to reach
// straight into the cookie jar, which is correct for a browser and silently
// wrong for the desktop client: it carries the session as a bearer, so there was
// no cookie to find, nothing was revoked, and the app cleared its keychain while
// the session stayed alive on the server until it expired on its own. A sign-out
// that does not sign out is worse than one that fails.
export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { body = {}; }

  const token = await requestSessionToken();
  if (token) {
    if (body.everywhere) await logoutEverywhere(token);
    else await logout(token);
  }

  const res = Response.json({ ok: true });
  res.headers.append("Set-Cookie", clearedSessionCookie());
  return res;
}
