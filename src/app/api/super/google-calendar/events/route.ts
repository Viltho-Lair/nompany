import { route } from "@/platform/http/route";
import { getConnection, listEvents } from "@/lib/data/googleCalendar";
import { log } from "@/platform/http/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A BOUNDED RANGE, ALWAYS. An unbounded one is a request for every event the
// calendar has ever held, which is slow on the wire and unreadable on the grid.
const MAX_SPAN_DAYS = 400;

export const GET = route({ auth: "super", name: "super/google-calendar/events" }, async ({ request }) => {
  // THE RANGE IS VALIDATED BEFORE THE CONNECTION IS EVEN READ. A reversed or
  // unbounded range is a malformed request regardless of whether a calendar
  // happens to be connected — answering "not connected" to a caller who sent
  // `to` before `from` would hide their own mistake behind unrelated server
  // state, and it is cheaper besides: a bad request stops before the store is
  // touched. (Checking the connection first made an early golden for this
  // route byte-identical to the "not connected" one, which is what caught it —
  // the range check was never reached in a fixture with no stored connection.)
  const url = new URL(request.url);
  const from = String(url.searchParams.get("from") || "");
  const to = String(url.searchParams.get("to") || "");
  const fromMs = Date.parse(from);
  const toMs = Date.parse(to);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) return { error: "invalid" };
  if (toMs - fromMs > MAX_SPAN_DAYS * 86_400_000) return { error: "invalid" };

  // CONNECTED AND CHOSEN ARE TWO DIFFERENT THINGS. The OAuth callback stores
  // tokens and leaves `calendarId` empty until the operator picks one, so a
  // connection with no id has nothing to read and answers exactly as "no
  // connection" does — there is no third state for a screen to render, and
  // reporting `connected: true` with no events would be an empty week wearing
  // a disguise.
  const connection = await getConnection();
  if (!connection?.calendarId) return { events: [], connected: false };

  try {
    return { connected: true, calendarId: connection.calendarId, events: await listEvents({ calendarId: connection.calendarId, from, to }) };
  } catch (e) {
    // EVERY FAILURE ON THIS PATH IS REPORTED, not just the provider's own.
    // listEvents throws CalendarApiError when Google refuses the read
    // (calendarReads.ts), and a plain Error when the token could not be
    // refreshed at all — the grant revoked at Google, or FIELD_ENCRYPTION_KEY
    // rotated out from under the stored connection — which happens before any
    // Calendar API call is made. Catching only the first shape would let the
    // second fall through to a 500 with an empty body that names nothing. On
    // this route that is exactly what "the board must never render an empty
    // week for a broken connection" depends on being able to show.
    //
    // LOGGED HERE AS WELL AS RETURNED — see ../route.ts's fuller note. Catching
    // the error to shape the response stops it reaching `withRequest`'s own
    // catch, the only other place anything gets logged, so returning it as an
    // ordinary value would make it exist ONLY in the HTTP body — nobody
    // watching the server output would ever see it. The response and the log
    // answer different questions: the response is what the operator fixes, the
    // log is how anyone re-reading the server output later tells an operator's
    // misconfiguration apart from a bug in this route's own code — which the
    // stack's first frame does, by naming whether the failure originated in
    // googleCalendar.ts/calendarOAuth.ts or somewhere else.
    //
    // NEVER A TOKEN. Nothing in calendarOAuth.ts or calendarReads.ts throws
    // with an access or refresh token in its message, which is what makes
    // surfacing the text here safe rather than merely convenient.
    const detail = e instanceof Error ? e.message : String(e);
    log.error("google-calendar events fetch failed", {
      error: detail,
      stack: e instanceof Error ? e.stack?.split("\n")[1]?.trim() : undefined,
    });
    return { status: 502, body: { error: "google", detail } };
  }
});
