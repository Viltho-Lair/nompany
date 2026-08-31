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
// POSTGRES HAS NEITHER A KEY TREE NOR ON DELETE CASCADE EITHER, and it is a
// SEPARATE SYSTEM from Redis — no transaction spans both, so property 1 above
// ("cascade = prefix deletion") has no Postgres analogue at all. What a
// section or studio owns there is instead an EXPLICIT, BOUNDED scope: an
// exact tenant_id, and for a section, an ENUMERATED collection list read from
// SECTION_COLLECTIONS (see pgDeleteSectionRows/pgDeleteAllForTenant in
// pgRows.ts) — never a predicate that could match more than the caller named
// (invariant 17). Property 2 (children-first, registry-last) still holds
// ACROSS both stores: every section/studio cascade below reaps Postgres rows
// and the Redis subtree — in either order between the two, since both are
// equally "children" — before touching the Redis registry row that names the
// section or studio, so a crash at any point before that registry write
// leaves a parent a re-run still finds and finishes, and a crash after it
// leaves nothing left to redo. Which of the two stores actually holds rows —
// neither (redis), Postgres only (postgres), or both (parity, where BOTH must
// be reaped or the next parity comparison sees a phantom) — follows
// DB_BACKEND (see sections.ts); see PG_HOLDS_ROWS below. Property 3 does NOT
// extend to Postgres — see the comment above sweepOrphans for why not, and
// what stays uncovered.
//
// Cascade paths (mirrors the approved ER plan):
//  USER    → profile/verification/questionnaire/sessions → owned studio (full
//            studio cascade) → their Collaborator rows in OTHER studios →
//            join-requests → indexes → registry row.
//  STUDIO  → every collection_rows row this tenant holds (Postgres, when
//            DB_BACKEND says it holds any) → every s:<id>:* key (sections +
//            all operational data, collaborators, grants, tokens,
//            notifications, media, settings, activity) → members' ix:collab
//            back-pointers → slug/owner/token indexes → join-requests →
//            registry row.
//  SECTION → its collection_rows rows (Postgres, ditto) → its
//            s:<sid>:sec:<id>:* collections → row.
//  COLLABORATOR → row → their notifications → ix back-pointer.
//  ROLE    → the `roleIds` reference on every holder → row. The permissions
//            themselves live ON the row, so they need no reaping.
//  ENGAGEMENT → every record the deal OWNS (the stage registry says which) →
//            each one's engagement state → the member ZSETs → the deal index →
//            the root. Records the deal merely USED are detached and left
//            standing; see cascadeDeleteEngagement.

import { REG, U, S, SEC, IX, ENG, KEY_PREFIX } from "./keys";
import { readArr, editArr, delKeys, delPrefix, release, getIndex, sRem, sMembers, scanPrefix, claim, zRem } from "./store";
import { STAGE_REGISTRY } from "@/platform/engagement/registry";
import { readEngagement, readEngagementView, detachRecord, isEngagementLocked, SLOT_TYPE } from "./engagement";
import { listSections, deleteRow, collectionsForKey, DB_BACKEND } from "./sections";
import { pgDeleteSectionRows, pgDeleteAllForTenant } from "./pgRows";
import { emitPlatform, PLATFORM } from "@/platform/realtime/events";
import { hashToken } from "@/platform/auth/passwords";
import { log } from "@/platform/http/observability";

// ---- which store(s) a cascade must reap ------------------------------------
// Sections, studios, collaborators, roles and users are REGISTRY objects —
// Redis-resident arrays under the ownership prefix, unmoved by DB_BACKEND (see
// keys.ts's table: only the OPERATIONAL ROWS a section owns — tickets,
// quotations, invoices, the collections named in SECTION_COLLECTIONS — live in
// Postgres's collection_rows once DB_BACKEND says so). So every cascade below
// still reads/writes the registry through Redis unconditionally, and this flag
// is consulted ONLY to decide whether Postgres also holds operational rows
// that need reaping alongside the Redis ones cascade already knew about.
//
//   redis    → Postgres holds nothing for this deployment; the Postgres path
//              must not run at all (Requirement 3).
//   postgres → Postgres holds the operational rows; the Redis SEC/S prefix
//              delete below still runs too, but finds nothing (nothing was
//              ever written there) and is a harmless no-op scan.
//   parity   → BOTH stores hold rows (every write went to both), so BOTH must
//              be reaped or the next parity comparison in this process sees a
//              phantom row and blames the wrong store for the divergence.
const PG_HOLDS_ROWS = DB_BACKEND !== "redis";

