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

import { S, IX, ID } from "@/lib/data/keys";
import { readArr, writeArr, sAdd } from "@/lib/data/store";

// HR fields carried on the merged row (studio-scoped, admin/HR-editable).
const HR_DEFAULTS = {
  departmentId: "", positionId: "", employeeCode: "", dateOfJoin: "",
  mobile: "", photo: "", certificationIds: [],
  idNumber: "", passportNumber: "", idExpiry: "", passportExpiry: "",
  idImage: "", passportImage: "",
};

export async function addCollaborator(studioId, { userId, alias = "", role = "member", isAdmin = false, ...hr }) {
  if (!studioId || !userId) return { error: "missing" };
  const rows = await readArr(S.collaborators(studioId));
  if (rows.some((c) => c.userId === userId)) return { error: "already" }; // UNIQUE(StudioID, UserID)
  const collaborator = {
    id: ID.collaborator(),
    studioId,
    userId,
    alias,
    role,                    // "owner" | "member" | studio-defined
    isAdmin: !!isAdmin,      // studio-scoped admin flag (never global)
    settings: {},            // internal display settings, this studio only
    ...HR_DEFAULTS,
    ...hr,
    createdAt: new Date().toISOString(),
  };
  await writeArr(S.collaborators(studioId), [collaborator, ...rows]);
  await sAdd(IX.collab(userId), studioId);
  return { collaborator };
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
  const rows = await readArr(S.collaborators(studioId));
  let updated = null;
  const next = rows.map((c) => {
    if (c.id !== collaboratorId) return c;
    const { id, studioId: sid, userId, ...safe } = patch || {};
    updated = { ...c, ...safe, id: c.id, studioId: c.studioId, userId: c.userId };
    return updated;
  });
  if (updated) await writeArr(S.collaborators(studioId), next);
  return updated;
}
