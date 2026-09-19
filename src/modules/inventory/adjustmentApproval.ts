// A STOCK ADJUSTMENT BIG ENOUGH TO NEED APPROVING.
//
// `adjustStock` is the one write in Inventory with no document behind it. A
// bill has a supplier's invoice, a receipt has a lorry; an adjustment is a
// person typing a number into the ledger every on-hand figure in the section is
// summed from. It asks `inventory.stock.create` — the right somebody needs to
// count shelves, and therefore held by more people than should be able to write
// off a container.
//
// IT IS APPROVED ON THE APPROVALS PAGE (the owner, 19/09/2026: the request stays
// where it is made, the answer moves to Approvals). Recording an adjustment over
// the studio's limit IS the request (type `adjustment`); the people who answer,
// and the amount each step starts at, are Approvals settings'. Until a studio
// saves the type they are whoever could sign one before — `inventory.stock.
// approve` from 1,000 and `.approveHigh` from 25,000, or the limits the studio
// had moved — plus the owner and Admins. The last yes writes the movement
// (`adjustmentApproval`, run by modules/approvals/effects).
//
// THE ONE THING THAT DIFFERS FROM A BILL: an adjustment does not EXIST as a
// document before anybody answers — it is an intention to move stock — so under
// every limit it applies immediately and no record is kept beyond the movement.
// A studio correcting a shelf by one unit does not acquire an approval queue.
//
// A LIMIT NEEDS NO CURRENCY HERE. The value is units times the item's own cost,
// already in whatever the studio counts in, so nothing is converted — which is
// what once let every adjustment through in a studio with no currency set, when
// the old engine read "cannot resolve" as "nobody has to sign". Approvals never
// asks for a rate when the amount is already the studio's.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { listCollaborators } from "@/platform/auth/collaborators";
import { roundMoney } from "@/shared/money";
import { approvalRows, requestApproval } from "@/modules/approvals/approvals";
import { approvalSummary } from "@/modules/approvals/reads";
import type { Refusal } from "@/modules/approvals/effects";
import type { Approval } from "@/modules/approvals/schema";
import type { StudioRef } from "@/modules/context";
import type { InventoryContext } from "./types";

export const ADJUSTMENT_APPROVAL = "adjustment";

type Adjustment = {
  id: string; itemId: string; qty: number; reason: string; unitCost: number; value: number;
  status: "Pending" | "Approved" | "Rejected";
  createdByCollaboratorId: string; createdAt: string;
  /** Signatures given under the old engine, before 19/09/2026 — carried onto its approval. */
  approvals?: { byCollaboratorId?: string; at?: string }[];
  [field: string]: unknown;
};

const Adjustments = repo<Adjustment>("stockAdjustments");
const Items = repo("inventoryItems");

export const ADJUSTMENT_STATUSES = ["Pending", "Approved", "Rejected"] as const;

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const scope = (ctx: InventoryContext) => ({ studio: ctx.studio, section: ctx.stockSection });

/**
 * WHAT AN ADJUSTMENT IS WORTH — units moved times what a unit costs.
 *
 * THE ABSOLUTE VALUE, so writing 500 units ON is as material as writing 500
 * OFF. A studio that only reviewed write-offs would have a control anybody
 * could walk round by adjusting up and then down. In the studio's currency — a
 * dinar adjustment is valued in fils, so a limit at a fils boundary routes the
 * way the studio set it.
 */
export function adjustmentValue(qty: number, unitCost: number, currency?: unknown): number {
  return roundMoney(Math.abs(num(qty)) * Math.max(0, num(unitCost)), currency);
}

/** What one unit of this item costs, for valuing an adjustment. */
export async function unitCostOf(ctx: InventoryContext, itemId: string): Promise<number> {
  const items = await Items.find({ studio: ctx.studio, section: ctx.itemsSection });
  return Math.max(0, num(items.find((i) => i.id === itemId)?.unitCost));
}

const requesterOf = (ctx: InventoryContext) => ({ studio: ctx.studio, collaborator: ctx.collaborator, roles: ctx.roles });
const amountOf = (ctx: InventoryContext, value: number) => ({ value, currency: String(ctx.studio.currency || "") });

/** What the approval calls it: what moved, and why — an adjustment has no reference. */
const titleOf = (row: Pick<Adjustment, "qty" | "reason">, itemName: string) =>
  `${row.qty > 0 ? "+" : ""}${row.qty} × ${itemName}${row.reason ? ` · ${row.reason}` : ""}`;

/**
 * FILE THE ADJUSTMENT AND ASK FOR ITS APPROVAL. Moves no stock — that is the
 * whole point. The caller (`adjustStock`) has already asked `approvalPreflight`
 * whether one is needed and possible, so the request refusing here means the
 * settings moved in between; the adjustment is then on file and says so.
 */
export async function raiseAdjustment(
  ctx: InventoryContext,
  input: { itemId: string; itemName: string; qty: number; reason: string; unitCost: number; value: number },
) {
  const row = await Adjustments.create(scope(ctx), {
    itemId: input.itemId,
    qty: input.qty,
    reason: input.reason,
    unitCost: input.unitCost,
    value: input.value,
    status: "Pending",
    createdByCollaboratorId: ctx.collaborator.id,
    createdAt: new Date().toISOString(),
  });
  const asked = await requestApproval(requesterOf(ctx), {
    type: ADJUSTMENT_APPROVAL,
    source: { sectionKey: "inventory-stock", recordId: row.id, ref: "", title: titleOf(row, input.itemName), path: "inventory-stock" },
    note: input.reason,
    amount: amountOf(ctx, input.value),
  });
  return "error" in asked ? { adjustment: row, approvalProblem: asked.error } : { adjustment: row };
}

