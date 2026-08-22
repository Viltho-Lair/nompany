// STUDIO repository — the tenant/company entity.
//
//  • A user owns AT MOST ONE studio: ix:owner:<UserID> is claimed (SET NX) on
//    creation, so a second create fails at the database level of this layer.
//  • slug is UNIQUE (ix:slug claim) and is BOTH the public address
//    (nompany.com/<slug>) and the tenant handle.
//  • Creation seeds the fixed section list (each with a fresh SectionID) and
//    the owner's Collaborator row (role "owner") — a studio is born complete.

import { REG, U, S, IX, ID, SECTION_DEFS, isValidSlug } from "@/platform/db/keys";
import { readArr, writeArr, editArr, setJSON, claim, getIndex, release, sMembers, hIncrBy, hGetAll, hDel } from "@/platform/db/store";
import { addCollaborator } from "@/platform/auth/collaborators";
import { ensureDefaultPlan } from "@/lib/data/catalog";
import { emitPlatform, PLATFORM } from "@/platform/realtime/events";
import { notifySuper, NOTIFY } from "@/platform/notify/notifications";
import type { Section } from "@/platform/db/sections";

export async function createStudio(
  { ownerUserId, name, slug, ownerAlias = "" }:
  { ownerUserId?: string; name?: string; slug?: string; ownerAlias?: string },
) {
  const cleanName = String(name || "").trim();
  const cleanSlug = String(slug || "").toLowerCase();
  if (!ownerUserId || !cleanName) return { error: "missing" };
  if (!isValidSlug(cleanSlug)) return { error: "slug-invalid" };

  const id = ID.studio();
  // Claim order: slug first, then ownership; roll back on any failure so no
  // claim is ever stranded.
  if (!(await claim(IX.slug(cleanSlug), id))) return { error: "slug-taken" };
  if (!(await claim(IX.owner(ownerUserId), id))) {
    await release(IX.slug(cleanSlug));
    return { error: "already-owner" }; // 0..1 studios per user
  }
  try {
    const now = new Date().toISOString();
    // Every studio starts on the Free package and the Standard tier. Both are
    // planted if they do not exist yet, so the very first studio created in an
    // environment still lands on a real plan rather than a dangling id.
    const { packageId, tierId } = await ensureDefaultPlan();
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

    // Atomic — a lost registry row here would strand the slug and owner claims
    // made above, permanently burning that slug.
    await editArr(REG.studios, (rows) => ({ next: [studio, ...rows] }));

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
    await release(IX.owner(ownerUserId));
    await release(IX.slug(cleanSlug));
    throw e;
  }
}

// ---- lookups ---------------------------------------------------------------
export async function getStudioById(studioId: string) {
  if (!studioId) return null;
  const rows = await readArr(REG.studios);
  return rows.find((s) => s.id === studioId) || null;
}
// The same shape as findUserBySession, and the same fix: `g:studios` is a fixed
// key, so resolving the slug and reading the registry are independent questions
// that were being asked one after the other.
export async function getStudioBySlug(slug: string) {
  const [id, rows] = await Promise.all([
    getIndex(IX.slug(String(slug || "").toLowerCase())),
    readArr(REG.studios),
  ]);
  return id ? (rows.find((s) => s.id === id) || null) : null;
}
export async function getOwnedStudio(userId: string) {
  const id = await getIndex(IX.owner(userId));
  return id ? getStudioById(id) : null;
}
export async function listStudios() {
  return readArr(REG.studios);
}

// The two back-pointers on their own, for callers that already hold the studio
// registry and only need ids (listing every user's studios would otherwise
// re-read g:studios once per person).
export const ownedStudioId = (userId: string) => getIndex(IX.owner(userId));
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
