// THE CONNECTED GOOGLE CALENDAR, stored. One small object edited in
// /super → Application → Calendar, the same shape and lifecycle as novaConfig.
//
// NO CREDENTIAL LIVES HERE. See googleCalendarAuth.ts — the calendar is read by
// impersonating a service account it has been shared with, so this key holds
// only which calendar was chosen and what it is called.
import { getJSON, setJSON, delKeys } from "@/platform/db/store";
import { REG } from "@/platform/db/keys";

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
