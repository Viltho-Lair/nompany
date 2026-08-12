// STUDIO SERVICE — turns requests into Studio / Collaborator / JoinRequest
// operations. Mirrors src/lib/identity.js, which owns the USER side.
//
// SCOPING RULE: everything here writes studio data (s:<StudioID>:*) or the
// global studio/joinRequest registries. It never writes user data — the only
// user-side effect is the derived ix:collab back-pointer, maintained by the
// collaborators repo.

import {
  createStudio, getStudioById, getStudioBySlug, getOwnedStudio,
  listUserCollaborations, changeStudioSlug,
  recordStudioVisit, studioVisitCounts, pruneStudioVisits,
} from "@/lib/data/studios";
import {
  addCollaborator, listCollaborators, getCollaboratorByUser, updateCollaborator,
} from "@/lib/data/collaborators";
import { listSections, listGrants, setGrant, removeGrant } from "@/lib/data/sections";
import {
  createJoinRequest, listPendingForStudio, getJoinRequest, decideJoinRequest,
  APPROVED, DECLINED,
} from "@/lib/data/joinRequests";
import { getIndex } from "@/lib/data/store";
import { IX, isValidSlug, RESERVED_SLUGS, SLUG_RE } from "@/lib/data/keys";
import { getVerification, getProfile } from "@/lib/data/users";
import { slugify } from "@/lib/slug";

// ---- creating the one studio a user may own --------------------------------
// Gated on a verified email: the address must be proven before a company can
// exist under it. Ownership is 0..1, enforced by the ix:owner claim underneath.
export async function createStudioForUser(user, { name, slug }) {
  const cleanName = String(name || "").trim();
  if (!cleanName) return { error: "name" };

  const verification = await getVerification(user.id);
  if (!verification?.emailVerifiedAt) return { error: "unverified" };

  const wanted = slugify(slug || cleanName);
  if (!isValidSlug(wanted)) {
    return { error: RESERVED_SLUGS.has(wanted) ? "slug-reserved" : "slug-invalid" };
  }
  // Seed the owner's studio-local name from their personal profile so they
  // don't appear as an unnamed member in their own people list. It stays a
  // COPY — renaming themselves here never touches their account profile.
  const profile = await getProfile(user.id);
  const ownerAlias = (profile?.shortName || profile?.fullName || "").trim();

  const created = await createStudio({ ownerUserId: user.id, name: cleanName, slug: wanted, ownerAlias });
  if (created.error) return created;
  return { studio: created.studio, sections: created.sections };
}

// Is this company code free? Used by the "choose your address" field.
export async function slugAvailability(rawSlug) {
  const slug = slugify(rawSlug || "");
  if (!SLUG_RE.test(slug)) return { slug, available: false, reason: "invalid" };
  if (RESERVED_SLUGS.has(slug)) return { slug, available: false, reason: "reserved" };
  const taken = await getIndex(IX.slug(slug));
  return { slug, available: !taken, reason: taken ? "taken" : "" };
}

// ---- what a user can see: their own studio + the ones they collaborate in ---
// Studios come back ORDERED BY HOW OFTEN THIS PERSON OPENS THEM, most-visited
// first, so a caller showing only the first few is showing the ones that
// actually matter to them rather than an arbitrary slice. Ties fall back to
// alphabetical, which keeps the order stable for someone who has visited
// nothing yet instead of letting it drift between requests.
export async function studiosForUser(userId) {
  const [owned, collaborations, visits] = await Promise.all([
    getOwnedStudio(userId),
    listUserCollaborations(userId),
    studioVisitCounts(userId),
  ]);
  const shape = (s) => ({ id: s.id, name: s.name, slug: s.slug, visits: visits[s.id] || 0 });
  const byVisits = (a, b) => b.visits - a.visits || String(a.name).localeCompare(String(b.name));

  // Creating a studio seeds its owner as a Collaborator row, so the owner is a
  // member of their own studio and `ix:collab` legitimately points at it. That
  // keeps People uniform, but it means "collaborations" would otherwise include
  // the studio you own. Collaboration means a studio SOMEONE ELSE let you into,
  // so the owned one is subtracted here — at the source, where every caller and
  // the visit ranking both get it right.
  const joined = owned ? collaborations.filter((s) => s.id !== owned.id) : collaborations;

  // We already hold the live set, so drop tallies for studios this person can no
  // longer reach. Fire-and-forget, and it only writes when something is stale.
  const live = [...(owned ? [owned.id] : []), ...joined.map((s) => s.id)];
  if (Object.keys(visits).some((id) => !live.includes(id))) {
    pruneStudioVisits(userId, live).catch(() => {});
  }

  return {
    owned: owned ? shape(owned) : null,
    collaborations: joined.map(shape).sort(byVisits),
  };
}

// ---- membership guard ------------------------------------------------------
// The address names the tenant; MEMBERSHIP authorises it. Returns
// { studio, collaborator } only when this user actually belongs to that studio,
// so a slug someone guessed reveals nothing.
export async function studioContext(user, slug) {
  if (!user) return { error: "unauthorized" };
  const studio = await getStudioBySlug(slug);
  if (!studio) return { error: "notfound" };
  const collaborator = await getCollaboratorByUser(studio.id, user.id);
  if (!collaborator) return { error: "forbidden" };
  return { studio, collaborator };
}

// Owner, or a collaborator the studio marked admin.
export function canAdminister(studio, collaborator) {
  return Boolean(collaborator && (collaborator.role === "owner" || collaborator.isAdmin));
}

