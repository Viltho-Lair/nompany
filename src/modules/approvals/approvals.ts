// APPROVALS — the store half. The rules are ./model, pure.
//
// Rows live under the studio's approvals section:
//   s:<StudioID>:sec:<SectionID>:c:approvals
// and each type's steps on the Approvals settings sub-section's `settings`.
//
// WHO SEES WHAT — the owner, 19/09/2026:
//   - EVERYBODY opens the page. On it they see what they requested, with how far
//     each has got, and what is waiting on THEM — nothing else.
//   - The owner and Admins see every approval, and may give that to anybody in
//     Access (`approvals.overview.view`).
//   - The owner and Admins set the steps, and may give that in Access too
//     (`approvals.settings`).
// ANSWERING NEEDS NO RIGHT: being named on the open step is the authority.

import { requirePermission, can, isAdministrator, type Role } from "@/platform/access";
import { getExchangeSnapshot } from "@/lib/data/exchangeRates";
import { crossRate } from "@/shared/currencies";
import { roundMoney } from "@/shared/money";
import { repo } from "@/platform/db/repo";
import { getSectionByKey, updateSection, type Section } from "@/platform/db/sections";
import { listCollaborators } from "@/platform/auth/collaborators";
import { NOTIFY } from "@/platform/notify/notifications";
import { notifyCollaboratorIds, signatureNotice } from "@/modules/people/holders";
import { moduleContext, type ModuleContext } from "../context";
import {
  applyDecision, cleanSetting, decisionProblem, defaultSetting, latestFor, overallFrom, planFor, requestProblem, stepStates, waitingOn,
  type Actor, type Person, type RoleRow,
} from "./model";
import { APPROVAL_TYPES, approvalType, approvalAvailable } from "./registry";
import { switchboard } from "@/lib/dashboardWidgets";
import { finishApproved, finishRejected, readyToFinish, stepFinished } from "./effects";
import type { Approval, ApprovalAmount, ApprovalSetting, ApprovalSource, Verdict } from "./schema";
import type { StudioRef, CollaboratorRef } from "../context";

const APPROVALS = "approvals";
const Approvals = repo<Approval>(APPROVALS);

const text = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);

export type ApprovalSettings = Record<string, ApprovalSetting>;

export type ApprovalsContext = ModuleContext & {
  settingsSection: Section;
  canViewSettings: boolean;
  canManageSettings: boolean;
  approvalSettings: ApprovalSettings;
};

/**
 * THE STORED STEPS, read defensively. They were validated by `cleanSetting` on
 * the way in; a row that no longer has the shape is skipped rather than trusted,
 * so the type reads as not configured — which refuses a request with a sentence —
 * instead of routing to nobody.
 */
export function readApprovalSettings(section: { settings?: unknown } | null | undefined): ApprovalSettings {
  const raw = (section?.settings as { approvalSettings?: unknown } | undefined)?.approvalSettings;
  const out: ApprovalSettings = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [type, setting] of Object.entries(raw as Record<string, unknown>)) {
    const steps = (setting as { steps?: unknown })?.steps;
    if (approvalType(type) && Array.isArray(steps) && steps.length) out[type] = setting as ApprovalSetting;
  }
  return out;
}

/** Every type's steps in this studio: what was saved, else the default. */
async function settingsFor(studio: StudioRef, settingsSection: { settings?: unknown } | null | undefined, roles: readonly Role[]) {
  const stored = readApprovalSettings(settingsSection);
  const people = await listCollaborators(studio.id);
  const out: Record<string, ApprovalSetting & { isDefault?: boolean }> = { ...stored };
  for (const t of APPROVAL_TYPES) {
    if (out[t.key]) continue;
    const seeded = defaultSetting(t.key, studio, people as Person[], roles as unknown as RoleRow[]);
    if (seeded) out[t.key] = { ...seeded, isDefault: true };
  }
  return { settings: out, people };
}

