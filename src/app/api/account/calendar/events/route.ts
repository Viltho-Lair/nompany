import { route } from "@/platform/http/route";
import { listConnections } from "@/platform/auth/calendarConnections";
import { listEvents } from "@/lib/data/calendarReads";
import type { CalendarProvider } from "@/platform/auth/calendarProviders";
import type { CalendarEvent } from "@/shared/calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A BOUNDED RANGE, ALWAYS — same ceiling and the same reason as
// super/google-calendar/events/route.ts: an unbounded range is a request for
// every event a calendar has ever held, which is slow on the wire and
// unreadable on any screen that renders it.
const MAX_SPAN_DAYS = 400;

type ConnectionOutcome = { provider: CalendarProvider; events: CalendarEvent[]; error: string };

export const GET = route({ auth: "user", name: "account/calendar/events" }, async ({ request, user }) => {
  // THE RANGE IS VALIDATED BEFORE ANY CONNECTION IS EVEN READ — same
  // ordering, and the same reason, as the console's own events route: a
  // reversed or unbounded range is a malformed request regardless of what is
  // connected, and checking it first is what keeps the "no connections"
  // golden from silently depending on this branch never being reached.
  const url = new URL(request.url);
  const from = String(url.searchParams.get("from") || "");
  const to = String(url.searchParams.get("to") || "");
  const fromMs = Date.parse(from);
  const toMs = Date.parse(to);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) return { error: "invalid" };
  if (toMs - fromMs > MAX_SPAN_DAYS * 86_400_000) return { error: "invalid" };

  // NETWORK-FREE WITH NO CONNECTIONS. listConnections is a handful of Redis
  // reads (one per provider, calendarConnections.ts), never a provider call —
  // with nothing stored, `connections` is `[]` and the map below runs zero
  // iterations, so nothing here ever reaches getCalendarAccessToken or an
  // actual Google/Microsoft request.
  const connections = await listConnections(String(user.id));

  const perConnection: ConnectionOutcome[] = await Promise.all(connections.map(async (c): Promise<ConnectionOutcome> => {
    // calendarIds IS EMPTY ON A FRESH CONNECTION — nothing in this phase's
    // connect flow (Task 5) populates it, and a calendar picker is later
    // work. "primary" is Google's own alias for the account's default
    // calendar, so it stands in safely for "every calendar this person has
    // not yet chosen among" rather than fetching nothing and showing an
    // empty calendar that looks connected.
    //
    // MICROSOFT IS COLLAPSED TO ONE ID REGARDLESS OF HOW MANY ARE STORED.
    // Graph's calendarView (calendarProviders.ts's microsoft.eventsUrl) is
    // per-MAILBOX, not per-calendar — it takes `_calendarId` and ignores it,
    // always hitting /me/calendarView. Looping N ids through it the way
    // Google's per-calendar endpoint wants would not widen the result, it
    // would issue N identical requests and return every event N times with
    // no id to dedupe against. So Microsoft always fetches exactly once;
    // only Google's loop actually varies by calendarId.
    const calendarIds = c.provider === "microsoft"
      ? ["primary"]
      : c.calendarIds.length ? c.calendarIds : ["primary"];
    try {
      const perCalendar = await Promise.all(
        calendarIds.map((calendarId) =>
          listEvents({ userId: String(user.id), provider: c.provider, calendarId, from, to })),
      );
      return { provider: c.provider, events: perCalendar.flat(), error: "" };
    } catch (e) {
      // ONE BROKEN CONNECTION MUST NOT SWALLOW THE OTHER'S EVENTS, AND MUST
      // NOT DISAPPEAR SILENTLY EITHER. A person may hold both a Google and a
      // Microsoft connection (design spec §4.1); failing the whole request
      // because one provider is unreachable throws away a calendar that
      // still works, and quietly returning only the half that worked tells
      // the person their calendar is empty when it is actually broken. So
      // every connection's outcome is collected independently: the events
      // that could be fetched go into `events`, and which provider failed
      // and why goes into `errors` — enough for the screen to show a partial
      // calendar AND a "your Microsoft calendar needs reconnecting" banner,
      // rather than making that choice here on the screen's behalf.
      //
      // The message is CalendarApiError's own provider-supplied text (see
      // calendarReads.ts) or a plain Error's — never a token: nothing in the
      // chain underneath (calendarOAuth.ts, calendarReads.ts) ever throws
      // with one in the message, which is exactly what makes surfacing it
      // here safe.
      const message = e instanceof Error ? e.message : String(e);
      return { provider: c.provider, events: [], error: message };
    }
  }));

  // UNREACHABLE TODAY, GUARDED ANYWAY: both normalisers (shared/calendar.ts)
  // drop any raw event whose start is falsy, so nothing here should ever
  // carry an unparseable one. Date.parse on garbage is NaN, and NaN in a
  // comparator sorts nothing — a malformed entry would otherwise sit wherever
  // it happened to land rather than visibly last.
  const startMs = (e: CalendarEvent) => {
    const ms = Date.parse(e.start);
    return Number.isFinite(ms) ? ms : Infinity;
  };
  const events = perConnection
    .flatMap((r) => r.events)
    .sort((a, b) => startMs(a) - startMs(b));
  const errors = perConnection
    .filter((r) => r.error)
    .map((r) => ({ provider: r.provider, message: r.error }));

  return { events, errors };
});
