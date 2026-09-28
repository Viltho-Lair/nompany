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
// live somewhere else. Here `readAt` is a field on the recipient's own row.
//
// WHERE THEY LIVE, SINCE 28/09/2026: a COLLECTION, `notifications`, filed under
// `administration-members` (keys.ts says why that section). Until then every
// studio's notices were ONE array under `s:<id>:notifications`, capped at 200
// for all its members together — a busy studio pushed everybody's older
// notices out, and every read and every "mark read" rewrote the whole list. A
// row per recipient means each person's history is their own, the bell reads
// thirty rows rather than the studio's two hundred, and Postgres orders,
// limits and counts them (sections.readColPage / countWhere).
//
// THE WORDS ARE SEALED (sealCipher: title, body, params), because a notice
// repeats what it is about — a deal's reference and title, sealed on the deal.
// What finds a row stays clear: recipient, type, time, read state, the link.
//
// KEPT NINETY DAYS — the owner, 28/09/2026. `purgeExpired` runs from the
// nightly upkeep and deletes by an explicit id list (invariant 17).
//
// THE OLD ARRAY IS STILL READ, and never written. Every row in it predates
// every row in the collection, so a page reads the collection first and runs
// on into the array when the collection is exhausted — no migration, and the
// array's rows fall out of the ninety-day window by themselves. When they
// have, `LEGACY` below and everything that reads it can go.
//
// `g:superNotifications` is the console's own list and is unchanged:
// platform-level, one list for whoever is on duty, outside every cascade.
//
// Writing one also rings the doorbell, so an open bell updates immediately
// rather than at the next page load.

import { S, REG, makeId } from "@/platform/db/keys";
import { readArr, editArr } from "@/platform/db/store";
import {
  listSections, addRows, readColPage, readColWhere, countWhere, setFieldWhere, idsBefore, deleteRows,
} from "@/platform/db/sections";
import { publish, CH } from "@/platform/realtime/bus";
import { log } from "@/platform/http/observability";

/** The collection, and the section it is filed under (keys.ts). */
const COLLECTION = "notifications";
const SECTION_KEY = "administration-members";

/** How long a notice is kept — the owner, 28/09/2026. */
export const KEEP_DAYS = 90;

const MAX_SUPER = 200;

export const NOTIFY = {
  joinRequested: "join.requested",
  joinDecided: "join.decided",
  peopleChanged: "people.changed",
  leaveRequested: "leave.requested",
  leaveDecided: "leave.decided",
  projectAssigned: "project.assigned",
  purchaseReceived: "purchase.received",
  approvalDecided: "approval.decided",
  // Something needs THIS person's signature — the next step of a bill, bid,
  // requisition or stock adjustment, a quotation or client-PO approval task,
  // or a payroll run. Before it, only the raiser was told when a decision
  // LANDED; nobody was told one was WAITING.
  approvalRequested: "approval.requested",
  rfqRaised: "rfq.raised",
  // A quotation handed to somebody to follow up (modules/technical, 24/09/2026).
  quotationAssigned: "quotation.assigned",
  mention: "mention",
  system: "system",
  // Time-driven (produced by the daily-notices cron, not by a request).
  invoiceOverdue: "invoice.overdue",
  billOverdue: "bill.overdue",
  documentExpiring: "document.expiring",
  permitExpiring: "permit.expiring",
  workRequestRaised: "workrequest.raised",
  workOrderAssigned: "workorder.assigned",
  campaignAssigned: "campaign.assigned",
  planAssigned: "plan.assigned",
  eventAssigned: "event.assigned",
  partnerAssigned: "partner.assigned",
  leadWaiting: "lead.waiting",
  // Several at once, from Customer insights (modules/sales/insights).
  leadsWaiting: "leads.waiting",
  leadAssigned: "lead.assigned",
  leadOverdue: "lead.overdue",
  workOrderDue: "workorder.due",
  calibrationDue: "calibration.due",
  // An item fell to its reorder level (modules/inventory/stockAlerts).
  stockLow: "stock.low",
  // Somebody's own employment moved — confirmed, suspended, on notice, exited
  // (modules/hr/lifecycleService). Addressed to the person it happened TO.
  employmentChanged: "employment.changed",
  // Support answered a question this person sent from Nova's help desk
  // (/super → Nova → Questions, 26/09/2026). Addressed to the asker alone.
  novaAnswered: "nova.answered",
  // PHASE 3 (28/09/2026) — what the product did and told nobody. Each is
  // declared with a template (modules/administration/notices) and a kind
  // (shared/notificationKinds); the test holds all three lists together.
  // A field-service job put on this person's rota (modules/operations/jobs).
  jobAssigned: "job.assigned",
  // Planner tasks handed to this person, one notice per save (operations/planner).
  taskAssigned: "task.assigned",
  // A register's person field names somebody new (platform/engine/records).
  recordAssigned: "record.assigned",
  // A record raised in a register that announces — an incident, an NCR (the
  // same file), by hand or by a rule.
  recordRaised: "record.raised",
  // THE READER'S OWN MONEY AND TIME (28/09/2026).
  // An expense claim paid out (modules/finance/claimsService).
  claimPaid: "claim.paid",
  // A staff advance handed over (the same file).
  advanceGiven: "advance.given",
  // A payroll run marked Paid — each person their own net (hr/payrollService).
  payPaid: "pay.paid",
  // Leave a manager booked for this person, decided on the spot (hr/hr).
  leaveBooked: "leave.booked",
  // TENDERS AND DEALS (28/09/2026). A tender handed to somebody to chase
  // (modules/tendering/tenders), and how it ended — told to its owner and to
  // whoever registered it; and one about to close (the daily cron).
  tenderAssigned: "tender.assigned",
  tenderWon: "tender.won",
  tenderLost: "tender.lost",
  tenderClosing: "tender.closing",
  // A deal closed by somebody other than its owner (modules/sales/sales).
  dealWon: "deal.won",
  dealLost: "deal.lost",
};

