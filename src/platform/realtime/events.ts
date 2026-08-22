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

import { S, REG } from "@/platform/db/keys";
import { xAdd, xAfter, xLastId } from "@/platform/db/store";
import { publish, CH } from "./bus";
import { log } from "@/platform/http/observability";

// Roughly the last few hundred changes per studio. A client that has been away
// longer than this gets told to reload from scratch rather than replay.
const MAX_EVENTS = 500;
const MAX_READ = 200;

// A cursor is a Redis stream id: "<millis>-<seq>". Anything else is rejected
// rather than passed through to Redis.
const CURSOR_RE = /^\d+-\d+$/;
export const isCursor = (v: unknown): boolean => CURSOR_RE.test(String(v || ""));

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
/** What an emitter says happened. `type` is the only required half. */
export type EventInput = {
  type?: string;
  scope?: string;
  sectionId?: string;
  collection?: string;
  rowId?: string;
};

export async function emit(
  studioId: string,
  { type, scope = SCOPE.SECTION, sectionId = "", collection = "", rowId = "" }: EventInput,
) {
  if (!studioId || !type) return null;
  try {
    const fields = { type, scope, sectionId, collection, rowId, at: new Date().toISOString() };
    const id = await xAdd(S.events(studioId), fields, MAX_EVENTS);
    // THEN ring the doorbell, so anyone already watching this studio hears about
    // it now rather than at the end of a polling interval. Strictly after the
    // XADD: the id is the client's cursor, so a listener must never be told
    // about an entry that is not yet in the log it would resume from.
    //
    // publish() swallows its own errors — the log is the truth, and a lost
    // notification costs a client one replay, never correctness.
    await publish(CH.studio(studioId), { id, ...fields });
    return id;
  } catch (e) {
    // The write it describes has already succeeded; losing the notification is
    // not a reason to fail the request.
    log.error(`[events] emit failed on ${studioId} (${type}): ${(e as Error).message}`);
    return null;
  }
}

// Everything after `cursor`, oldest first. `visible` decides per event whether
// THIS caller may hear about it — the log is studio-wide, the answer is not.
export async function readSince(
  studioId: string,
  cursor: string,
  visible?: (event: Record<string, string>) => boolean,
) {
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
export async function latestId(studioId: string) {
  return xLastId(S.events(studioId));
}

// ---- the platform log (what /super watches) --------------------------------
//
// Same mechanism one level up: a single capped stream at g:events, plus a
// doorbell on ev:super. It exists because the console's audience is not a
// studio — an owner cares that A studio was created, that someone asked to
// join somewhere, that a visitor is waiting in chat. Those facts belong to no
// tenant, so they cannot live in any tenant's log.
//
// Unlike a studio event, a platform event MAY carry a little context (a name, a
// slug) — its only readers are nompany's own owners, who can already see every
// studio, so there is no audience to withhold it from and it saves the console
// a lookup per row.

export const PLATFORM = {
  studioCreated: "studio.created",
  studioDeleted: "studio.deleted",
  userSignedUp: "user.signedup",
  joinRequested: "join.requested",
  chatWaiting: "chat.waiting",
  ratingLeft: "rating.left",
};

export type PlatformEventInput = {
  type?: string;
  title?: string;
  body?: string;
  href?: string;
  refId?: string;
};

export async function emitPlatform({ type, title = "", body = "", href = "", refId = "" }: PlatformEventInput) {
  if (!type) return null;
  try {
    const fields = { type, title, body, href, refId, at: new Date().toISOString() };
    const id = await xAdd(REG.events, fields, MAX_EVENTS);
    await publish(CH.super, { id, ...fields });
    return id;
  } catch (e) {
    log.error(`[events] platform emit failed (${type}): ${(e as Error).message}`);
    return null;
  }
}

// The console's equivalents of readSince/latestId. No `visible` predicate:
// every owner sees the whole platform log, which is the point of the console.
export async function readPlatformSince(cursor: string) {
  const rows = await xAfter(REG.events, isCursor(cursor) ? cursor : "", MAX_READ);
  return {
    cursor: rows.length ? rows[rows.length - 1].id : (isCursor(cursor) ? cursor : await latestPlatformId()),
    events: rows,
    truncated: rows.length === MAX_READ,
  };
}

export async function latestPlatformId() {
  return xLastId(REG.events);
}
