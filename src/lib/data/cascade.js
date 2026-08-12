// CASCADING DELETION — the ONLY legal deletion path for users, studios,
// sections and collaborators. Nothing else in the codebase may delete these.
//
// Redis has no ON DELETE CASCADE, so the guarantees come from three properties:
//  1. The ownership tree is the key tree → cascade = prefix deletion.
//  2. Deletion order is children-first, registry-last → a re-run after a crash
//     always finds the root again and finishes the job (idempotent).
//  3. sweepOrphans() (weekly cron) verifies registries ↔ indexes ↔ prefixes and
//     reaps anything a mid-cascade crash stranded.
//
// Cascade paths (mirrors the approved ER plan):
//  USER    → profile/verification/questionnaire/sessions → owned studio (full
//            studio cascade) → their Collaborator rows in OTHER studios →
//            join-requests → indexes → registry row.
//  STUDIO  → every s:<id>:* key (sections + all operational data, collaborators,
//            grants, tokens, notifications, media, settings, activity) →
//            members' ix:collab back-pointers → slug/owner/token indexes →
//            join-requests → registry row.
//  SECTION → its s:<sid>:sec:<id>:* collections → grants targeting it → row.
//  COLLABORATOR → row → their grants → their notifications → ix back-pointer.

import { REG, U, S, SEC, IX } from "@/lib/data/keys";
import { readArr, editArr, delKeys, delPrefix, release, getIndex, sRem, sMembers, scanPrefix, claim } from "@/lib/data/store";

// ---- collaborator ----------------------------------------------------------
export async function cascadeDeleteCollaborator(studioId, collaboratorId) {
  const rows = await readArr(S.collaborators(studioId));
  const row = rows.find((c) => c.id === collaboratorId);
  if (!row) return false; // already gone — idempotent

  // children first: grants + notifications addressed to this collaborator.
  // Each removal is atomic, so a grant written for SOMEONE ELSE while this
  // cascade runs is not swept away with the departing person's.
  await editArr(S.grants(studioId), (grants) => ({
    next: grants.filter((g) => !(g.subjectType === "collaborator" && g.subjectId === collaboratorId)),
  }));
  await editArr(S.notifications(studioId), (notifs) => ({
    next: notifs.filter((n) => n.recipientId !== collaboratorId),
  }));

  // back-pointer, then the row itself
  await sRem(IX.collab(row.userId), studioId);
  await editArr(S.collaborators(studioId), (all) => ({ next: all.filter((c) => c.id !== collaboratorId) }));
  return true;
}

// ---- section ---------------------------------------------------------------
export async function cascadeDeleteSection(studioId, sectionId) {
  const rows = await readArr(S.sections(studioId));
  const row = rows.find((s) => s.id === sectionId);

  // children first: every operational collection under the section prefix
  await delPrefix(SEC.prefix(studioId, sectionId));
  await editArr(S.grants(studioId), (grants) => ({ next: grants.filter((g) => g.sectionId !== sectionId) }));

  if (row) await editArr(S.sections(studioId), (all) => ({ next: all.filter((s) => s.id !== sectionId) }));
  return Boolean(row);
}

// ---- studio ----------------------------------------------------------------
export async function cascadeDeleteStudio(studioId) {
  const studios = await readArr(REG.studios);
  const studio = studios.find((s) => s.id === studioId);

  // read children we need BEFORE the prefix is deleted
  const collaborators = await readArr(S.collaborators(studioId));
  const tokens = await readArr(S.tokens(studioId));

  // members' back-pointers + live access-token indexes
  for (const c of collaborators) await sRem(IX.collab(c.userId), studioId);
  for (const t of tokens) await release(IX.stoken(t.token));

  // the whole subtree in one stroke: sections + all data, collaborators,
  // grants, tokens, notifications, media, settings, activity log
  await delPrefix(S.prefix(studioId));

  // uniqueness claims
  if (studio) {
    await release(IX.slug(studio.slug));
    await release(IX.owner(studio.ownerUserId));
  }

  // join-requests targeting this studio
  await editArr(REG.joinRequests, (jrs) => ({ next: jrs.filter((r) => r.studioId !== studioId) }));

  // registry last — atomic, so a studio created while this one is being deleted
  // is not erased along with it.
  if (studio) await editArr(REG.studios, (all) => ({ next: all.filter((s) => s.id !== studioId) }));
  return Boolean(studio);
}

