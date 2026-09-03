import { cookies } from "next/headers";
import { route } from "@/platform/http/route";
import { readState, clearedStateCookie, OAUTH_STATE_COOKIE } from "@/platform/auth/oauth";
import {
  isCalendarProvider, providerConfigured, safeReturnPath, DEFAULT_CALENDAR_RETURN_PATH,
} from "@/platform/auth/calendarProviders";
import { exchangeCode } from "@/platform/auth/calendarOAuth";
import { saveConnection } from "@/platform/auth/calendarConnections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Land back on the return path with a flag attached, never a bare API error —
// the person is sitting in a browser mid-redirect, not calling this route
// themselves. `path` is trusted here: every caller has already run it through
// safeReturnPath.
function landOn(request: Request, path: string, flag: string): Response {
  const url = new URL(path, new URL(request.url).origin);
  url.searchParams.set("calendar", flag);
  return Response.redirect(url.toString(), 302);
}

// Complete "connect your calendar": verify state, exchange the code, store
// the connection against the person who is actually signed in, then send
// them back where they started.
export const GET = route(
  { auth: "user", name: "calendar/callback" },
  async ({ request, params, user }) => {
    const url = new URL(request.url);
    const { provider } = params;
    if (!isCalendarProvider(provider) || !providerConfigured(provider)) {
      return landOn(request, DEFAULT_CALENDAR_RETURN_PATH, "error");
    }

    // CSRF, CHECKED BEFORE ANYTHING ELSE THAT TOUCHES THE CODE: the state must
    // be ours (readState verifies the HMAC and the TTL) AND match the cookie
    // set when this flow started. Only once that holds is `next` inside it
    // trustworthy enough to redirect to.
    const cookieState = (await cookies()).get(OAUTH_STATE_COOKIE)?.value || "";
    const stateParam = url.searchParams.get("state");
    const parsedState = stateParam && stateParam === cookieState ? readState(stateParam) : null;
    if (!parsedState) return landOn(request, DEFAULT_CALENDAR_RETURN_PATH, "error");

    // Re-validated, not just trusted because it came out of signed state: the
    // signature proves WE minted it, not that the path inside it was ever
    // checked — safeReturnPath is what actually rules out an absolute URL,
    // and running it twice costs nothing (see its own comment for why).
    const next = safeReturnPath(parsedState.next);

    const code = url.searchParams.get("code");
    if (url.searchParams.get("error") || !code) return landOn(request, next, "cancelled");

    let exchanged;
    try {
      exchanged = await exchangeCode({ provider, code, request });
    } catch {
      // The provider's own reason (invalid code, revoked consent, network
      // blip) is not for this redirect to carry — see calendarOAuth.ts: no
      // token and no provider detail may reach a redirect URL or a log line.
      return landOn(request, next, "error");
    }

    // THE CONNECTION IS STORED AGAINST THE SIGNED-IN USER FROM THE SESSION,
    // NEVER AGAINST ANYTHING IN `state`. The reference document this work
    // started from put a tenant id in `state` and keyed the tokens off it —
    // which makes a signed cookie the only thing standing between one
    // tenant's calendar and another's. Here `state` decides a redirect and
    // nothing else: forged, the worst outcome is landing on the wrong page,
    // already connected as yourself.
    await saveConnection(String(user.id), provider, {
      accessToken: exchanged.accessToken,
      expiresAtMs: exchanged.expiresAtMs,
      refreshToken: exchanged.refreshToken,
    });

    const res = landOn(request, next, "connected");
    const out = new Response(res.body, res);
    out.headers.append("Set-Cookie", clearedStateCookie());
    return out;
  },
);
