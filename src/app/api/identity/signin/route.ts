import { cookies } from "next/headers";
import { route, refused } from "@/platform/http/route";
import {
  pendingSignIn, completeTwoFactor, sessionCookie, clearedPendingCookie, requestIsHttps,
  publicUser, PENDING_COOKIE, isDesktopClient, deviceCookie,
} from "@/platform/auth/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A SIGN-IN PAUSED FOR THE AUTHENTICATOR CODE (docs/functionality/sessions-and-devices.md).
//
// The password is already proven; what is left is the code from the person's
// authenticator app, or a recovery code. PUBLIC because there is no session
// yet — the ticket in the HttpOnly cookie is the proof, it lives ten minutes,
// and five wrong codes spend it.
const spec = { auth: "public", name: "identity/signin" };

async function ticket() {
  return (await cookies()).get(PENDING_COOKIE)?.value || "";
}

export const GET = route(spec, async () => {
  const result = await pendingSignIn(await ticket());
  if (refused(result)) return result;
  return { ok: true, ...result };
});

export const POST = route({ ...spec, body: true, status: { invalid: 401, locked: 429 } }, async ({ request, body }) => {
  const result = await completeTwoFactor(await ticket(), body.code, {
    trustThisDevice: Boolean(body.trustThisDevice), desktop: isDesktopClient(request),
  });
  if (refused(result)) return result;
  const res = Response.json({ ok: true, user: publicUser(result.user) });
  res.headers.append("Set-Cookie", sessionCookie(result.token, result.ttl, requestIsHttps(request)));
  res.headers.append("Set-Cookie", clearedPendingCookie());
  if (result.deviceId) res.headers.append("Set-Cookie", deviceCookie(result.deviceId, requestIsHttps(request)));
  return res;
});
