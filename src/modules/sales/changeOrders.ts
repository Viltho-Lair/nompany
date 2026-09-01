// CHANGE ORDERS — scope moving after signature.
//
// The record's shape and the reasoning behind each field are in
// ./changeOrderSchema. This file creates and reads them, and holds the one rule
// the schema cannot express: a variation is APPROVED by somebody other than the
// person who submitted it (invariant 7).
import { repo } from "@/platform/db/repo";
import { requirePermission } from "@/platform/access";
import { attachRecord, resolveDealId } from "@/platform/db/engagement";
import type { ChangeOrder } from "./changeOrderSchema";
import { CHANGE_ORDER_STATUSES } from "./changeOrderSchema";

import type { SalesContext } from "./types";

// NO `isStatus` GUARD HERE, unlike contracts.ts's `isFeeBasis`, because no
// status ever arrives from a request body: every value this field takes is
// written by a transition below, and `satisfies ChangeOrderStatus` is what makes
// the compiler check each one against the tuple.
type ChangeOrderStatus = (typeof CHANGE_ORDER_STATUSES)[number];

const ChangeOrders = repo<ChangeOrder>("changeOrders");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
// SIGNED, and that is the whole point of not reusing contracts.ts's `num`
// unchanged: an omission is a variation too, so a negative delta is a real
// value rather than something to clamp away.
const signed = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// NO contributeContext CALL, DELIBERATELY, and this is the one place among P2's
// records where that needs saying out loud.
//
// A change order knows nothing about the nine shared facts (Law 4). Its title
// names the amendment, not the deal — contributing it would rename a deal after
// its smallest part. Its `timeDeltaDays` is a delta, and the deal's `deadline`
// is a date, so turning one into the other means reading the contract's end
// date; and even then the contribution would be REFUSED, because a change order
// and the contract it amends are both `commitment` class and an equal rank does
// not overwrite (see platform/engagement/context.ts). That refusal is correct:
// moving a deadline the contract established is an explicit, audited edit, not
// something a variation does on the way past.

export async function listChangeOrders(ctx: SalesContext) {
  const denied = requirePermission(ctx.access, "crmSales.quotations.view");
  if (denied) return denied;
  const { studio, quotationsSection } = ctx;
  // A STUDIO MAY NOT HAVE THIS SECTION — it is foreign to Sales' own root, so
  // its absence is a real answer rather than an error. Nothing is wrong, so an
  // empty list is the honest reply.
  if (!quotationsSection) return { changeOrders: [] };
  return { changeOrders: await ChangeOrders.find({ studio, section: quotationsSection }) };
}

/**
 * WHAT THE APPROVED VARIATIONS DO TO THE CONTRACT VALUE — derived on every
 * read, never stored.
 *
 * A stored "current contract value" would have to be re-summed by whichever
 * verb happened to touch a variation last, and would be wrong from the moment
 * one was approved by a path that forgot. Summing the approved deltas is one
 * pass over rows the caller already has.
 *
 * ONLY `approved` COUNTS. A submitted variation is a claim, and a claim in a
 * cost report is a number somebody will act on before it was agreed.
 */
export function approvedValueDelta(changeOrders: readonly ChangeOrder[]): number {
  return changeOrders
    .filter((c) => c.status === "approved")
    .reduce((sum, c) => sum + (Number(c.valueDelta) || 0), 0);
}

/**
 * Raise a variation against a deal's contract.
 *
 * THE GUARD IS HERE, NOT IN THE ROUTE — routes get added and forgotten, and the
 * function that does the work cannot be reached around.
 *
 * BOTH REFERENCES ARE REQUIRED. A variation with no deal varies nothing, and one
 * with no contract has no agreement to amend; `change_order` is absent from the
 * unassigned pen's list of types for exactly that reason.
 */
