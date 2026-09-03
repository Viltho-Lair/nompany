import { route } from "@/platform/http/route";
import { requestIsHttps } from "@/platform/auth/identity";
import { makeState, stateCookie } from "@/platform/auth/oauth";
import {
  isCalendarProvider, providerConfigured, calendarAuthorizeUrl, safeReturnPath,
} from "@/platform/auth/calendarProviders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Kick off "connect your calendar" for Google / Microsoft — oauth.ts's
// sign-in flow, calendar-scoped: same signed-state CSRF shape, a separate
// redirect path (calendarRedirectUri), and read-only scopes that grant
// nompany nothing but the ability to look at a calendar the person already
// owns. auth: "user" because this is data a signed-in person attaches to
// their OWN account, never something reachable before they exist here.
export const GET = route(
  { auth: "user", name: "calendar/start" },
  async ({ request, params }) => {
    const { provider } = params;
    if (!isCalendarProvider(provider)) return new Response("Unknown provider", { status: 404 });
    // Refused here rather than sent to the provider: an unconfigured client
    // id/secret would land the person on a consent screen that can only ever
    // fail, or worse, on a provider's own generic error page with no way back.
    if (!providerConfigured(provider)) return new Response("Provider not configured", { status: 503 });

    const next = safeReturnPath(new URL(request.url).searchParams.get("next"));
    const state = makeState(next);
    const res = Response.redirect(calendarAuthorizeUrl({ provider, request, state }), 302);
    const out = new Response(res.body, res);
    out.headers.append("Set-Cookie", stateCookie(state, requestIsHttps(request)));
    return out;
  },
);