/**
 * THE ADJUSTMENTS, each with how far its approval has got — read from the
 * approval (./reads), never a copy.
 *
 * AN ADJUSTMENT WAITING FROM BEFORE APPROVALS TOOK IT OVER is given its approval
 * here, in the name of whoever raised it, carrying the signatures it already had
 * so nobody signs twice. Once: a filed one is found on the next read. The
 * owner's rule of 12/09/2026: an update reaches every studio by itself.
 */
export async function listAdjustments(ctx: InventoryContext) {
  const denied = requirePermission(ctx.access, "inventory.stock.view");
  if (denied) return denied;
  const [rows, approvals] = await Promise.all([
    Adjustments.find(scope(ctx)),
    approvalRows(ctx.studio, ctx.approvalsSection),
  ]);

  const stranded = rows.filter((r) => r.status === "Pending" && !approvalSummary(approvals, ADJUSTMENT_APPROVAL, r.id));
  if (stranded.length && ctx.approvalsSection) {
    const [people, items] = await Promise.all([
      listCollaborators(ctx.studio.id),
      Items.find({ studio: ctx.studio, section: ctx.itemsSection }),
    ]);
    const byId = new Map((people as { id?: unknown }[]).map((c) => [String(c.id), c]));
    const names = new Map(items.map((i) => [String(i.id), String(i.name || "")]));
    for (const r of stranded) {
      const requester = byId.get(r.createdByCollaboratorId);
      if (!requester) continue;
      const asked = await requestApproval(
        { studio: ctx.studio, collaborator: requester as InventoryContext["collaborator"], roles: ctx.roles },
        {
          type: ADJUSTMENT_APPROVAL,
          source: { sectionKey: "inventory-stock", recordId: r.id, ref: "", title: titleOf(r, names.get(r.itemId) || ""), path: "inventory-stock" },
          note: r.reason,
          amount: amountOf(ctx, num(r.value)),
          carried: (r.approvals || []).map((s) => ({ collaboratorId: String(s.byCollaboratorId || ""), at: String(s.at || "") }))
            .filter((s) => s.collaboratorId),
        },
      );
      if ("approval" in asked && asked.approval) approvals.push(asked.approval);
    }
  }

  const adjustments = [...rows]
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .map((row) => ({ ...row, approval: approvalSummary(approvals, ADJUSTMENT_APPROVAL, row.id) }));
  return { adjustments };
}

// ---- what deciding its approval does — modules/approvals/effects -------------

/** The adjustment an approval names, in a context carrying the studio's authority. */
async function adjustmentFor(studio: StudioRef, approval: Approval, byCollaboratorId: string) {
  // IMPORTED WHEN NEEDED: ./inventory imports this file.
  const inv = await import("./inventory");
  const ctx = await inv.inventoryContext.asApprover(studio.id, byCollaboratorId);
  if (ctx.error) return { error: ctx.error } as Refusal;
  const row = await Adjustments.byId(scope(ctx), approval.source.recordId);
  return row ? { ctx, row, inv } : ({ error: "notfound" } as Refusal);
}

/**
 * CAN THIS STOCK MOVE NOW. A write-off approved days after it was asked for may
 * find the shelf emptied in between; the approver hears that while their yes
 * has not landed, rather than the ledger going below nought.
 */
async function adjustmentProblem(found: Exclude<Awaited<ReturnType<typeof adjustmentFor>>, Refusal>): Promise<Refusal | null> {
  const { ctx, row, inv } = found;
  if (row.status !== "Pending") return { error: "already-decided", status: row.status };
  if (row.qty < 0) {
    const have = Number(inv.balances(await inv.stockMovements(ctx))[row.itemId]) || 0;
    if (have + row.qty < 0) return { error: "insufficient", have, needed: Math.abs(row.qty) };
  }
  return null;
}

/** What deciding an `adjustment` approval does — see modules/approvals/effects. */
export const adjustmentApproval = {
  ready: async (studio: StudioRef, approval: Approval, by: string) => {
    const found = await adjustmentFor(studio, approval, by);
    return "error" in found ? found : adjustmentProblem(found);
  },
  // THE STOCK MOVES ON THE LAST YES AND NOT BEFORE, and once: the status flips
  // under a function patch first, and only the write that flipped it moves stock.
  approved: async (studio: StudioRef, approval: Approval, by: string) => {
    const found = await adjustmentFor(studio, approval, by);
    if ("error" in found) return found;
    const problem = await adjustmentProblem(found);
    if (problem) return problem;
    const { ctx, row, inv } = found;
    const at = new Date().toISOString();
    const flipped = await Adjustments.update(scope(ctx), row.id, (cur) => (cur.status !== "Pending" ? cur : {
      ...cur, status: "Approved", approvedAt: at, approvedByCollaboratorId: by,
    }));
    if (!flipped || flipped.status !== "Approved" || flipped.approvedAt !== at) return { error: "already-decided" };
    await inv.applyApprovedAdjustment(ctx, flipped);
    return "done" as const;
  },
  rejected: async (studio: StudioRef, approval: Approval, by: string, reason: string) => {
    const found = await adjustmentFor(studio, approval, by);
    if ("error" in found) return found;
    const { ctx, row } = found;
    if (row.status !== "Pending") return "done" as const;
    const done = await Adjustments.update(scope(ctx), row.id, (cur) => (cur.status !== "Pending" ? cur : {
      ...cur, status: "Rejected", rejectedReason: str(reason, 300), rejectedByCollaboratorId: by, rejectedAt: new Date().toISOString(),
    }));
    return done ? ("done" as const) : ({ error: "notfound" } as Refusal);
  },
};
