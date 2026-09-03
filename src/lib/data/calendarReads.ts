// READING A PERSON'S OWN CONNECTED CALENDAR — either provider, one shape out.
//
// This is googleCalendar.ts's per-user sibling, not a replacement for it:
// that file reads the CONSOLE's single Google calendar (REG.googleCalendar,
// no userId, service-account auth). This one reads a calendar a PERSON
// connected via OAuth (calendarConnections.ts, one row per user+provider),
// for either Google or Microsoft, through the single door
// getCalendarAccessToken already provides — this file never touches a
// refresh token, an expiry, or the store a connection lives in.
import { getCalendarAccessToken } from "@/platform/auth/calendarOAuth";
import { CALENDAR_PROVIDERS, type CalendarProvider } from "@/platform/auth/calendarProviders";
import { normaliseEvent, normaliseMicrosoftEvent, type CalendarEvent } from "@/shared/calendar";
// REUSED, NOT REDECLARED — same reasoning as calendarOAuth.ts importing this
// same type from this same file: it is exactly `(input, init) =>
// Promise<Response>`, which is what a fake fetch needs to satisfy for a test,
// and the real global `fetch` already satisfies it too.
import type { FetchLike } from "@/platform/auth/googleFederation";

/**
 * The provider's own refusal, carried rather than flattened.
 *
 * "API not enabled", "token expired", "insufficient permissions" and
 * "calendar not found" all render as the same blank grid from a screen, and
 * each has a different fix — losing the provider's own message turns four
 * distinct one-line fixes into a guessing game. `provider` and `status` are
 * typed fields (not just baked into the message) so a caller can branch on
 * them without parsing text.
 */
export class CalendarApiError extends Error {
  status: number;
  provider: CalendarProvider;
  constructor(status: number, provider: CalendarProvider, message: string) {
    super(message);
    this.name = "CalendarApiError";
    this.status = status;
    this.provider = provider;
  }
}

// Google's error body nests under error.message; Graph's does too
// (`{ error: { code, message } }`) — same field, different API, so one
// extractor covers both rather than a per-provider branch that would drift
// the moment either provider's error shape changed.
function providerMessage(body: any, res: Response): string {
  const said = body?.error?.message;
  return typeof said === "string" && said ? said : `http ${res.status}`;
}

async function callProvider(
  provider: CalendarProvider,
  url: string,
  accessToken: string,
  // Defaults to the real fetch so every existing call site is unchanged;
  // listEvents below is the only caller that ever overrides it, so a test can
  // drive pagination without a live network call.
  fetchImpl: FetchLike = fetch as FetchLike,
): Promise<any> {
  const res = await fetchImpl(url, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    // A HUNG CALL IS A HELD SERVERLESS INVOCATION — same reason
    // googleCalendar.ts's own fetch carries one.
    signal: AbortSignal.timeout(10_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new CalendarApiError(res.status, provider, `${provider} calendar API: ${providerMessage(body, res)}`);
  }
  return body;
}

/**
 * A CALENDAR LIST'S ROW SHAPE DIFFERS PER PROVIDER — Google's calendarList
 * items key the name as `summary`, Graph's key it as `name` and wrap the
 * array in `value` rather than `items`. Both are normalised to the same
 * `{ id, summary }` here so a picker component never branches on provider.
 */
export async function listCalendars(
  userId: string,
  provider: CalendarProvider,
): Promise<{ id: string; summary: string }[]> {
  const accessToken = await getCalendarAccessToken(userId, provider);
  const cfg = CALENDAR_PROVIDERS[provider];
  const body = await callProvider(provider, cfg.calendarsUrl, accessToken);
  const rows: any[] = (provider === "google" ? body.items : body.value) || [];
  return rows
    .map((c) => ({
      id: String(c.id || ""),
      summary: String((provider === "google" ? c.summary : c.name) || ""),
    }))
    .filter((c) => c.id);
}

// Injected so paging is provable without a live connection or a live network
// call — same shape as calendarOAuth.ts's CalendarAuthDeps, for the same
// reason. `getAccessTokenImpl` exists purely for that: a fake fetch alone
// cannot drive listEvents through a real getCalendarAccessToken, which needs
// a real stored, encrypted connection to load.
export type CalendarReadDeps = {
  fetchImpl?: FetchLike;
  getAccessTokenImpl?: (userId: string, provider: CalendarProvider) => Promise<string>;
};

// A CALENDAR CAN HOLD MORE EVENTS THAN ONE RESPONSE PAGE HOLDS. Both
// providers cap a single page — Google's maxResults=250, Microsoft's
// $top=250 (both set in calendarProviders.ts's eventsUrl) — and neither
// errors when there's more; each just says so, differently: Google returns
// `nextPageToken`, Microsoft returns `@odata.nextLink`. NOT FOLLOWING EITHER
// IS SILENT DATA LOSS — the person sees a calendar that is quietly missing
// entries, with nothing on screen or in the response saying anything was
// dropped. MAX_EVENT_PAGES bounds how far this follows, deliberately: an
// unbounded loop turns one calendar's worth of history into a stuck request.
// 4 pages * 250 events/page = 1000 events over the requested range — past
// that the result is still truncated, but only for a range far outside what
// this screen's month/week views ever ask for.
const MAX_EVENT_PAGES = 4;

export async function listEvents(
  { userId, provider, calendarId, from, to }:
    { userId: string; provider: CalendarProvider; calendarId: string; from: string; to: string },
  deps: CalendarReadDeps = {},
): Promise<CalendarEvent[]> {
  const getAccessToken = deps.getAccessTokenImpl ?? getCalendarAccessToken;
  const accessToken = await getAccessToken(userId, provider);
  const cfg = CALENDAR_PROVIDERS[provider];
  const normalise = provider === "google" ? normaliseEvent : normaliseMicrosoftEvent;
  const firstUrl = cfg.eventsUrl(calendarId, from, to);

  const events: CalendarEvent[] = [];
  let url: string | undefined = firstUrl;
  for (let page = 0; page < MAX_EVENT_PAGES && url; page++) {
    const body = await callProvider(provider, url, accessToken, deps.fetchImpl);
    const rows: any[] = (provider === "google" ? body.items : body.value) || [];
    for (const row of rows) {
      const e = normalise(row);
      if (e) events.push(e);
    }
    if (provider === "google") {
      // Google's continuation is a TOKEN, not a URL — it travels back as a
      // query param on the SAME request, so the base url (with its
      // singleEvents/orderBy/timeMin/timeMax) is reused rather than rebuilt.
      const nextToken = body.nextPageToken;
      url = typeof nextToken === "string" && nextToken
        ? `${firstUrl}&pageToken=${encodeURIComponent(nextToken)}`
        : undefined;
    } else {
      // Microsoft's continuation IS a full URL, already carrying its own
      // query — fetched directly, never rebuilt from calendarId/from/to.
      const nextLink = body["@odata.nextLink"];
      url = typeof nextLink === "string" && nextLink ? nextLink : undefined;
    }
  }
  return events;
}
