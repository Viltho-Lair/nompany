import { cookies } from "next/headers";
import { route } from "@/platform/http/route";
import { readState, clearedStateCookie, OAUTH_STATE_COOKIE, origin } from "@/platform/auth/oauth";
import {
  isCalendarProvider, providerConfigured, safeReturnPath, DEFAULT_CALENDAR_RETURN_PATH,
} from "@/platform/auth/calendarProviders";
import { exchangeCode, fetchAccountEmail } from "@/platform/auth/calendarOAuth";
import { saveConnection } from "@/platform/auth/calendarConnections";
import { log } from "@/platform/http/observability";

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
      // LOGGED, LIKE EVERY OTHER EXIT FROM THIS ROUTE. What the browser gets
      // back is one flag — deliberately, because a redirect URL the person
      // keeps must not carry a provider's reason — and that left the ONLY
      // record of a failed connection being the words "try again" on a screen.
      // A dropped FIELD_ENCRYPTION_KEY, an unregistered redirect URI and a
      // refused exchange all looked identical from the outside AND left nothing
      // behind on the inside. `reason` names the stage; redact()
      // (observability.ts) still applies, and providerReason only ever yields
      // an error CODE.
      log.error("calendar connect failed", {
        provider: String(provider),
        reason: "unknown-or-unconfigured-provider",
      });
      return landOn(request, DEFAULT_CALENDAR_RETURN_PATH, "error");
    }

    // CSRF, CHECKED BEFORE ANYTHING ELSE THAT TOUCHES THE CODE: the state must
    // be ours (readState verifies the HMAC and the TTL) AND match the cookie
    // set when this flow started. Only once that holds is `next` inside it
    // trustworthy enough to redirect to.
    const cookieState = (await cookies()).get(OAUTH_STATE_COOKIE)?.value || "";
    const stateParam = url.searchParams.get("state");
    const parsedState = stateParam && stateParam === cookieState ? readState(stateParam) : null;
    if (!parsedState) {
      // WHICH of the four, because they are four different bugs: no state came
      // back at all, no cookie survived the round trip (a dropped Set-Cookie, a
      // cross-site landing), a cookie that does not match the parameter (a
      // second flow started in another tab overwrote it), or one that matches
      // and still does not verify — expired past the 600s TTL, or signed with a
      // different secret, since stateSecret() falls back through OTP_SECRET and
      // then FIELD_ENCRYPTION_KEY and a deploy that changes either invalidates
      // every state in flight.
      log.error("calendar connect failed", {
        provider: String(provider),
        reason: !stateParam ? "no-state-param"
          : !cookieState ? "no-state-cookie"
          : stateParam !== cookieState ? "state-cookie-mismatch"
          : "state-unverifiable",
      });
      return landOn(request, DEFAULT_CALENDAR_RETURN_PATH, "error");
    }

    // Re-validated, not just trusted because it came out of signed state: the
    // signature proves WE minted it, not that the path inside it was ever
    // checked — safeReturnPath is what actually rules out an off-site
    // redirect, and running it twice costs nothing (see its own comment).
    const next = safeReturnPath(parsedState.next, origin(request));

    const code = url.searchParams.get("code");
    if (url.searchParams.get("error") || !code) return landOn(request, next, "cancelled");

    // THE STORE WRITE IS INSIDE THIS try, NOT AFTER IT. saveConnection
    // encrypts both tokens, and encryptField THROWS when FIELD_ENCRYPTION_KEY
    // is missing or malformed — a deployment problem, but one that surfaces
    // here at the worst possible moment: the person has already consented, so
    // the grant is LIVE AT THE PROVIDER with nothing on this side recording
    // it. Left outside, that threw out of the handler and the person got a
    // bare 500 from an API route they never meant to visit. Inside, it lands
    // like every other failure this flow already knows how to end — back on
    // their own page with ?calendar=error, which the screen renders as "we
    // couldn't connect your calendar. Try again."
    try {
      const exchanged = await exchangeCode({ provider, code, request });

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
    } catch (e) {
      // THE MESSAGE IS LOGGED; THE REDIRECT STILL CARRIES NOTHING. Those are
      // two different audiences — a URL survives in browser history and in
      // whatever the person pastes into a support thread, a server log does not
      // leave the deployment. exchangeCode composes its messages out of
      // providerReason, which yields an error CODE ("invalid_grant") or
      // "http <status>" and never a token or a response body; a storage failure
      // yields the cipher layer's own wording, which names no key material.
      log.error("calendar connect failed", {
        provider: String(provider),
        reason: (e as Error)?.message || "unknown",
      });
      // The provider's own reason (invalid code, revoked consent, network
      // blip) is not for this redirect to carry — see calendarOAuth.ts: no
      // token and no provider detail may reach a redirect URL or a log line.
      // The same holds for a storage failure: nothing about the key, the
      // cipher or the store belongs in a URL a browser will keep.
      return landOn(request, next, "error");
    }

    return landOn(request, next, "connected");
  },
);