export const approvalsContext = moduleContext<ApprovalsContext>({
  root: APPROVALS,
  sub: { settings: "approvals-settings" },
  flags: ["settings"],
  extend: ({ settingsSection }) => ({
    approvalSettings: readApprovalSettings(settingsSection as Section),
  }),
});

const actorOf = (collaborator: CollaboratorRef, roles: readonly Role[]): Actor => ({
  collaboratorId: String(collaborator.id),
  isAdmin: isAdministrator(collaborator, roles),
});

/**
 * EVERY APPROVAL IN THE STUDIO, for a module showing its records' approvals
 * through ./reads. The section is the caller's foreign `approvals` section;
 * a studio without one has none, and every record reads as never asked.
 */
export async function approvalRows(studio: StudioRef, section: Section | null | undefined): Promise<Approval[]> {
  return section ? Approvals.find({ studio, section }) : [];
}

/** May this reader see every approval in the studio, not only their own. */
export const seesEverything = (ctx: Pick<ModuleContext, "access">) => can(ctx.access, "approvals.overview.view");

/**
 * THE PAGE, in one read: what is waiting on me, what I asked for, and — for
 * whoever may see it — everything.
 *
 * A PERSON NAMED ON A LATER STEP IS NOT SHOWN IT YET. "Only the approvals that
 * require their attention" (the owner): an approval waiting on Sales is not
 * Management's business until Sales has answered, and showing it early is how a
 * queue fills with things nobody on it can act on.
 */
export async function listApprovals(ctx: ApprovalsContext) {
  const me = actorOf(ctx.collaborator, ctx.roles);
  const [rows, people] = await Promise.all([Approvals.find(ctx), listCollaborators(ctx.studio.id)]);
  const alias = Object.fromEntries(people.map((c) => [String(c.id), String(c.alias || "")]));
  const everything = seesEverything(ctx);
  // WHAT THE STUDIO RUNS decides the ORDER, never whether something is shown:
  // a switched-off department's approvals are listed below the rest (the owner,
  // 19/09/2026), because one already asked for still has somebody waiting on it.
  const on = switchboard(ctx.sections);

  const view = (a: Approval) => ({
    id: a.id,
    type: a.type,
    status: a.status,
    source: a.source,
    note: a.note,
    attachment: a.attachment || null,
    amount: a.amount || null,
    finish: a.finish || null,
    requestedByCollaboratorId: a.requestedByCollaboratorId,
    requestedByAlias: alias[a.requestedByCollaboratorId] || "",
    requestedAt: a.requestedAt,
    decidedAt: a.decidedAt,
    // Each step and each person asked on it, with their own answer.
    steps: stepStates(a).map((s) => ({
      id: s.step.id,
      label: s.step.label,
      requireAll: s.step.requireAll,
      state: s.state,
      people: s.people.map((p) => ({ ...p, alias: alias[p.collaboratorId] || "" })),
    })),
    // Asked of the same function the write enforces with, so the buttons appear
    // exactly where pressing them succeeds.
    canAnswer: decisionProblem(a, me, "Approved", "") === null,
    // FALSE when its department is switched off — the screen lists it beneath.
    available: approvalAvailable(a.type, on),
  });

  // Pending first, then newest — what can still move leads.
  const ordered = [...rows].sort((x, y) => {
    const open = (a: Approval) => (a.status === "Pending" ? 0 : 1);
    return open(x) - open(y) || String(y.requestedAt).localeCompare(String(x.requestedAt));
  });

  return {
    waiting: ordered.filter((a) => waitingOn(a).includes(me.collaboratorId) && decisionProblem(a, me, "Approved", "") === null).map(view),
    requested: ordered.filter((a) => a.requestedByCollaboratorId === me.collaboratorId).map(view),
    all: everything ? ordered.map(view) : null,
  };
}

/**
 * ONE PERSON'S ANSWER. A function patch (invariant 8): `applyDecision` re-reads
 * the live row inside the write, so two people answering one step at the same
 * moment both land, and an answer overtaken by somebody else's no writes nothing.
 */
