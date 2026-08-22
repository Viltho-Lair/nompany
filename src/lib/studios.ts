// STUDIO SERVICE — turns requests into Studio / Collaborator / JoinRequest
// operations. Mirrors src/platform/auth/identity.js, which owns the USER side.
//
// SCOPING RULE: everything here writes studio data (s:<StudioID>:*) or the
// global studio/joinRequest registries. It never writes user data — the only
// user-side effect is the derived ix:collab back-pointer, maintained by the
// collaborators repo.

import {
  effectivePermissions, requirePermission, scopeFor, sectionViewable, sectionManageable,
  escalates, ADMIN_ROLE_ID,
} from "@/platform/access";
import { listRoles } from "@/modules/people/roles";
import { notifyCollaborators, NOTIFY } from "@/platform/notify/notifications";
import {
  createStudio, getStudioById, getStudioBySlug, getOwnedStudio,
  listUserCollaborations, changeStudioSlug,
  recordStudioVisit, studioVisitCounts, pruneStudioVisits,
} from "@/modules/main/studios";
import {
  addCollaborator, listCollaborators, getCollaboratorByUser, updateCollaborator,
} from "@/platform/auth/collaborators";
import { listSections } from "@/platform/db/sections";
import {
  createJoinRequest, listPendingForStudio, getJoinRequest, decideJoinRequest,
  APPROVED, DECLINED,
} from "@/modules/people/joinRequests";
import { getIndex } from "@/platform/db/store";
import { IX, isValidSlug, RESERVED_SLUGS, SLUG_RE } from "@/platform/db/keys";
import { getVerification, getProfile } from "@/platform/auth/users";
import { memberLimitOf } from "@/lib/plans";
import { slugify } from "@/shared/slug";

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
export async function studiosForUser(userId: string) {
  const [owned, collaborations, visits] = await Promise.all([
    getOwnedStudio(userId),
    listUserCollaborations(userId),
    studioVisitCounts(userId),
  ]);
  // A rename takes effect the moment it is saved, so there is nothing queued to
  // report and no pending shape to carry — what the row says IS the studio.
  const shape = (s) => ({
    id: s.id, name: s.name, slug: s.slug, logo: s.logo || "", visits: visits[s.id] || 0,
  });
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
  const live = [...(owned ? [String(owned.id)] : []), ...joined.map((s) => String(s.id))];
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
export async function studioContext(user: { id?: unknown } | null | undefined, slug: string) {
  if (!user) return { error: "unauthorized" };
  const studio = await getStudioBySlug(slug);
  if (!studio) return { error: "notfound" };
  // COLLABORATORS, ROLES AND SECTIONS ALL KEY OFF studio.id ALONE, so none of
  // them needed to wait for the others. Reading membership first and only then
  // asking for roles and sections cost a whole round trip to discover something
  // the other two reads did not depend on.
  //
  // The refusal still happens before any of it is USED, which is what matters:
  // a non-member gets the same answer, one wave sooner, and learns nothing extra
  // because nothing is returned to them either way.
  const [collaborator, roles, sections] = await Promise.all([
    getCollaboratorByUser(String(studio.id), String(user.id)),
    listRoles(String(studio.id)),
    listSections(String(studio.id)),
  ]);
  if (!collaborator) return { error: "forbidden" };

  // ACCESS IS RESOLVED ONCE, HERE. Every section context is built on this one,
  // so every service function already holds the answer and none of them has to
  // work it out again — which is exactly how the UI and the write paths came to
  // disagree in the first place.
  //
  // Roles and grants are both read while the legacy bridge stands; the resolver
  // decides which one speaks. When grants are migrated, drop the two reads.
  const access = effectivePermissions({ studio, collaborator, roles });

  // `grants` is still returned because callers destructure it; it is no longer
  // consulted for access and goes when the last of them stops asking.
  return { studio, collaborator, access, roles, sections, grants: [] };
}

// MAY THIS PERSON RUN THE STUDIO'S PEOPLE? Asked of the permission set, not of
// a flag on their row.
//
// It read `collaborator.isAdmin`, which was a COPY of what their roles already
// said — two answers to one question, free to disagree the moment either moved.
// The flag is gone; Admin is the wildcard ROLE, and holding it resolves to
// every permission including this one. An owner short-circuits to the same
// place inside effectivePermissions, so they can never be locked out.
//
// people.members.edit is the right the screens behind this actually need:
// approving a join request, editing somebody's access, opening Access.
export function canAdminister(access) {
  return !requirePermission(access, "people.members.edit");
}

// ---- section permissions ---------------------------------------------------
// DEFAULT DENY: somebody with no role sees nothing. What they may open is
// resolved from their permissions and nothing else.
//
// These three took a `grants` argument until now, and none of them read it: the
// grants model was replaced by roles and the parameter survived the replacement.
// Every caller was therefore paying a Redis read per page load to fetch a list
// that was passed down three levels and dropped. It is gone from all three.

// The sections this person may actually open — what the studio nav renders.
export function visibleSections(studio, collaborator, sections, access) {
  const keys = (sections || []).map((s) => s.key);
  return (sections || []).filter((s) => s.enabled !== false && sectionViewable(access, s.key, keys));
}

// { sales: true, technical: false, … } — used by the modules to decide whether a
// cross-record reference should be a link or plain text.
export function sectionNav(studio, collaborator, sections, access) {
  const visible = new Set(visibleSections(studio, collaborator, sections, access).map((s) => s.key));
  return Object.fromEntries((sections || []).map((s) => [s.key, visible.has(s.key)]));
}

// { "sales-tickets": true, "sales-clients": false, … } — MANAGE, per section
// key, the same shape sectionNav gives for view.
//
// Every screen in the studio already dispatches on the section key it is
// showing, so handing it this map lets each one ask about ITSELF. Threading a
// separate canManageX prop per sub-section was how the parent's answer ended up
// standing in for all of them.
export function manageMap(studio, collaborator, sections, access) {
  return Object.fromEntries((sections || []).map((s) => [s.key, sectionManageable(access, s.key, (sections || []).map((x) => x.key))]));
}

// Re-exported so a service module can guard a mutation without importing two
// modules to do it — the guard belongs beside the context that carries it.
export { requirePermission, scopeFor };

// ---- joining someone else's studio by company code -------------------------
// Typing a code only ever RAISES A REQUEST. We deliberately report whether the
// code matched a studio (the slug is a public address anyway), but never who is
// in it or anything about it beyond its name.
export async function requestJoinByCode(user, code) {
  const studio = await getStudioBySlug(slugify(code || ""));
  if (!studio) return { error: "notfound" };
  if (studio.ownerUserId === user.id) return { error: "own-studio" };

  const existing = await getCollaboratorByUser(String(studio.id), String(user.id));
  if (existing) return { error: "already-member", studio: { name: studio.name, slug: studio.slug } };

  const created = await createJoinRequest({ studioId: String(studio.id), userId: String(user.id) });
  if (created.error) return { error: created.error, studio: { name: studio.name, slug: studio.slug } };
  return { request: created.request, studio: { name: studio.name, slug: studio.slug } };
}

export async function listJoinRequests(studioId: string) {
  return listPendingForStudio(studioId);
}

// Approving is what actually creates the Collaborator row — the person's
// identity INSIDE this studio, with its own CollaboratorID.
export async function approveJoinRequest({ studio, actingCollaborator, actorAccess, requestId, alias, role }) {
  const request = await getJoinRequest(requestId);
  if (!request || request.studioId !== studio.id) return { error: "notfound" };

  // NOBODY MAY LET SOMEBODY IN WITH MORE THAN THEY HOLD THEMSELVES.
  //
  // The People screen already refuses to assign a role beyond the assigner's
  // own reach. Approving a join request assigns one too, and it was the SECOND
  // DOOR into the same escalation: approving as "admin" handed out the wildcard
  // without anyone checking whether the approver held it. Same rule, same
  // helper, so the two doors cannot drift apart.
  if (role === "admin") {
    const bad = escalates(actorAccess, { roleIds: [ADMIN_ROLE_ID] }, await listRoles(studio.id));
    if (bad) return bad;
  }

  // THE PACKAGE'S CEILING, checked before the request is marked approved —
  // approving and then failing to add would leave the person told yes and still
  // outside. A package with no limit set returns null and nothing is enforced.
  const limit = await memberLimitOf(studio);
  if (limit !== null) {
    const current = (await listCollaborators(studio.id)).length;
    if (current >= limit) return { error: "member-limit", limit };
  }

  const decided = await decideJoinRequest(requestId, { status: APPROVED, decidedByCollaboratorId: actingCollaborator.id });
  if (decided.error) return decided;

  // APPROVING AS "ADMIN" ASSIGNS THE ADMIN ROLE — it does not stamp a flag and
  // it does not invent a third value for `role`. `role` means ownership and
  // nothing else now: "owner" or "member". What somebody may DO is carried in
  // roleIds, so approving as an admin and being made one later on the People
  // screen leave the row in exactly the same state.
  const added = await addCollaborator(studio.id, {
    userId: request.userId,
    alias: String(alias || "").slice(0, 120),
    role: "member",
    roleIds: role === "admin" ? [ADMIN_ROLE_ID] : [],
  });
  if (added.error === "already") return { collaborator: await getCollaboratorByUser(studio.id, request.userId), request: decided.request };
  if (added.error) return { error: added.error };

  // TELL THEM THEY ARE IN — NOTIFY.joinDecided, declared since the notification
  // module was written and never once emitted. It is sent AFTER addCollaborator
  // rather than after decideJoinRequest, and the order is the point: until the
  // row exists they have no CollaboratorID, and a notification addressed to one
  // that does not exist is a message nobody can ever read.
  //
  // The DECLINE has no counterpart here, and cannot: somebody refused entry
  // never gets a CollaboratorID, so there is no identity inside this studio to
  // address. They learn it from their own account instead — see the joinRequests
  // block in currentIdentity — which is also the only place it can be said
  // without confirming to a stranger that the studio exists.
  await notifyCollaborators(
    studio.id,
    [String(added.collaborator?.id || "")],
    {
      type: NOTIFY.joinDecided,
      title: `You are in ${studio.name}`,
      body: "Your request to join was approved.",
      href: "",
      tone: "success",
    },
    { userIdOf: () => request.userId },
  );

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

export { recordStudioVisit, studioVisitCounts, pruneStudioVisits };
