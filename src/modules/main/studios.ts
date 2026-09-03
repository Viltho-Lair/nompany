// STUDIO repository — the tenant/company entity.
//
//  • A user may own SEVERAL studios, but at most TWO of them on the DEFAULT
//    (Free) package. Studios on any other package are uncapped — see
//    FREE_STUDIO_LIMIT below for why the count is that shape.
//  • slug is UNIQUE (ix:slug claim) and is BOTH the public address
//    (nompany.com/<slug>) and the tenant handle.
//  • OWNERSHIP IS DERIVED, NOT INDEXED. There was an ix:owner:<UserID> claim
//    here, a SET NX that made a second create fail at this layer. It went when
//    the cap stopped being "zero or one" and started depending on each owned
//    studio's PACKAGE, which only the registry row carries — so the registry
//    read the cap needs is the read the lookup needed anyway, and the index
//    became a second hop answering strictly less. Deriving also removed a
//    per-user hop from listUsersForConsole, which already held the whole
//    registry and still asked.
//  • Creation seeds the fixed section list (each with a fresh SectionID) and
//    the owner's Collaborator row (role "owner") — a studio is born complete.
//    A SEPARATE id space per studio is what keeps two studios owned by one
//    person from ever addressing each other's data: they share section KEYS
//    and share no section IDS, and every collection key is
//    SEC.col(studioId, sectionId, name).

import { REG, U, S, IX, ID, SECTION_DEFS, isValidSlug } from "@/platform/db/keys";
import { readArr, writeArr, editArr, setJSON, claim, getIndex, release, delPrefix, sMembers, hIncrBy, hGetAll, hDel } from "@/platform/db/store";
import { addCollaborator } from "@/platform/auth/collaborators";
import { ensureDefaultPlan } from "@/lib/data/catalog";
import { emitPlatform, PLATFORM } from "@/platform/realtime/events";
import { notifySuper, NOTIFY } from "@/platform/notify/notifications";
import type { Section } from "@/platform/db/sections";

// HOW MANY STUDIOS ON THE DEFAULT PACKAGE ONE PERSON MAY OWN. Studios on any
// OTHER package are uncapped, so this is a cap on what somebody may take for
// free rather than a cap on how much business they may run here.
//
// The count keys off `packageId` — the field /super actually edits — and NOT
// the `plan: "free"` string alongside it, which nothing has written since
// creation and which would report a paid studio as free forever.
export const FREE_STUDIO_LIMIT = 2;

// Studios this user owns that sit on the default package. PURE — it takes the
// registry rows rather than reading them, so the cap can be asserted without a
// database and, more importantly, so the authoritative check can run INSIDE the
// registry compare-and-set where the rows are already in hand.
//
// AN ABSENT packageId COUNTS AS DEFAULT: that is the direction that cannot be
// exploited, and it agrees with planForStudio, which falls back to
// DEFAULT_PACKAGE for exactly that row. A packageId that is set but no longer
// names a catalogue item counts as PAID here while planForStudio shows it as
// free — closing that would mean reading the package catalogue on every create
// to learn something only /super deleting a live package can cause.
export function countFreeStudios(
  rows: StudioRow[], userId: string, defaultPackageId: string,
) {
  return rows.filter((s) => {
    if (String(s.ownerUserId || "") !== userId) return false;
    const pkg = String(s.packageId || "");
    return pkg === "" || pkg === defaultPackageId;
  }).length;
}

