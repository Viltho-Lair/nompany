import { cookies } from "next/headers";
import { route } from "@/platform/http/route";
import { readState, clearedStateCookie, OAUTH_STATE_COOKIE, origin } from "@/platform/auth/oauth";
import {
  isCalendarProvider, providerConfigured, safeReturnPath, DEFAULT_CALENDAR_RETURN_PATH,
} from "@/platform/auth/calendarProviders";
import { exchangeCode, fetchAccountEmail } from "@/platform/auth/calendarOAuth";
import { saveConnection } from "@/platform/auth/calendarConnections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Land back on the return path with a flag attached, never a bare API error —
// the person is sitting in a browser mid-redirect, not calling this route
// themselves. `path` is trusted here: every caller has already run it through
// safeReturnPath against this same origin.
//
// EVERY EXIT FROM THIS ROUTE ENDS THE FLOW, success or not: a bad state, a
// cancelled consent screen and a failed exchange are just as finished as a
// connected one. `nc_oauth` is cleared on ALL of them here, in one place,
// rather than on only the success path — the state cookie carries a 600s TTL
// and there is no reason to leave a dead one alive for the rest of it once
// this route has already answered.
function landOn(request: Request, path: string, flag: string): Response {
  const url = new URL(path, origin(request));
  url.searchParams.set("calendar", flag);
  const res = Response.redirect(url.toString(), 302);
  const out = new Response(res.body, res);
  out.headers.append("Set-Cookie", clearedStateCookie());
  return out;
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
    // checked — safeReturnPath is what actually rules out an off-site
    // redirect, and running it twice costs nothing (see its own comment).
    const next = safeReturnPath(parsedState.next, origin(request));

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

    // Best-effort label for the account screen — see fetchAccountEmail's own
    // comment for why a failed lookup falls back to "" rather than failing
    // the connection that already succeeded. Omitted from the patch entirely
    // when empty, not passed through as "" — saveConnection only writes a
    // field it is GIVEN, so passing "" here would overwrite a good email
    // already on file the moment a RECONNECT's lookup has a transient
    // failure. Leaving it out lets saveConnection's own fallback
    // (`patch.accountEmail ?? existing?.accountEmail ?? ""`) keep whatever
    // was already stored.
    const accountEmail = await fetchAccountEmail(provider, exchanged.accessToken);

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
      ...(accountEmail ? { accountEmail } : {}),
    });

    return landOn(request, next, "connected");
  },
);
