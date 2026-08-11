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
import { readArr, writeArr } from "@/lib/data/store";

export const PENDING = "pending";
export const APPROVED = "approved";
export const DECLINED = "declined";

export async function createJoinRequest({ studioId, userId }) {
  if (!studioId || !userId) return { error: "missing" };
  const rows = await readArr(REG.joinRequests);
  if (rows.some((r) => r.studioId === studioId && r.userId === userId && r.status === PENDING)) {
    return { error: "pending" }; // never stack duplicates
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
  await writeArr(REG.joinRequests, [request, ...rows]);
  return { request };
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

// Resolve a request. Only a PENDING one can be decided, so a double-approve
// cannot create two collaborator rows.
export async function decideJoinRequest(requestId, { status, decidedByCollaboratorId }) {
  const rows = await readArr(REG.joinRequests);
  const current = rows.find((r) => r.id === requestId);
  if (!current) return { error: "notfound" };
  if (current.status !== PENDING) return { error: "already-decided" };
  const updated = { ...current, status, decidedAt: new Date().toISOString(), decidedByCollaboratorId: decidedByCollaboratorId || "" };
  await writeArr(REG.joinRequests, rows.map((r) => (r.id === requestId ? updated : r)));
  return { request: updated };
}