/** One stored notification, as this module writes it. */
export type NotificationRow = {
  id: string;
  studioId?: string;
  recipientId?: string;
  readAt?: string;
  /** "" in the inbox, "archived" once put away. Absent on the old array's rows. */
  state?: string;
  at?: string;
  [field: string]: unknown;
};

/** What a caller says it wants somebody told. */
export type Notice = {
  type: string;
  title: string;
  body?: string;
  href?: string;
  tone?: string;
  /**
   * THE FACTS, so the bell can choose the words.
   *
   * `title` and `body` are still written and are still the English sentence
   * they always were — they are what a row renders as when it has no template,
   * which is every `system` notice and every row stored before this existed.
   * What `params` adds is the ability to render the SAME notice in Arabic, or
   * in the studio's own wording, from `modules/administration/notices`.
   *
   * Values are pre-formatted strings rather than numbers or dates, because the
   * producer is the only thing that knows "3 days" is three days and not the
   * 3rd — and because a template cannot format what it is handed.
   */
  params?: Record<string, string>;
};

function build({ type, title, body = "", href = "", tone = "primary", params }: Notice) {
  return {
    id: makeId("ntf"),
    type,
    title,
    body,
    href,
    tone,
    // ABSENT AND EMPTY MEAN DIFFERENT THINGS, and this line is where the
    // difference is kept. A producer that sends NO params has not been written
    // for a template, and `renderNotice` keeps its stored sentence. One that
    // sends `{}` HAS been — its notice simply carries no facts — so the empty
    // object must survive, or a reader would get the English literal instead
    // of the Arabic template. Testing the key count would collapse the two.
    ...(params === undefined ? {} : { params }),
    at: new Date().toISOString(),
    readAt: "",
    state: "",
  };
}

// ---- studio-scoped ---------------------------------------------------------

/** The members section's id — where every notice in this studio is filed. */
async function sectionOf(studioId: string): Promise<string> {
  // listSections, not getSectionByKey: it plants a missing seeded section on
  // read, so a studio that predates the key is completed rather than refused.
  const sec = (await listSections(studioId)).find((s) => s.key === SECTION_KEY);
  if (!sec) throw new Error(`notifications: ${studioId} has no ${SECTION_KEY} section`);
  return sec.id;
}

const cutoff = (now = Date.now()) => new Date(now - KEEP_DAYS * 86_400_000).toISOString();

/**
 * Notify one or more collaborators inside a studio.
 *
 * Best-effort by the same rule as events.emit(): the thing being announced has
 * already happened, so failing to announce it must never fail the request that
 * caused it.
 *
 * `href` is STUDIO-RELATIVE ("people", "crm-sales-tickets") — the bell
 * prefixes it with the studio's slug. Storing the slug here would bake in an
 * address that can be renamed, leaving old notifications pointing at a studio
 * that no longer answers to that name.
 */
