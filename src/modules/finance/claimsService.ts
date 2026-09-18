// THE STORE HALF OF ./claims — expense claims and staff advances, both filed
// under `finance-payables` (`expenseClaims`, `staffAdvances`).
//
// WHO MAY DO WHAT, and the one line held whatever anybody holds:
//   - `finance.claims.create`  — raise, edit, submit and withdraw your OWN claims,
//                                 and see your own claims and advances;
//   - `finance.claims.view`    — see everybody's;
//   - `finance.claims.approve` — agree or reject somebody ELSE's claim;
//   - `finance.payables.pay`   — pay an approved claim, hand over an advance,
//                                 take one back (the right that pays suppliers).
// NOBODY APPROVES THEIR OWN CLAIM, and nobody hands themselves an advance.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { listCollaborators } from "@/platform/auth/collaborators";
import { nextReference } from "@/modules/main/references";
import { seriesSetting } from "@/modules/administration/numbering";
import { autoPost } from "./posting";
import { storedMoneyAccounts, moneyAccountProblem } from "./ledger";
import {
  cleanClaimLines, claimTotal, claimPayable, claimMoveProblem, openAdvance, advanceTakes,
} from "./claims";
import type { Claim, Advance, ClaimStatus } from "./claims";
import type { FinanceContext } from "./types";
import type { Row } from "@/platform/db/store";

type ClaimRecord = Claim & {
  reference: string; note?: string; projectId?: string; createdAt: string;
  submittedOn?: string; approvedOn?: string; rejectedReason?: string; accountId?: string;
};
type AdvanceRecord = Advance & {
  reference: string; paidOn: string; accountId?: string; note?: string; paidByCollaboratorId: string; createdAt: string;
  returns?: { id: string; amount: number; date: string; accountId?: string }[];
};

const Claims = repo<ClaimRecord>("expenseClaims");
const Advances = repo<AdvanceRecord>("staffAdvances");
const scope = (ctx: FinanceContext) => ({ studio: ctx.studio, section: ctx.payablesSection });
const today = () => new Date().toISOString().slice(0, 10);
const day = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "").trim()) ? String(v).trim() : "");
const str = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);
const can = (ctx: FinanceContext, key: string) => !requirePermission(ctx.access, key as Parameters<typeof requirePermission>[1]);

function rights(ctx: FinanceContext) {
  const create = can(ctx, "finance.claims.create");
  const approve = can(ctx, "finance.claims.approve");
  const pay = can(ctx, "finance.payables.pay");
  const seeAll = can(ctx, "finance.claims.view") || approve || pay;
  return { create, approve, pay, seeAll, any: create || seeAll };
}

