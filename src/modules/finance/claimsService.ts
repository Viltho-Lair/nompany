// THE STORE HALF OF ./claims — expense claims and staff advances, both filed
// under `finance-payables` (`expenseClaims`, `staffAdvances`).
//
// WHO MAY DO WHAT, and the one line held whatever anybody holds:
//   - `finance.claims.create`  — raise, edit, submit and withdraw your OWN claims,
//                                 and see your own claims and advances;
//   - `finance.claims.view`    — see everybody's;
//   - `finance.payables.pay`   — pay an approved claim, hand over an advance,
//                                 take one back (the right that pays suppliers).
// AGREEING OR REJECTING A CLAIM is the Approvals page's since 19/09/2026:
// submitting one asks for its approval (type `claim`), and the people who
// answer are Approvals settings'. Nobody answers their own claim — the Admin
// excepted, the owner's rule — and nobody hands themselves an advance.

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
import { approvalPreflight, approvalRows, requestApproval } from "@/modules/approvals/approvals";
import { approvalSummary } from "@/modules/approvals/reads";
import type { Refusal } from "@/modules/approvals/effects";
import type { Approval } from "@/modules/approvals/schema";
import type { StudioRef } from "@/modules/context";

/** The approval type a claim asks for. Its key is stored — see modules/approvals/registry. */
export const CLAIM_APPROVAL = "claim";

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
  const pay = can(ctx, "finance.payables.pay");
  const seeAll = can(ctx, "finance.claims.view") || pay;
  return { create, pay, seeAll, any: create || seeAll };
}

