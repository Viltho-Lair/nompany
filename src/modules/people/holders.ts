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
 * A DIFFERENT NOTICE FOR EACH PERSON — a payroll run tells every employee their
 * own net pay, which is one sentence per person rather than one for all. One
 * read of the people, however many notices; each still rings its own doorbell.
 * No right is asked: every notice here is about the recipient's OWN record.
 */
export async function notifyEach(
  studioId: string, notices: readonly { id: string; notice: Notice }[], except: readonly string[] = [],
) {
  try {
    const skip = new Set(except.filter(Boolean));
    const wanted = notices.filter((n) => n.id && !skip.has(n.id));
    if (!wanted.length) return;
    const people = new Map((await listCollaborators(studioId)).map((c) => [String(c.id), c]));
    for (const { id, notice } of wanted) {
      const person = people.get(id);
      if (person) await tell(studioId, [person], notice);
    }
  } catch { /* best-effort, as above */ }
}

/**
 * WHO IS NEWLY ON A LIST — pure. The people in `after` who were not in
 * `before`, less whoever made the change: they know, because they just did it.
 * Somebody taken OFF a list is not told here; being relieved of work is not
 * something the bell has been asked to announce.
 */
export function newlyAssigned(
  before: readonly unknown[] | null | undefined,
  after: readonly unknown[] | null | undefined,
  actorId = "",
): string[] {
  const had = new Set((before || []).map(String));
  return [...new Set((after || []).map(String))].filter((id) => id && !had.has(id) && id !== actorId);
}

/**
 * TELL WHOEVER WAS JUST GIVEN THIS WORK — the one door every "assigned to you"
 * notice goes through (28/09/2026). Before it, a job or a planner task could be
 * handed to somebody and nothing told them; they found out by opening the
 * board.
 *
 * GATED ON `right`: a person named on a record they may not open is told
 * nothing, because the notice would link to a screen that refuses them and
 * repeat what the record says to somebody the studio has not let read it.
 */
export async function notifyNewlyAssigned(
  studioId: string,
  { before, after, actorId = "", right, notice }: {
    before: readonly unknown[] | null | undefined;
    after: readonly unknown[] | null | undefined;
    actorId?: string;
    right: string;
    notice: Notice;
  },
) {
  try {
    const added = new Set(newlyAssigned(before, after, actorId));
    if (!added.size) return;
    const holders = await collaboratorsHolding(studioId, right);
    await tell(studioId, holders.filter((c) => added.has(String(c.id))), notice);
  } catch { /* best-effort: the assignment is written; failing to announce it must not fail that */ }
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
