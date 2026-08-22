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

import { REG, ID } from "@/platform/db/keys";
import { readArr, editArr } from "@/platform/db/store";
import { emit, emitPlatform, SCOPE, TYPE, PLATFORM } from "@/platform/realtime/events";
import { listCollaborators } from "@/platform/auth/collaborators";
import { listRoles } from "./roles";
import { effectivePermissions, can } from "@/platform/access";
import { notifyCollaborators, NOTIFY } from "@/platform/notify/notifications";
import type { JoinRequest } from "./types";

export const PENDING = "pending";
export const APPROVED = "approved";
export const DECLINED = "declined";

// The duplicate check and the insert are one atomic step: two taps on "request
// to join" cannot both find no pending row and both add one.
export async function createJoinRequest({ studioId, userId }: { studioId?: string; userId?: string }) {
  if (!studioId || !userId) return { error: "missing" };
  const outcome = await editArr<JoinRequest, { error?: string; request?: JoinRequest }>(REG.joinRequests, (rows) => {
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
  if (outcome.request) {
    await emit(studioId, { type: TYPE.joinRequested, scope: SCOPE.PEOPLE });

    // And, unlike a row change, this one is worth INTERRUPTING somebody over:
    // it sits there until a human decides it. The event above refreshes a board
    // that happens to be open; this reaches an admin who is somewhere else.
    // WHO CAN ACTUALLY ACT ON THIS is who gets told. That is the same question
    // the People screen answers, so it is asked of the same resolver rather
    // than of a flag on the row — a request announced to somebody who cannot
    // approve it is a notification that wastes the only person who saw it.
    const [people, roles] = await Promise.all([listCollaborators(studioId), listRoles(studioId)]);
    const admins = people.filter((c) =>
      can(effectivePermissions({ collaborator: c, roles }), "people.members.edit"));
    const userIdOf = new Map(admins.map((c) => [String(c.id), String(c.userId)]));
    await notifyCollaborators(
      studioId,
      admins.map((c) => String(c.id)),
      {
        type: NOTIFY.joinRequested,
        title: "Someone asked to join",
        body: "A request is waiting in People & requests.",
        href: "people",
        tone: "primary",
      },
      { userIdOf: (id) => userIdOf.get(id) },
    );

    await emitPlatform({
      type: PLATFORM.joinRequested,
      title: "Join request raised",
      body: "Someone asked to join a studio.",
      refId: studioId,
    });
  }
  return outcome;
}

export async function listPendingForStudio(studioId: string) {
  const rows = await readArr<JoinRequest>(REG.joinRequests);
  return rows
    .filter((r) => r.studioId === studioId && r.status === PENDING)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

// EVERY REQUEST THIS PERSON HAS RAISED, whatever became of it.
//
// It existed before finding M-2 and had no caller — which is most of why M-2 was
// possible. A request row has carried `status` and `decidedAt` since the day it
// was written; nothing ever showed them to the person who asked, so they
// re-opened the studio address and guessed from whether it let them in.
//
// Read at the ACCOUNT level, where they are a User rather than a member of
// anything, because somebody DECLINED never gets a CollaboratorID and so has no
// identity inside that studio to be told in.
export async function listForUser(userId: string) {
  if (!userId) return [];
  const rows = await readArr<JoinRequest>(REG.joinRequests);
  return rows.filter((r) => r.userId === userId);
}

export async function getJoinRequest(requestId: string) {
  const rows = await readArr<JoinRequest>(REG.joinRequests);
  return rows.find((r) => r.id === requestId) || null;
}

// Resolve a request. Only a PENDING one can be decided, and the check and the
// write are ONE atomic step — so when two admins approve the same person at the
// same moment, exactly one wins and the other is told "already-decided". That
// is what stops a double-approve from creating two collaborator rows: the guard
// is worthless if another request can slip between reading it and writing.
export async function decideJoinRequest(
  requestId: string,
  { status, decidedByCollaboratorId }: { status: string; decidedByCollaboratorId: string },
) {
  const outcome = await editArr<JoinRequest, { error?: string; request?: JoinRequest }>(REG.joinRequests, (rows) => {
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
