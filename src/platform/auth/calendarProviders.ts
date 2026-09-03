// Connected calendars (Google + Microsoft) — data, not sign-in.
//
// This is oauth.ts's calendar-scoped sibling, not a replacement for it: oauth.ts
// authenticates a person INTO nompany with identity-only scopes
// (openid email profile). This file authorises nompany to READ a calendar the
// person already owns, on a separate redirect path
// (/api/auth/calendar/callback/<provider>) so the two flows never collide and a
// calendar grant is never mistaken for a sign-in.
//
// `offlineParams` exists because "give me a refresh token" is spelled
// differently per provider: Google needs access_type=offline (+ prompt=consent
// so a returning user is asked again rather than silently re-issued the same
// grant without one); Microsoft needs offline_access IN THE SCOPE STRING
// itself — there is no separate query param. Get either wrong and the access
// token quietly stops refreshing once it expires, hours or days after the
// mistake was made.
import { origin } from "./oauth";

export type CalendarProvider = "google" | "microsoft";

export type ProviderConfig = {
  idEnv: string;
  secretEnv: string;
  authorize: string;
  token: string;
  revoke: string;
  scope: string;
  /** Extra authorize params this provider needs to issue a refresh token. */
  offlineParams: Record<string, string>;
  calendarsUrl: string;
  eventsUrl: (calendarId: string, fromISO: string, toISO: string) => string;
};

// A RECORD, so a provider name that came off a URL segment can index it —
// `isCalendarProvider` is the guard that makes that safe, and every caller
// runs it first. Same shape oauth.ts uses, so a third provider is a row, not a
// fork in every function that touches this one.
export const CALENDAR_PROVIDERS: Record<CalendarProvider, ProviderConfig> = {
  google: {
    idEnv: "GOOGLE_CLIENT_ID",
    secretEnv: "GOOGLE_CLIENT_SECRET",
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    revoke: "https://oauth2.googleapis.com/revoke",
    // Read-only: this feature displays a connected calendar, it never writes
    // to one.
    scope: "https://www.googleapis.com/auth/calendar.readonly",
    offlineParams: { access_type: "offline", prompt: "consent" },
    calendarsUrl: "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    // GOOGLE: singleEvents EXPANDS a recurring series into instances. Without
    // it a weekly standup is ONE event carrying a recurrence rule.
    eventsUrl: (calendarId, fromISO, toISO) =>
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
      new URLSearchParams({ singleEvents: "true", orderBy: "startTime", timeMin: fromISO, timeMax: toISO, maxResults: "250" }),
  },
  microsoft: {
    idEnv: "MICROSOFT_CLIENT_ID",
    secretEnv: "MICROSOFT_CLIENT_SECRET",
    // "common" lets both work and personal Microsoft accounts connect.
    authorize: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    token: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    // Microsoft has NO token-revocation endpoint for delegated (user) tokens —
    // there is no Graph or AAD call that invalidates one on demand. This was
    // considered, not forgotten: disconnecting drops our copy of the token and
    // it simply expires on Microsoft's side. Left "" so a later caller (Task 3)
    // knows to skip the revoke call for this provider rather than assume a gap.
    revoke: "",
    // WITHOUT offline_access MICROSOFT NEVER ISSUES A REFRESH TOKEN — it is
    // that provider's access_type=offline, and its absence fails silently an
    // hour later when the access token expires with nothing left to renew it.
    scope: "Calendars.Read offline_access",
    offlineParams: {},
    calendarsUrl: "https://graph.microsoft.com/v1.0/me/calendars",
    // MICROSOFT: /me/events does NOT expand recurrence; /me/calendarView DOES.
    // Same trap as Google's singleEvents, different spelling.
    eventsUrl: (_calendarId, fromISO, toISO) =>
      `https://graph.microsoft.com/v1.0/me/calendarView?` +
      new URLSearchParams({ startDateTime: fromISO, endDateTime: toISO, $top: "250", $orderby: "start/dateTime" }),
  },
};

