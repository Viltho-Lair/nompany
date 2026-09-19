// APPROVALS — the rules, with no store in sight.
//
// PURE. Asserted in tests/approvals-model.mjs. The store half arrives with the
// Approvals page (step 2 of the build in docs/progress.md), and every write it
// makes goes through `applyDecision` as a FUNCTION patch (invariant 8), so two
// approvers answering the same step at the same moment both land.
//
// THE SHAPE, as the owner set it on 19/09/2026:
//   - An approval type is answered in ordered STEPS, one after the other.
//   - Each step names specific studio members, and a checkbox says whether ALL
//     of them must approve or ANY ONE is enough.
//   - Nothing is self-approved: the requester is never one of the people asked,
//     and a step whose only approver is the requester cannot be requested at all.
//     THE ONE EXCEPTION is the owner or an Admin (invariant 7's, as for payroll,
//     bills and stock adjustments): "I am an Owner by default, I must have every
//     access", and a one-person studio could otherwise approve nothing at all.
//   - An approval has an OVERALL status, and each person asked has their own.
//
// A REJECTION FROM ANYBODY AT THE OPEN STEP REJECTS THE WHOLE APPROVAL. Under
// "all must approve" that is the definition; under "any one" it is the safer
// reading — a no from somebody asked is an answer, and waiting to see whether a
// colleague overrules it would make the result depend on who clicked first.
// Asking again is a new request, so the rejected one stays as the record of it.

import { APPROVAL_TYPE_KEYS, approvalType } from "./registry";
import type {
  Approval, ApprovalSetting, ApprovalStatus, ApprovalStep, Decision, Verdict,
} from "./schema";

export const MAX_STEPS = 10;
export const MAX_APPROVERS_PER_STEP = 50;

const text = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);

export type SettingProblem = { problem: string; step?: number };

/**
 * A TYPE'S SETTING AS IT WILL BE STORED, or every problem with it.
 *
 * REFUSED ON WRITE, never on read — the chain store's rule, for its reason: each
 * of these is invisible at runtime and none of them throws. A step with nobody on
 * it blocks every request that reaches it, silently and for ever; an approver who
 * is not a member of this studio can never answer. So they are sentences the
 * studio is shown when it saves, not failures somebody discovers a week later.
 *
 * `memberIds` is the studio's collaborators as they stand at the save.
 */
export function cleanSetting(
  type: unknown,
  raw: unknown,
  memberIds: Iterable<string>,
): { setting: ApprovalSetting } | { problems: SettingProblem[] } {
  const problems: SettingProblem[] = [];
  if (!APPROVAL_TYPE_KEYS.includes(String(type))) return { problems: [{ problem: "unknown-type" }] };

  const members = new Set(memberIds);
  const rows = Array.isArray((raw as { steps?: unknown })?.steps) ? (raw as { steps: unknown[] }).steps : [];
  if (!rows.length) problems.push({ problem: "no-steps" });
  if (rows.length > MAX_STEPS) problems.push({ problem: "too-many-steps" });

  // AN ID PER STEP THAT NOTHING ELSE HOLDS, because a decision names the step it
  // answers. Two steps sharing one id would let one signature count for both.
  const seen = new Set<string>();
  const steps: ApprovalStep[] = rows.slice(0, MAX_STEPS).map((r, i) => {
    const row = (r || {}) as Record<string, unknown>;
    let id = text(row.id, 40);
    if (!id || seen.has(id)) id = `s${i + 1}`;
    while (seen.has(id)) id = `${id}_`;
    seen.add(id);

    // DEDUPED, because "all must approve" counts heads: the same person listed
    // twice would be asked twice and could never be both answers.
    const approverIds = [...new Set(
      (Array.isArray(row.approverIds) ? row.approverIds : []).map((x) => text(x, 60)).filter(Boolean),
    )];
    if (!approverIds.length) problems.push({ problem: "step-no-approvers", step: i + 1 });
    if (approverIds.length > MAX_APPROVERS_PER_STEP) problems.push({ problem: "too-many-approvers", step: i + 1 });
    if (approverIds.some((a) => !members.has(a))) problems.push({ problem: "unknown-approver", step: i + 1 });

    return { id, label: text(row.label, 80), approverIds, requireAll: row.requireAll === true };
  });

  return problems.length ? { problems } : { setting: { steps } };
}

/** Who is asking or answering, as the rules need to know them. */
export type Actor = { collaboratorId: string; isAdmin?: boolean };