export async function decideApproval(ctx: ApprovalsContext, id: string, body: Record<string, unknown>) {
  const me = actorOf(ctx.collaborator, ctx.roles);
  const verdict = body?.verdict;
  const note = text(body?.note, 1000);

  const current = await Approvals.byId(ctx, id);
  if (!current) return { error: "notfound" };
  const problem = decisionProblem(current, me, verdict, note);
  if (problem) return { error: problem };

  // ONE CLOCK READ, OUTSIDE THE PATCH — the patch may run once per retry, and
  // every run must compute the same row.
  const at = new Date().toISOString();

  // THE YES THAT WOULD FINISH IT IS ASKED OF THE RECORD FIRST. Approving a till
  // return puts units back and pays money out, and either can be impossible by
  // now — the drawer is closed, the units went back on another request. The
  // approver is told why HERE, while their yes has not landed, rather than an
  // approval reading Approved over a record that never moved.
  if (applyDecision(current, me, verdict as Verdict, note, at).status === "Approved") {
    const notReady = await readyToFinish(ctx.studio, current, me.collaboratorId);
    if (notReady) return notReady;
  }

  const approval = await Approvals.update(ctx, id, (row) => applyDecision(row, me, verdict as Verdict, note, at));
  if (!approval) return { error: "notfound" };

  // Did the answer land? A colleague's no in between leaves the row without it,
  // and the caller is told the approval moved on rather than that it worked.
  const landed = approval.decisions.some((d) => d.collaboratorId === me.collaboratorId && d.at === at);
  if (!landed) return { error: "not-pending" };

  await announce(ctx.studio.id, current, approval, me.collaboratorId);
  if (approval.status !== "Pending" && current.status === "Pending") {
    return { approval: await finish(ctx, approval, me.collaboratorId) };
  }
  // A STEP FINISHED AND ANOTHER OPENED: a record whose own state follows its
  // steps (a document moves from review to approval) is told which one.
  const doneBefore = stepStates(current).filter((s) => s.state === "Approved").length;
  const doneAfter = stepStates(approval).filter((s) => s.state === "Approved").length;
  if (doneAfter > doneBefore) await stepFinished(ctx.studio, approval, doneAfter - 1, me.collaboratorId);
  return { approval };
}

/**
 * THE RECORD MOVES WHEN ITS APPROVAL IS DECIDED — the till return restocks and
 * refunds, the rejected one is closed. `./effects` holds what each type does.
 *
 * WHAT HAPPENED IS STORED ON THE APPROVAL (`finish`), because the record's
 * write can still fail after the yes has landed — a store error, somebody
 * changing the record in between. An approval reading Approved over a record
 * that never moved is the one thing this page must not claim, so it says so and
 * offers to try again (`retryFinish`).
 */
async function finish(ctx: Pick<ApprovalsContext, "studio" | "section">, approval: Approval, byCollaboratorId: string): Promise<Approval> {
  const outcome = approval.status === "Approved"
    ? await finishApproved(ctx.studio, approval, byCollaboratorId)
    : await finishRejected(ctx.studio, approval, byCollaboratorId);
  if (outcome === "none") return approval;
  const at = new Date().toISOString();
  const written = await Approvals.update(ctx, approval.id, () => ({
    finish: { at, error: outcome === "done" ? "" : outcome.error },
  }));
  return written || approval;
}

/**
 * TRY THE RECORD'S WRITE AGAIN, for an approval that was decided and could not
 * finish. Whoever gave the deciding answer may, and so may anybody who sees
 * every approval. Each type's finish refuses a record that has already moved,
 * so trying twice moves nothing twice.
 */
