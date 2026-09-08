// A STOCK ADJUSTMENT BIG ENOUGH TO NEED A SECOND SIGNATURE.
//
// `adjustStock` is the one write in Inventory with no document behind it. A
// bill has a supplier's invoice, a receipt has a lorry; an adjustment is a
// person typing a number into the ledger every on-hand figure in the section is
// summed from. It has always asked `inventory.stock.create` and nothing else —
// which is the right somebody needs to do their job counting shelves, and is
// therefore held by more people than should be able to write off a container.
//
// IT IS P2'S APPROVAL ENGINE'S FIFTH DOCUMENT TYPE, not a fifth engine. The
// chain is seeded in `platform/approval/chains`; invariant 7 is enforced twice
// (the raiser never signs, and nobody signs two steps of one record); and the
// threshold is the studio's dial.
//
// THE ONE THING THAT DIFFERS FROM THE OTHER FOUR: a bill, a bid and a
// requisition all EXIST as documents before anybody signs. An adjustment does
// not — it is an intention to move stock — so below the threshold it applies
// immediately and no record is kept beyond the movement itself. A studio
// correcting a shelf by one unit should not acquire an approval queue.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { firstUnsignedStep, planSatisfied } from "@/platform/approval/resolve";
import type { ResolvedPlan, PlanRefusal, ApprovalSignature } from "@/platform/approval/resolve";
import { approvalChainsFor } from "@/platform/approval/store";
import type { InventoryContext } from "./types";
import type { PermissionKey } from "@/platform/access";

const Adjustments = repo("stockAdjustments");
const Items = repo("inventoryItems");

export const ADJUSTMENT_STATUSES = ["Pending", "Approved", "Rejected"] as const;

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const money = (n: number) => Math.round(n * 100) / 100;

const scope = (ctx: InventoryContext) => ({ studio: ctx.studio, section: ctx.stockSection });

/**
 * WHAT AN ADJUSTMENT IS WORTH — units moved times what a unit costs.
 *
 * THE ABSOLUTE VALUE, so writing 500 units ON is as material as writing 500
 * OFF. A studio that only reviewed write-offs would have a control anybody
 * could walk round by adjusting up and then down.
 *
 * NO FX. An adjustment carries no currency of its own — the item's cost is
 * already in the studio's — so the plan is resolved with the studio's currency
 * on both sides and no rate table, which is the same shape a requisition uses
 * and for the same reason.
 */
export function adjustmentValue(qty: number, unitCost: number): number {
  return money(Math.abs(num(qty)) * Math.max(0, num(unitCost)));
}

/**
 * THE PLAN, BUILT DIRECTLY RATHER THAN THROUGH `resolveApprovalPlan`.
 *
 * THE FX RESOLVER REFUSES A STUDIO WITH NO CURRENCY, and that refusal is right
 * for a bill — an amount in euros cannot be judged against a limit in riyals
 * without a rate. An adjustment has NO currency: its value is units times the
 * item's own cost, which is already in whatever the studio counts in, and there
 * is nothing to convert.
 *
 * ROUTING IT THROUGH THE RESOLVER ANYWAY OPENED A SILENT HOLE, which is why
 * this is written out rather than quietly changed. `createStudio` has never set
 * a currency, so the resolver returned `ok: false` for every studio that had
 * not set one; `needsApproval` reads a refusal as "no plan, so nobody has to
 * sign", and every adjustment of every size applied immediately with the
 * control switched off and nothing saying so. A gate that fails open is worse
 * than no gate, because somebody believes in it.
 *
 * So the steps are selected here, on the amount alone, which is the only thing
 * an adjustment's plan ever depended on. `firstUnsignedStep` and
 * `planSatisfied` take this shape unchanged.
 */
export function planForAdjustment(
  ctx: InventoryContext,
  value: number,
): ResolvedPlan | PlanRefusal {
  const chain = approvalChainsFor(ctx.studio).adjustment;
  if (!chain?.steps?.length) {
    return { ok: false, reason: "no-chain", detail: "No approval chain is configured for stock adjustments." };
  }
  return {
    ok: true,
    steps: chain.steps.filter((step) => value >= Number(step.from || 0)),
    amountInBase: value,
    // Null because nothing was converted — the record was already in the
    // studio's own money, which for an adjustment is always true.
    rate: null,
    updatedAt: Date.now(),
    stale: false,
  };
}

/**
 * DOES THIS ADJUSTMENT NEED ANYBODY?
 *
 * A plan whose steps are all below the amount resolves to NO steps, and
 * `planSatisfied` is then true with no signatures — which is exactly the
 * "apply it now" case. Reading it that way rather than comparing the amount to
 * a threshold here means the chain is the single authority: a studio that sets
 * its first step to 0 gets every adjustment reviewed, with nothing in this file
 * to change.
 */
export const needsApproval = (plan: ResolvedPlan | PlanRefusal): boolean =>
  plan.ok === true && !planSatisfied(plan, []);

/**
 * A PLAN THAT COULD NOT BE BUILT MUST STOP THE WRITE, not wave it through.
 *
 * The only way `planForAdjustment` refuses now is a studio with no adjustment
 * chain at all, which means somebody emptied it. Reading that as "nobody has to
 * sign" is the failure this pair exists to keep apart: "no signature is
 * required" and "we cannot tell whether one is required" look identical to a
 * boolean and are opposite answers.
 */