// ---- section permissions ---------------------------------------------------
// DEFAULT DENY: a newly approved collaborator sees nothing until a section is
// granted to them. Granting everything on approval would recreate the very
// problem this exists to solve. Owners and studio admins always see everything —
// they cannot lock themselves out.
function grantsFor(grants, collaborator, sectionId) {
  return (grants || []).filter(
    (g) => g.subjectType === "collaborator" && g.subjectId === collaborator?.id && g.sectionId === sectionId
  );
}

export function canViewSection(studio, collaborator, sectionId, grants) {
  if (canAdminister(studio, collaborator)) return true;
  const rows = grantsFor(grants, collaborator, sectionId);
  if (rows.some((g) => g.effect === "deny" && g.action === "view")) return false; // deny wins
  return rows.some((g) => g.effect === "allow" && (g.action === "view" || g.action === "manage"));
}

// Manage implies view; a manage grant alone is enough to see the section too.
export function canManageSection(studio, collaborator, sectionId, grants) {
  if (canAdminister(studio, collaborator)) return true;
  const rows = grantsFor(grants, collaborator, sectionId);
  if (rows.some((g) => g.effect === "deny" && g.action === "manage")) return false;
  return rows.some((g) => g.effect === "allow" && g.action === "manage");
}

// The sections this person may actually open — what the studio nav renders.
export function visibleSections(studio, collaborator, sections, grants) {
  return (sections || []).filter((s) => s.enabled !== false && canViewSection(studio, collaborator, s.id, grants));
}

// { sales: true, technical: false, … } — used by the modules to decide whether a
// cross-record reference should be a link or plain text.
export function sectionNav(studio, collaborator, sections, grants) {
  const visible = new Set(visibleSections(studio, collaborator, sections, grants).map((s) => s.key));
  return Object.fromEntries((sections || []).map((s) => [s.key, visible.has(s.key)]));
}

// ---- joining someone else's studio by company code -------------------------
// Typing a code only ever RAISES A REQUEST. We deliberately report whether the
// code matched a studio (the slug is a public address anyway), but never who is
// in it or anything about it beyond its name.
export async function requestJoinByCode(user, code) {
  const studio = await getStudioBySlug(slugify(code || ""));
  if (!studio) return { error: "notfound" };
  if (studio.ownerUserId === user.id) return { error: "own-studio" };

  const existing = await getCollaboratorByUser(studio.id, user.id);
  if (existing) return { error: "already-member", studio: { name: studio.name, slug: studio.slug } };

  const created = await createJoinRequest({ studioId: studio.id, userId: user.id });
  if (created.error) return { error: created.error, studio: { name: studio.name, slug: studio.slug } };
  return { request: created.request, studio: { name: studio.name, slug: studio.slug } };
}

export async function listJoinRequests(studioId) {
  return listPendingForStudio(studioId);
}

// Approving is what actually creates the Collaborator row — the person's
// identity INSIDE this studio, with its own CollaboratorID.
export async function approveJoinRequest({ studio, actingCollaborator, requestId, alias, role }) {
  const request = await getJoinRequest(requestId);
  if (!request || request.studioId !== studio.id) return { error: "notfound" };

  const decided = await decideJoinRequest(requestId, { status: APPROVED, decidedByCollaboratorId: actingCollaborator.id });
  if (decided.error) return decided;

  const added = await addCollaborator(studio.id, {
    userId: request.userId,
    alias: String(alias || "").slice(0, 120),
    role: role === "admin" ? "admin" : "member",
    isAdmin: role === "admin",
  });
  if (added.error === "already") return { collaborator: await getCollaboratorByUser(studio.id, request.userId), request: decided.request };
  if (added.error) return { error: added.error };
  return { collaborator: added.collaborator, request: decided.request };
}

export async function declineJoinRequest({ studio, actingCollaborator, requestId }) {
  const request = await getJoinRequest(requestId);
  if (!request || request.studioId !== studio.id) return { error: "notfound" };
  return decideJoinRequest(requestId, { status: DECLINED, decidedByCollaboratorId: actingCollaborator.id });
}

// Turn a grant on or off. `enabled:false` removes the matching row rather than
// writing a deny, so "not granted" and "explicitly denied" stay distinguishable.
export async function toggleGrant(studioId, { collaboratorId, sectionId, action, enabled }) {
  if (!collaboratorId || !sectionId || !["view", "manage"].includes(action)) return { error: "missing" };
  const rows = await listGrants(studioId);
  const match = rows.find(
    (g) => g.subjectType === "collaborator" && g.subjectId === collaboratorId && g.sectionId === sectionId && g.action === action
  );
  if (enabled) {
    if (match && match.effect === "allow") return { ok: true };
    return setGrant(studioId, { subjectType: "collaborator", subjectId: collaboratorId, sectionId, action, effect: "allow" });
  }
  if (match) await removeGrant(studioId, match.id);
  // Revoking manage leaves view untouched; revoking view also drops manage,
  // since manage without view would be unreachable.
  if (action === "view") {
    const implied = rows.find(
      (g) => g.subjectType === "collaborator" && g.subjectId === collaboratorId && g.sectionId === sectionId && g.action === "manage"
    );
    if (implied) await removeGrant(studioId, implied.id);
  }
  return { ok: true };
}

export {
  listCollaborators, updateCollaborator, listSections, listGrants,
  getStudioById, getStudioBySlug, changeStudioSlug,
};

export { recordStudioVisit, studioVisitCounts, pruneStudioVisits };