export async function createStudio(
  { ownerUserId, name, slug, ownerAlias = "" }:
  { ownerUserId?: string; name?: string; slug?: string; ownerAlias?: string },
) {
  const cleanName = String(name || "").trim();
  const cleanSlug = String(slug || "").toLowerCase();
  if (!ownerUserId || !cleanName) return { error: "missing" };
  if (!isValidSlug(cleanSlug)) return { error: "slug-invalid" };

  // The default package id is needed BEFORE anything is claimed — it is what
  // the cap counts against — and creation needs it a few lines later anyway, so
  // asking for it here costs nothing.
  const { packageId, tierId } = await ensureDefaultPlan();
  // The catalogue answers with a Row, so its ids are `unknown`. Narrowed ONCE,
  // here, rather than at each of the two places the cap counts against it — two
  // coercions is two chances for them to disagree about what an absent id means.
  const freePackageId = String(packageId || "");

  // THE CHEAP REFUSAL. Read the registry and count what this person already
  // owns on the default package. This is not the authoritative check — two
  // creates racing would both pass it — it is the one that answers a full
  // account in a single read, before a slug is claimed or a section is written.
  // The check that actually holds runs inside the registry compare-and-set
  // below, where the rows cannot change underneath it.
  const existing = await readArr<StudioRow>(REG.studios);
  if (countFreeStudios(existing, ownerUserId, freePackageId) >= FREE_STUDIO_LIMIT) {
    return { error: "free-studio-limit", limit: FREE_STUDIO_LIMIT };
  }

  const id = ID.studio();
  // The slug is the only uniqueness claim left. Ownership used to take a second
  // one here (ix:owner, SET NX) and no longer does — see the header.
  if (!(await claim(IX.slug(cleanSlug), id))) return { error: "slug-taken" };

  try {
    const now = new Date().toISOString();
    // Every studio starts on the Free package and the Standard tier — both
    // planted by the ensureDefaultPlan() above if they do not exist yet, so the
    // very first studio created in an environment still lands on a real plan
    // rather than a dangling id.
    const studio = {
      id, ownerUserId, name: cleanName, slug: cleanSlug,
      plan: "free", packageId, tierId,
      status: "active", createdAt: now,
    };

    // Seed the fixed section list. Parents get a SectionID, sub-sections get
    // their own id and point at their parent — one flat array, one id space,
    // so grants and the cascade treat both alike.
    const sections: Section[] = [];
    SECTION_DEFS.forEach((d) => {
      const parent: Section = {
        id: ID.section(), studioId: id, key: d.key, name: d.name, parentId: null,
        enabled: true, sortOrder: sections.length, settings: {}, createdAt: now,
      };
      sections.push(parent);
      (d.children || []).forEach((c) => {
        sections.push({
          id: ID.subsection(), studioId: id, key: c.key, name: c.name, parentId: parent.id,
          enabled: true, sortOrder: sections.length, settings: {}, createdAt: now,
        });
      });
    });
    await writeArr(S.sections(id), sections);
    await setJSON(S.settings(id), {});

    // The owner is a Collaborator like everyone else (uniform people table).
    // No role is assigned and none is needed: `role: "owner"` is what
    // effectivePermissions short-circuits on, so ownership carries every
    // permission without anything being written down twice.
    const seeded = await addCollaborator(id, { userId: ownerUserId, alias: ownerAlias, role: "owner" });
    if (seeded.error) throw new Error(`owner collaborator: ${seeded.error}`);

    // THE CAP, AUTHORITATIVELY. `editArr` is a compare-and-set, so the rows this
    // callback counts are the rows the write lands against — invariant 8's shape,
    // and the reason the check is here rather than only at the top. The ix:owner
    // SET NX used to provide this atomicity for free; a cap of two, decided by a
    // field on the row, cannot be expressed as a claim, so it moves inside the
    // write it has to be atomic with. Two creates racing now have one winner and
    // one refusal instead of a third free studio.
    //
    // Also atomic for the original reason: a lost registry row here would strand
    // the slug claim above, permanently burning that slug.
    const landed = await editArr<StudioRow, boolean>(REG.studios, (rows) => {
      if (countFreeStudios(rows, ownerUserId, freePackageId) >= FREE_STUDIO_LIMIT) {
        return { result: false };
      }
      return { next: [studio as StudioRow, ...rows], result: true };
    });

    // LOST THE RACE. Everything seeded above belongs to a studio that will never
    // exist, so it is removed rather than left for the orphan sweep: the sections,
    // settings and owner Collaborator row all live under one prefix, and the slug
    // claim would otherwise burn an address nobody owns. Deliberately NOT
    // cascadeDeleteStudio — that reads the registry to find a row that was never
    // written, and would emit a "studio deleted" the console should never see.
    if (!landed) {
      await delPrefix(S.prefix(id));
      await release(IX.slug(cleanSlug));
      return { error: "free-studio-limit", limit: FREE_STUDIO_LIMIT };
    }

    // Tell the console. AFTER the registry write, so the notification can never
    // describe a studio that does not exist — and best-effort inside, so a
    // failure to announce cannot undo a studio that does.
    await emitPlatform({
      type: PLATFORM.studioCreated,
      title: "New studio registered",
      body: `${cleanName} (/${cleanSlug}) completed onboarding.`,
      href: `/super/application/studios`,
      refId: id,
    });
    await notifySuper({
      type: NOTIFY.system,
      title: "New studio registered",
      body: `${cleanName} — nompany.com/${cleanSlug}`,
      href: `/super/application/studios`,
      tone: "success",
    });

    return { studio, sections };
  } catch (e) {
    await release(IX.slug(cleanSlug));
    throw e;
  }
}

