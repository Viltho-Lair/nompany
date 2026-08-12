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

import { REG, S, IX, ID, SECTION_DEFS, isValidSlug } from "@/lib/data/keys";
import { readArr, writeArr, editArr, setJSON, claim, getIndex, release, sMembers } from "@/lib/data/store";
import { addCollaborator } from "@/lib/data/collaborators";

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
    const studio = { id, ownerUserId, name: cleanName, slug: cleanSlug, plan: "free", status: "active", createdAt: now };

    // Seed the fixed section list — every section gets its own unique SectionID.
    const sections = SECTION_DEFS.map((d, i) => ({
      id: ID.section(), studioId: id, key: d.key, name: d.name,
      enabled: true, sortOrder: i, settings: {}, createdAt: now,
    }));
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