export async function notifyCollaborators(
  studioId: string,
  recipientIds: readonly string[],
  notice: Notice,
  // `userIdOf` IS THE CALLER'S JOB because this module addresses CollaboratorIDs
  // (invariant 6) and the doorbell channel is keyed by UserID. The mapping lives
  // where the collaborator list already is; asking for it here would mean a
  // second read of a list the caller is holding. WITHOUT IT NOTHING RINGS, and
  // the notice waits for a reload — tests/notification-inbox-model.mjs refuses
  // a call that omits it.
  opts: { userIdOf?: (collaboratorId: string) => string | undefined } = {},
) {
  const ids = [...new Set((recipientIds || []).filter(Boolean))];
  if (!studioId || !ids.length || !notice?.type || !notice?.title) return [];

  try {
    const sec = await sectionOf(studioId);
    // NOT ANNOUNCED on the studio stream: a notice is addressed to one person,
    // and an event under the members section would reload every board filed
    // there for everybody. The recipient's own doorbell, below, is the signal.
    const rows = await addRows<NotificationRow>(
      studioId, sec, COLLECTION,
      ids.map((recipientId) => ({ ...build(notice), recipientId })),
      { announce: false },
    );

    // Ring each recipient's own channel. Per person, not per studio: a
    // notification has an audience of one, and broadcasting it to the studio
    // would hand everyone else a copy of a message addressed to someone else.
    //
    // THE DOORBELL CARRIES NO MESSAGE — finding L-7. Only { kind, id, studioId,
    // recipientId } goes out; the stream route reads the row itself on a
    // connection it has already authenticated. The same idea as the event log:
    // the stream is truth, the doorbell is a doorbell.
    await Promise.all(
      rows.map((row) => {
        const userId = opts.userIdOf?.(String(row.recipientId));
        return userId ? publish(CH.user(userId), {
          kind: "notif",
          id: row.id,
          studioId,
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

// ---- the old array, read-only ------------------------------------------------
// Rows written before 28/09/2026. Read for the recipient, inside the window,
// and never written again except to mark one read or put it away.
const LEGACY = {
  async mine(studioId: string, collaboratorId: string): Promise<NotificationRow[]> {
    const since = cutoff();
    const rows = await readArr<NotificationRow>(S.notifications(studioId));
    return rows.filter((n) => n.recipientId === collaboratorId && String(n.at || "") >= since);
  },
  async patch(studioId: string, collaboratorId: string, ids: readonly string[] | null, change: (n: NotificationRow) => NotificationRow | null) {
    const wanted = ids?.length ? new Set(ids) : null;
    return editArr<NotificationRow, number>(S.notifications(studioId), (rows) => {
      let changed = 0;
      const next = rows.map((n) => {
        if (n.recipientId !== collaboratorId || (wanted && !wanted.has(n.id))) return n;
        const out = change(n);
        if (!out) return n;
        changed++;
        return out;
      });
      return changed ? { next, result: changed } : { result: 0 };
    });
  },
};

/** What the bell and the notification page may ask for. */
export type ListQuery = {
  limit?: number;
  /** The last row of the previous page — `legacy:<id>` once into the old array. */
  after?: string;
  unread?: boolean;
  /** true lists what was put away; false (the default) lists the inbox. */
  archived?: boolean;
  /** Only these types — a category, resolved by the caller (shared/notificationKinds). */
  types?: readonly string[];
};

const LEGACY_CURSOR = "legacy:";

/**
 * One page of this collaborator's notifications, newest first, and the cursor
 * for the next. Addressed by the caller's OWN collaborator id — there is no
 * way to ask for somebody else's.
 */
export async function listForCollaborator(
  studioId: string, collaboratorId: string, q: ListQuery = {},
): Promise<{ rows: NotificationRow[]; next: string }> {
  if (!studioId || !collaboratorId) return { rows: [], next: "" };
  const limit = Math.max(1, Math.min(100, Math.floor(q.limit || 30)));
  const since = cutoff();
  const keep = (n: NotificationRow) =>
    String(n.at || "") >= since
    && (q.archived ? n.state === "archived" : n.state !== "archived")
    && (!q.unread || !n.readAt)
    && (!q.types?.length || q.types.includes(String(n.type)));

  let rows: NotificationRow[] = [];
  let after = q.after || "";

  // The collection first — everything in it is newer than anything in the array.
  if (!after.startsWith(LEGACY_CURSOR)) {
    const match: Record<string, readonly string[]> = {
      recipientId: [collaboratorId],
      state: [q.archived ? "archived" : ""],
    };
    if (q.unread) match.readAt = [""];
    if (q.types?.length) match.type = q.types;
    const sec = await sectionOf(studioId);
    const page = await readColPage<NotificationRow>(studioId, sec, COLLECTION, match, { limit: limit + 1, after });
    // `keep` again: the database narrowed on what it could, and the window is
    // enforced here too so a row the purge has not reached yet stays hidden.
    rows = page.filter(keep);
    if (page.length > limit) {
      rows = rows.slice(0, limit);
      return { rows, next: rows[rows.length - 1]?.id || "" };
    }
    after = LEGACY_CURSOR;
  }

  // Then the old array, for as long as any of it is inside the window.
  const legacy = (await LEGACY.mine(studioId, collaboratorId)).filter(keep)
    .sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  const at = after === LEGACY_CURSOR ? -1 : legacy.findIndex((n) => n.id === after.slice(LEGACY_CURSOR.length));
  // A cursor naming a row that has gone (read out of the window, removed with
  // its person) ends the list rather than starting it again from the top.
  if (after !== LEGACY_CURSOR && at < 0) return { rows, next: "" };
  const from = at + 1;
  const room = limit - rows.length;
  const more = legacy.slice(from, from + room);
  rows = [...rows, ...more];
  const next = from + room < legacy.length && more.length ? LEGACY_CURSOR + more[more.length - 1].id : "";
  return { rows, next };
}

/** How many of this collaborator's notices are unread, across both stores. */
export async function unreadCount(studioId: string, collaboratorId: string): Promise<number> {
  if (!studioId || !collaboratorId) return 0;
  const sec = await sectionOf(studioId);
  const [fresh, legacy] = await Promise.all([
    countWhere(studioId, sec, COLLECTION, { recipientId: [collaboratorId], readAt: [""], state: [""] }),
    LEGACY.mine(studioId, collaboratorId),
  ]);
  return fresh + legacy.filter((n) => !n.readAt && n.state !== "archived").length;
}

/** One notice by id, if it is addressed to this collaborator — the stream's read. */
export async function findForCollaborator(
  studioId: string, collaboratorId: string, id: string,
): Promise<NotificationRow | null> {
  if (!studioId || !collaboratorId || !id) return null;
  const sec = await sectionOf(studioId);
  // Both fields narrow in Postgres, and the recipient IS the check: a doorbell
  // naming somebody else's notice finds nothing.
  const [row] = await readColWhere<NotificationRow>(studioId, sec, COLLECTION, {
    id: [id], recipientId: [collaboratorId],
  });
  return row && row.recipientId === collaboratorId ? row : null;
}

/**
 * Mark as read. `ids` empty means "all of mine".
 *
 * Scoped to the caller inside the write, not before it: the recipient is part
 * of what the UPDATE matches, so a request naming someone else's notification
 * id cannot mark it read no matter what it claims.
 */
export async function markRead(studioId: string, collaboratorId: string, ids: readonly string[]) {
  if (!studioId || !collaboratorId) return 0;
  const at = new Date().toISOString();
  const match: Record<string, readonly string[]> = { recipientId: [collaboratorId], readAt: [""] };
  if (ids?.length) match.id = ids;
  const sec = await sectionOf(studioId);
  const [fresh, legacy] = await Promise.all([
    setFieldWhere(studioId, sec, COLLECTION, match, "readAt", at),
    LEGACY.patch(studioId, collaboratorId, ids?.length ? ids : null, (n) => (n.readAt ? null : { ...n, readAt: at })),
  ]);
  return fresh + legacy;
}

/**
 * Put notices away, or bring them back. Putting one away also reads it — an
 * archived notice counting as unread would keep a badge nobody can clear from
 * the inbox. `ids` is required: there is no "archive everything".
 */
export async function setArchived(studioId: string, collaboratorId: string, ids: readonly string[], archived: boolean) {
  if (!studioId || !collaboratorId || !ids?.length) return 0;
  const sec = await sectionOf(studioId);
  const state = archived ? "archived" : "";
  const match = { recipientId: [collaboratorId], id: ids };
  if (archived) await markRead(studioId, collaboratorId, ids);
  const [fresh, legacy] = await Promise.all([
    setFieldWhere(studioId, sec, COLLECTION, match, "state", state),
    LEGACY.patch(studioId, collaboratorId, ids, (n) => ((n.state || "") === state ? null : { ...n, state })),
  ]);
  return fresh + legacy;
}

/**
 * THE NINETY-DAY WINDOW, enforced on the store rather than only on the read.
 * Deletes by an explicit id list (invariant 17), a bounded batch at a time, and
 * says how many went so the nightly upkeep can report a backlog.
 */
export async function purgeExpired(studioId: string, batch = 1000): Promise<number> {
  if (!studioId) return 0;
  const sec = await sectionOf(studioId);
  const ids = await idsBefore(studioId, sec, COLLECTION, "at", cutoff(), batch);
  if (!ids.length) return 0;
  return deleteRows(studioId, sec, COLLECTION, ids, { announce: false });
}

/**
 * Everything addressed to one collaborator, for the cascade that removes them
 * (cascade.ts, invariant 11): the ids, so the delete is an explicit list.
 */
export async function idsForCollaborator(studioId: string, collaboratorId: string): Promise<{ sectionId: string; ids: string[] }> {
  const sec = await sectionOf(studioId);
  const rows = await readColWhere<NotificationRow>(studioId, sec, COLLECTION, { recipientId: [collaboratorId] });
  return { sectionId: sec, ids: rows.filter((r) => r.recipientId === collaboratorId).map((r) => r.id) };
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
