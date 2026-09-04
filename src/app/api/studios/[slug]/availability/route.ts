import { route } from "@/platform/http/route";
import { teamAvailability, type TeamAvailability } from "@/lib/data/studioAvailability";
import { SLOT_MINUTES } from "@/lib/data/calendarFreeBusy";
import { CalendarApiError } from "@/lib/data/calendarReads";
import { availabilityRangeStart } from "@/shared/calendar";
import { log } from "@/platform/http/observability";

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

// A SCHEDULING STRIP ASKS FOR A WEEK, NOT A YEAR — and the rule that says so
// is availabilityRangeStart, in shared/calendar.ts, not a copy here. It lives
// there because the planner's strip (availabilityWindow, the same module) has
// to clamp its request to the SAME bound before sending it, and the two halves
// were in two files that no test could hold against each other. They drifted:
// see the ordering note on availabilityRangeStart. The only number this file
// contributes is the slot size, which is the free/busy reader's own.
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
    // FINITE, FORWARD, WITHIN THE BOUND, AND ROUNDED ONTO THE SLOT GRID — one
    // decision, made in one pure function so the strip that has to satisfy it
    // can be tested against it. Every reason is written down there.
    const alignedFromMs = availabilityRangeStart(Date.parse(from), Date.parse(to), SLOT_MS);
    if (alignedFromMs === null) return { error: "invalid" };
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
    //
    // AND THE REASON GOES SOMEWHERE, rather than being dropped on the floor.
    // Redacting it on the wire is what a colleague is owed; an operator
    // watching every lane turn amber is owed the opposite, and until this line
    // existed there was no thread to pull anywhere — the message died in this
    // `.map`. The spec's failure table (§9) asks for exactly this: the
    // provider's own reason, at error level, in the server log.
    //
    // THE LOG KEEPS THE MESSAGE WHOLE, INCLUDING AN ADDRESS IT MAY CARRY.
    // Graph's per-target refusal embeds the calendar owner's account email, and
    // observability.ts's header lists email addresses among what a log line
    // does not carry. This is a deliberate, narrow exception rather than an
    // oversight: the two audiences are not the same one. Redaction upstairs
    // protects a colleague from learning a co-worker's address off a screen;
    // this line is read by whoever operates the deployment, for whom "which
    // mailbox did the provider refuse" IS the diagnosis, and a message trimmed
    // to fit the rule would leave a failure that cannot be acted on. The wire
    // stays redacted regardless of what happens here.
    const people: TeamAvailability = rows.map((row) => {
      if (!row.error) return row;
      log.error("availability lookup failed for one person", {
        studioId: String(studio.id),
        // CollaboratorID, never UserID (invariant 6) — and it is what the
        // studio's own People screen can be searched by.
        collaboratorId: row.collaboratorId,
        reason: row.error,
      });
      return { collaboratorId: row.collaboratorId, busy: row.busy, connected: row.connected, error: "unavailable" };
    });

    return { people };
  },
);