// ---- lookups ---------------------------------------------------------------
export async function getStudioById(studioId: string): Promise<StudioRow | null> {
  if (!studioId) return null;
  const rows = await readArr<StudioRow>(REG.studios);
  return rows.find((s) => s.id === studioId) || null;
}
// The same shape as findUserBySession, and the same fix: `g:studios` is a fixed
// key, so resolving the slug and reading the registry are independent questions
// that were being asked one after the other.
export async function getStudioBySlug(slug: string): Promise<StudioRow | null> {
  const [id, rows] = await Promise.all([
    getIndex(IX.slug(String(slug || "").toLowerCase())),
    readArr<StudioRow>(REG.studios),
  ]);
  return id ? (rows.find((s) => s.id === id) || null) : null;
}
// EVERY studio this user owns — one read, not one per studio. This was
// getOwnedStudio, a getIndex(ix:owner) followed by a registry read to turn the
// id into a row; the index is gone and the registry read is the whole of it now,
// so the lookup lost a hop on the way to answering more.
//
// Ordered NEWEST FIRST, which is the order the registry itself keeps (createStudio
// unshifts), so a caller showing one studio shows the one just made rather than an
// arbitrary member of a set.
export async function listOwnedStudios(userId: string): Promise<StudioRow[]> {
  if (!userId) return [];
  const rows = await readArr<StudioRow>(REG.studios);
  return rows.filter((s) => String(s.ownerUserId || "") === userId);
}
export async function listStudios() {
  return readArr(REG.studios);
}

// The collaboration back-pointer on its own, for callers that already hold the
// studio registry and only need ids.
//
// ITS OWNERSHIP TWIN IS GONE. `ownedStudioId` was a getIndex per user, and its
// one caller — listUsersForConsole — already held the entire studio registry
// when it asked. Ownership is a field on the row it is holding, so that call was
// a round trip to learn something already in memory; it derives now, and there
// is nothing here to export.
export const collaborationStudioIds = (userId: string) => sMembers(IX.collab(userId));

// The studios a user COLLABORATES in (their own is via getOwnedStudio). Derived
// from the ix:collab back-pointer set — never stored twice.
/**
 * A STUDIO AS THE REGISTRY HOLDS IT. Named down to what callers read and open
 * past that: what else a studio carries — its plan, its branding, its legal
 * information — belongs to the screens that edit it, and restating all of it
 * here would be a second definition free to drift.
 */
export type StudioRow = { id: string; name?: string; slug?: string } & Record<string, unknown>;

export async function listUserCollaborations(userId: string): Promise<StudioRow[]> {
  const ids = await sMembers(IX.collab(userId));
  if (!ids.length) return [];
  const rows = await readArr<StudioRow>(REG.studios);
  const byId = new Map(rows.map((s) => [s.id, s] as [string, StudioRow]));
  // `filter(Boolean)` removes the misses, and the cast is what says so — an id
  // in the back-pointer set with no registry row is drift the sweeper cleans,
  // not something a caller has to handle.
  return ids.map((id) => byId.get(id)).filter(Boolean) as StudioRow[];
}

// ---- registry updates (id/ownerUserId immutable; slug via changeStudioSlug) -
export async function updateStudio(studioId: string, patch: Record<string, unknown>) {
  return editArr<StudioRow, StudioRow | null>(REG.studios, (rows) => {
    let updated: StudioRow | null = null;
    const next = rows.map((s) => {
      if (s.id !== studioId) return s;
      // The three destructured out are the immutable ones — id, owner and slug
      // — and naming them is how they are excluded, which is why none is read.
      // The slug has its own path because it carries a uniqueness claim.
      const { id: _id, ownerUserId: _owner, slug: _slug, ...safe } = patch || {};
      updated = { ...s, ...safe, id: s.id, ownerUserId: s.ownerUserId, slug: s.slug } as StudioRow;
      return updated;
    });
    return updated ? { next, result: updated } : { result: null };
  });
}

