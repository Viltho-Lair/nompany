// Per-user "updates" (unread log entries) tracking, stored in localStorage so it
// stays personal to each browser/user without any server read-state. An item's
// `log` array (projects + salesTickets both have one) is the source of truth;
// "unread" = log entries newer than the last time this user opened that item,
// excluding the user's own changes.

const SEEN_KEY = "mt_updates_seen";       // { [itemId]: ISO last-seen }
const BASE_KEY = "mt_updates_baseline";   // ISO — first time this browser used it

function ls() {
  try { return typeof window !== "undefined" ? window.localStorage : null; } catch { return null; }
}

// A baseline set on first use so pre-existing history doesn't all show as unread
// — only entries added after the user started using the feature count.
export function baseline() {
  const s = ls();
  if (!s) return new Date().toISOString();
  let b = s.getItem(BASE_KEY);
  if (!b) { b = new Date().toISOString(); try { s.setItem(BASE_KEY, b); } catch {} }
  return b;
}

export function getSeen() {
  const s = ls();
  if (!s) return {};
  try { return JSON.parse(s.getItem(SEEN_KEY) || "{}"); } catch { return {}; }
}

export function markSeen(id, iso) {
  const s = ls();
  if (!s || !id) return;
  const m = getSeen();
  m[id] = iso || new Date().toISOString();
  try { s.setItem(SEEN_KEY, JSON.stringify(m)); } catch {}
}

export function seenAt(id) {
  return getSeen()[id] || baseline();
}

// Log entries newer than last-seen, excluding the current user's own changes.
export function unreadEntries(log, id, me) {
  const since = seenAt(id);
  const myId = me?.id;
  const myName = me?.fullName || me?.userId;
  return (Array.isArray(log) ? log : []).filter((e) => {
    if ((e.at || "") <= since) return false;
    if (myId && e.byId) return e.byId !== myId;
    if (myName && e.by) return e.by !== myName;
    return true;
  });
}

export function unreadCount(log, id, me) {
  return unreadEntries(log, id, me).length;
}

// Set of unread entry ids — for highlighting rows in a log list. Captured once
// (against the last-seen value) so it stays stable while the item is open even
// after markSeen() is called.
export function unreadEntryIdSet(log, id, me) {
  return new Set(unreadEntries(log, id, me).map((e) => e.id));
}
