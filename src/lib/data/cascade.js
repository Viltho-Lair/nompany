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
//  SECTION → its s:<sid>:sec:<id>:* collections → row.
//  COLLABORATOR → row → their notifications → ix back-pointer.
//  ROLE    → the `roleIds` reference on every holder → row. The permissions
//            themselves live ON the row, so they need no reaping.

import { REG, U, S, SEC, IX } from "@/lib/data/keys";
import { readArr, editArr, delKeys, delPrefix, release, getIndex, sRem, sMembers, scanPrefix, claim } from "@/lib/data/store";
import { emitPlatform, PLATFORM } from "@/lib/data/events";

// ---- collaborator ----------------------------------------------------------
export async function cascadeDeleteCollaborator(studioId, collaboratorId) {
  const rows = await readArr(S.collaborators(studioId));
  const row = rows.find((c) => c.id === collaboratorId);
  if (!row) return false; // already gone — idempotent

  // children first: the notifications addressed to this collaborator. The
  // removal is atomic, so one written for SOMEONE ELSE while this cascade runs
  // is not swept away with the departing person's.
  //
  // Their grants used to be reaped here too. Grants are gone — access is roles
  // plus the `roleIds` on this very row, so it leaves with the row.
  await editArr(S.notifications(studioId), (notifs) => ({
    next: notifs.filter((n) => n.recipientId !== collaboratorId),
  }));

  // back-pointer, then the row itself
  await sRem(IX.collab(row.userId), studioId);
  await editArr(S.collaborators(studioId), (all) => ({ next: all.filter((c) => c.id !== collaboratorId) }));
  return true;
}

// ---- role ------------------------------------------------------------------
// A ROLE *IS* ITS ACCESS. The permissions and scopes live on the row, so
// deleting the row deletes them — there is no separate access record to strand.
// What does not live on the row is the REFERENCE every holder carries in
// `roleIds`, and that is the only thing here worth reaping.
//
// Refusing to delete a role while somebody held it was the wrong answer, and it
// was the answer this module already knew better than: it made a job title
// undeletable until every holder had been hand-edited, to guard against a stale
// pointer the delete should simply remove. Deleting a role means the job no
// longer exists — the people who held it stop holding it, which is the intent
// and not a side effect.
//
// Leaving the pointer was worse than either: resolution filters roles by id, so
// a dangling one grants nothing silently, and `explain` — the one screen built
// to say WHY somebody cannot do something — reads a non-empty roleIds, skips
// its "no role yet" branch and answers "holds no role", which is both wrong and
// unhelpful at the moment somebody is trying to work out what happened.
//
// Children first, row last, so a re-run after a crash finds the row still there
// and finishes the job.
export async function cascadeDeleteRole(studioId, roleId) {
  const rows = await readArr(S.roles(studioId));
  const row = rows.find((r) => r.id === roleId);

  // Counted INSIDE the atomic write and returned as its result, not tallied by
  // a closure — editArr may re-run its callback under contention, and a counter
  // incremented from out here would double.
  const stripped = await editArr(S.collaborators(studioId), (all) => {
    const holders = all.filter((c) => (c.roleIds || []).includes(roleId));
    if (!holders.length) return { result: 0 };
    return {
      next: all.map((c) => ((c.roleIds || []).includes(roleId)
        ? { ...c, roleIds: c.roleIds.filter((id) => id !== roleId) }
        : c)),
      result: holders.length,
    };
  });

  if (row) await editArr(S.roles(studioId), (all) => ({ next: all.filter((r) => r.id !== roleId) }));
  return { removed: Boolean(row), stripped: stripped || 0 };
}

// ---- section ---------------------------------------------------------------
// Deleting a PARENT takes its sub-sections with it. Each sub-section owns its
// own key prefix and its own grants, so both are reaped per id — children
// first, then the parent, then the rows. Deleting a sub-section on its own
// leaves the parent untouched.
export async function cascadeDeleteSection(studioId, sectionId) {
  const rows = await readArr(S.sections(studioId));
  const row = rows.find((s) => s.id === sectionId);
  const children = rows.filter((s) => s.parentId === sectionId);
  const doomed = [...children.map((c) => c.id), sectionId];

  // children first: every operational collection under each doomed id. Nothing
  // else points at a section — grants did, and grants are gone.
  for (const id of doomed) await delPrefix(SEC.prefix(studioId, id));

  if (row) {
    await editArr(S.sections(studioId), (all) => ({ next: all.filter((s) => !doomed.includes(s.id)) }));
  }
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

  // The console's log records this; the studio's own log cannot, having just
  // been deleted along with everything else under its prefix. That asymmetry is
  // exactly why the platform log lives outside every cascade.
  if (studio) {
    await emitPlatform({
      type: PLATFORM.studioDeleted,
      title: "Studio deleted",
      body: `${studio.name} (/${studio.slug}) and all of its data were removed.`,
      refId: studioId,
    });
  }
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