// ---- user ------------------------------------------------------------------
export async function cascadeDeleteUser(userId) {
  const users = await readArr(REG.users);
  const user = users.find((u) => u.id === userId);

  // 1) the studio they OWN (full studio cascade — sections, data, everyone's
  //    access to it, tokens, media: all gone)
  const ownedId = await getIndex(IX.owner(userId));
  if (ownedId) await cascadeDeleteStudio(ownedId);

  // 2) their Collaborator rows in every OTHER studio (removes them from those
  //    studios' lists; their business records survive per the plan)
  const collabStudioIds = await sMembers(IX.collab(userId));
  for (const sid of collabStudioIds) {
    const rows = await readArr(S.collaborators(sid));
    const mine = rows.find((c) => c.userId === userId);
    if (mine) await cascadeDeleteCollaborator(sid, mine.id);
  }

  // 3) session indexes, then every u:<id>:* satellite (profile, verification
  //    code, questionnaire, session list)
  const sessions = await readArr(U.sessions(userId));
  for (const s of sessions) await release(IX.session(s.token));
  await delPrefix(U.prefix(userId));

  // 4) their join-requests + remaining indexes
  await editArr(REG.joinRequests, (jrs) => ({ next: jrs.filter((r) => r.userId !== userId) }));
  if (user) await release(IX.email(user.email));
  await delKeys(IX.collab(userId));

  // 5) registry last — atomic, so a signup landing mid-cascade survives.
  if (user) await editArr(REG.users, (all) => ({ next: all.filter((u) => u.id !== userId) }));
  return Boolean(user);
}

// ---- orphan sweeper (weekly cron; also runnable on demand) -----------------
// Verifies registries ↔ indexes ↔ key prefixes and repairs/reaps drift left by
// a crash mid-cascade. Every fix is safe and idempotent.
export async function sweepOrphans() {
  const fixed = { emailIndexRepaired: 0, emailIndexReaped: 0, slugIndexRepaired: 0, slugIndexReaped: 0, ownerIndexReaped: 0, userPrefixesReaped: 0, studioPrefixesReaped: 0, collabSetsCleaned: 0 };
  const users = await readArr(REG.users);
  const studios = await readArr(REG.studios);
  const userIds = new Set(users.map((u) => u.id));
  const studioIds = new Set(studios.map((s) => s.id));

  // registries → indexes (repair missing claims)
  for (const u of users) if (!(await getIndex(IX.email(u.email)))) { await claim(IX.email(u.email), u.id); fixed.emailIndexRepaired++; }
  for (const s of studios) if (!(await getIndex(IX.slug(s.slug)))) { await claim(IX.slug(s.slug), s.id); fixed.slugIndexRepaired++; }

  // indexes → registries (reap stale claims)
  for (const k of await scanPrefix("ix:email:")) {
    const target = await getIndex(k);
    if (!userIds.has(target)) { await delKeys(k); fixed.emailIndexReaped++; }
  }
  for (const k of await scanPrefix("ix:slug:")) {
    const target = await getIndex(k);
    if (!studioIds.has(target)) { await delKeys(k); fixed.slugIndexReaped++; }
  }
  for (const k of await scanPrefix("ix:owner:")) {
    const target = await getIndex(k);
    if (!studioIds.has(target) || !userIds.has(k.slice("ix:owner:".length))) { await delKeys(k); fixed.ownerIndexReaped++; }
  }

  // stranded prefixes (owner registry row is gone → subtree should be gone)
  const strandedRoots = (keys, prefix, known) => {
    const ids = new Set();
    for (const k of keys) { const id = k.slice(prefix.length).split(":")[0]; if (id && !known.has(id)) ids.add(id); }
    return ids;
  };
  for (const id of strandedRoots(await scanPrefix("u:"), "u:", userIds)) { await delPrefix(`u:${id}:`); fixed.userPrefixesReaped++; }
  for (const id of strandedRoots(await scanPrefix("s:"), "s:", studioIds)) { await delPrefix(`s:${id}:`); fixed.studioPrefixesReaped++; }

  // collaboration back-pointer sets
  for (const k of await scanPrefix("ix:collab:")) {
    const userId = k.slice("ix:collab:".length);
    if (!userIds.has(userId)) { await delKeys(k); fixed.collabSetsCleaned++; continue; }
    for (const sid of await sMembers(k)) {
      if (!studioIds.has(sid)) { await sRem(k, sid); fixed.collabSetsCleaned++; continue; }
      const rows = await readArr(S.collaborators(sid));
      if (!rows.some((c) => c.userId === userId)) { await sRem(k, sid); fixed.collabSetsCleaned++; }
    }
  }

  return { checked: { users: users.length, studios: studios.length }, fixed };
}
