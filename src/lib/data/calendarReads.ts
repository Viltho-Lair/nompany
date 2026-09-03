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

async function callProvider(provider: CalendarProvider, url: string, accessToken: string): Promise<any> {
  const res = await fetch(url, {
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

export async function listEvents(
  { userId, provider, calendarId, from, to }:
    { userId: string; provider: CalendarProvider; calendarId: string; from: string; to: string },
): Promise<CalendarEvent[]> {
  const accessToken = await getCalendarAccessToken(userId, provider);
  const cfg = CALENDAR_PROVIDERS[provider];
  const url = cfg.eventsUrl(calendarId, from, to);
  const body = await callProvider(provider, url, accessToken);
  const rows: any[] = (provider === "google" ? body.items : body.value) || [];
  const normalise = provider === "google" ? normaliseEvent : normaliseMicrosoftEvent;
  return rows.map(normalise).filter((e): e is CalendarEvent => e !== null);
}