/**
 * THE STEPS A NEW REQUEST WILL WALK, frozen from the setting with the requester
 * taken off every step — or why it cannot be requested.
 *
 * TAKEN OFF, NOT REFUSED, when others remain on the step: a manager who is one of
 * three approvers for leave may still ask for their own leave, and the other two
 * answer it. Under "all must approve" that means all of the OTHERS. Only a step
 * where the requester was the ONLY person asked has nobody left, and that request
 * is refused — nothing is self-approved.
 *
 * AN OWNER OR ADMIN STAYS ON THEIR STEPS, and so may answer their own request.
 */
export function planFor(
  setting: ApprovalSetting | null | undefined,
  requester: Actor,
): { steps: ApprovalStep[] } | { error: "not-configured" } | { error: "no-approver"; step: number; label: string } {
  const steps = setting?.steps || [];
  if (!steps.length) return { error: "not-configured" };
  const planned = requester.isAdmin
    ? steps.map((s) => ({ ...s }))
    : steps.map((s) => ({ ...s, approverIds: s.approverIds.filter((id) => id !== requester.collaboratorId) }));
  const empty = planned.findIndex((s) => !s.approverIds.length);
  if (empty >= 0) return { error: "no-approver", step: empty + 1, label: planned[empty].label };
  return { steps: planned };
}

/**
 * MAY THIS RECORD ASK FOR THIS APPROVAL NOW. One open request per record and
 * type: a second pending approval of the same thing would split the approvers
 * between two copies of one question.
 */
export function requestProblem(
  type: unknown,
  existing: readonly Pick<Approval, "type" | "status" | "source">[],
  recordId: string,
): string | null {
  const def = approvalType(type);
  if (!def) return "unknown-type";
  if (!def.requestable) return "not-requestable";
  if (!text(recordId, 60)) return "no-record";
  const open = existing.some((a) => a.type === def.key && a.source?.recordId === recordId && a.status === "Pending");
  return open ? "already-pending" : null;
}

export type StepState = "Approved" | "Rejected" | "Current" | "Waiting" | "Closed";
export type PersonState = { collaboratorId: string; verdict: Verdict | null; at: string; note: string };
export type StepView = { step: ApprovalStep; index: number; state: StepState; people: PersonState[] };

/** Did this step finish, going by the answers given on it? */
function stepOutcome(step: ApprovalStep, decisions: readonly Decision[]): "Approved" | "Rejected" | null {
  const mine = decisions.filter((d) => d.stepId === step.id && step.approverIds.includes(d.collaboratorId));
  if (mine.some((d) => d.verdict === "Rejected")) return "Rejected";
  const yes = new Set(mine.filter((d) => d.verdict === "Approved").map((d) => d.collaboratorId));
  // NOBODY ON THE STEP IS NEVER A YES. `[].every(...)` is true, so an empty step
  // under "all must approve" would approve itself — planFor refuses such a step,
  // but an approval converted from the old board can carry one, and it must
  // stay unanswered.
  if (!step.approverIds.length) return null;
  const done = step.requireAll
    ? step.approverIds.every((id) => yes.has(id))
    : step.approverIds.some((id) => yes.has(id));
  return done ? "Approved" : null;
}

/** The overall status the answers add up to. */
export function overallFrom(steps: readonly ApprovalStep[], decisions: readonly Decision[]): ApprovalStatus {
  for (const step of steps) {
    const outcome = stepOutcome(step, decisions);
    if (outcome === "Rejected") return "Rejected";
    if (outcome !== "Approved") return "Pending";
  }
  return steps.length ? "Approved" : "Pending";
}

/**
 * EVERY STEP AND EVERY PERSON, as the Approvals page and the record show them.
 *
 * `Current` only while the approval is Pending. A converted one can be stored
 * Approved or Rejected with answers that do not add up to it — its board status
 * was set by hand — and the stored status is the truth, so the steps it never
 * reached read `Closed` rather than claiming somebody is still being waited on.
 */
export function stepStates(approval: Pick<Approval, "status" | "steps" | "decisions">): StepView[] {
  let reachedOpen = false;
  return approval.steps.map((step, index) => {
    const outcome = stepOutcome(step, approval.decisions);
    let state: StepState;
    if (outcome) state = outcome;
    else if (reachedOpen) state = approval.status === "Pending" ? "Waiting" : "Closed";
    else { reachedOpen = true; state = approval.status === "Pending" ? "Current" : "Closed"; }
    if (outcome === "Rejected") reachedOpen = true;
    const people = step.approverIds.map((collaboratorId) => {
      const d = approval.decisions.find((x) => x.stepId === step.id && x.collaboratorId === collaboratorId);
      return { collaboratorId, verdict: d?.verdict || null, at: d?.at || "", note: d?.note || "" };
    });
    return { step, index, state, people };
  });
}