export function isCalendarProvider(v: unknown): v is CalendarProvider {
  return v === "google" || v === "microsoft";
}

// Where the connect flow lands somebody when it wasn't told anywhere better.
export const DEFAULT_CALENDAR_RETURN_PATH = "/en/account";

// `next` travels inside SIGNED state (oauth.ts's makeState/readState), so it
// cannot be forged in transit — but the value that gets signed in the first
// place comes straight off a query string somebody else can construct. A
// link like `.../calendar/google/start?next=https://evil.example` would mint
// state carrying that URL, and the callback would 302 there once the person
// has connected a calendar as themselves: an open redirect wearing this
// feature's own trust.
//
// A PREFIX TEST CANNOT MODEL WHAT THE URL PARSER DOES, so this used to be one
// (`startsWith("/") && !startsWith("//")`) and it was wrong: the WHATWG URL
// parser strips every ASCII tab/CR/LF out of its ENTIRE input before it looks
// at a single character, so `"/\n/evil.example"` — which is exactly what
// `?next=/%0A/evil.example` decodes to by the time it reaches here — passes
// a prefix test (it starts with one "/", not two) and then, once the browser
// parses it, becomes `"//evil.example"`, which IS protocol-relative. The only
// check that cannot disagree with what a browser actually resolves is to
// resolve it the same way: parse `v` against the real origin and compare the
// RESULT's origin, not the raw string. Checked again in the callback, not
// just at mint time, because the cost of checking twice is nothing and the
// cost of trusting the first check alone is an open redirect the moment a
// second call site forgets it.
export function safeReturnPath(v: unknown, siteOrigin: string, fallback: string = DEFAULT_CALENDAR_RETURN_PATH): string {
  if (typeof v !== "string" || !v) return fallback;
  let parsed: URL;
  try {
    parsed = new URL(v, siteOrigin);
  } catch {
    return fallback;
  }
  if (parsed.origin !== siteOrigin) return fallback;
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function providerConfigured(p: CalendarProvider, env: NodeJS.ProcessEnv = process.env): boolean {
  const cfg = CALENDAR_PROVIDERS[p];
  return Boolean(env[cfg.idEnv] && env[cfg.secretEnv]);
}

// Which providers a "connect a calendar" screen should offer.
export function enabledCalendarProviders(env: NodeJS.ProcessEnv = process.env): CalendarProvider[] {
  return (Object.keys(CALENDAR_PROVIDERS) as CalendarProvider[]).filter((p) => providerConfigured(p, env));
}

// A calendar grant lives on its own callback path, distinct from oauth.ts's
// /api/auth/callback/<provider> sign-in path, so the two flows can never be
// confused for one another.
export function calendarRedirectUri(request: Request, p: CalendarProvider): string {
  return `${origin(request)}/api/auth/calendar/callback/${p}`;
}

export function calendarAuthorizeUrl(
  { provider, request, state }: { provider: CalendarProvider; request: Request; state: string },
): string {
  const cfg = CALENDAR_PROVIDERS[provider];
  const params: Record<string, string> = {
    // An absent client id is a misconfigured deployment, not a runtime branch
    // — same call as oauth.ts's authorizeUrl: let the provider refuse the
    // empty value with a message that says so, rather than checking here.
    client_id: process.env[cfg.idEnv] || "",
    redirect_uri: calendarRedirectUri(request, provider),
    response_type: "code",
    scope: cfg.scope,
    state,
    ...cfg.offlineParams,
  };
  // encodeURIComponent, not URLSearchParams, on purpose: URLSearchParams
  // encodes a space as "+", which is only unambiguous inside a form BODY.
  // Microsoft's multi-word scope ("Calendars.Read offline_access") belongs in
  // a query string here, where "%20" is the encoding that can't be misread.
  const qs = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return `${cfg.authorize}?${qs}`;
}