// Slug change = claim the new address, then release the old one (never a gap
// where both or neither resolve).
export async function changeStudioSlug(studioId: string, newSlug: unknown) {
  const clean = String(newSlug || "").toLowerCase();
  if (!isValidSlug(clean)) return { error: "slug-invalid" };
  const studio = await getStudioById(studioId);
  if (!studio) return { error: "notfound" };
  if (studio.slug === clean) return { studio };
  if (!(await claim(IX.slug(clean), studioId))) return { error: "slug-taken" };
  await editArr(REG.studios, (rows) => ({
    next: rows.map((s) => (s.id === studioId ? { ...s, slug: clean } : s)),
  }));
  await release(IX.slug(String(studio.slug || "")));
  return { studio: { ...studio, slug: clean } };
}

// ---- renaming a studio -------------------------------------------------------
// IT HAPPENS WHEN THEY PRESS SAVE.
//
// This used to be a REQUEST applied at midnight by a cron, on the reasoning that
// changing the public address mid-afternoon breaks every open tab, bookmark and
// shared link. That reasoning was half right and its own comment said so:
// midnight does not make the old address work either. It moved the breakage
// rather than removing it, and charged a cron job, three fields on the studio
// row, a scheduled state in two screens and a failure path for the privilege.
//
// So it is immediate, and the old address stops resolving at once. Renaming is
// rare, it is the owner's deliberate act, and the people affected are the
// handful of colleagues who will be told. What is gone with the deferral: the
// cron, `pendingName`, `pendingSlug`, `renameAt`, and everything that read them.
export async function renameStudio(
  studioId: string,
  { name, slug }: { name?: unknown; slug?: unknown },
) {
  const studio = await getStudioById(studioId);
  if (!studio) return { error: "notfound" };

  const cleanName = String(name ?? "").trim().slice(0, 120);
  const cleanSlug = String(slug ?? "").trim().toLowerCase();

  const wantsName = Boolean(cleanName) && cleanName !== studio.name;
  const wantsSlug = Boolean(cleanSlug) && cleanSlug !== studio.slug;
  if (!wantsName && !wantsSlug) return { changed: false, studio };

  // THE ADDRESS FIRST, because it is the half that can fail. changeStudioSlug
  // claims the new slug before releasing the old one, so a name is never
  // applied to a studio whose address change was refused — which is the state
  // the old two-step could leave behind.
  let current = studio;
  if (wantsSlug) {
    if (!isValidSlug(cleanSlug)) return { error: "slug-invalid" };
    const out = await changeStudioSlug(studioId, cleanSlug);
    if (out.error) return { error: out.error === "slug-taken" ? "slug-taken" : out.error };
    // changeStudioSlug returns the row it just wrote whenever it did not error,
    // and the branch above has already returned on every error path.
    current = out.studio as StudioRow;
  }
  if (wantsName) current = (await updateStudio(studioId, { name: cleanName })) || current;

  return { changed: true, studio: current };
}

// NB: studio ACCESS TOKENS were removed by design (2026-08-11). Joining a studio
// is now "type the company code (its slug) → request → owner approves", so a
// shareable token would be a second, weaker way in. See data/joinRequests.js.

// ---- how often this person opens each studio --------------------------------
// Used to rank the studios shown on the account overview, so the few on display
// are the ones actually being worked in. Deliberately a plain tally: no history
// is kept, nothing is written about WHEN, and nobody but the person themselves
// can read it — it lives under their own key prefix.
export async function recordStudioVisit(userId: string, studioId: string) {
  if (!userId || !studioId) return;
  await hIncrBy(U.studioVisits(userId), studioId, 1);
}

export async function studioVisitCounts(userId: string) {
  const raw = await hGetAll(U.studioVisits(userId));
  const out: Record<string, unknown> = {};
  for (const [id, n] of Object.entries(raw || {})) out[id] = Number(n) || 0;
  return out;
}

// A studio this person can no longer reach leaves a tally behind. It is inert —
// ranking only ever sorts studios already in hand — but pruning keeps the hash
// from growing without bound across a long-lived account.
export async function pruneStudioVisits(userId: string, liveStudioIds: readonly string[]) {
  const counts = await studioVisitCounts(userId);
  const live = new Set(liveStudioIds);
  const stale = Object.keys(counts).filter((id) => !live.has(id));
  if (stale.length) await hDel(U.studioVisits(userId), ...stale);
  return stale.length;
}