/** The claims and advances the reader may see, and what each person still holds. */
export async function claimsView(ctx: FinanceContext) {
  const r = rights(ctx);
  if (!r.any) return { error: "forbidden" as const };
  const me = ctx.collaborator.id;
  const [claims, advances, people, accounts] = await Promise.all([
    Claims.find(scope(ctx)), Advances.find(scope(ctx)), listCollaborators(ctx.studio.id), storedMoneyAccounts(ctx),
  ]);
  const mine = (id: string) => r.seeAll || id === me;
  const alias = Object.fromEntries(people.map((c) => [String(c.id), String(c.alias || "")]));
  const holders = [...new Set(advances.map((a) => a.collaboratorId))].filter(mine);
  return {
    me,
    claims: claims.filter((c) => mine(c.claimantCollaboratorId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((c) => ({
        ...c, total: claimTotal(c), payable: claimPayable(c), claimantAlias: alias[c.claimantCollaboratorId] || "",
      })),
    advances: advances.filter((a) => mine(a.collaboratorId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((a) => ({ ...a, holderAlias: alias[a.collaboratorId] || "" })),
    open: Object.fromEntries(holders.map((id) => [id, openAdvance(advances, claims, id)])),
    // WHO AN ADVANCE MAY GO TO — the studio's people, never the payer themself.
    people: r.pay ? people.filter((p) => String(p.id) !== me).map((p) => ({ id: String(p.id), alias: String(p.alias || "") })) : [],
    categories: ctx.cashCategories,
    moneyAccounts: accounts.map((a) => ({ id: a.id, code: a.code, name: a.name })),
    canCreate: r.create, canApprove: r.approve, canPay: r.pay, canSeeAll: r.seeAll,
  };
}

async function claimById(ctx: FinanceContext, id: string) {
  return (await Claims.find(scope(ctx))).find((c) => c.id === id);
}

/** Raise a claim, or edit your own draft. */
export async function saveClaim(ctx: FinanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.claims.create");
  if (denied) return denied;
  const cleaned = cleanClaimLines(body?.lines);
  if ("problems" in cleaned) return { error: "refused" as const, detail: cleaned.problems.join("; ") };
  const fields = { lines: cleaned.lines, note: str(body?.note, 500), projectId: str(body?.projectId, 60) };
  const id = str(body?.id, 60);
  if (id) {
    const current = await claimById(ctx, id);
    if (!current) return { error: "notfound" };
    if (current.claimantCollaboratorId !== ctx.collaborator.id) return { error: "not-yours" };
    if (current.status !== "Draft") return { error: "status" };
    const updated = await Claims.update(scope(ctx), id, () => fields);
    return updated ? { claim: updated } : { error: "notfound" };
  }
  const all = await Claims.find(scope(ctx));
  const reference = await nextReference(ctx.studio.id, {
    rows: all as unknown as Row[], field: "reference", ...seriesSetting("expenseClaim", ctx.studio.numbering),
  });
  return {
    claim: await Claims.create(scope(ctx), {
      ...fields, reference, claimantCollaboratorId: ctx.collaborator.id, status: "Draft" as ClaimStatus,
      createdAt: new Date().toISOString(),
    }),
  };
}

/** A draft that was never submitted may be deleted by the person who raised it. */
export async function removeClaim(ctx: FinanceContext, id: string) {
  const denied = requirePermission(ctx.access, "finance.claims.create");
  if (denied) return denied;
  const current = await claimById(ctx, id);
  if (!current) return { error: "notfound" };
  if (current.claimantCollaboratorId !== ctx.collaborator.id) return { error: "not-yours" };
  if (current.status !== "Draft") return { error: "status" };
  return (await Claims.remove(scope(ctx), id)) ? { removed: id } : { error: "notfound" };
}

/**
 * MOVE A CLAIM: submit or withdraw your own, or agree or reject somebody
 * else's. Agreeing takes what the claimant still holds of an advance, freezes
 * it on the claim, and posts; a claim the advance covers entirely is settled
 * there and then, because nothing is left to pay.
 */
export async function moveClaim(ctx: FinanceContext, id: string, to: string, reason?: unknown) {
  const deciding = to === "Approved" || to === "Rejected";
  const denied = requirePermission(ctx.access, deciding ? "finance.claims.approve" : "finance.claims.create");
  if (denied) return denied;
  const current = await claimById(ctx, id);
  if (!current) return { error: "notfound" };
  const problem = claimMoveProblem(current, to, ctx.collaborator.id);
  if (problem) return { error: problem };

  if (to === "Rejected" && !str(reason)) return { error: "reason" };
  const now = today();
  let patch: Partial<ClaimRecord> = { status: to as ClaimStatus };
  if (to === "Submitted") patch.submittedOn = now;
  if (to === "Draft") patch = { ...patch, rejectedReason: "" };
  if (to === "Rejected") patch.rejectedReason = str(reason, 300);
  if (to === "Approved") {
    const [claims, advances] = await Promise.all([Claims.find(scope(ctx)), Advances.find(scope(ctx))]);
    const fromAdvance = advanceTakes(claimTotal(current), openAdvance(advances, claims, current.claimantCollaboratorId));
    patch = { ...patch, fromAdvance, approvedOn: now, approvedByCollaboratorId: ctx.collaborator.id };
    if (claimPayable({ lines: current.lines, fromAdvance }) === 0) patch = { ...patch, status: "Paid", paidOn: now };
  }
  // A FUNCTION PATCH THAT RE-CHECKS THE STATUS (invariant 8): two approvers
  // pressing at once must not both approve and both post.
  const from = current.status;
  const updated = await Claims.update(scope(ctx), id, (row) => ((row as ClaimRecord).status === from ? patch : {}));
  if (!updated) return { error: "notfound" };
  if ((updated as ClaimRecord).status !== patch.status) return { error: "status" };
  const posting = to === "Approved" ? await autoPost(ctx, "claim", id) : null;
  return { claim: updated, ...(posting ? { posting } : {}) };
}

/** Pay an approved claim's cash part from a money account. */
export async function payClaim(ctx: FinanceContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.payables.pay");
  if (denied) return denied;
  const current = await claimById(ctx, id);
  if (!current) return { error: "notfound" };
  if (current.status !== "Approved") return { error: "status" };
  const accountId = str(body?.accountId, 60);
  const wrong = await moneyAccountProblem(ctx, accountId);
  if (wrong) return { error: wrong };
  const updated = await Claims.update(scope(ctx), id, (row) => ((row as ClaimRecord).status === "Approved"
    ? { status: "Paid" as ClaimStatus, paidOn: day(body?.date) || today(), accountId }
    : {}));
  if (!updated || (updated as ClaimRecord).status !== "Paid") return { error: "status" };
  const posting = await autoPost(ctx, "claim-payment", id);
  return { claim: updated, posting };
}

/** Hand a person an advance. Never yourself. */
export async function giveAdvance(ctx: FinanceContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.payables.pay");
  if (denied) return denied;
  const collaboratorId = str(body?.collaboratorId, 60);
  if (!collaboratorId) return { error: "person" };
  if (collaboratorId === ctx.collaborator.id) return { error: "own-advance" };
  const people = await listCollaborators(ctx.studio.id);
  if (!people.some((p) => String(p.id) === collaboratorId)) return { error: "person" };
  const amount = Math.round((Number(body?.amount) || 0) * 1000) / 1000;
  if (!(amount > 0)) return { error: "amount" };
  const accountId = str(body?.accountId, 60);
  const wrong = await moneyAccountProblem(ctx, accountId);
  if (wrong) return { error: wrong };
  const all = await Advances.find(scope(ctx));
  const reference = await nextReference(ctx.studio.id, {
    rows: all as unknown as Row[], field: "reference", ...seriesSetting("staffAdvance", ctx.studio.numbering),
  });
  const advance = await Advances.create(scope(ctx), {
    reference, collaboratorId, amount, status: "Paid", paidOn: day(body?.date) || today(), accountId,
    note: str(body?.note, 300), paidByCollaboratorId: ctx.collaborator.id, returns: [], returned: 0,
    createdAt: new Date().toISOString(),
  });
  const posting = await autoPost(ctx, "advance", advance.id);
  return { advance, posting };
}

/**
 * TAKE BACK WHAT A PERSON DID NOT SPEND. No more than this advance has left
 * unreturned, and no more than the person still holds after their claims.
 */
export async function returnAdvance(ctx: FinanceContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "finance.payables.pay");
  if (denied) return denied;
  const [advances, claims] = await Promise.all([Advances.find(scope(ctx)), Claims.find(scope(ctx))]);
  const adv = advances.find((a) => a.id === id);
  if (!adv) return { error: "notfound" };
  const amount = Math.round((Number(body?.amount) || 0) * 1000) / 1000;
  if (!(amount > 0)) return { error: "amount" };
  const left = Math.min(adv.amount - (Number(adv.returned) || 0), openAdvance(advances, claims, adv.collaboratorId));
  if (amount > left + 1e-9) return { error: "more-than-held", held: Math.max(0, left) };
  const accountId = str(body?.accountId, 60);
  const wrong = await moneyAccountProblem(ctx, accountId);
  if (wrong) return { error: wrong };
  // UNIQUE WITHOUT READING THE ROW AGAIN: two returns recorded at once must
  // not both become "ret2" and post as one.
  const returnId = `ret${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const updated = await Advances.update(scope(ctx), id, (row) => {
    const r = row as AdvanceRecord;
    const returns = [...(r.returns || []), { id: returnId, amount, date: day(body?.date) || today(), ...(accountId ? { accountId } : {}) }];
    return { returns, returned: Math.round(((Number(r.returned) || 0) + amount) * 1000) / 1000 };
  });
  if (!updated) return { error: "notfound" };
  const posting = await autoPost(ctx, "advance-return", `${id}:${returnId}`);
  return { advance: updated, posting };
}