/** The claims and advances the reader may see, and what each person still holds. */
export async function claimsView(ctx: FinanceContext) {
  const r = rights(ctx);
  if (!r.any) return { error: "forbidden" as const };
  const me = ctx.collaborator.id;
  const [claims, advances, people, accounts, approvals] = await Promise.all([
    Claims.find(scope(ctx)), Advances.find(scope(ctx)), listCollaborators(ctx.studio.id), storedMoneyAccounts(ctx),
    approvalRows(ctx.studio, ctx.approvalsSection),
  ]);
  // A CLAIM SUBMITTED BEFORE 19/09/2026 was already asking, so it is given its
  // approval here, in its claimant's name. Once: a filed one is found next time.
  const stranded = claims.filter((c) => c.status === "Submitted" && !approvalSummary(approvals, CLAIM_APPROVAL, c.id));
  if (stranded.length && ctx.approvalsSection) {
    const byId = new Map((people as { id?: unknown }[]).map((c) => [String(c.id), c]));
    for (const c of stranded) {
      const claimant = byId.get(c.claimantCollaboratorId);
      if (!claimant) continue;
      const asked = await askForClaim({ studio: ctx.studio, collaborator: claimant as FinanceContext["collaborator"], roles: ctx.roles }, c);
      if (asked.approval) approvals.push(asked.approval);
    }
  }
  const mine = (id: string) => r.seeAll || id === me;
  const alias = Object.fromEntries(people.map((c) => [String(c.id), String(c.alias || "")]));
  const holders = [...new Set(advances.map((a) => a.collaboratorId))].filter(mine);
  return {
    me,
    claims: claims.filter((c) => mine(c.claimantCollaboratorId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((c) => ({
        ...c, total: claimTotal(c), payable: claimPayable(c), claimantAlias: alias[c.claimantCollaboratorId] || "",
        // HOW FAR ITS APPROVAL HAS GOT, read from the approval.
        approval: approvalSummary(approvals, CLAIM_APPROVAL, c.id),
      })),
    advances: advances.filter((a) => mine(a.collaboratorId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((a) => ({ ...a, holderAlias: alias[a.collaboratorId] || "" })),
    open: Object.fromEntries(holders.map((id) => [id, openAdvance(advances, claims, id)])),
    // WHO AN ADVANCE MAY GO TO — the studio's people, never the payer themself.
    people: r.pay ? people.filter((p) => String(p.id) !== me).map((p) => ({ id: String(p.id), alias: String(p.alias || "") })) : [],
    categories: ctx.cashCategories,
    moneyAccounts: accounts.map((a) => ({ id: a.id, code: a.code, name: a.name })),
    canCreate: r.create, canPay: r.pay, canSeeAll: r.seeAll,
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

/** File a claim's approval, in its claimant's name, carrying its total. */
function askForClaim(requester: { studio: StudioRef; collaborator: FinanceContext["collaborator"]; roles: FinanceContext["roles"] }, claim: ClaimRecord) {
  return requestApproval(requester, {
    type: CLAIM_APPROVAL,
    source: {
      sectionKey: "finance-payables", recordId: claim.id, ref: claim.reference,
      title: `${claim.reference}${claim.note ? ` · ${claim.note}` : ""}`, path: "finance-payables",
    },
    note: (claim.lines || []).map((l) => `${l.category || ""} — ${l.description || ""}: ${l.amount}`).join("\n"),
    amount: { value: claimTotal(claim), currency: String(requester.studio.currency || "") },
  });
}

/**
 * MOVE A CLAIM: submit or withdraw your own. SUBMITTING IS ASKING FOR ITS
 * APPROVAL (19/09/2026); agreeing and rejecting are answered on the Approvals
 * page, and a move to either sent here is refused by name rather than routed
 * around the approvers.
 */
export async function moveExpenseClaim(ctx: FinanceContext, id: string, to: string) {
  if (to === "Approved" || to === "Rejected") return { error: "not-answerable" };
  const denied = requirePermission(ctx.access, "finance.claims.create");
  if (denied) return denied;
  const current = await claimById(ctx, id);
  if (!current) return { error: "notfound" };
  const problem = claimMoveProblem(current, to, ctx.collaborator.id);
  if (problem) return { error: problem };

  // ASKED FIRST WHETHER ANYBODY COULD ANSWER IT, so a studio whose claims
  // nobody approves refuses in words rather than parking one for ever.
  const requester = { studio: ctx.studio, collaborator: ctx.collaborator, roles: ctx.roles };
  if (to === "Submitted") {
    const preflight = await approvalPreflight(requester, {
      type: CLAIM_APPROVAL, amount: { value: claimTotal(current), currency: String(ctx.studio.currency || "") },
    });
    if ("error" in preflight) return preflight;
  }

  const now = today();
  let patch: Partial<ClaimRecord> = { status: to as ClaimStatus };
  if (to === "Submitted") patch.submittedOn = now;
  if (to === "Draft") patch = { ...patch, rejectedReason: "" };
  const from = current.status;
  const updated = await Claims.update(scope(ctx), id, (row) => ((row as ClaimRecord).status === from ? patch : {}));
  if (!updated) return { error: "notfound" };
  if ((updated as ClaimRecord).status !== patch.status) return { error: "status" };
  if (to === "Submitted") {
    const asked = await askForClaim(requester, updated as ClaimRecord);
    // UNDER EVERY LIMIT THE STUDIO SET, nothing is asked: agreed as submitted.
    if (asked.notNeeded) return agree(ctx, id, String(ctx.collaborator.id));
    if (asked.error) return { claim: updated, approvalProblem: asked.error };
  }
  return { claim: updated };
}

/**
 * AGREE IT: take what the claimant still holds of an advance, freeze it on the
 * claim, and post; a claim the advance covers entirely is settled there and
 * then, because nothing is left to pay. Once — a function patch that re-checks
 * the status (invariant 8), so two answers at once post once.
 */
async function agree(ctx: FinanceContext, id: string, by: string) {
  const current = await claimById(ctx, id);
  if (!current) return { error: "notfound" };
  if (current.status !== "Submitted") return { error: "already-decided" };
  const now = today();
  const [claims, advances] = await Promise.all([Claims.find(scope(ctx)), Advances.find(scope(ctx))]);
  const fromAdvance = advanceTakes(claimTotal(current), openAdvance(advances, claims, current.claimantCollaboratorId));
  let patch: Partial<ClaimRecord> = { status: "Approved", fromAdvance, approvedOn: now, approvedByCollaboratorId: by };
  if (claimPayable({ lines: current.lines, fromAdvance }) === 0) patch = { ...patch, status: "Paid", paidOn: now };
  const updated = await Claims.update(scope(ctx), id, (row) => ((row as ClaimRecord).status === "Submitted" ? patch : {}));
  if (!updated || (updated as ClaimRecord).status !== patch.status) return { error: "already-decided" };
  const posting = await autoPost(ctx, "claim", id);
  return { claim: updated, posting };
}

/** The claim an approval names, in a context carrying the studio's authority. */
async function claimFor(studio: StudioRef, approval: Approval, byCollaboratorId: string) {
  // IMPORTED WHEN NEEDED: ./finance imports the services beside it.
  const { financeContext } = await import("./finance");
  const ctx = await financeContext.asApprover(studio.id, byCollaboratorId);
  if (ctx.error) return { error: ctx.error } as Refusal;
  const claim = await claimById(ctx, approval.source.recordId);
  return claim ? { ctx, claim } : ({ error: "notfound" } as Refusal);
}

/**
 * WHAT DECIDING A `claim` APPROVAL DOES — see modules/approvals/effects. A yes
 * agrees it (above); a no makes it Rejected with the approver's reason. Only
 * from Submitted: a claim its claimant withdrew while the approval waited is not
 * brought back by a late yes.
 */
export const claimApproval = {
  ready: async (studio: StudioRef, approval: Approval, by: string) => {
    const found = await claimFor(studio, approval, by);
    if ("error" in found) return found;
    return found.claim.status === "Submitted" ? null : ({ error: "already-decided", status: found.claim.status } as Refusal);
  },
  approved: async (studio: StudioRef, approval: Approval, by: string) => {
    const found = await claimFor(studio, approval, by);
    if ("error" in found) return found;
    const done = await agree(found.ctx, found.claim.id, by);
    return "error" in done && done.error ? ({ error: done.error } as Refusal) : ("done" as const);
  },
  rejected: async (studio: StudioRef, approval: Approval, by: string, reason: string) => {
    const found = await claimFor(studio, approval, by);
    if ("error" in found) return found;
    if (found.claim.status !== "Submitted") return "done" as const;
    const updated = await Claims.update(scope(found.ctx), found.claim.id, (row) => ((row as ClaimRecord).status === "Submitted"
      ? { status: "Rejected" as ClaimStatus, rejectedReason: str(reason, 300) } : {}));
    return updated ? ("done" as const) : ({ error: "notfound" } as Refusal);
  },
};

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
