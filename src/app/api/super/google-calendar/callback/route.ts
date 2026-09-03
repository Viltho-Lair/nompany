import { cookies } from "next/headers";
import { route } from "@/platform/http/route";
import { readState, clearedStateCookie, OAUTH_STATE_COOKIE, origin } from "@/platform/auth/oauth";
import { providerConfigured, consoleCalendarRedirectUri } from "@/platform/auth/calendarProviders";
import { exchangeCode, fetchAccountEmail } from "@/platform/auth/calendarOAuth";
import { saveConnection } from "@/lib/data/googleCalendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Where the operator is sent back to. A constant, not a `next` out of `state`:
// the console has one calendar screen and nothing should be able to steer this
// redirect at all.
const CONSOLE_CALENDAR_PATH = "/super/application/calendar";

// EVERY EXIT FROM THIS ROUTE ENDS THE FLOW, success or not — a bad state, a
// cancelled consent screen and a failed exchange are as finished as a connected
// one — so `nc_oauth` is cleared on all of them, here, in one place. The state
// cookie carries a 600s TTL and there is no reason to leave a dead one alive
// once this route has already answered.
function landOn(request: Request, flag: string): Response {
  const url = new URL(CONSOLE_CALENDAR_PATH, origin(request));
  url.searchParams.set("calendar", flag);
  const res = Response.redirect(url.toString(), 302);
  const out = new Response(res.body, res);
  out.headers.append("Set-Cookie", clearedStateCookie());
  return out;
}

// Complete "connect the console's calendar": verify state, exchange the code,
// store the tokens against REG.googleCalendar, send the operator back.
//
// `auth: "super"` IS THE WHOLE POINT OF THIS ROUTE EXISTING SEPARATELY. The
// record it writes is the deployment's, so only a console session may write it;
// the account-level callback one door over is `auth: "user"` and writes the
// signed-in person's own row instead.
export const GET = route(
  { auth: "super", name: "super/google-calendar/callback" },
  async ({ request, admin }) => {
    const url = new URL(request.url);
    if (!providerConfigured("google")) return landOn(request, "error");

    // CSRF, CHECKED BEFORE ANYTHING ELSE TOUCHES THE CODE: the state must be
    // ours (readState verifies the HMAC and the TTL) AND match the cookie set
    // when the flow started.
    const cookieState = (await cookies()).get(OAUTH_STATE_COOKIE)?.value || "";
    const stateParam = url.searchParams.get("state");
    if (!stateParam || stateParam !== cookieState || !readState(stateParam)) {
      return landOn(request, "error");
    }

    const code = url.searchParams.get("code");
    if (url.searchParams.get("error") || !code) return landOn(request, "cancelled");

    let exchanged;
    try {
      exchanged = await exchangeCode({
        provider: "google",
        code,
        request,
        // THE EXACT STRING /authorize WAS GIVEN. Google compares the two byte
        // for byte; the default (the account surface's path) would be refused
        // here with an `invalid_grant` that says nothing about why.
        redirectUri: consoleCalendarRedirectUri(request),
      });
    } catch {
      // Google's own reason (invalid code, revoked consent, a network blip) is
      // not for this redirect to carry — see calendarOAuth.ts: no token and no
      // provider detail may reach a redirect URL or a log line.
      return landOn(request, "error");
    }

    // Best-effort label for the screen; a failed lookup must not fail a
    // connection that already succeeded (see fetchAccountEmail). Omitted from
    // the patch when empty rather than passed as "", so a RECONNECT whose
    // lookup blips keeps the address already on file.
    const accountEmail = await fetchAccountEmail("google", exchanged.accessToken);

    // NO calendarId IS SET HERE. Connected and chosen are two different
    // states and the screen renders them differently: the operator picks a
    // calendar from the dropdown next, which is a thing this flow could only
    // guess at. saveConnection carries an existing choice forward, so
    // reconnecting an expired grant does not silently unpick the calendar.
    await saveConnection({
      accessToken: exchanged.accessToken,
      expiresAtMs: exchanged.expiresAtMs,
      refreshToken: exchanged.refreshToken,
      connectedAt: Date.now(),
      connectedBy: String(admin?.email || ""),
      ...(accountEmail ? { accountEmail } : {}),
    });

    return landOn(request, "connected");
  },
);