export async function retryFinish(ctx: ApprovalsContext, id: string) {
  const current = await Approvals.byId(ctx, id);
  if (!current) return { error: "notfound" };
  if (current.status === "Pending" || !current.finish?.error) return { error: "not-unfinished" };
  const me = String(ctx.collaborator.id);
  const decider = [...current.decisions].sort((a, b) => b.at.localeCompare(a.at))[0]?.collaboratorId || me;
  if (me !== decider && !seesEverything(ctx)) return { error: "forbidden" };
  if (current.status === "Approved") {
    const notReady = await readyToFinish(ctx.studio, current, decider);
    if (notReady) return notReady;
  }
  return { approval: await finish(ctx, current, decider) };
}

/**
 * WHO HEARS ABOUT IT. The requester when it is decided either way; the people on
 * the next step when one opens. Never the person who just answered.
 */
async function announce(studioId: string, before: Approval, after: Approval, byId: string) {
  const reference = after.source?.ref || after.source?.title || "";
  if (after.status !== "Pending" && before.status === "Pending") {
    await notifyCollaboratorIds(studioId, [after.requestedByCollaboratorId], {
      type: NOTIFY.approvalDecided,
      title: after.status === "Approved" ? "Your approval came through" : "Your approval was rejected",
      body: reference,
      params: { outcome: after.status === "Approved" ? "granted" : "rejected", reference },
      href: "approvals",
      tone: after.status === "Approved" ? "success" : "warning",
    }, [byId]);
    return;
  }
  const before_ = new Set(waitingOn(before));
  const fresh = waitingOn(after).filter((id) => !before_.has(id));
  if (fresh.length) await notifyCollaboratorIds(studioId, fresh, signatureNotice(reference, "approvals"), [byId]);
}

/**
 * ASK FOR AN APPROVAL — what a record's Request approval button calls, through
 * its own module's route, which has already checked the caller may act on that
 * record. This checks everything that belongs to approvals: the type exists and
 * is set up, nothing about this record is already waiting, and the requester is
 * not the only person who could answer.
 */
/**
 * WHAT A REQUEST IS WORTH, in the studio's currency — converted only when a step
 * starts at a threshold, because that is the only thing the conversion is for.
 * A type whose steps all start at 0 never needs the studio's currency and never
 * reads a rate, so moving a type onto Approvals stops no studio that has not set
 * one (`createStudio` never has).
 */
async function judge(
  studio: StudioRef, setting: ApprovalSetting | null | undefined, amount: { value: unknown; currency: unknown } | null | undefined,
): Promise<{ amount: ApprovalAmount | null } | { error: "no-studio-currency" | "unquoted"; detail?: string }> {
  if (!amount) return { amount: null };
  const value = Number(amount.value) || 0;
  const base = String(studio.currency || "").trim().toUpperCase();
  const from = String(amount.currency || "").trim().toUpperCase() || base;
  const thresholds = (setting?.steps || []).some((s) => Number(s.from) > 0);
  if (!thresholds || from === base) {
    return { amount: { value, currency: from, inBase: base ? roundMoney(value, base) : value, rate: null } };
  }
  if (!base) return { error: "no-studio-currency" };
  const snap = await getExchangeSnapshot();
  const rate = crossRate(snap?.rates, from, base);
  if (rate == null) return { error: "unquoted", detail: `${from} to ${base}` };
  return { amount: { value, currency: from, inBase: roundMoney(value * rate, base), rate } };
}

type Requester = { studio: StudioRef; collaborator: CollaboratorRef; roles: readonly Role[] };
type RequestInput = {
  type: string; source: ApprovalSource; note?: unknown;
  attachment?: { url: string; name: string } | null;
  /** For a type that carries one — see `amounted` in ./registry. */
  amount?: { value: unknown; currency: unknown } | null;
  /**
   * SIGNATURES A RECORD ALREADY HAD under the engine it is leaving, in the order
   * they were given — carried onto the steps in that order, so nobody signs
   * twice. A signer no longer named on the step is added to it: the signature
   * was valid when given, and it stays attributed to them.
   */
  carried?: readonly { collaboratorId: string; at: string }[];
  /**
   * THE PEOPLE A RECORD NAMES FOR ITS OWN STEPS, by position — a controlled
   * document names its reviewer and its approver. Where one is given, it
   * replaces that step's people from the settings for this request only; a
   * null leaves the settings' step as it is. The requester is still taken off.
   */
  stepPeople?: readonly (readonly string[] | null | undefined)[];
};