export const planUnusable = (plan: ResolvedPlan | PlanRefusal): boolean => plan.ok !== true;

/** The pending queue. */
export async function listAdjustments(ctx: InventoryContext) {
  const denied = requirePermission(ctx.access, "inventory.stock.view");
  if (denied) return denied;
  return { adjustments: await Adjustments.find(scope(ctx)) };
}

/** Park one for signature. Moves no stock — that is the whole point. */
export async function raiseAdjustment(
  ctx: InventoryContext,
  input: { itemId: string; qty: number; reason: string; unitCost: number; value: number; plan: ResolvedPlan },
) {
  return Adjustments.create(scope(ctx), {
    itemId: input.itemId,
    qty: input.qty,
    reason: input.reason,
    unitCost: input.unitCost,
    value: input.value,
    // THE PLAN IS STORED ON THE RECORD, the way a bill's is: a threshold moved
    // overnight must not re-route an adjustment already waiting for somebody.
    approvalPlan: input.plan,
    approvals: [],
    status: "Pending",
    createdByCollaboratorId: ctx.collaborator.id,
    createdAt: new Date().toISOString(),
  });
}

/**
 * SIGN ONE STEP, and move the stock when the last one is signed.
 *
 * @param applyMovement - what actually writes the movement. Injected rather than
 *   imported so this file does not reach back into `inventory.ts`, which
 *   imports it — and so the test can assert the signing rules without a store.
 */
export async function approveAdjustment(
  ctx: InventoryContext,
  id: string,
  applyMovement: (row: Record<string, unknown>) => Promise<unknown>,
) {
  const rows = await Adjustments.find(scope(ctx));
  const row = rows.find((r) => r.id === id);
  if (!row) return { error: "notfound" };
  if (row.status !== "Pending") return { error: "already-decided", status: row.status };

  // INVARIANT 7, FIRST HALF: the person who raised it never signs it. Held on
  // identity alone, so it refuses the owner too.
  if (row.createdByCollaboratorId === ctx.collaborator.id) return { error: "same-signer" };

  const signatures = (row.approvals || []) as ApprovalSignature[];
  // SECOND HALF: somebody who signed an earlier step may not sign a later one.
  // Invariant 7 is about the RECORD rather than about the pair of rights, and a
  // second step the first signer can clear is not a second step.
  if (signatures.some((s) => s.byCollaboratorId === ctx.collaborator.id)) return { error: "same-signer" };

  const plan = row.approvalPlan as ResolvedPlan | PlanRefusal | null;
  const step = firstUnsignedStep(plan, signatures);
  if (!step) return { error: "not-approved" };

  // THE PERMISSION IS CHOSEN AT RUNTIME, which is the feature. Access is still
  // resolved once (invariant 3); this asks a different question of the set that
  // was already resolved.
  const denied = requirePermission(ctx.access, step.permission as PermissionKey);
  if (denied) return denied;

  const approvals = [...signatures, {
    permission: step.permission,
    byCollaboratorId: ctx.collaborator.id,
    byAlias: str(ctx.collaborator.alias, 60),
    at: new Date().toISOString(),
  }];
  const done = planSatisfied(plan, approvals);

  const updated = await Adjustments.update(scope(ctx), id, {
    approvals,
    ...(done ? { status: "Approved", approvedAt: new Date().toISOString() } : {}),
  });
  if (!updated) return { error: "notfound" };

  // THE STOCK MOVES ON THE LAST SIGNATURE AND NOT BEFORE. Writing it on the
  // first would make a two-step chain a one-step one that also logs a second
  // name.
  const movement = done ? await applyMovement(updated) : null;
  return { adjustment: updated, ...(movement ? { movement } : {}) };
}

/** Turn one down. It moves nothing and stays on the record. */
export async function rejectAdjustment(ctx: InventoryContext, id: string, reason: string) {
  const rows = await Adjustments.find(scope(ctx));
  const row = rows.find((r) => r.id === id);
  if (!row) return { error: "notfound" };
  if (row.status !== "Pending") return { error: "already-decided", status: row.status };
  if (row.createdByCollaboratorId === ctx.collaborator.id) return { error: "same-signer" };

  const plan = row.approvalPlan as ResolvedPlan | PlanRefusal | null;
  const step = firstUnsignedStep(plan, (row.approvals || []) as ApprovalSignature[]);
  if (!step) return { error: "not-approved" };
  const denied = requirePermission(ctx.access, step.permission as PermissionKey);
  if (denied) return denied;

  const updated = await Adjustments.update(scope(ctx), id, {
    status: "Rejected",
    rejectedReason: str(reason, 300),
    rejectedByCollaboratorId: ctx.collaborator.id,
    rejectedAt: new Date().toISOString(),
  });
  return updated ? { adjustment: updated } : { error: "notfound" };
}

/** What one unit of this item costs, for valuing an adjustment. */
export async function unitCostOf(ctx: InventoryContext, itemId: string): Promise<number> {
  const items = await Items.find({ studio: ctx.studio, section: ctx.itemsSection });
  return Math.max(0, num(items.find((i) => i.id === itemId)?.unitCost));
}
