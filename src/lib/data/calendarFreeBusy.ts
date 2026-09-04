// WHEN SOMEBODY IS BUSY — NEVER WHAT THEY ARE DOING.
//
// This is the file the whole phase's privacy promise rests on. A colleague
// looking at somebody's availability sees blocks of time and nothing else: no
// title, no location, no attendees, no organiser. Two providers answer that
// question, and the guarantee has a completely different footing on each:
//
//   GOOGLE  — structural. `freeBusy.query` has NO title field. There is no way
//             to leak one through this endpoint because the endpoint cannot
//             express one; a period is a start and an end.
//   MICROSOFT — a RULE THIS CODE KEEPS. `getSchedule` returns `scheduleItems`
//             alongside `availabilityView`, and those rows carry `subject` and
//             `location`. Reading them would be a one-line change that compiles,
//             passes every type check, and quietly turns a free/busy view into
//             a window onto somebody's meetings.
//
// So the Microsoft path reads `availabilityView` and nothing else, and the
// comment sitting directly above that read names exactly what would leak.
//
// THE DELIBERATE NON-FALLBACK. `getSchedule` can need more than Calendars.Read
// in some tenants, and there is an obvious rescue: read /me/calendarView and
// derive busy blocks from the events. That is refused here. It would pull every
// meeting's subject and location into this process for a COLLEAGUE-FACING
// feature — the exact thing this phase forbids — in the one situation nobody is
// watching, and it would do it silently. A visible failure is the better
// outcome, so Graph's own refusal is carried to the caller instead.
//
// NOTHING IS STORED. Intervals are fetched on demand and discarded — no cache,
// no key. Somebody's calendar changes minute to minute, and a stale copy of when
// they are busy is both wrong and a copy of data we promised only to pass
// through.
import { getCalendarAccessToken } from "@/platform/auth/calendarOAuth";
import { getConnection } from "@/platform/auth/calendarConnections";
import { CALENDAR_PROVIDERS, type CalendarProvider } from "@/platform/auth/calendarProviders";
import { mergeBusy, availabilityViewToIntervals, type BusyInterval } from "@/shared/calendar";
import { callProvider, CalendarApiError } from "./calendarReads";
import type { FetchLike } from "@/platform/auth/googleFederation";

// GRAPH'S SLOT SIZE, AND THE ANCHOR availabilityViewToIntervals COUNTS FROM.
// One constant because the two must agree: ask for 30-minute slots and decode
// as 60 and every meeting renders at the wrong time, at twice its length, with
// nothing saying so.
const SLOT_MINUTES = 30;

// Same injection shape as calendarReads.ts's CalendarReadDeps, for the same
// reason — a function with no seam can only be driven against the real network
// and a real stored, encrypted connection, which makes "an empty accountEmail
// never reaches Graph" and "a Graph refusal surfaces" both unprovable.
// `getConnectionImpl` is this file's own addition: the Microsoft path reads the
// stored connection for one field, and that read is exactly what the empty-email
// assertion needs to control.
export type CalendarFreeBusyDeps = {
  fetchImpl?: FetchLike;
  getAccessTokenImpl?: (userId: string, provider: CalendarProvider) => Promise<string>;
  getConnectionImpl?: typeof getConnection;
};

/**
 * GRAPH WANTS A WALL CLOCK PLUS A ZONE, not an instant — `{ dateTime, timeZone }`,
 * the same DateTimeTimeZone pair shared/calendar.ts's `microsoftInstant` unpicks
 * on the way back in. This is that conversion in the other direction: the
 * instant is re-expressed as UTC wall time with the designator stripped, and
 * "UTC" named beside it, so there is no zone left for Graph to assume.
 */
function graphDateTime(iso: string): { dateTime: string; timeZone: string } {
  const ms = Date.parse(iso);
  const utc = Number.isFinite(ms) ? new Date(ms).toISOString() : iso;
  return { dateTime: utc.replace(/Z$/, ""), timeZone: "UTC" };
}

/**
 * One person's busy blocks over a window, from whichever calendar they connected.
 *
 * Returns MERGED intervals: sorted, non-overlapping, back-to-back runs fused —
 * so a caller counting gaps never has to know which provider answered.
 */
