// WHO HOLDS A RIGHT — and telling them.
//
// FOUR COPIES OF ONE QUESTION. Join requests asked "who holds
// administration.members.edit", leave asked "who holds hr.vacations.approve",
// an RFQ asked "who holds crmSales.quotations.create" — each by listing the
// collaborators, listing the roles and filtering through `effectivePermissions`
// by hand. Notifying the next signer of every approval chain would have made it
// ten, so the question has one home now, answered by the same resolver the
// screens enforce with (invariant 3): somebody told about a thing they cannot
// act on is a notification that wastes the one person who saw it.
//
// BEST-EFFORT, like `notifyCollaborators` beneath it. The thing being announced
// has already happened; failing to announce it must never fail the request that
// caused it.
import { listCollaborators } from "@/platform/auth/collaborators";
import { effectivePermissions, can, type PermissionKey } from "@/platform/access";
import { notifyCollaborators, NOTIFY, type Notice } from "@/platform/notify/notifications";
import { listRoles } from "./roles";

type Person = { id?: unknown; userId?: unknown };

/** Every collaborator whose resolved access holds `permission`. */
export async function collaboratorsHolding(studioId: string, permission: string) {
  const [people, roles] = await Promise.all([listCollaborators(studioId), listRoles(studioId)]);
  return people.filter((c) => can(effectivePermissions({ collaborator: c, roles }), permission as PermissionKey));
}

async function tell(studioId: string, people: Person[], notice: Notice) {
  if (!people.length) return;
  const userIdOf = new Map(people.map((c) => [String(c.id), String(c.userId)]));
  await notifyCollaborators(studioId, people.map((c) => String(c.id)), notice, { userIdOf: (id) => userIdOf.get(id) });
}

/**
 * TELL EVERYBODY WHO MAY ANSWER. `except` is who must not be told: the raiser,
 * who already knows, and anybody who has signed an earlier step — invariant 7
 * refuses them the next one, so ringing them would ask for a signature they
 * cannot give.
 */
export async function notifyHolders(
  studioId: string, permission: string, notice: Notice, except: readonly string[] = [],
) {
  try {
    const skip = new Set(except.filter(Boolean));
    await tell(studioId, (await collaboratorsHolding(studioId, permission)).filter((c) => !skip.has(String(c.id))), notice);
  } catch { /* best-effort: the approval exists; failing to announce it must not fail that */ }
}

/** Tell these collaborators — a task's appointed authorities, say. */
export async function notifyCollaboratorIds(
  studioId: string, ids: readonly string[], notice: Notice, except: readonly string[] = [],
) {
  try {
    const skip = new Set(except.filter(Boolean));
    const wanted = new Set(ids.filter((id) => id && !skip.has(id)));
    if (!wanted.size) return;
    await tell(studioId, (await listCollaborators(studioId)).filter((c) => wanted.has(String(c.id))), notice);
  } catch { /* best-effort, as above */ }
}

/**
 * "Waiting for your signature", with the document's own reference as the one
 * fact. The reference is the studio's number (BIL-0004, REQ-0012, a quotation
 * number), so it reads the same in both languages; the sentence around it is
 * the template's (`approval.requested` in modules/administration/notices).
 */
export const signatureNotice = (reference: string, href: string): Notice => ({
  type: NOTIFY.approvalRequested,
  title: "Waiting for your signature",
  body: reference,
  params: { reference },
  href,
  tone: "primary",
});
