// NOTIFICATIONS — the things a person should be told, and whether they've seen
// them yet.
//
// NOT THE SAME THING AS THE EVENT LOG. The event log (events.js) says "section
// X moved" so a board knows to refetch; it is machinery, it carries no words,
// and it is forgotten as soon as every client has caught up. A notification is
// addressed to a PERSON, says something in a sentence, links somewhere, and
// persists until they have read it — it survives sign-out, and the bell has to
// show a count on a fresh page load with nothing streamed yet.
//
// ONE ROW PER RECIPIENT ("fan out on write"). Writing a notification for five
// people writes five rows. The alternative — one row plus a set of who has read
// it — saves a little space and costs a great deal: read state would have to
// live somewhere else, which means a second key per person, which means
// something new for the cascade to know about. Here `readAt` is just a field on
// the recipient's own row. Studios hold tens of collaborators, not thousands,
// so the copies are cheap and every question ("my unread count") is answered by
// filtering one array.
//
// WHERE THEY LIVE, AND WHY NOTHING NEW HAD TO BE INVENTED:
//   s:<StudioID>:notifications   already declared in keys.js, and already swept
//                                by cascadeDeleteCollaborator (which filters on
//                                exactly the recipientId field used here) and by
//                                the studio's own prefix delete. Adding this
//                                changes no existing document and teaches the
//                                cascade nothing new.
//   g:superNotifications         the console's equivalent. Platform-level, so
//                                deliberately outside every cascade.
//
// Writing one also rings the doorbell, so an open bell updates immediately
// rather than at the next page load.

import { S, REG, makeId } from "@/platform/db/keys";
import { readArr, editArr } from "@/platform/db/store";
import { publish, CH } from "@/platform/realtime/bus";
import { log } from "@/platform/http/observability";

// Enough that nobody reaches the end of their bell in normal use, small enough
// that the array stays a cheap read. Older rows fall off; they are notices, not
// records, and the thing they pointed at is still there.
const MAX_PER_STUDIO = 200;
const MAX_SUPER = 200;

export const NOTIFY = {
  joinRequested: "join.requested",
  joinDecided: "join.decided",
  peopleChanged: "people.changed",
  taskAssigned: "task.assigned",
  leaveRequested: "leave.requested",
  leaveDecided: "leave.decided",
  projectAssigned: "project.assigned",
  purchaseReceived: "purchase.received",
  mention: "mention",
  system: "system",
};

/** One stored notification, as this module writes it. */
export type NotificationRow = {
  id: string;
  studioId?: string;
  recipientId?: string;
  readAt?: string;
  [field: string]: unknown;
};

/** What a caller says it wants somebody told. */
export type Notice = {
  type: string;
  title: string;
  body?: string;
  href?: string;
  tone?: string;
};

function build({ type, title, body = "", href = "", tone = "primary" }: Notice) {
  return {
    id: makeId("ntf"),
    type,
    title,
    body,
    href,
    tone,
    at: new Date().toISOString(),
    readAt: "",
  };
}

// ---- studio-scoped ---------------------------------------------------------

/**
 * Notify one or more collaborators inside a studio.
 *
 * Best-effort by the same rule as events.emit(): the thing being announced has
 * already happened, so failing to announce it must never fail the request that
 * caused it.
 *
 * @param {string} studioId
 * @param {string[]} recipientIds  CollaboratorIDs (never UserIDs — see the note
 *                                 at the top of collaborators.js)
 * @param {{type: string, title: string, body?: string, href?: string, tone?: string}} notice
 *        `href` is STUDIO-RELATIVE ("people", "sales/tickets") — the bell
 *        prefixes it with the studio's slug. Storing the slug here would bake
 *        in an address that can be renamed, leaving old notifications pointing
 *        at a studio that no longer answers to that name.
 * @param {{userIdOf?: (collaboratorId: string) => string}} [opts] lets the
 *        caller map recipients to UserIDs so the doorbell can be rung on the
 *        right per-person channel
 */