export async function createChangeOrder(ctx: SalesContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "crmSales.quotations.create");
  if (denied) return denied;

  const { studio, quotationsSection, collaborator } = ctx;
  // Refused rather than answered emptily: a write has somewhere it must go.
  if (!quotationsSection) return { error: "no-section" };

  const title = str(body?.title, 200);
  if (!title) return { error: "title" };

  const dealId = str(body?.dealId, 60);
  if (!dealId) return { error: "deal" };

  const contractId = str(body?.contractId, 60);
  if (!contractId) return { error: "contract" };

  // Through the alias table, so a caller holding a derived id lands on the deal
  // that exists rather than on one nothing else can find (Law 3).
  const resolved = await resolveDealId(studio.id, dealId);

  const changeOrder = await ChangeOrders.create({ studio, section: quotationsSection }, {
    number: "",              // issued later, exactly as a contract's is
    title,
    dealId: resolved,
    contractId,
    valueDelta: signed(body?.valueDelta),
    currency: str(body?.currency, 8) || studio.currency || "",
    timeDeltaDays: signed(body?.timeDeltaDays),
    scope: str(body?.scope, 4000),
    // ALWAYS BORN A DRAFT. A caller cannot post an approved variation into
    // existence — approval is a transition with a rule on it (see below), and a
    // status accepted from the request body would be the side entrance around it.
    status: "draft" satisfies ChangeOrderStatus,
    submittedByCollaboratorId: "",
    submittedAt: "",
    approvedByCollaboratorId: "",
    approvedAt: "",
    notes: str(body?.notes, 4000),
    createdByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // ATTACH, AND DO NOT SWALLOW THE FAILURE. Attaching is what can be refused —
  // a deal whose template does not carry variations, an id that resolves to
  // nothing — and a variation that could not join its deal has not done the one
  // thing a variation is for. This is the opposite discipline from the audit
  // trail, whose failure must not fail a write that already happened.
  await attachRecord(studio.id, resolved, "change_order", changeOrder.id, changeOrder.createdAt);

  return { changeOrder };
}

export async function updateChangeOrder(ctx: SalesContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "crmSales.quotations.edit");
  if (denied) return denied;

  const { studio, quotationsSection } = ctx;
  if (!quotationsSection) return { error: "no-section" };

  const current = await ChangeOrders.byId({ studio, section: quotationsSection }, id);
  if (!current) return { error: "notfound" };

  // AN ANSWERED VARIATION IS CLOSED. Editing the value of something already
  // approved would change what was agreed without anybody agreeing to it — the
  // correction is a new variation, which is what `many` cardinality is for.
  if (current.status === "approved" || current.status === "rejected") {
    return { error: "answered", status: current.status };
  }

  // THE FIELDS A CHANGE ORDER MAY NOT CHANGE, and why each is immutable rather
  // than merely guarded:
  //
  //   dealId      — moving a variation between deals is not an edit. Re-rooting
  //                 is what Law 3 forbids.
  //   contractId  — a variation is raised against one agreement; pointing it at
  //                 another makes its value adjust a total it was never argued
  //                 against.
  //   number      — a reference somebody quoted must keep meaning what they
  //                 quoted (invariant 10).
  //   status      — a transition, not a field. See submit/approve/reject below.
  const patch: Partial<ChangeOrder> = {};
  if (body.title !== undefined) patch.title = str(body.title, 200);
  if (body.valueDelta !== undefined) patch.valueDelta = signed(body.valueDelta);
  if (body.currency !== undefined) patch.currency = str(body.currency, 8);
  if (body.timeDeltaDays !== undefined) patch.timeDeltaDays = signed(body.timeDeltaDays);
  if (body.scope !== undefined) patch.scope = str(body.scope, 4000);
  if (body.notes !== undefined) patch.notes = str(body.notes, 4000);

  if (!Object.keys(patch).length) return { error: "nothing" };
  patch.updatedAt = new Date().toISOString();

  const changeOrder = await ChangeOrders.update({ studio, section: quotationsSection }, id, patch);
  return changeOrder ? { changeOrder } : { error: "notfound" };
}

/**
 * PUT THE VARIATION TO ITS APPROVER — and record WHO put it, because that is
 * half of the invariant-7 check below.
 */
export async function submitChangeOrder(ctx: SalesContext, id: string) {
  const denied = requirePermission(ctx.access, "crmSales.quotations.edit");
  if (denied) return denied;

  const { studio, quotationsSection, collaborator } = ctx;
  if (!quotationsSection) return { error: "no-section" };

  const current = await ChangeOrders.byId({ studio, section: quotationsSection }, id);
  if (!current) return { error: "notfound" };
  if (current.status !== "draft") return { error: "already", status: current.status };

  // CAPTURED ONCE, OUTSIDE THE CLOSURE. This is a function patch (invariant 8),
  // so updateRow may invoke it more than once — a CAS retry under contention, or
  // once per store under NOMPANY_DB=parity — and a `new Date()` called inside
  // would disagree between those invocations by whatever time separated them.
  const at = new Date().toISOString();
  const changeOrder = await ChangeOrders.update({ studio, section: quotationsSection }, id, () => ({
    status: "submitted" satisfies ChangeOrderStatus,
    submittedByCollaboratorId: collaborator.id,
    submittedAt: at,
    updatedAt: at,
  }));
  return changeOrder ? { changeOrder } : { error: "notfound" };
}

/**
 * ANSWER THE VARIATION — and INVARIANT 7 lives here, at the transition rather
 * than in the permission model: the person who submitted a variation may not be
 * the one who approves it. Holding both rights is legitimate; using both on one
 * record is not.
 *
 * GUARDED BY `edit` RATHER THAN BY AN `approve` VERB, and that is a deliberate
 * limit rather than an oversight. `crmSales.quotations` carries
 * view/create/edit/delete, and minting an area for a record that has no screen
 * yet would move the 123-key permission matrix and every golden that pins it —
 * the same reason the stage registry entry reuses this permission. It gets its
 * own verb when it gets a screen.
 */
export async function answerChangeOrder(ctx: SalesContext, id: string, approve: boolean) {
  const denied = requirePermission(ctx.access, "crmSales.quotations.edit");
  if (denied) return denied;

  const { studio, quotationsSection, collaborator } = ctx;
  if (!quotationsSection) return { error: "no-section" };

  const current = await ChangeOrders.byId({ studio, section: quotationsSection }, id);
  if (!current) return { error: "notfound" };
  if (current.status !== "submitted") return { error: "not-submitted", status: current.status };
  if (current.submittedByCollaboratorId === collaborator.id) return { error: "same-signer" };

  const at = new Date().toISOString();
  const status: ChangeOrderStatus = approve ? "approved" : "rejected";
  const changeOrder = await ChangeOrders.update({ studio, section: quotationsSection }, id, () => ({
    status,
    // STAMPED ON A REJECTION TOO. "Nobody answered" and "this person said no"
    // are different states, and a rejection with no signatory is the first one
    // wearing the second one's status.
    approvedByCollaboratorId: collaborator.id,
    approvedAt: at,
    updatedAt: at,
  }));
  return changeOrder ? { changeOrder } : { error: "notfound" };
}
