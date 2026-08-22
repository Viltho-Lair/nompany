// COLLABORATOR repository — the merged person-record inside ONE studio
// (per the approved plan: Collaborator and Employee are ONE entity).
//
// The same human in three studios = one User + three Collaborator rows with
// three different CollaboratorIDs under three different s:<StudioID>: prefixes.
// alias / role / settings / HR fields live on THIS row → they exist and display
// only inside this studio (isolation is physical, not conventional).
//
// All person references inside a studio (createdBy, assignees, notification
// recipients) point at CollaboratorID — never UserID.
//
// UNIQUE(StudioID, UserID) is enforced on insert. ix:collab:<UserID> (a SET of
// StudioIDs) is the user's derived "collaboration studios" list.
// Row deletion goes through cascade.js (cascadeDeleteCollaborator).

import { S, IX, ID } from "@/platform/db/keys";
import { readArr, editArr, sAdd } from "@/platform/db/store";
import { emit, SCOPE, TYPE } from "@/platform/realtime/events";

// HR fields carried on the merged row (studio-scoped, admin/HR-editable).
//
// THREE FIELDS ARE GONE, all three because they were copies:
//
//   photo      — the face belongs to the ACCOUNT, not to one studio's record of
//                it. Stored here it froze on the day somebody joined, so
//                changing your picture changed it everywhere but HR. Read off
//                the profile now, on every read, the way People always did it.
//   positionId — a job title beside the roleIds that say what the job may do.
//                One list now: roleIds is what somebody is.
//   departmentId is still here and still studio-local, but it holds a SECTION
//                KEY rather than a row id — see lib/departments.js.
const HR_DEFAULTS = {
  departmentId: "", employeeCode: "", dateOfJoin: "",
  mobile: "", certificationIds: [],
  idNumber: "", passportNumber: "", idExpiry: "", passportExpiry: "",
  idImage: "", passportImage: "",
};

// UNIQUE(StudioID, UserID) is enforced INSIDE the atomic write, so two approvals
// racing on the same person cannot both pass the check and both insert a row.
export async function addCollaborator(studioId, { userId, alias = "", role = "member", roleIds = [], ...hr }) {
  if (!studioId || !userId) return { error: "missing" };
  const outcome = await editArr(S.collaborators(studioId), (rows) => {
    if (rows.some((c) => c.userId === userId)) return { result: { error: "already" } };
    const collaborator = {
      id: ID.collaborator(),
      studioId,
      userId,
      alias,
      // "owner" or "member". OWNERSHIP ONLY — it is not where access lives.
      // There was an `isAdmin` flag beside it saying the same thing a second
      // way; both are gone in favour of the roles below, which are the one
      // place that answers what somebody may do.
      role,
      roleIds: Array.isArray(roleIds) ? roleIds : [],
      overrides: { allow: [], deny: [] },
      settings: {},            // internal display settings, this studio only
      ...HR_DEFAULTS,
      ...hr,
      createdAt: new Date().toISOString(),
    };
    return { next: [collaborator, ...rows], result: { collaborator } };
  });
  // The back-pointer only after the row is really there — never for a rejected
  // duplicate, which would leave the user "collaborating" in a studio twice.
  if (outcome.collaborator) {
    await sAdd(IX.collab(userId), studioId);
    await emit(studioId, { type: TYPE.peopleChanged, scope: SCOPE.PEOPLE });
  }
  return outcome;
}

export async function listCollaborators(studioId) {
  return readArr(S.collaborators(studioId));
}
export async function getCollaborator(studioId, collaboratorId) {
  const rows = await readArr(S.collaborators(studioId));
  return rows.find((c) => c.id === collaboratorId) || null;
}
export async function getCollaboratorByUser(studioId, userId) {
  const rows = await readArr(S.collaborators(studioId));
  return rows.find((c) => c.userId === userId) || null;
}

// id / studioId / userId are immutable — everything else is patchable.
export async function updateCollaborator(studioId, collaboratorId, patch) {
  const updated = await editArr(S.collaborators(studioId), (rows) => {
    let hit = null;
    const next = rows.map((c) => {
      if (c.id !== collaboratorId) return c;
      const { id, studioId: sid, userId, ...safe } = patch || {};
      hit = { ...c, ...safe, id: c.id, studioId: c.studioId, userId: c.userId };
      return hit;
    });
    return hit ? { next, result: hit } : { result: null };
  });
  if (updated) await emit(studioId, { type: TYPE.peopleChanged, scope: SCOPE.PEOPLE });
  return updated;
}