/** The settings' steps with the record's own people put on the steps it names. */
function withStepPeople(setting: ApprovalSetting | null | undefined, people: RequestInput["stepPeople"]) {
  if (!setting || !people?.length) return setting;
  return {
    ...setting,
    steps: setting.steps.map((s, i) => {
      const named = (people[i] || []).map(String).filter(Boolean);
      return named.length ? { ...s, approverIds: [...new Set(named)] } : s;
    }),
  };
}

/**
 * CAN THIS BE ASKED FOR, and does it need asking at all — the answers
 * `requestApproval` gives, without writing anything. A record whose creation IS
 * the request (a till return) asks this first, so it is never created and then
 * refused. `{ needed: false }` is an amount under every threshold: the record
 * goes ahead as though approved.
 */
export async function approvalPreflight(requester: Requester, input: Pick<RequestInput, "type" | "amount" | "stepPeople">) {
  const { studio, collaborator, roles } = requester;
  const settingsSection = await getSectionByKey(studio.id, "approvals-settings");
  const { settings } = await settingsFor(studio, settingsSection, roles);
  const setting = withStepPeople(settings[input.type], input.stepPeople);
  const judged = await judge(studio, setting, input.amount);
  if ("error" in judged) return judged;
  const plan = planFor(setting, actorOf(collaborator, roles), judged.amount ? judged.amount.inBase : null);
  if ("error" in plan) return plan;
  return { needed: !("notNeeded" in plan) };
}

/**
 * WHAT ASKING ANSWERS — one of three, each saying so, so a caller narrows on
 * `.error`, `.notNeeded` or `.approval` and never has to guess which shape a
 * refusal took.
 */
export type RequestOutcome =
  | { approval: Approval; notNeeded?: undefined; error?: undefined }
  | { notNeeded: true; approval?: undefined; error?: undefined }
  | { error: string; approval?: undefined; notNeeded?: undefined; [detail: string]: unknown };

export async function requestApproval(requester: Requester, input: RequestInput): Promise<RequestOutcome> {
  const { studio, collaborator, roles } = requester;
  const section = await getSectionByKey(studio.id, APPROVALS);
  if (!section) return { error: "no-section" };
  const settingsSection = await getSectionByKey(studio.id, "approvals-settings");
  const scope = { studio, section };

  const source: ApprovalSource = {
    sectionKey: text(input.source?.sectionKey, 80),
    recordId: text(input.source?.recordId, 60),
    ref: text(input.source?.ref, 80),
    title: text(input.source?.title, 200),
    ...(text(input.source?.path, 200) ? { path: text(input.source?.path, 200) } : {}),
  };
  const existing = await Approvals.find(scope, { where: { type: input.type } });
  const refused = requestProblem(input.type, existing, source.recordId);
  if (refused) return { error: refused };

  const me = actorOf(collaborator, roles);
  const { settings } = await settingsFor(studio, settingsSection, roles);
  const setting = withStepPeople(settings[input.type], input.stepPeople);
  const judged = await judge(studio, setting, input.amount);
  if ("error" in judged) return judged;
  const plan = planFor(setting, me, judged.amount ? judged.amount.inBase : null);
  if ("error" in plan) return plan;
  if ("notNeeded" in plan) return { notNeeded: true as const };

  const steps = plan.steps.map((s) => ({ ...s, approverIds: [...s.approverIds] }));
  const decisions: Approval["decisions"] = [];
  (input.carried || []).forEach((c, i) => {
    const step = steps[i];
    if (!step || !c.collaboratorId) return;
    if (!step.approverIds.includes(c.collaboratorId)) step.approverIds.push(c.collaboratorId);
    decisions.push({ stepId: step.id, collaboratorId: c.collaboratorId, verdict: "Approved", at: c.at || new Date().toISOString(), note: "" });
  });
  const status = decisions.length ? overallFrom(steps, decisions) : "Pending";

  const approval = await Approvals.create(scope, {
    type: input.type,
    source,
    requestedByCollaboratorId: me.collaboratorId,
    requestedAt: new Date().toISOString(),
    steps,
    decisions,
    status,
    decidedAt: status === "Pending" ? "" : new Date().toISOString(),
    note: text(input.note, 4000),
    ...(judged.amount ? { amount: judged.amount } : {}),
    ...(input.attachment?.url ? { attachment: { url: text(input.attachment.url, 2000), name: text(input.attachment.name, 200) } } : {}),
  });
  // CARRIED SIGNATURES CAN ALREADY ADD UP — a plan with fewer steps than the
  // record was signed for. Then it is finished like any other approved one.
  if (approval.status !== "Pending") {
    const last = decisions[decisions.length - 1]?.collaboratorId || me.collaboratorId;
    return { approval: await finish(scope, approval, last) };
  }
  await notifyCollaboratorIds(studio.id, waitingOn(approval), signatureNotice(source.ref || source.title, "approvals"), [me.collaboratorId]);
  return { approval };
}

