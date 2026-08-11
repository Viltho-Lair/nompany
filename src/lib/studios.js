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
} from "@/lib/data/studios";
import {
  addCollaborator, listCollaborators, getCollaboratorByUser, updateCollaborator,
} from "@/lib/data/collaborators";
import { listSections } from "@/lib/data/sections";
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
export async function studiosForUser(userId) {
  const [owned, collaborations] = await Promise.all([
    getOwnedStudio(userId),
    listUserCollaborations(userId),
  ]);
  const shape = (s) => ({ id: s.id, name: s.name, slug: s.slug });
  return {
    owned: owned ? shape(owned) : null,
    collaborations: collaborations.map(shape),
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

export {
  listCollaborators, updateCollaborator, listSections,
  getStudioById, getStudioBySlug, changeStudioSlug,
};
