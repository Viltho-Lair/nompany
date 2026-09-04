import { route } from "@/platform/http/route";
import {
  getConnection, publicConnection, saveConnection, disconnect, getCalendar, listCalendars,
} from "@/lib/data/googleCalendar";
import { consoleCalendarRedirectUri } from "@/platform/auth/calendarProviders";
import { log } from "@/platform/http/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE CONSOLE'S CALENDAR, AFTER THE SERVICE ACCOUNT. Connecting is an OAuth
// round trip now (start/ and callback/ next to this file), so this route is
// only what happens either side of it: read what is connected, choose which of
// that account's calendars to show, and disconnect.
const spec = { auth: "super", name: "super/google-calendar" };

// TWO STATES, AND THE SECOND ONE COSTS A ROUND TRIP. With nothing connected
// there is no token to call Google with, so the answer is `{ connection: null }`
// and nothing on the network is touched — which is also what keeps this route's
// golden deterministic on a machine whose .env.local happens to carry live
// credentials. Once a calendar IS connected, the list is fetched every time:
// under the old service account a shared calendar routinely never appeared in
// calendarList at all, which is why listing used to be opt-in behind
// `?discover=1` and pasting an id by hand was the primary path. An OAuth grant
// is the account's own, so the list is simply correct and the opt-in is gone.
//
// NO TOKEN REACHES THIS BODY. `publicConnection` names its six fields rather
// than deleting two from a spread — see its comment in lib/data/googleCalendar.ts.
export const GET = route(spec, async ({ request }) => {
  // THE CONSOLE'S OWN CALLBACK PATH, and a DIFFERENT ONE from the account
  // flow's (calendarProviders.ts) — an operator who registers the account
  // redirect URI here would be refused the same way as one who registers
  // nompany.com's URI while the site serves on www. Computed from THIS
  // request, not hardcoded, for the same reason.
  const redirectUri = consoleCalendarRedirectUri(request);
  const connection = await getConnection();
  if (!connection) return { connection: null, redirectUri };

  let calendars: { id: string; summary: string }[] = [];
  let problem = "";
  try {
    calendars = await listCalendars();
  } catch (e) {
    // A FAILING LIST IS NOT A BROKEN CONNECTION — the grant may simply have
    // been revoked at Google, or the Calendar API may not be enabled on this
    // project — so it is reported ALONGSIDE the connection rather than instead
    // of it, and the screen can still offer Disconnect.
    //
    // LOGGED AS WELL AS RETURNED, deliberately both. Catching the error to
    // shape the response is exactly what stops it reaching `withRequest`'s own
    // catch (observability.ts), the only other place anything gets logged — so
    // returning it as an ordinary value would leave it existing ONLY in the
    // HTTP body, where nobody re-reading the server output would ever see it.
    // The two answer different questions: the response tells the operator what
    // to fix, the log is how a bug in this route's own code is told apart from
    // Google's refusal or a misconfigured project. Nothing here can carry a
    // token: no throw in calendarOAuth.ts or calendarReads.ts puts one in a
    // message, which is what makes surfacing the text safe.
    const detail = e instanceof Error ? e.message : String(e);
    log.error("google-calendar list failed", {
      error: detail,
      stack: e instanceof Error ? e.stack?.split("\n")[1]?.trim() : undefined,
    });
    problem = detail;
  }
  return { connection: publicConnection(connection), calendars, problem, redirectUri };
});

// WHICH calendar of the connected account to show. Connecting and choosing are
// separate acts: the callback stores tokens and leaves calendarId empty,
// because which of an account's calendars the console should display is not
// something an OAuth flow can know.
export const PUT = route({ ...spec, body: true }, async ({ body }) => {
  const calendarId = String(body?.calendarId || "").trim();
  if (!calendarId) return { error: "invalid" };
  // CHECKED BEFORE THE NETWORK, and reported as its own refusal. Falling
  // through to getCalendar would throw consoleCalendarAccessToken's "no Google
  // calendar is connected" as a 500 with an empty body, which names nothing the
  // operator can act on.
  const connection = await getConnection();
  if (!connection) return { error: "not-connected" };

  // VALIDATED BY READING IT, NOT BY STORING IT — so "saved" always means
  // "readable", and the name and time zone shown back are Google's own rather
  // than whatever the dropdown happened to carry.
  let calendar;
  try {
    calendar = await getCalendar(calendarId);
  } catch (e) {
    // REPORTED, NOT RETHROWN, AND LOGGED TOO — same reasoning as the GET above.
    // Google's refusal (the API is not enabled, the calendar is gone, the grant
    // was revoked) each has a different one-line fix, and losing the message
    // turns three of them into one afternoon.
    const detail = e instanceof Error ? e.message : String(e);
    log.error("google-calendar choose failed", {
      error: detail,
      stack: e instanceof Error ? e.stack?.split("\n")[1]?.trim() : undefined,
    });
    return { status: 400, body: { error: "google", detail } };
  }
  return {
    ok: true,
    connection: publicConnection(await saveConnection({
      calendarId: calendar.id,
      summary: calendar.summary,
      timeZone: calendar.timeZone,
    })),
  };
});

// DISCONNECT REVOKES AT GOOGLE FIRST, then forgets. Merely forgetting would
// leave a live grant on the operator's Google account that nothing in nompany
// can see or withdraw.
export const DELETE = route(spec, async () => {
  await disconnect();
  return { ok: true };
});