// ---- what a cascade needs to know about the rows it reaps ------------------
// NARROW ON PURPOSE. A cascade does not care what a collaborator or a studio IS
// — it cares which pointers leave with it. Naming the full row types here would
// make this module a second definition of every record it touches, and it would
// have to change every time one of them grew a field it does not read.
type Identified = { id: string };
type CollaboratorRef = Identified & { userId: string; roleIds?: string[] };
// `key` is read only by the Postgres path below, to look up which operational
// collections this section owns (SECTION_COLLECTIONS is keyed by section KEY,
// not by the minted SectionID) — nothing else here needed it before.
type SectionRef = Identified & { parentId?: string | null; key: string };
type StudioRef = Identified & { name: string; slug: string; ownerUserId: string };
type UserRef = Identified & { email: string };
type SessionRef = { tokenHash?: string; token?: string };

// ---- collaborator ----------------------------------------------------------
export async function cascadeDeleteCollaborator(studioId: string, collaboratorId: string): Promise<boolean> {
  const rows = await readArr<CollaboratorRef>(S.collaborators(studioId));
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
export async function cascadeDeleteRole(studioId: string, roleId: string): Promise<{ removed: boolean; stripped: number }> {
  const rows = await readArr<Identified>(S.roles(studioId));
  const row = rows.find((r) => r.id === roleId);

  // Counted INSIDE the atomic write and returned as its result, not tallied by
  // a closure — editArr may re-run its callback under contention, and a counter
  // incremented from out here would double.
  const stripped = await editArr<CollaboratorRef, number>(S.collaborators(studioId), (all) => {
    const holders = all.filter((c) => (c.roleIds || []).includes(roleId));
    if (!holders.length) return { result: 0 };
    return {
      next: all.map((c) => ((c.roleIds || []).includes(roleId)
        ? { ...c, roleIds: (c.roleIds || []).filter((id) => id !== roleId) }
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
export async function cascadeDeleteSection(studioId: string, sectionId: string): Promise<boolean> {
  const rows = await readArr<SectionRef>(S.sections(studioId));
  const row = rows.find((s) => s.id === sectionId);
  const children = rows.filter((s) => s.parentId === sectionId);
  const doomed = [...children.map((c) => c.id), sectionId];

  // CHILDREN FIRST, IN BOTH STORES, NEITHER STORE FIRST WITHIN A GIVEN id.
  // Postgres and Redis are separate systems with no transaction spanning them,
  // so "atomic" is not on offer — what IS on offer is that the section's own
  // registry row (removed below, LAST) is the thing every re-run keys off, and
  // it is untouched until every doomed id's rows are gone from BOTH stores.
  //
  // WHAT A CRASH AT EACH POINT LEAVES:
  //  - mid-loop (id 2 of 3 done, id 3 not started): the registry row still
  //    lists all three doomed ids (untouched until the loop finishes), so a
  //    re-run recomputes the identical `doomed` list. id 1 and 2's deletes are
  //    then no-ops (already empty, matched-zero-rows / empty-prefix-scan) and
  //    id 3 gets reaped — no orphan, no double-delete.
  //  - after the loop, before the registry write below: every doomed id's data
  //    is gone from both stores but the registry still names them. A re-run
  //    finds `row` present, repeats the (now all-empty) per-id loop as
  //    harmless no-ops, and completes the registry write it didn't reach
  //    before.
  //  - after the registry write: `row` is gone on the next call, which is the
  //    existing "already gone — idempotent" return below; nothing is re-run
  //    because there is nothing left to finish.
  for (const id of doomed) {
    // Postgres FIRST — see the module header for the PG_HOLDS_ROWS decision.
    // A section is looked up by its minted id but SECTION_COLLECTIONS is keyed
    // by the section's KEY, so the id is resolved back to its own row (in
    // `rows`, read once above) before the lookup.
    if (PG_HOLDS_ROWS) {
      const sec = rows.find((s) => s.id === id);
      const collections = sec ? collectionsForKey(sec.key) : [];
      if (collections.length) await pgDeleteSectionRows(studioId, id, collections);
    }
    // Redis: every operational collection under this id. Nothing else points
    // at a section — grants did, and grants are gone.
    await delPrefix(SEC.prefix(studioId, id));
  }

  if (row) {
    await editArr<SectionRef, void>(S.sections(studioId), (all) => ({ next: all.filter((s) => !doomed.includes(s.id)) }));
  }
  return Boolean(row);
}

// ---- studio ----------------------------------------------------------------
export async function cascadeDeleteStudio(studioId: string): Promise<boolean> {
  const studios = await readArr<StudioRef>(REG.studios);
  const studio = studios.find((s) => s.id === studioId);

  // read children we need BEFORE the prefix is deleted
  const collaborators = await readArr<CollaboratorRef>(S.collaborators(studioId));

  // members' back-pointers. Time-limited access tokens used to be released
  // here too; nothing ever minted one, so there was nothing to release.
  for (const c of collaborators) await sRem(IX.collab(c.userId), studioId);

  // POSTGRES FIRST, EVERY OPERATIONAL ROW THIS TENANT EVER HELD — the fix for
  // the defect this task exists to close: without this, deleting a studio
  // removed its registry row, its sections and its members while every
  // ticket, quotation, project and invoice stayed in collection_rows forever.
  // Runs before the Redis subtree below (order between the two stores'
  // deletes does not matter for correctness — see below — only that BOTH
  // finish before the registry row, further down, does).
  //
  // WHAT A CRASH AT EACH POINT LEAVES: this call is one statement inside one
  // Postgres transaction (withTenant's BEGIN…COMMIT), so it is atomic in
  // isolation — it either removes every row this tenant holds, or (a crash or
  // network failure before COMMIT) leaves all of them untouched. Either way
  // the studio's REG.studios row is still there (untouched until the very end
  // of this function), so a re-run reaches this line again: already-empty is
  // a zero-row no-op, still-populated gets reaped. A crash AFTER this commits
  // but before the Redis delPrefix below leaves Postgres empty and Redis still
  // holding the subtree — also fine, because the registry row is still there
  // to trigger a re-run, and this call repeats as a no-op while the Redis
  // delete (which had not run yet) completes.
  if (PG_HOLDS_ROWS) await pgDeleteAllForTenant(studioId);

  // the whole subtree in one stroke: sections + all data, collaborators,
  // notifications, settings
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
export async function cascadeDeleteUser(userId: string): Promise<boolean> {
  const users = await readArr<UserRef>(REG.users);
  const user = users.find((u) => u.id === userId);

  // 1) the studio they OWN (full studio cascade — sections, data, everyone's
  //    access to it, tokens, media: all gone)
  const ownedId = await getIndex(IX.owner(userId));
  if (ownedId) await cascadeDeleteStudio(ownedId);

  // 2) their Collaborator rows in every OTHER studio (removes them from those
  //    studios' lists; their business records survive per the plan)
  const collabStudioIds = await sMembers(IX.collab(userId));
  for (const sid of collabStudioIds) {
    const rows = await readArr<CollaboratorRef>(S.collaborators(sid));
    const mine = rows.find((c) => c.userId === userId);
    if (mine) await cascadeDeleteCollaborator(sid, mine.id);
  }

  // 3) session indexes, then every u:<id>:* satellite (profile, verification
  //    code, questionnaire, session list)
  const sessions = await readArr<SessionRef>(U.sessions(userId));
  // Both shapes — see sessionKeys in data/users.js. A user being deleted must
  // not leave a live session behind because its row used the older form.
  for (const s of sessions) {
    if (s?.tokenHash) await release(IX.session(s.tokenHash));
    if (s?.token) { await release(IX.session(hashToken(s.token))); await release(IX.session(s.token)); }
  }
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
//
// THIS FUNCTION DELETES BY PREFIX, so it is the one place in the codebase where
// getting the key namespace wrong is unrecoverable rather than merely wrong.
// It used to REPAIR through the prefixed builders (IX.email(), IX.slug()) and
// REAP through bare literals ("u:", "s:", "ix:email:"). Under any KEY_PREFIX —
// which tests/integration.test.mjs sets unconditionally — that combination
// reads an EMPTY registry and then scans the REAL key space, so every live user
// and studio subtree looks orphaned and is deleted. Two guards close that:
//
//   1. Every scan below is namespaced with P, exactly like every other key this
//      module touches. A sweep can now only ever see its own namespace.
//   2. An empty registry inside a namespace is refused outright. It is the
//      normal state of a fresh namespace and it is never a licence to delete
//      anything — belt and braces, because guard 1 is a change somebody could
//      undo without realising what it was for.
//
// Deliberately NOT guarded on NODE_ENV: the failure this prevents is a
// production runtime picking up a stray variable, so the check has to hold in
// production too.
//
// BOTH GUARDS ARE EXPRESSED AS VALUES rather than inline conditions, because a
// test cannot safely prove them by RUNNING this function: the suite shares one
// Redis with production, so a regression test that executed the sweep would
// itself delete the data it exists to protect. SWEEP_SCOPES and sweepRefusal()
// are pure, so the guards can be asserted without a single DEL.
const P = KEY_PREFIX;

// EVERY prefix this function is allowed to scan, built once from the namespace.
// If a seventh scan is ever added it belongs here, and the test that every
// scope starts with KEY_PREFIX then covers it automatically.
// ---- engagement -------------------------------------------------------------
// DELETING A DEAL, AND THE ONE RULE THAT MAKES IT SAFE.
//
// The user's words: "engagements carry ID of everything, when an engagement is
// deleted everything that is linked to it will be deleted EXCEPT IF THE
// INFORMATION IS CREATED ELSE WHERE." That exception is the whole design here.
//
// WHAT DIES is decided by STAGE_REGISTRY's `onDelete`, walked rather than
// listed — a hand-written type list is how readEngagementView once silently
// dropped `bill` and `asset`, and the same mistake on a DESTRUCTIVE path either
// deletes something nobody agreed to delete or strands it. Each entry carries
// its own reason; read them there, not here.
//
// WHAT SURVIVES, and why it is not even a decision this function makes: a Tier B
// shared reference (spec §3.1) — the Sales CLIENT above all, plus vendors,
// items, collaborators, roles, sections, settings — is NOT IN THE STAGE REGISTRY
// AT ALL. `context.clientId` points at a client; it does not own one, and other
// engagements point at the same row. Walking only the registry is therefore what
// keeps every shared reference out of the blast radius by construction, rather
// than by an exclusion list somebody has to remember to extend.
//
// ORDER: children-first, registry-last (invariant 11). Each record's engagement
// state comes off BEFORE its row — the recoverable direction, exactly as
// removeQuotation/removeProject do it: a crash then leaves a real row with no
// engagement state, which the backfill heals, rather than engagement state
// pointing at a row that no longer exists, which nothing heals. The root goes
// last of all, so a re-run after a crash still finds it and finishes the job.
export type EngagementCascade =
  | { ok: true; deleted: Array<{ type: string; id: string }>; kept: Array<{ type: string; id: string }> }
  | { error: "notfound" | "locked" };

export async function cascadeDeleteEngagement(
  studioId: string, engId: string,
): Promise<EngagementCascade> {
  const root = await readEngagement(studioId, engId);
  // Already gone — idempotent. The root is deleted LAST, so its absence means
  // the cascade already ran to completion; there is nothing left to finish.
  if (!root) return { error: "notfound" };
  // THE INTERLOCK, AND IT LIVES HERE rather than only at the route. A destructive
  // action guarded in one caller is guarded until the second caller is written.
  if (isEngagementLocked(root)) return { error: "locked" };

  const view = await readEngagementView(studioId, engId);
  if (!view) return { error: "notfound" };

  // The sections are read ONCE for the whole cascade and looked up in memory.
  // getSectionByKey per stage type would be fourteen reads of the same list —
  // the exact "convenience helper that re-reads" the hop-count constraint log
  // exists to keep out.
  const sections = await listSections(studioId);
  const sectionByKey = new Map(sections.map((sec) => [sec.key, sec]));

  // Every (type, id) this deal knows about: its member sets, plus the root's
  // singleton slots — `approvedQuotation` names a quotation, which SLOT_TYPE
  // states once so it is not re-guessed here.
  const byType = new Map<string, Set<string>>();
  const note = (type: string, id: string | null | undefined) => {
    if (!id || !STAGE_REGISTRY[type]) return;
    const set = byType.get(type) || new Set<string>();
    set.add(id);
    byType.set(type, set);
  };
  for (const [type, ids] of Object.entries(view.members)) for (const id of ids) note(type, id);
  for (const [slot, id] of Object.entries(view.singletons)) note(SLOT_TYPE[slot] || slot, id);

  const deleted: Array<{ type: string; id: string }> = [];
  const kept: Array<{ type: string; id: string }> = [];

  for (const entry of Object.values(STAGE_REGISTRY)) {
    const ids = byType.get(entry.type);
    if (!ids?.size) continue;
    const section = sectionByKey.get(entry.sectionKey) || null;
    for (const id of ids) {
      // Engagement state first, for BOTH dispositions: a kept record must stop
      // pointing at a root that is about to disappear just as surely as a
      // deleted one must.
      await detachRecord(studioId, engId, entry.type, id);
      if (entry.onDelete !== "cascade") { kept.push({ type: entry.type, id }); continue; }
      // A studio with no section of that key has no rows of that type either —
      // nothing to delete, and nothing to report as deleted.
      if (section && await deleteRow(studioId, section.id, entry.collection, id)) {
        deleted.push({ type: entry.type, id });
      }
    }
  }

  // The member ZSETs are children of the root, so they go before it. Every one
  // should already be empty (detachRecord zRem'd each id, and Redis drops an
  // empty sorted set), but a re-run after a crash mid-loop must still clear
  // whatever survived — that is what makes this idempotent rather than merely
  // repeatable.
  await delKeys(Object.values(STAGE_REGISTRY).map((e) => ENG.members(studioId, engId, e.type)));
  // REGISTRY LAST: the listing index, then the root itself. In that order, a
  // crash between them leaves a root nothing lists — invisible and re-deletable
  // — rather than an index entry pointing at nothing, which every reader trips
  // over.
  await zRem(ENG.index(studioId), engId);
  await delKeys(ENG.root(studioId, engId));
  return { ok: true, deleted, kept };
}

export const SWEEP_SCOPES = Object.freeze({
  email: `${P}ix:email:`,
  slug: `${P}ix:slug:`,
  owner: `${P}ix:owner:`,
  collab: `${P}ix:collab:`,
  user: `${P}u:`,
  studio: `${P}s:`,
});

/**
 * Why a sweep must not run, or null if it may.
 *
 * An empty registry inside a NAMESPACE is the normal state of a fresh test run,
 * and it is never a licence to delete anything. An empty registry with NO
 * namespace is a genuinely empty database, where there is nothing to lose and
 * nothing to reap either — so that case is allowed through and simply finds
 * nothing.
 */
export function sweepRefusal(
  prefix: string,
  users: readonly unknown[],
  studios: readonly unknown[],
): string | null {
  if (prefix && !users.length && !studios.length) return "empty-registry-under-prefix";
  return null;
}

// POSTGRES ROWS ARE NOT SWEPT HERE, AND CANNOT BE FROM THIS FUNCTION AS
// WRITTEN (Requirement 6 — a decision, not a workaround).
//
// Every scope this sweep walks is discovered FROM REDIS: REG.users/REG.studios
// for the repair passes, and a scan of the u:/s: key space for the
// "stranded prefix" pass below. A studio cascade that already ran to
// completion under this fix leaves nothing stranded — its Postgres rows went
// with cascadeDeleteStudio, in order, before the registry row did — so the
// gap here is specifically studios that were fully cascaded (or otherwise
// erased) FROM REDIS by something else, or before this fix existed: no
// registry row, no s:<id>:* subtree, nothing this scan can find. Its
// Postgres rows, if any survive under that same tenant_id, are invisible to
// every tool in this codebase, not just this one — RLS on collection_rows is
// FORCED and the connecting role holds no BYPASSRLS, so there is no query
// this connection can run to ask "which tenant_ids exist in collection_rows"
// independently of a tenant id supplied from elsewhere. Enumerating Postgres
// tenants directly needs a maintenance role scoped by its own RLS policy —
// the intended future fix, and deliberately not built here (see the cascade
// Postgres-path report for the reasoning).
//
// Stated in the return value rather than left to be inferred from an absent
// field, so a caller reading `fixed` cannot mistake "this sweep found no
// stray Postgres rows" for "this sweep checked for stray Postgres rows and
// found none" — it never checked at all.
const POSTGRES_SWEEP_NOTE =
  "sweepOrphans discovers every id it reaps from Redis (registries + a u:/s: key scan); " +
  "it cannot enumerate Postgres tenant_ids independently (RLS is FORCED, no BYPASSRLS), so a studio " +
  "already erased from Redis by something else leaves any surviving collection_rows for it unreachable " +
  "by this sweep. Uncovered until a maintenance role scoped by its own RLS policy exists.";

export async function sweepOrphans() {
  const fixed = { emailIndexRepaired: 0, emailIndexReaped: 0, slugIndexRepaired: 0, slugIndexReaped: 0, ownerIndexReaped: 0, userPrefixesReaped: 0, studioPrefixesReaped: 0, collabSetsCleaned: 0 };
  const users = await readArr<UserRef>(REG.users);
  const studios = await readArr<StudioRef>(REG.studios);

  // GUARD 2. Nothing to reconcile against means nothing may be reaped.
  const refusal = sweepRefusal(P, users, studios);
  if (refusal) {
    log.warn(`[sweep] refusing to run: key prefix "${P}" is set and both registries are empty.`);
    return { skipped: refusal, prefix: P, checked: { users: 0, studios: 0 }, fixed, postgres: POSTGRES_SWEEP_NOTE };
  }

  const userIds = new Set(users.map((u) => u.id));
  const studioIds = new Set(studios.map((s) => s.id));

  // registries → indexes (repair missing claims)
  for (const u of users) if (!(await getIndex(IX.email(u.email)))) { await claim(IX.email(u.email), u.id); fixed.emailIndexRepaired++; }
  for (const s of studios) if (!(await getIndex(IX.slug(s.slug)))) { await claim(IX.slug(s.slug), s.id); fixed.slugIndexRepaired++; }

  // indexes → registries (reap stale claims)
  //
  // `?? ""` RATHER THAN A NULL CHECK, and it is the same decision either way: an
  // index whose value vanished between the scan and the read points at nothing,
  // which is precisely a stale claim, so it is reaped. Naming it "" makes that
  // explicit — no id is the empty string — instead of leaving the compiler to
  // ask a question the behaviour had already answered.
  for (const k of await scanPrefix(SWEEP_SCOPES.email)) {
    const target = (await getIndex(k)) ?? "";
    if (!userIds.has(target)) { await delKeys(k); fixed.emailIndexReaped++; }
  }
  for (const k of await scanPrefix(SWEEP_SCOPES.slug)) {
    const target = (await getIndex(k)) ?? "";
    if (!studioIds.has(target)) { await delKeys(k); fixed.slugIndexReaped++; }
  }
  for (const k of await scanPrefix(SWEEP_SCOPES.owner)) {
    const target = (await getIndex(k)) ?? "";
    if (!studioIds.has(target) || !userIds.has(k.slice(SWEEP_SCOPES.owner.length))) { await delKeys(k); fixed.ownerIndexReaped++; }
  }

  // stranded prefixes (owner registry row is gone → subtree should be gone)
  const strandedRoots = (keys: string[], prefix: string, known: ReadonlySet<string>) => {
    const ids = new Set<string>();
    for (const k of keys) { const id = k.slice(prefix.length).split(":")[0]; if (id && !known.has(id)) ids.add(id); }
    return ids;
  };
  for (const id of strandedRoots(await scanPrefix(SWEEP_SCOPES.user), SWEEP_SCOPES.user, userIds)) { await delPrefix(`${SWEEP_SCOPES.user}${id}:`); fixed.userPrefixesReaped++; }
  for (const id of strandedRoots(await scanPrefix(SWEEP_SCOPES.studio), SWEEP_SCOPES.studio, studioIds)) { await delPrefix(`${SWEEP_SCOPES.studio}${id}:`); fixed.studioPrefixesReaped++; }

  // collaboration back-pointer sets
  for (const k of await scanPrefix(SWEEP_SCOPES.collab)) {
    const userId = k.slice(SWEEP_SCOPES.collab.length);
    if (!userIds.has(userId)) { await delKeys(k); fixed.collabSetsCleaned++; continue; }
    for (const sid of await sMembers(k)) {
      if (!studioIds.has(sid)) { await sRem(k, sid); fixed.collabSetsCleaned++; continue; }
      const rows = await readArr<CollaboratorRef>(S.collaborators(sid));
      if (!rows.some((c) => c.userId === userId)) { await sRem(k, sid); fixed.collabSetsCleaned++; }
    }
  }

  return { checked: { users: users.length, studios: studios.length }, fixed, postgres: POSTGRES_SWEEP_NOTE };
}
