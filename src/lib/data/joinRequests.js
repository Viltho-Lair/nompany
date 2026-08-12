// JOIN REQUESTS — how a user becomes a collaborator in someone else's studio.
//
// No access tokens (removed by design): a person types the studio's COMPANY CODE
// (its slug — the same unique name that is its address) and that only ever
// RAISES A REQUEST. Approval by the studio is the gate, so a guessable code
// costs nothing.
//
// The row links user ↔ studio and holds NOTHING else: no data is written to
// either side until approval creates the Collaborator row. It is global (each
// row carries both ids) because it must be readable from either direction, and
// it is cleaned up by BOTH cascade paths (delete user → their requests; delete
// studio → its requests).

import { REG, ID } from "@/lib/data/keys";
import { readArr, editArr } from "@/lib/data/store";
import { emit, SCOPE, TYPE } from "@/lib/data/events";

export const PENDING = "pending";
export const APPROVED = "approved";
export const DECLINED = "declined";

// The duplicate check and the insert are one atomic step: two taps on "request
// to join" cannot both find no pending row and both add one.
export async function createJoinRequest({ studioId, userId }) {
  if (!studioId || !userId) return { error: "missing" };
  const outcome = await editArr(REG.joinRequests, (rows) => {
    if (rows.some((r) => r.studioId === studioId && r.userId === userId && r.status === PENDING)) {
      return { result: { error: "pending" } }; // never stack duplicates
    }
    const request = {
      id: ID.row("req"),
      studioId,
      userId,
      status: PENDING,
      createdAt: new Date().toISOString(),
      decidedAt: "",
      decidedByCollaboratorId: "",
    };
    return { next: [request, ...rows], result: { request } };
  });
  // The request lives in a GLOBAL registry, but it is the target studio's
  // admins who need to hear about it, so the event goes to that studio's log.
  if (outcome.request) await emit(studioId, { type: TYPE.joinRequested, scope: SCOPE.PEOPLE });
  return outcome;
}

export async function listPendingForStudio(studioId) {
  const rows = await readArr(REG.joinRequests);
  return rows
    .filter((r) => r.studioId === studioId && r.status === PENDING)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function listForUser(userId) {
  const rows = await readArr(REG.joinRequests);
  return rows.filter((r) => r.userId === userId);
}

export async function getJoinRequest(requestId) {
  const rows = await readArr(REG.joinRequests);
  return rows.find((r) => r.id === requestId) || null;
}

// Resolve a request. Only a PENDING one can be decided, and the check and the
// write are ONE atomic step — so when two admins approve the same person at the
// same moment, exactly one wins and the other is told "already-decided". That
// is what stops a double-approve from creating two collaborator rows: the guard
// is worthless if another request can slip between reading it and writing.
export async function decideJoinRequest(requestId, { status, decidedByCollaboratorId }) {
  const outcome = await editArr(REG.joinRequests, (rows) => {
    const current = rows.find((r) => r.id === requestId);
    if (!current) return { result: { error: "notfound" } };
    if (current.status !== PENDING) return { result: { error: "already-decided" } };
    const updated = {
      ...current,
      status,
      decidedAt: new Date().toISOString(),
      decidedByCollaboratorId: decidedByCollaboratorId || "",
    };
    return {
      next: rows.map((r) => (r.id === requestId ? updated : r)),
      result: { request: updated },
    };
  });
  // Only the winner of the race announces the decision — the losers changed
  // nothing.
  if (outcome.request) {
    await emit(outcome.request.studioId, { type: TYPE.joinDecided, scope: SCOPE.PEOPLE });
  }
  return outcome;
}
