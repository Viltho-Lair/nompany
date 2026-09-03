import { route } from "@/platform/http/route";
import {
  getConnection, saveConnection, clearConnection, getCalendar, listCalendars,
} from "@/lib/data/googleCalendar";
import { calendarServiceAccount } from "@/platform/auth/googleCalendarAuth";
import { log } from "@/platform/http/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE CONSOLE'S CALENDAR CONNECTION. There is no OAuth callback here and no
// redirect flow: the calendar is read by impersonating a service account the
// operator shares it with, so "connecting" is choosing an id.
const spec = { auth: "super", name: "super/google-calendar" };

// The address is served rather than hardcoded in the screen so the screen cannot
// tell an operator to share a calendar with an account the server does not use.
//
// DISCOVERY IS OPT-IN (`?discover=1`), NOT ON EVERY GET. listCalendars() is a
// live round trip through STS and IAM Credentials to Google — slow (a held
// serverless invocation up to the 10s timeout in googleCalendar.ts) and, worse,
// NON-DETERMINISTIC for this suite: Gate A loads .env.local, so
// VERCEL_OIDC_TOKEN is set here even though CI carries no such token at all —
// a golden built from a live Google error would read differently on every
// machine that ran it, which is exactly the flapping test this repo refuses to
// keep (see CLAUDE.md). A plain page load only needs to know what is already
// connected, so it costs nothing; a "browse my calendars" action asks for
// `?discover=1` and pays the round trip when an operator actually wants it.
export const GET = route(spec, async ({ request }) => {
  const connection = await getConnection();
  const serviceAccount = calendarServiceAccount();
  const url = new URL((request as Request).url);
  if (url.searchParams.get("discover") !== "1") {
    return { connection, serviceAccount };
  }
  let calendars: { id: string; summary: string; timeZone: string }[] = [];
  let problem = "";
  try {
    calendars = await listCalendars();
  } catch (e) {
    // AN EMPTY OR FAILING LIST IS NOT A BROKEN CONNECTION. A calendar shared
    // with a service account routinely does not appear in its calendarList, so
    // this is reported alongside the connection rather than instead of it.
    //
    // LOGGED HERE AS WELL AS RETURNED — see the matching comment in the PUT
    // handler below. An EMPTY calendars array reaching the response is normal
    // and is never logged; what is logged here is a THROW — the identity chain
    // (STS, IAM Credentials) or the Calendar API itself refusing the call — and
    // that is a different thing that must not disappear once it is reshaped
    // into `problem` for the screen, or a log-reading operator sees no evidence
    // the call ever failed.
    const detail = e instanceof Error ? e.message : String(e);
    log.error("google-calendar discover failed", {
      error: detail,
      stack: e instanceof Error ? e.stack?.split("\n")[1]?.trim() : undefined,
    });
    problem = detail;
  }
  return { connection, calendars, problem, serviceAccount };
});

export const PUT = route({ ...spec, body: true }, async ({ body, admin }) => {
  const calendarId = String(body?.calendarId || "").trim();
  if (!calendarId) return { error: "invalid" };
  // VALIDATED BY READING IT, NOT BY STORING IT. An id that cannot be read is
  // refused with Google's own reason, so "saved" always means "works".
  let calendar;
  try {
    calendar = await getCalendar(calendarId);
  } catch (e) {
    // REPORTED, NOT JUST GoogleCalendarError. getCalendar's own Google refusal
    // (API disabled, not shared, insufficient access) throws GoogleCalendarError
    // — but the identity chain underneath it (googleCalendarAuth.ts: no
    // VERCEL_OIDC_TOKEN, an expired one, STS refusing the exchange, IAM
    // Credentials refusing the impersonation) throws a PLAIN Error, before any
    // Google Calendar API call is even made. Catching only GoogleCalendarError
    // let those fall through uncaught to the route wrapper's generic 500 with
    // an EMPTY body, which named nothing an operator could act on. This is
    // nompany's own console with one operator: the message names the exact env
    // var or Google refusal to go fix, so every failure on this path is
    // reported here rather than only the one shape being rethrown.
    //
    // LOGGED HERE AS WELL AS RETURNED — deliberately both, not one or the
    // other. Catching the error to shape the response is exactly what stops it
    // reaching `withRequest`'s own catch (observability.ts), which is the ONLY
    // other place an error gets logged; returning it as an ordinary value
    // means the try succeeds and nothing there ever sees this. The response
    // and the log answer different questions: the response tells the operator
    // what to go fix, the log is how anyone re-reading the server output later
    // — including whether this was ever a bug in OUR code rather than Google's
    // or the environment's — finds out, the same way the STS refusal that
    // exposed this whole gap was originally read off the log rather than the
    // screen. The stack's first frame is what tells the two apart: Google's own
    // refusals and the identity chain's env-driven ones point back into
    // googleCalendar.ts/googleCalendarAuth.ts, so a frame anywhere else is the
    // sign this was a programmer error, not an operator one.
    const detail = e instanceof Error ? e.message : String(e);
    log.error("google-calendar connect failed", {
      error: detail,
      stack: e instanceof Error ? e.stack?.split("\n")[1]?.trim() : undefined,
    });
    return { status: 400, body: { error: "google", detail } };
  }
  return {
    ok: true,
    connection: await saveConnection({
      calendarId: calendar.id,
      summary: calendar.summary,
      timeZone: calendar.timeZone,
      connectedAt: Date.now(),
      connectedBy: String(admin?.email || ""),
    }),
  };
});

export const DELETE = route(spec, async () => {
  await clearConnection();
  return { ok: true };
});
