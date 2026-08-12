// THE STUDIO EVENT LOG — "what changed, and when".
//
// One Redis Stream per studio at s:<StudioID>:events. It is a NEW key, not a
// new shape: no existing document gains a field, and because it sits under the
// studio prefix, cascadeDeleteStudio's delPrefix() already reaps it. Nothing
// about the stored model changes.
//
// WHY A STREAM and not another JSON array:
//  • Entry ids are monotonic and assigned by Redis, so the log is strictly
//    ordered and the id IS the cursor — "give me everything after X" is one
//    XRANGE, not a scan-and-filter.
//  • It is capped (MAXLEN ~) so it can never grow without bound.
//  • Appending is O(1) and contention-free — unlike a whole-array rewrite, two
//    concurrent writers never conflict, so the log adds no contention to the
//    writes it records.
//
// WHAT AN EVENT CARRIES: enough to decide WHAT TO REFETCH, and nothing more.
// No row contents, no names, no values. That keeps the log cheap, keeps it from
// becoming a second copy of the data that could drift, and means a leaked event
// discloses only that *something* in a section changed.
//
// Emission is BEST-EFFORT and never fails a write: the write is the truth, the
// event is a notification about it. A dropped event costs a client one polling
// interval of staleness, never correctness.

import { S } from "@/lib/data/keys";
import { xAdd, xAfter, xLastId } from "@/lib/data/store";

// Roughly the last few hundred changes per studio. A client that has been away
// longer than this gets told to reload from scratch rather than replay.
const MAX_EVENTS = 500;
const MAX_READ = 200;

// A cursor is a Redis stream id: "<millis>-<seq>". Anything else is rejected
// rather than passed through to Redis.
const CURSOR_RE = /^\d+-\d+$/;
export const isCursor = (v) => CURSOR_RE.test(String(v || ""));

// Who is allowed to hear about an event.
//  • "section" — gated by the caller's view permission on that SectionID.
//  • "people"  — membership, join requests, permission grants: admins only.
export const SCOPE = { SECTION: "section", PEOPLE: "people" };

export const TYPE = {
  rowCreated: "row.created",
  rowUpdated: "row.updated",
  rowDeleted: "row.deleted",
  peopleChanged: "people.changed",
  grantsChanged: "grants.changed",
  joinRequested: "join.requested",
  joinDecided: "join.decided",
};

// Append one event. Returns the new entry id, or null if the log could not be
// written — callers deliberately ignore the result.
export async function emit(studioId, { type, scope = SCOPE.SECTION, sectionId = "", collection = "", rowId = "" }) {
  if (!studioId || !type) return null;
  try {
    return await xAdd(
      S.events(studioId),
      { type, scope, sectionId, collection, rowId, at: new Date().toISOString() },
      MAX_EVENTS,
    );
  } catch (e) {
    // The write it describes has already succeeded; losing the notification is
    // not a reason to fail the request.
    console.error(`[events] emit failed on ${studioId} (${type}): ${e.message}`);
    return null;
  }
}

// Everything after `cursor`, oldest first. `visible` decides per event whether
// THIS caller may hear about it — the log is studio-wide, the answer is not.
export async function readSince(studioId, cursor, visible) {
  const rows = await xAfter(S.events(studioId), isCursor(cursor) ? cursor : "", MAX_READ);
  const events = typeof visible === "function" ? rows.filter(visible) : rows;
  return {
    // The cursor always advances to the newest entry SEEN, not the newest
    // DELIVERED — otherwise an event the caller may not read would be handed
    // back forever.
    cursor: rows.length ? rows[rows.length - 1].id : (isCursor(cursor) ? cursor : await latestId(studioId)),
    events,
    // More may be waiting: the caller should poll again immediately rather than
    // wait out its interval.
    truncated: rows.length === MAX_READ,
  };
}

// Where a fresh client starts: "now", so opening a page replays nothing.
export async function latestId(studioId) {
  return xLastId(S.events(studioId));
}