export async function busyFor(
  { userId, provider, from, to }:
    { userId: string; provider: CalendarProvider; from: string; to: string },
  deps: CalendarFreeBusyDeps = {},
): Promise<BusyInterval[]> {
  const getAccessToken = deps.getAccessTokenImpl ?? getCalendarAccessToken;
  const accessToken = await getAccessToken(userId, provider);
  const url = CALENDAR_PROVIDERS[provider].freeBusyUrl;

  if (provider === "google") {
    // `items: [{ id: "primary" }]` — GOOGLE NEEDS NO STORED READ. "primary"
    // resolves against whoever the access token belongs to, so the token alone
    // says whose calendar this is. Microsoft's does not; see below.
    const body = await callProvider(provider, url, accessToken, deps.fetchImpl, {
      timeMin: from,
      timeMax: to,
      items: [{ id: "primary" }],
    });
    const calendar = body?.calendars?.primary;
    // A PER-CALENDAR REFUSAL ARRIVES INSIDE A 200. Google answers `{ calendars:
    // { primary: { errors: [{ reason: "notFound" }], busy: [] } } }` rather than
    // a non-2xx, so callProvider's status check never sees it — and an
    // unexamined `busy: []` is indistinguishable from "free all week", which is
    // the worst possible way for this feature to fail: it does not look broken.
    const errors: any[] = Array.isArray(calendar?.errors) ? calendar.errors : [];
    if (errors.length) {
      const reason = errors.map((e) => String(e?.reason || "unknown")).join(", ");
      throw new CalendarApiError(200, provider, `google calendar API: freeBusy refused the primary calendar: ${reason}`);
    }
    const periods: any[] = Array.isArray(calendar?.busy) ? calendar.busy : [];
    return mergeBusy(periods.map((p) => ({ start: String(p?.start || ""), end: String(p?.end || "") })));
  }

  // GRAPH IDENTIFIES A CALENDAR BY EMAIL ADDRESS, NOT BY THE TOKEN. getSchedule
  // takes `schedules: [<address>]`, and the stored connection is the only place
  // that address lives (calendarConnections.ts writes it at connect time from
  // the default calendar's owner.address).
  const loadConnection = deps.getConnectionImpl ?? getConnection;
  const connection = await loadConnection(userId, provider);
  const address = connection?.accountEmail || "";
  if (!address) {
    // AN EMPTY `schedules` ARRAY IS THE DANGEROUS CALL, not the failed one.
    // Graph accepts it and answers 200 with an empty `value` — no error, no
    // warning — which decodes to no intervals, which renders as somebody being
    // free every hour of every day. A colleague would then book over a full
    // calendar and nothing anywhere would have said the lookup did not happen.
    // So the request is never made and the reason is thrown instead: no
    // intervals, and the cause visible rather than disguised as an answer. The
    // status is 409 because this is OUR refusal to ask — the stored connection
    // is missing the one field the query needs — not anything Graph said.
    throw new CalendarApiError(
      409,
      provider,
      "microsoft calendar API: the stored connection has no account email, so free/busy cannot be asked for; the person must reconnect the calendar",
    );
  }

  const body = await callProvider(provider, url, accessToken, deps.fetchImpl, {
    schedules: [address],
    startTime: graphDateTime(from),
    endTime: graphDateTime(to),
    availabilityViewInterval: SLOT_MINUTES,
  });

  const row = Array.isArray(body?.value) ? body.value[0] : undefined;
  // GRAPH REPORTS A PER-SCHEDULE FAILURE INSIDE A 200, exactly like Google's
  // per-calendar `errors` above — `{ value: [{ error: { message } }] }` — and
  // the same reasoning applies: unexamined, it decodes to an empty
  // availabilityView and renders as a free week.
  const rowError = row?.error;
  if (rowError) {
    const said = typeof rowError.message === "string" && rowError.message ? rowError.message : "no reason given";
    throw new CalendarApiError(200, provider, `microsoft calendar API: getSchedule refused ${address}: ${said}`);
  }

  // READ `availabilityView` AND NOTHING ELSE. The sibling field on this same row
  // is `scheduleItems`, whose entries carry `subject` and `location` — the
  // meeting's title and where it is. Mapping them would be the leak this whole
  // phase exists to prevent: a colleague is promised WHEN, never WHAT, and on
  // this provider nothing but this line enforces it. `availabilityView` is a
  // string of per-slot codes and cannot carry either field.
  const view = typeof row?.availabilityView === "string" ? row.availabilityView : "";
  return availabilityViewToIntervals(view, from, SLOT_MINUTES);
}
