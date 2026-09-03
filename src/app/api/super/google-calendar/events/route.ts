import { route } from "@/platform/http/route";
import { getConnection, listEvents, GoogleCalendarError } from "@/lib/data/googleCalendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A BOUNDED RANGE, ALWAYS. An unbounded one is a request for every event the
// calendar has ever held, which is slow on the wire and unreadable on the grid.
const MAX_SPAN_DAYS = 400;

export const GET = route({ auth: "super", name: "super/google-calendar/events" }, async ({ request }) => {
  const connection = await getConnection();
  if (!connection) return { events: [], connected: false };

  const url = new URL(request.url);
  const from = String(url.searchParams.get("from") || "");
  const to = String(url.searchParams.get("to") || "");
  const fromMs = Date.parse(from);
  const toMs = Date.parse(to);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) return { error: "invalid" };
  if (toMs - fromMs > MAX_SPAN_DAYS * 86_400_000) return { error: "invalid" };

  try {
    return { connected: true, calendarId: connection.calendarId, events: await listEvents({ calendarId: connection.calendarId, from, to }) };
  } catch (e) {
    if (e instanceof GoogleCalendarError) return { status: 502, body: { error: "google", detail: e.message } };
    throw e;
  }
});
