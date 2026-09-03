import { route } from "@/platform/http/route";
import { getConnection, listEvents } from "@/lib/data/googleCalendar";

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

  const connection = await getConnection();
  if (!connection) return { events: [], connected: false };

  try {
    return { connected: true, calendarId: connection.calendarId, events: await listEvents({ calendarId: connection.calendarId, from, to }) };
  } catch (e) {
    // REPORTED, NOT JUST GoogleCalendarError — see the matching comment in
    // ../route.ts. listEvents's own Google refusal throws GoogleCalendarError,
    // but a failure in the identity chain underneath it (no VERCEL_OIDC_TOKEN,
    // an expired one, STS or IAM Credentials refusing) throws a plain Error
    // before any Calendar API call happens, and would otherwise fall through to
    // a 500 with an empty body that told the operator nothing. On this route
    // that failure is exactly what invariant "the board must never render an
    // empty week for a broken connection" (task 7 brief) depends on being able
    // to show — a swallowed message here is an empty week wearing a disguise.
    const detail = e instanceof Error ? e.message : String(e);
    return { status: 502, body: { error: "google", detail } };
  }
});
