// THE CONNECTED GOOGLE CALENDAR, stored. One small object edited in
// /super → Application → Calendar, the same shape and lifecycle as novaConfig.
//
// NO CREDENTIAL LIVES HERE. See googleCalendarAuth.ts — the calendar is read by
// impersonating a service account it has been shared with, so this key holds
// only which calendar was chosen and what it is called.
import { getJSON, setJSON, delKeys } from "@/platform/db/store";
import { REG } from "@/platform/db/keys";
import { getCalendarAccessToken, calendarServiceAccount } from "@/platform/auth/googleCalendarAuth";
import { normaliseEvent, type CalendarEvent } from "@/shared/calendar";

export type CalendarConnection = {
  calendarId: string;
  summary: string;
  timeZone: string;
  connectedAt: number;
  connectedBy: string;
};

export async function getConnection(): Promise<CalendarConnection | null> {
  const stored = await getJSON<Partial<CalendarConnection>>(REG.googleCalendar);
  // TRIM BEFORE THE NULL CHECK, not after: a whitespace-only calendarId is
  // truthy raw, and clean() below would trim it to "" — returning a non-null
  // connection with an empty id. The screen (Task 7) branches on exactly
  // null-vs-not to decide between the calendar grid and the setup steps, so a
  // stray-whitespace id must read as "not connected", the same as absent.
  if (!stored?.calendarId?.trim()) return null;
  return clean(stored);
}

export async function saveConnection(patch: Partial<CalendarConnection>): Promise<CalendarConnection> {
  const next = clean(patch);
  await setJSON(REG.googleCalendar, next);
  return next;
}

export async function clearConnection(): Promise<void> {
  await delKeys(REG.googleCalendar);
}

// THE WRITE BOUNDARY: only known fields, only their own types. A body that
// arrives with an accessToken or a refreshToken in it cannot store one — which
// matters, because a later change that reintroduces OAuth must do so
// deliberately rather than by a field leaking through a spread.
function clean(v: Partial<CalendarConnection>): CalendarConnection {
  return {
    calendarId: String(v.calendarId || "").trim(),
    summary: String(v.summary || "").trim(),
    timeZone: String(v.timeZone || "UTC").trim(),
    connectedAt: Number(v.connectedAt) || Date.now(),
    connectedBy: String(v.connectedBy || "").trim(),
  };
}

const API = "https://www.googleapis.com/calendar/v3";

/**
 * Google's own refusal, carried rather than flattened.
 *
 * EVERY ONE OF THESE LOOKS LIKE "THE CALENDAR IS BROKEN" FROM THE SCREEN, and
 * each has a different fix — the API is not enabled, the calendar was never
 * shared, the impersonation binding is missing. Losing Google's reason turns
 * three distinct one-line fixes into one afternoon.
 */
export class GoogleCalendarError extends Error {
  status: number;
  reason: string;
  constructor(status: number, reason: string, message: string) {
    super(message);
    this.name = "GoogleCalendarError";
    this.status = status;
    this.reason = reason;
  }
}

async function google(path: string, params: Record<string, string> = {}) {
  const token = await getCalendarAccessToken();
  const url = `${API}${path}${Object.keys(params).length ? `?${new URLSearchParams(params)}` : ""}`;
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
    // A HUNG CALL IS A HELD SERVERLESS INVOCATION, the same reason the auth legs
    // carry one.
    signal: AbortSignal.timeout(10_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = String(body?.error?.errors?.[0]?.reason || body?.error?.status || "");
    throw new GoogleCalendarError(res.status, reason, explain(res.status, reason, body));
  }
  return body;
}

/** The four failures an operator can actually fix, each naming its fix. */
function explain(status: number, reason: string, body: any): string {
  const sa = calendarServiceAccount();
  const said = String(body?.error?.message || "").slice(0, 300);
  if (reason === "accessNotConfigured") {
    return `The Google Calendar API is not enabled on this project. Enable it at APIs & Services → Library → Google Calendar API. Google said: ${said}`;
  }
  if (status === 404) {
    return `That calendar is not visible to ${sa}. Share it in Google Calendar → Settings → the calendar → "Share with specific people" → ${sa}, with "See all event details". Google said: ${said}`;
  }
  if (status === 403) {
    return `Google refused the read. Usually the calendar is shared with less than "See all event details". Google said: ${said}`;
  }
  return `Google refused with ${status}${reason ? ` (${reason})` : ""}: ${said}`;
}

/**
 * A CALENDAR SHARED WITH A SERVICE ACCOUNT DOES NOT RELIABLY APPEAR HERE. List
 * entries need an acceptance step a service account never performs, while
 * events.list against the id works regardless. So this populates a convenience
 * dropdown and an empty result is NORMAL — never treat it as "not connected",
 * and never make it the only way to choose a calendar.
 */
export async function listCalendars(): Promise<{ id: string; summary: string; timeZone: string }[]> {
  const body = await google("/users/me/calendarList", { maxResults: "50", minAccessRole: "reader" });
  return (body.items || []).map((c: any) => ({
    id: String(c.id || ""), summary: String(c.summary || ""), timeZone: String(c.timeZone || "UTC"),
  })).filter((c: { id: string }) => c.id);
}

/** Reads a calendar by id — how a pasted id is validated and its real name shown back. */
export async function getCalendar(id: string): Promise<{ id: string; summary: string; timeZone: string }> {
  const c = await google(`/calendars/${encodeURIComponent(id)}`);
  return { id: String(c.id || id), summary: String(c.summary || id), timeZone: String(c.timeZone || "UTC") };
}

export async function listEvents(
  { calendarId, from, to }: { calendarId: string; from: string; to: string },
): Promise<CalendarEvent[]> {
  const body = await google(`/calendars/${encodeURIComponent(calendarId)}/events`, {
    // singleEvents EXPANDS a recurring series into its instances. Without it a
    // weekly standup is ONE event with a recurrence rule, and the grid would
    // show it once a year.
    singleEvents: "true",
    orderBy: "startTime",
    timeMin: from,
    timeMax: to,
    maxResults: "250",
  });
  return (body.items || []).map(normaliseEvent).filter(Boolean) as CalendarEvent[];
}
