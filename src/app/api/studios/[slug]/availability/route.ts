import { route } from "@/platform/http/route";
import { teamAvailability, type TeamAvailability } from "@/lib/data/studioAvailability";
import { SLOT_MINUTES } from "@/lib/data/calendarFreeBusy";
import { CalendarApiError } from "@/lib/data/calendarReads";
import { AVAILABILITY_MAX_SPAN_DAYS } from "@/shared/calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// WHEN COLLEAGUES ARE BUSY, NEVER WHAT THEY ARE DOING. The gate is membership
// (auth: "studio") plus each person's own opt-in, which teamAvailability
// applies — see studioAvailability.ts. NO PERMISSION KEY: the same reasoning as
// calendar-share/route.ts, one door over. A right here would be a second gate
// free to disagree with the consent flag, and consent is the one that has to
// win.
//
// NOTHING IS STORED BY THIS ROUTE. Intervals are fetched per request and
// discarded — no cache, no key. A stale copy of when somebody is busy is both
// wrong and a copy of data this feature only ever promised to pass through.

// A SCHEDULING STRIP ASKS FOR A WEEK, NOT A YEAR — the reasoning is on the
// constant itself, in shared/calendar.ts. It lives there rather than here
// because the planner's strip has to clamp its request to the SAME number
// before sending it, and a second copy in a client file would be free to drift
// from this one with nothing to notice.
const MAX_SPAN_DAYS = AVAILABILITY_MAX_SPAN_DAYS;

const SLOT_MS = SLOT_MINUTES * 60_000;

export const GET = route(
  { auth: "studio", name: "studios/[slug]/availability" },
  async ({ request, studio }) => {
    // THE RANGE IS VALIDATED BEFORE ANY STORE OR PROVIDER READ, the same
    // ordering account/calendar/events/route.ts uses and for the same reason: a
    // reversed or unbounded range is a malformed request whatever the studio
    // holds, and checking it first is what keeps the empty-share-list golden
    // from silently depending on this branch never being reached.
    const url = new URL(request.url);
    const from = String(url.searchParams.get("from") || "");
    const to = String(url.searchParams.get("to") || "");
    const fromMs = Date.parse(from);
    const toMs = Date.parse(to);
    // REVERSAL IS JUDGED ON WHAT THE CALLER ACTUALLY SENT, before the alignment
    // below. Rounding `from` DOWN first would rescue a genuinely reversed range
    // whose two ends sit inside one slot (10:20 → 10:10 becomes 10:00 → 10:10)
    // and answer it as though it were fine.
    if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) return { error: "invalid" };

    // MICROSOFT ANCHORS ITS SLOTS AT THE RANGE START, not at the hour. Graph's
    // availabilityView is a string of fixed-width slots counted from whatever
    // `startTime` we send, so asking from 09:07 puts every boundary at :07 and
    // :37 — a 09:30 meeting then decodes as starting 09:07, and nothing on the
    // wire says the grid moved. Rounding `from` DOWN onto the 30-minute grid is
    // the cheap fix: boundaries land where a reader expects, and rounding down
    // rather than up can only widen the window, never hide a busy block that
    // straddles the start. Google is unaffected — freeBusy returns real
    // instants — so aligning is harmless there.
    const alignedFromMs = Math.floor(fromMs / SLOT_MS) * SLOT_MS;
    // The span is bounded on the ALIGNED range, which is the one actually
    // asked for; alignment can only add up to one slot, so the ceiling holds.
    if (toMs - alignedFromMs > MAX_SPAN_DAYS * 86_400_000) return { error: "invalid" };
    const alignedFrom = new Date(alignedFromMs).toISOString();

    let rows: TeamAvailability;
    try {
      rows = await teamAvailability({ studioId: String(studio.id), from: alignedFrom, to });
    } catch (e) {
      // MAPPED, NEVER FORWARDED. CalendarApiError.status is the PROVIDER'S
      // status, plus two values that are not HTTP statuses of ours at all: 409
      // when we refuse to ask (a stored Microsoft connection with no account
      // email) and 200 when a per-target refusal arrived inside a successful
      // response. Passing it through would answer this request with `200` for a
      // failure, or with `401` — telling the caller their own session is bad
      // when it is perfectly good and it is a colleague's grant that lapsed.
      // So an upstream calendar failure is 502, which is what it is: our
      // request was fine and something we depend on was not.
      //
      // Unreachable today — teamAvailability catches per person and returns an
      // error ROW rather than throwing — and kept so that if that ever changes
      // the failure surfaces as an honest 502 instead of an echoed nonsense
      // status. Anything else (a store fault) propagates, as it does everywhere.
      if (e instanceof CalendarApiError) return { status: 502, body: { error: "provider" } };
      throw e;
    }

    // WHAT A COLLEAGUE IS TOLD ABOUT A FAILURE: that there was one. The message
    // teamAvailability collects is the provider's own words, and Graph's
    // per-target refusal embeds the calendar owner's ACCOUNT EMAIL verbatim
    // ("getSchedule refused someone@example.com: ..."), which is a colleague
    // learning an address they were never shown. Redacting it by pattern would
    // leave the rest of a message we do not author and cannot bound — the next
    // provider release is free to put a mailbox name, a tenant or a display
    // name in there, and a regex written today would not know. So the row says
    // only that this person's calendar could not be read; the person themselves
    // still gets the provider's full reason on their own account screen, where
    // it is their data and it is actionable.
    //
    // The KEY still has to be present, because `busy: []` with no error is what
    // a genuinely free person looks like — collapsing the two would show a
    // failed lookup as an open afternoon, which is the one way this feature
    // must never be wrong.
    //
    // `connected` IS CARRIED THROUGH, not dropped with the message. It says
    // whether there was anything to ask at all, which is a fact about our own
    // store rather than about the provider's answer, and a strip needs it to
    // tell "opted in, nothing hooked up" from "connected and genuinely free".
    // It leaks nothing: a colleague already learns as much from the row's mere
    // existence, which says this person opted in.
    const people: TeamAvailability = rows.map((row) => (
      row.error
        ? { collaboratorId: row.collaboratorId, busy: row.busy, connected: row.connected, error: "unavailable" }
        : row
    ));

    return { people };
  },
);
