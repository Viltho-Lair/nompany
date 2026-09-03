import { route } from "@/platform/http/route";
import { requestIsHttps } from "@/platform/auth/identity";
import { makeState, stateCookie } from "@/platform/auth/oauth";
import {
  providerConfigured, calendarAuthorizeUrl, consoleCalendarRedirectUri,
} from "@/platform/auth/calendarProviders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// KICK OFF "CONNECT THE CONSOLE'S CALENDAR". The account surface's own start
// route (/api/auth/calendar/<provider>/start) is the same flow one door over,
// and the two are separate for exactly one reason: this one is `auth: "super"`.
// What it eventually writes is REG.googleCalendar — the DEPLOYMENT's calendar,
// not a person's — so the authority to begin it has to be the console's, and a
// route any signed-in user may reach cannot supply that. See
// consoleCalendarRedirectUri's own comment for the fuller version.
//
// GOOGLE ONLY, deliberately: the console keeps one calendar, at a key named
// googleCalendar, and there is no second console calendar for Microsoft to be.
export const GET = route(
  { auth: "super", name: "super/google-calendar/start" },
  async ({ request }) => {
    // Refused here rather than sent to Google: an unconfigured client id/secret
    // would land the operator on a consent screen that can only ever fail, or
    // on Google's own generic error page with no way back.
    if (!providerConfigured("google")) return new Response("Provider not configured", { status: 503 });

    // NOTHING TRAVELS IN `state` BUT CSRF. The account flow carries a `next`
    // path because a person may start connecting from several places; the
    // console has exactly one calendar screen, so the callback's destination is
    // a constant there and there is nothing here worth a caller being able to
    // influence.
    const state = makeState("");
    const res = Response.redirect(
      calendarAuthorizeUrl({
        provider: "google",
        request,
        state,
        redirectUri: consoleCalendarRedirectUri(request),
      }),
      302,
    );
    const out = new Response(res.body, res);
    out.headers.append("Set-Cookie", stateCookie(state, requestIsHttps(request)));
    return out;
  },
);