/** The step open for answers, or null when none is. */
export function currentStep(approval: Pick<Approval, "status" | "steps" | "decisions">): ApprovalStep | null {
  return stepStates(approval).find((s) => s.state === "Current")?.step || null;
}

/**
 * WHO THE APPROVAL IS WAITING ON RIGHT NOW: the people on the open step who have
 * not answered. This is "my approvals" on the page and who the bell rings for.
 */
export function waitingOn(approval: Pick<Approval, "status" | "steps" | "decisions">): string[] {
  const step = currentStep(approval);
  if (!step) return [];
  const answered = new Set(approval.decisions.filter((d) => d.stepId === step.id).map((d) => d.collaboratorId));
  return step.approverIds.filter((id) => !answered.has(id));
}

/**
 * MAY THIS PERSON GIVE THIS ANSWER NOW.
 *
 * NO PERMISSION IS ASKED, and that is the design rather than a gap: being named
 * on the open step IS the authority. The owner assigns approvals to people, not
 * to rights — a right would be a second answer to "who approves this", free to
 * disagree with the settings.
 *
 * The requester is refused by name even though planFor already took them off
 * every step — a frozen plan is data, and data can be wrong. Except the owner or
 * an Admin, who planFor left on their steps for that reason.
 */
export function decisionProblem(
  approval: Pick<Approval, "status" | "steps" | "decisions" | "requestedByCollaboratorId">,
  actor: Actor,
  verdict: unknown,
  note: unknown,
): string | null {
  const collaboratorId = actor.collaboratorId;
  if (approval.status !== "Pending") return "not-pending";
  if (collaboratorId === approval.requestedByCollaboratorId && !actor.isAdmin) return "own-request";
  if (verdict !== "Approved" && verdict !== "Rejected") return "verdict";
  const step = currentStep(approval);
  if (!step || !step.approverIds.includes(collaboratorId)) return "not-yours";
  if (approval.decisions.some((d) => d.stepId === step.id && d.collaboratorId === collaboratorId)) return "already-answered";
  // A NO SAYS WHY. The requester has to act on it, and "rejected" alone sends
  // them to ask the approver in person — which is the conversation this replaces.
  if (verdict === "Rejected" && !text(note, 1000)) return "reason-required";
  return null;
}

/**
 * THE WRITE A DECISION MAKES, computed from the row as it stands inside the
 * write — so it is a FUNCTION patch (invariant 8), and it may run more than once
 * (a compare-and-set retry). Everything it needs arrives as arguments, `at`
 * included, so every run computes the identical result.
 *
 * Re-checked against the live row, not the copy read before: if a colleague
 * closed the step or rejected it in between, this answer no longer applies and
 * nothing is written.
 */
export function applyDecision(
  row: Pick<Approval, "status" | "steps" | "decisions" | "requestedByCollaboratorId" | "decidedAt">,
  actor: Actor,
  verdict: Verdict,
  note: string,
  at: string,
): Partial<Approval> {
  if (decisionProblem(row, actor, verdict, note)) return {};
  const collaboratorId = actor.collaboratorId;
  const step = currentStep(row) as ApprovalStep;
  const decisions: Decision[] = [...row.decisions, { stepId: step.id, collaboratorId, verdict, at, note: text(note, 1000) }];
  const status = overallFrom(row.steps, decisions);
  return { decisions, status, decidedAt: status === "Pending" ? "" : (row.decidedAt || at) };
}

/**
 * THE APPROVAL A RECORD SHOWS: its newest of that type. A rejected request
 * followed by a new one shows the new one; the rejected one stays on the
 * Approvals page as the record of what happened.
 */
export function latestFor<A extends Pick<Approval, "type" | "source" | "requestedAt">>(
  approvals: readonly A[],
  type: string,
  recordId: string,
): A | null {
  return approvals
    .filter((a) => a.type === type && a.source?.recordId === recordId)
    .reduce<A | null>((best, a) => (!best || a.requestedAt > best.requestedAt ? a : best), null);
}
