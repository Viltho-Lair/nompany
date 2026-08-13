// STUDIO repository — the tenant/company entity.
//
//  • A user owns AT MOST ONE studio: ix:owner:<UserID> is claimed (SET NX) on
//    creation, so a second create fails at the database level of this layer.
//  • slug is UNIQUE (ix:slug claim) and is BOTH the public address
//    (nompany.com/<slug>) and the tenant handle.
//  • Creation seeds the fixed section list (each with a fresh SectionID) and
//    the owner's Collaborator row (role "owner") — a studio is born complete.
//  • Time-limited access tokens: ix:stoken:<token> carries a Redis EX, so
//    expiry is enforced by Redis itself, not by a date check.
//
// STUDIO-scoped data lives ONLY under s:<StudioID>:* — never on a user.
// Deletion goes through cascade.js (cascadeDeleteStudio).

import { REG, U, S, IX, ID, SECTION_DEFS, isValidSlug } from "@/lib/data/keys";
import { readArr, writeArr, editArr, setJSON, claim, getIndex, release, sMembers, hIncrBy, hGetAll, hDel } from "@/lib/data/store";
import { addCollaborator } from "@/lib/data/collaborators";
import { ensureDefaultPlan } from "@/lib/data/catalog";

export async function createStudio({ ownerUserId, name, slug, ownerAlias = "" }) {
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
    const sections = [];
    SECTION_DEFS.forEach((d) => {
      const parent = {
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
    const seeded = await addCollaborator(id, { userId: ownerUserId, alias: ownerAlias, role: "owner", isAdmin: true });
    if (seeded.error) throw new Error(`owner collaborator: ${seeded.error}`);

    // Atomic — a lost registry row here would strand the slug and owner claims
    // made above, permanently burning that slug.
    await editArr(REG.studios, (rows) => ({ next: [studio, ...rows] }));
    return { studio, sections };
  } catch (e) {
    await release(IX.owner(ownerUserId));
    await release(IX.slug(cleanSlug));
    throw e;
  }
}

// ---- lookups ---------------------------------------------------------------
export async function getStudioById(studioId) {
  if (!studioId) return null;
  const rows = await readArr(REG.studios);
  return rows.find((s) => s.id === studioId) || null;
}
export async function getStudioBySlug(slug) {
  const id = await getIndex(IX.slug(String(slug || "").toLowerCase()));
  return id ? getStudioById(id) : null;
}
export async function getOwnedStudio(userId) {
  const id = await getIndex(IX.owner(userId));
  return id ? getStudioById(id) : null;
}
export async function listStudios() {
  return readArr(REG.studios);
}

// The two back-pointers on their own, for callers that already hold the studio
// registry and only need ids (listing every user's studios would otherwise
// re-read g:studios once per person).
export const ownedStudioId = (userId) => getIndex(IX.owner(userId));
export const collaborationStudioIds = (userId) => sMembers(IX.collab(userId));

// The studios a user COLLABORATES in (their own is via getOwnedStudio). Derived
// from the ix:collab back-pointer set — never stored twice.
export async function listUserCollaborations(userId) {
  const ids = await sMembers(IX.collab(userId));
  if (!ids.length) return [];
  const rows = await readArr(REG.studios);
  const byId = new Map(rows.map((s) => [s.id, s]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

// ---- registry updates (id/ownerUserId immutable; slug via changeStudioSlug) -
export async function updateStudio(studioId, patch) {
  return editArr(REG.studios, (rows) => {
    let updated = null;
    const next = rows.map((s) => {
      if (s.id !== studioId) return s;
      const { id, ownerUserId, slug, ...safe } = patch || {};
      updated = { ...s, ...safe, id: s.id, ownerUserId: s.ownerUserId, slug: s.slug };
      return updated;
    });
    return updated ? { next, result: updated } : { result: null };
  });
}

// Slug change = claim the new address, then release the old one (never a gap
// where both or neither resolve).
export async function changeStudioSlug(studioId, newSlug) {
  const clean = String(newSlug || "").toLowerCase();
  if (!isValidSlug(clean)) return { error: "slug-invalid" };
  const studio = await getStudioById(studioId);
  if (!studio) return { error: "notfound" };
  if (studio.slug === clean) return { studio };
  if (!(await claim(IX.slug(clean), studioId))) return { error: "slug-taken" };
  await editArr(REG.studios, (rows) => ({
    next: rows.map((s) => (s.id === studioId ? { ...s, slug: clean } : s)),
  }));
  await release(IX.slug(studio.slug));
  return { studio: { ...studio, slug: clean } };
}

// NB: studio ACCESS TOKENS were removed by design (2026-08-11). Joining a studio
// is now "type the company code (its slug) → request → owner approves", so a
// shareable token would be a second, weaker way in. See data/joinRequests.js.

// ---- how often this person opens each studio --------------------------------
// Used to rank the studios shown on the account overview, so the few on display
// are the ones actually being worked in. Deliberately a plain tally: no history
// is kept, nothing is written about WHEN, and nobody but the person themselves
// can read it — it lives under their own key prefix.
export async function recordStudioVisit(userId, studioId) {
  if (!userId || !studioId) return;
  await hIncrBy(U.studioVisits(userId), studioId, 1);
}

export async function studioVisitCounts(userId) {
  const raw = await hGetAll(U.studioVisits(userId));
  const out = {};
  for (const [id, n] of Object.entries(raw || {})) out[id] = Number(n) || 0;
  return out;
}

// A studio this person can no longer reach leaves a tally behind. It is inert —
// ranking only ever sorts studios already in hand — but pruning keeps the hash
// from growing without bound across a long-lived account.
export async function pruneStudioVisits(userId, liveStudioIds) {
  const counts = await studioVisitCounts(userId);
  const live = new Set(liveStudioIds);
  const stale = Object.keys(counts).filter((id) => !live.has(id));
  if (stale.length) await hDel(U.studioVisits(userId), ...stale);
  return stale.length;
}