export async function notifyCollaborators(
  studioId: string,
  recipientIds: readonly string[],
  notice: Notice,
  // `userIdOf` IS THE CALLER'S JOB because this module addresses CollaboratorIDs
  // (invariant 6) and the pub/sub channel is keyed by UserID. The mapping lives
  // where the collaborator list already is; asking for it here would mean a
  // second read of a list the caller is holding.
  opts: { userIdOf?: (collaboratorId: string) => string | undefined } = {},
) {
  const ids = [...new Set((recipientIds || []).filter(Boolean))];
  if (!studioId || !ids.length || !notice?.type || !notice?.title) return [];

  try {
    const rows = ids.map((recipientId) => ({ ...build(notice), recipientId, studioId }));

    await editArr(S.notifications(studioId), (current) => ({
      // Newest first, then truncate: the bell reads from the front, so the cap
      // costs nothing at read time.
      next: [...rows, ...current].slice(0, MAX_PER_STUDIO),
    }));

    // Ring each recipient's own channel. Per person, not per studio: a
    // notification has an audience of one, and broadcasting it to the studio
    // would hand everyone else a copy of a message addressed to someone else.
    //
    // THE DOORBELL CARRIES NO MESSAGE — finding L-7. This published the whole
    // row: title, body and href, over Redis pub/sub. Pub/sub is not addressed
    // to anyone — it is a broadcast on a shared instance, readable by anything
    // holding SUBSCRIBE, and the per-user CHANNEL NAME is not a permission. So
    // the notice itself was leaving the database in the clear while the copy in
    // Redis sat behind a membership check.
    //
    // Only { kind, id, studioId, recipientId } goes out now. That is enough for
    // the stream route to know whose it is and which connection it belongs on,
    // and it already reads the body from S.notifications on a connection it has
    // authenticated — so nothing is lost and no client pays a round trip. The
    // same idea as the event log: the stream is truth, pub/sub is a doorbell.
    await Promise.all(
      rows.map((row) => {
        const userId = opts.userIdOf?.(row.recipientId);
        return userId ? publish(CH.user(userId), {
          kind: "notif",
          id: row.id,
          studioId: row.studioId,
          recipientId: row.recipientId,
        }) : null;
      }).filter(Boolean),
    );

    return rows;
  } catch (e) {
    log.error(`[notifications] write failed on ${studioId}: ${(e as Error).message}`);
    return [];
  }
}

/** This collaborator's notifications, newest first. */
export async function listForCollaborator(studioId: string, collaboratorId: string) {
  if (!studioId || !collaboratorId) return [];
  const rows = await readArr(S.notifications(studioId));
  return rows.filter((n) => n.recipientId === collaboratorId);
}

/**
 * Mark as read. `ids` empty means "all of mine".
 *
 * Scoped to the caller inside the atomic write, not before it: the filter is
 * part of what gets committed, so a request naming someone else's notification
 * id cannot mark it read no matter what it claims.
 */
export async function markRead(studioId: string, collaboratorId: string, ids: readonly string[]) {
  if (!studioId || !collaboratorId) return 0;
  const wanted = ids?.length ? new Set(ids) : null;
  const at = new Date().toISOString();

  return editArr<NotificationRow, number>(S.notifications(studioId), (rows) => {
    let changed = 0;
    const next = rows.map((n) => {
      if (n.recipientId !== collaboratorId || n.readAt) return n;
      if (wanted && !wanted.has(n.id)) return n;
      changed++;
      return { ...n, readAt: at };
    });
    return changed ? { next, result: changed } : { result: 0 };
  });
}

// ---- platform-scoped (the /super console) ----------------------------------

/**
 * Notify nompany's owners. Recipient is left empty on purpose: unlike a studio,
 * where a notice is addressed to one person, the console's audience is "whoever
 * is on duty" — every owner sees the same list.
 */
export async function notifySuper(notice: Notice) {
  if (!notice?.type || !notice?.title) return null;
  try {
    const row = build(notice);
    await editArr(REG.superNotifications, (current) => ({
      next: [row, ...current].slice(0, MAX_SUPER),
    }));
    await publish(CH.super, { kind: "notif", ...row });
    return row;
  } catch (e) {
    log.error(`[notifications] super write failed: ${(e as Error).message}`);
    return null;
  }
}

export async function listSuper() {
  return readArr(REG.superNotifications);
}

export async function markSuperRead(ids: readonly string[]) {
  const wanted = ids?.length ? new Set(ids) : null;
  const at = new Date().toISOString();
  return editArr<NotificationRow, number>(REG.superNotifications, (rows) => {
    let changed = 0;
    const next = rows.map((n) => {
      if (n.readAt) return n;
      if (wanted && !wanted.has(n.id)) return n;
      changed++;
      return { ...n, readAt: at };
    });
    return changed ? { next, result: changed } : { result: 0 };
  });
}
