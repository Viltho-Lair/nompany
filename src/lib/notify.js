// Server-side helper for writing PER-USER notifications (replaces the old
// section-scoped notifyDepartments). Every trigger point calls notifyUsers with
// the specific recipients — the people something is assigned to or awaiting.
import { createItem, getCollection, replaceCollection, getSettings } from "@/lib/db";
import { getSectionAccess } from "@/lib/sectionAccess";
import { canAccessSection } from "@/lib/sectionAccessConstants";
import { wantsKind, notifItemKey } from "@/lib/notifications";

const KEEP_PER_USER = 100; // bound the collection per recipient

// Notify a set of users. Skips the actor (never notify yourself), skips anyone
// who has turned this `kind` off in their per-user settings, and dedupes ids.
// `itemKey` defaults from entityType (sidebar grouping).
export async function notifyUsers({ userIds, kind, label, href, entityType, entityId, itemKey, actor, settings }) {
  const recipients = [...new Set((userIds || []).map(String).filter(Boolean))].filter((id) => id !== actor?.id);
  if (!recipients.length) return;
  const s = settings || (await getSettings());
  const prefsAll = s?.notificationPrefs || {};
  const targets = recipients.filter((uid) => wantsKind(prefsAll[uid], kind));
  if (!targets.length) return;

  const now = new Date().toISOString();
  const key = itemKey || notifItemKey(entityType);
  for (const uid of targets) {
    await createItem("notifications", {
      userId: uid,
      kind,
      label: String(label || "").slice(0, 300),
      href: href || "",
      entityType: entityType || "",
      entityId: entityId || "",
      itemKey: key,
      actorId: actor?.id || null,
      actorUserId: actor?.userId || "System",
      read: false,
      createdAt: now,
    });
  }

  // Opportunistic per-user trim so the collection stays bounded.
  const all = await getCollection("notifications");
  const drop = new Set();
  for (const uid of targets) {
    const mine = all
      .filter((n) => n.userId === uid)
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    if (mine.length > KEEP_PER_USER) for (const n of mine.slice(KEEP_PER_USER)) drop.add(n.id);
  }
  if (drop.size) await replaceCollection("notifications", all.filter((n) => !drop.has(n.id)));
}

// Notify @mentioned users — but ONLY those who currently have access to the
// record's `sectionKey` (mentions are limited to users who can see the content,
// re-verified server-side even if the client offered someone else).
export async function notifyMentions({ actor, mentions, sectionKey, label, href, entityType, entityId, settings }) {
  const ids = [...new Set((mentions || []).map(String).filter(Boolean))].filter((id) => id !== actor?.id);
  if (!ids.length) return;
  const [users, accessMap] = await Promise.all([getCollection("users"), getSectionAccess()]);
  const usersById = Object.fromEntries(users.map((u) => [u.id, u]));
  const allowed = ids.filter((id) => usersById[id] && canAccessSection(usersById[id], sectionKey, accessMap));
  if (!allowed.length) return;
  await notifyUsers({ actor, userIds: allowed, kind: "mention", label, href, entityType, entityId, settings });
}
