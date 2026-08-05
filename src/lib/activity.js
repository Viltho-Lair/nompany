// Studio-wide activity log — powers the notification bell. Every mutation
// that matters to someone other than the actor writes one entry here via
// logActivity(). Reads are scoped per-viewer in getActivityFeed(): admin sees
// literally everything; everyone else only sees entries whose `sectionKey`
// their tags can reach (same rule the sidebar/pages already use).

import { createItem, getCollection, replaceCollection } from "@/lib/db";
import { ADMIN_TAG } from "@/lib/authConstants";
import { canAccessSection } from "@/lib/sectionAccessConstants";

const MAX_ENTRIES = 400; // keep the JSON blob bounded; trimmed opportunistically on write

// verb: "created" | "updated" | "commented" | "status" | "deleted"
// sectionKey: a lib/sectionAccessConstants key — decides who can see this entry.
// label: short human-readable line, e.g. `New quotation Q-2026-004`.
// href: where "Go to" should navigate.
export async function logActivity({ actor, verb, sectionKey, entityType, entityId, label, href }) {
  await createItem("activityLog", {
    actorId: actor?.id || null,
    actorUserId: actor?.userId || "Public",
    verb,
    sectionKey,
    entityType,
    entityId,
    label,
    href,
    createdAt: new Date().toISOString(),
  });

  // Opportunistic trim — only pay the extra read+write when we're actually
  // over the cap, not on every single write.
  const rows = await getCollection("activityLog");
  if (rows.length > MAX_ENTRIES) {
    const trimmed = [...rows].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, MAX_ENTRIES);
    await replaceCollection("activityLog", trimmed);
  }
}

// Department → the section key whose members should be notified about a task.
// Management has no dedicated section, so it falls back to the shared "tasks"
// inbox. Used by notifyDepartments() so a task reaches every related team.
const DEPT_SECTION = {
  Sales: "sales-list",
  Finance: "finance",
  Technical: "technical-quotations",
  Management: "tasks",
};

// Emit one activity entry per distinct related-department section, so members of
// each department see the task in their notification bell (the feed is section
// scoped). One entry per section (deduped) — a viewer only sees the section(s)
// they can reach.
export async function notifyDepartments({ actor, departments, verb = "created", entityType, entityId, label, href }) {
  const sections = [...new Set((departments || []).map((d) => DEPT_SECTION[d] || "tasks"))];
  for (const sectionKey of sections) {
    await logActivity({ actor, verb, sectionKey, entityType, entityId, label, href });
  }
}

// Scoped feed for the given viewer, newest first. `accessMap` is the
// getSectionAccess() result the caller already has (avoids a duplicate DB read).
export async function getActivityFeed(user, accessMap, limit = 60) {
  if (!user) return [];
  const rows = await getCollection("activityLog");
  const sorted = [...rows].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const tags = Array.isArray(user.tags) ? user.tags : [];
  const isAdmin = tags.includes(ADMIN_TAG);
  const visible = isAdmin
    ? sorted
    : sorted.filter((r) => !r.sectionKey || canAccessSection(user, r.sectionKey, accessMap));
  return visible.slice(0, limit);
}
