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
import { repo } from "@/platform/db/repo";
import { getSectionByKey, updateSection, type Section } from "@/platform/db/sections";
import { listCollaborators } from "@/platform/auth/collaborators";
import { NOTIFY } from "@/platform/notify/notifications";
import { notifyCollaboratorIds, signatureNotice } from "@/modules/people/holders";
import { moduleContext, type ModuleContext } from "../context";
import {
  applyDecision, cleanSetting, decisionProblem, latestFor, planFor, requestProblem, stepStates, waitingOn,
  type Actor,
} from "./model";
import { APPROVAL_TYPES, approvalType } from "./registry";
import { CLIENT_PO_APPROVAL } from "./reads";
import type { Approval, ApprovalSetting, ApprovalSource, Verdict } from "./schema";
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

  const view = (a: Approval) => ({
    id: a.id,
    type: a.type,
    status: a.status,
    source: a.source,
    note: a.note,
    attachment: a.attachment || null,
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
  const approval = await Approvals.update(ctx, id, (row) => applyDecision(row, me, verdict as Verdict, note, at));
  if (!approval) return { error: "notfound" };

  // Did the answer land? A colleague's no in between leaves the row without it,
  // and the caller is told the approval moved on rather than that it worked.
  const landed = approval.decisions.some((d) => d.collaboratorId === me.collaboratorId && d.at === at);
  if (!landed) return { error: "not-pending" };

  await announce(ctx.studio.id, current, approval, me.collaboratorId);
  if (approval.status === "Approved" && current.status === "Pending") await onApproved(ctx.studio, approval);
  return { approval };
}

/**
 * WHAT AN APPROVAL CAUSES, beside the record reading it as approved.
 *
 * A CLIENT'S PO, APPROVED, ISSUES THE PROJECT NUMBER it will be billed under —
 * what Finance's signature on the old board did. Done here, next to the write
 * that causes it, because a screen cannot be trusted to remember it. Best-effort
 * and idempotent: the project may not be open yet, in which case there is
 * nothing to number and `issueProjectNumber` numbers nothing.
 *
 * IMPORTED WHEN NEEDED, because Projects reads approvals too and a module-level
 * import would make the two modules load each other.
 */
async function onApproved(studio: StudioRef, approval: Approval) {
  if (approval.type !== CLIENT_PO_APPROVAL || !approval.source?.recordId) return;
  const listSection = (await getSectionByKey(studio.id, "projects-list")) || (await getSectionByKey(studio.id, "projects"));
  if (!listSection) return;
  const { issueProjectNumber } = await import("@/modules/projects/projects");
  await issueProjectNumber({ studio, listSection }, approval.source.recordId);
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
export async function requestApproval(
  requester: { studio: StudioRef; collaborator: CollaboratorRef; roles: readonly Role[] },
  input: { type: string; source: ApprovalSource; note?: unknown; attachment?: { url: string; name: string } | null },
) {
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
  const plan = planFor(readApprovalSettings(settingsSection)[input.type], me);
  if ("error" in plan) return plan;

  const approval = await Approvals.create(scope, {
    type: input.type,
    status: "Pending",
    source,
    requestedByCollaboratorId: me.collaboratorId,
    requestedAt: new Date().toISOString(),
    steps: plan.steps,
    decisions: [],
    decidedAt: "",
    note: text(input.note, 4000),
    ...(input.attachment?.url ? { attachment: { url: text(input.attachment.url, 2000), name: text(input.attachment.name, 200) } } : {}),
  });
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
  const people = await listCollaborators(ctx.studio.id);
  return {
    types: APPROVAL_TYPES.filter((t) => t.requestable).map((t) => ({
      key: t.key,
      label: t.label,
      steps: ctx.approvalSettings[t.key]?.steps || [],
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
