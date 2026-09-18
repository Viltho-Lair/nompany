import { cookies } from "next/headers";
import { route, refused } from "@/platform/http/route";
import {
  pendingSignIn, chooseSessionToEnd, completeTwoFactor, sessionCookie, clearedPendingCookie, requestIsHttps,
  publicUser, PENDING_COOKIE, isDesktopClient, pendingCookie, deviceCookie,
} from "@/platform/auth/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A SIGN-IN PAUSED AT THE SESSION LIMIT (docs/functionality/sessions-and-devices.md).
//
// The password (and the code, where one was asked) is already proven; what is
// left is which of this person's sessions to end. PUBLIC because there is no
// session yet — the ticket in the HttpOnly cookie is the proof, it lives ten
// minutes, and it can only end a session the limit is actually asking about.
const spec = { auth: "public", name: "identity/signin" };

async function ticket() {
  return (await cookies()).get(PENDING_COOKIE)?.value || "";
}

export const GET = route(spec, async () => {
  const result = await pendingSignIn(await ticket());
  if (refused(result)) return result;
  return { ok: true, ...result };
});

// Two ways to finish: `code` answers the authenticator, `sessionId` names the
// session to end. Finishing the first can lead straight into the second.
export const POST = route({ ...spec, body: true, status: { invalid: 401, locked: 429 } }, async ({ request, body }) => {
  const desktop = isDesktopClient(request);
  const result = body.code !== undefined
    ? await completeTwoFactor(await ticket(), body.code, { trustThisDevice: Boolean(body.trustThisDevice), desktop })
    : await chooseSessionToEnd(await ticket(), body.sessionId, { desktop });
  if (refused(result)) return result;
  const recorded = "deviceId" in result ? String(result.deviceId || "") : "";
  // Still over the limit — somebody signed in again meanwhile. Ask again.
  if (result.chooseSession) {
    const res = Response.json({ ok: true, chooseSession: true, sessions: result.sessions });
    res.headers.append("Set-Cookie", pendingCookie(result.ticketId, requestIsHttps(request)));
    if (recorded) res.headers.append("Set-Cookie", deviceCookie(recorded, requestIsHttps(request)));
    return res;
  }
  const res = Response.json({
    ok: true, user: publicUser(result.user),
    trustRefused: "trustRefused" in result ? Boolean(result.trustRefused) : false,
  });
  if (recorded) res.headers.append("Set-Cookie", deviceCookie(recorded, requestIsHttps(request)));
  res.headers.append("Set-Cookie", sessionCookie(result.token, result.ttl, requestIsHttps(request)));
  res.headers.append("Set-Cookie", clearedPendingCookie());
  return res;
});