/**
 * THE STATUS A RECORD SHOWS — read from its newest approval of that type, never
 * copied onto the record (the owner: "a status carry, not a copy"). Null when it
 * has never been asked.
 */
export async function approvalFor(studio: StudioRef, type: string, recordId: string) {
  const section = await getSectionByKey(studio.id, APPROVALS);
  if (!section) return null;
  const rows = await Approvals.find({ studio, section }, { where: { type } });
  const latest = latestFor(rows, type, recordId);
  return latest ? { id: latest.id, status: latest.status, steps: stepStates(latest), requestedAt: latest.requestedAt } : null;
}

/** Approvals settings: every requestable type, its steps, and who can be named. */
export async function approvalSettingsView(ctx: ApprovalsContext) {
  const denied = requirePermission(ctx.access, "approvals.settings.view");
  if (denied) return denied;
  const { settings, people } = await settingsFor(ctx.studio, ctx.settingsSection, ctx.roles);
  const on = switchboard(ctx.sections);
  return {
    types: APPROVAL_TYPES.filter((t) => t.requestable).map((t) => ({
      key: t.key,
      label: t.label,
      // Listed beneath the rest when its department is switched off — still
      // editable, so a studio can set it up before switching the department on.
      available: approvalAvailable(t.key, on),
      amounted: Boolean(t.amounted),
      steps: settings[t.key]?.steps || [],
      // NOT SAVED YET: today's right holders, worked out on each read. The screen
      // says so, and saving the type makes them the studio's own.
      isDefault: Boolean(settings[t.key]?.isDefault),
    })),
    people: people.map((c) => ({ id: String(c.id), alias: String(c.alias || "") })),
    canEdit: can(ctx.access, "approvals.settings.edit"),
  };
}

/**
 * ONE TYPE'S STEPS, replaced whole. Approvals already requested keep the steps
 * they were frozen with; only new requests walk these.
 */
export async function saveApprovalSetting(ctx: ApprovalsContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "approvals.settings.edit");
  if (denied) return denied;
  const type = text(body?.type, 40);
  if (!approvalType(type)?.requestable) return { error: "unknown-type" };

  const people = await listCollaborators(ctx.studio.id);
  const cleaned = cleanSetting(type, body?.setting, people.map((c) => String(c.id)));
  if ("problems" in cleaned) return { error: "setting", problems: cleaned.problems };

  // MERGED INTO THE LIVE ROW, not the copy this request read: two people saving
  // two different types at once must both land.
  const updated = await updateSection(ctx.studio.id, ctx.settingsSection.id, (live) => ({
    settings: {
      ...(live.settings || {}),
      approvalSettings: { ...readApprovalSettings(live), [type]: cleaned.setting },
    },
  }));
  return updated ? { type, setting: cleaned.setting } : { error: "notfound" };
}
