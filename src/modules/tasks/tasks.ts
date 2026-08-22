// TASKS — who is doing what, and by when.
//
// Rows live under the studio's *tasks section*:
//   s:<StudioID>:sec:<SectionID>:c:tasks
//
// ASSIGNEES ARE CollaboratorIDs. A task belongs to someone's identity inside
// THIS studio, so removing them from the studio takes their assignments with
// them and never touches their account or their work elsewhere.
//
// PERMISSION IS SPLIT, like leave in HR. Manage means running the board:
// creating tasks, assigning them, editing anyone's. View means you can see the
// board and get on with YOUR OWN work — moving a task you were assigned, or
// ticking off its checklist. A board where the people doing the work can't say
// they've done it is not a board.
//
// Progress comes from the checklist, never stored separately, so it cannot
// drift from the items it counts.

import { requirePermission, can } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { getSectionByKey, updateSection } from "@/platform/db/sections";
import { moduleContext } from "../context";

import { listCollaborators } from "@/platform/auth/collaborators";
// Issuing the project number is a CONSEQUENCE of Finance signing the PO, so it
// is called from decideTask rather than from a screen — see the note there.
import { issueProjectNumber } from "@/modules/projects/projects";
import {
  TASK_AUTHORITIES, TASK_TYPE_AUTHORITIES, TASK_TYPES, TASK_TYPE_LABELS,
  APPROVAL_COOLDOWN_MS, isApprovalTask, readTaskAssignees, resolveTaskAssignees,
  enrichTask, canSeeTask, progressOf, summarise,
} from "./taskRouting";
import type { Task, ChecklistItem, TasksContext, EnrichedTask, Approval } from "./types";
import type { Section } from "@/platform/db/sections";

const TASKS = "tasks";
const PROJECTS = "projects";

// THE COLLECTIONS THIS MODULE QUERIES, named once. A repository binds a
// collection, not a scope — the studio and section arrive per call, which is
// what stops a query naming another tenant's keys and what lets one object
// answer for a sibling department's rows as easily as its own.
const Tasks = repo<Task>(TASKS);
const Projects = repo(PROJECTS);

export const TASK_STATUSES = ["Open", "In progress", "Blocked", "Done"];
export const TASK_PRIORITIES = ["Low", "Normal", "High", "Urgent"];
export const DEFAULT_STATUS = "Open";
export const DEFAULT_PRIORITY = "Normal";

const str = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);
const day = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "").trim()) ? String(v).trim() : "");

export const tasksContext = moduleContext({
  root: "tasks",
  sub: { settings: "tasks-settings" },
  foreign: { projectsList: ["projects-list", "projects"] },
  flags: ["settings"],
  // Who currently holds each approval authority, resolved from Task settings on
  // every read — appointing somebody there hands them the open approvals
  // immediately, so this is never copied onto a row.
  extend: ({ settingsSection }) => ({
    taskAssignees: readTaskAssignees(settingsSection),
  }),
});

// ---- task routing -----------------------------------------------------------
// Lives in modules/tasks/taskRouting.js so the board can import it without pulling this
// module's Redis-backed store in with it. Re-exported here so every server-side
// caller keeps one import.
export {
  TASK_AUTHORITIES, TASK_TYPE_AUTHORITIES, TASK_TYPES, TASK_TYPE_LABELS,
  APPROVAL_COOLDOWN_MS, isApprovalTask, readTaskAssignees, resolveTaskAssignees,
  enrichTask, canSeeTask, progressOf, summarise,
};

export async function saveTasksSettings(ctx: TasksContext, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "tasks.settings.edit");
  if (denied) return denied;

  const { studio, settingsSection, collaborator } = ctx;
  const next = { ...(settingsSection.settings || {}) };
  if (body?.taskAssignees !== undefined) {
    const incoming = body.taskAssignees && typeof body.taskAssignees === "object" ? body.taskAssignees : {};
    // Only known authority codes are stored, so a typo cannot create a silent
    // bucket that never routes to anyone.
    next.taskAssignees = readTaskAssignees({ settings: { taskAssignees: incoming } });
  }
  const updated = await updateSection(studio.id, settingsSection.id, { settings: next });
  return updated ? { taskAssignees: readTaskAssignees({ settings: next }) } : { error: "notfound" };
}

// THE COLLECTIONS THIS MODULE QUERIES, named once. A repository is bound to a
// collection rather than to a scope, so the same object answers for every studio
// and section — the scope arrives with each call, which is what keeps a query
// from ever naming another tenant's keys.
export async function listTasks(ctx: TasksContext) {
  const { studio, collaborator, canManage, taskAssignees } = ctx;
  const [tasks, people, projects] = await Promise.all([
    Tasks.find(ctx),
    listCollaborators(studio.id),
    projectRows({ studio }),
  ]);
  const alias = Object.fromEntries(people.map((c) => [c.id, c.alias || "Unnamed"]));
  const projectNumber = Object.fromEntries(projects.map((p) => [p.id, p.number]));
  const today = new Date().toISOString().slice(0, 10);

  return [...tasks]
    // Routing is resolved BEFORE anything is filtered or sorted, because who a
    // task belongs to is what decides whether it is shown at all.
    .map((t) => enrichTask(t, taskAssignees, collaborator.id))
    .filter((t) => canSeeTask(t, { meId: collaborator.id, canManage }))
    .sort((a, b) => {
      // Open work first, then by due date, then newest.
      const done = (t: EnrichedTask) => (t.status === "Done" ? 1 : 0);
      if (done(a) !== done(b)) return done(a) - done(b);
      if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (!!a.dueDate !== !!b.dueDate) return a.dueDate ? -1 : 1;
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    })
    .map((t) => ({
      ...t,
      assigneeAlias: alias[t.assigneeCollaboratorId] || "",
      createdByAlias: alias[t.createdByCollaboratorId] || "",
      projectNumber: projectNumber[t.projectId] || "",
      progress: progressOf(t.checklist),
      // Both derived, so neither can go stale.
      overdue: t.status !== "Done" && !!t.dueDate && t.dueDate < today,
      // "Mine" means it is waiting on ME: assigned to me, or — on a typed task —
      // routed to an authority I hold and not yet decided by me.
      mine: t.assigneeCollaboratorId === collaborator.id
        || (t.myAuthorities || []).some((c) => !t.approvals?.[c]?.approved),
      // Each authority resolved to names, so the board can say who is being
      // waited on rather than printing a list of ids.
      authorityStates: (t.authorities || []).map((code) => ({
        code,
        label: TASK_AUTHORITIES.find((a) => a.code === code)?.label || code,
        holders: (t.byAuthority?.[code] || []).map((id) => alias[id]).filter(Boolean),
        approved: !!t.approvals?.[code]?.approved,
        byAlias: alias[t.approvals?.[code]?.byCollaboratorId || ""] || "",
        at: t.approvals?.[code]?.at || "",
        // Nobody has been appointed to this authority, so this task is stuck —
        // worth saying out loud rather than letting it sit there forever.
        orphaned: (t.byAuthority?.[code] || []).length === 0,
      })),
    }));
}

export async function createTask(ctx: TasksContext, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "tasks.board.create");
  if (denied) return denied;

  const { studio, collaborator } = ctx;
  const title = str(body?.title, 200);
  if (!title) return { error: "title" };

  const assigneeCollaboratorId = str(body?.assigneeCollaboratorId, 60);
  if (assigneeCollaboratorId) {
    const people = await listCollaborators(studio.id);
    if (!people.some((c) => c.id === assigneeCollaboratorId)) return { error: "assignee" };
  }

  const projectId = str(body?.projectId, 60);
  if (projectId) {
    const projects = await projectRows(ctx);
    if (!projects.some((p) => p.id === projectId)) return { error: "project" };
  }

  // A typed task is routed by its type and needs no assignee — who holds it is
  // read from Task settings, and changes the moment those settings change.
  const type = TASK_TYPES.includes(String(body?.type)) ? String(body?.type) : "";

  const task = await Tasks.create(ctx, {
    title,
    type,
    approvals: {},
    approvalWithdrawnAt: "",
    description: str(body?.description, 4000),
    status: TASK_STATUSES.includes(String(body?.status)) ? String(body?.status) : DEFAULT_STATUS,
    priority: TASK_PRIORITIES.includes(String(body?.priority)) ? String(body?.priority) : DEFAULT_PRIORITY,
    assigneeCollaboratorId,
    projectId,
    dueDate: day(body?.dueDate),
    checklist: cleanChecklist(body?.checklist),
    createdByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
    completedAt: "",
  });
  return { task: { ...task, progress: progressOf(task.checklist) } };
}

// What someone may change depends on who they are. A manager edits anything; the
// assignee may move their own task along and tick its checklist, but not
// reassign it or rewrite what was asked of them.
export async function updateTask(ctx: TasksContext, id: string, body: Record<string, unknown>) {
  const { studio, collaborator } = ctx;
  const current = await Tasks.byId(ctx, id);
  if (!current) return { error: "notfound" };

  // A TYPED TASK IS NOT A TO-DO SOMEBODY WROTE, it is a decision the product
  // raised: "approve quotation Q-0042" exists because Sales pressed a button,
  // it names the document it is about, and whoever signs it is answering that
  // question. Retitling it, rewriting its description or pointing it at another
  // project would change what the approvers think they are agreeing to, after
  // some of them may already have agreed.
  //
  // So its only legal changes are decisions, and those come through decideTask.
  // Status is refused with the rest: a typed task's status FOLLOWS its
  // approvals, and setting it by hand would let somebody call it Done while an
  // authority has not signed.
  if (isApprovalTask(current)) return { error: "typed-immutable" };

  // WHO MAY CHANGE WHAT, and the two halves are different rights.
  //
  // A task is created and ASSIGNED by somebody authorised, and COMPLETED by the
  // person it was assigned to. So finishing your own work is not a board right:
  // moving your task along and ticking its checklist is the job, and requiring
  // tasks.board.edit for it would mean only the people who hand work out can
  // ever say it is done.
  //
  // Everything else — retitling, reassigning, replacing the checklist — is
  // running the board, and that is tasks.board.edit. Asked of the permission
  // set rather than of the section, so the declared right is what decides.
  const boardEdit = can(ctx.access, "tasks.board.edit");
  const isAssignee = current.assigneeCollaboratorId === collaborator.id;
  const asked = Object.keys(body || {}).filter((k) => k !== "id");
  const ownWorkOnly = asked.length > 0 && asked.every((k) => k === "status" || k === "toggle");

  if (!(isAssignee && ownWorkOnly)) {
    const denied = requirePermission(ctx.access, "tasks.board.edit");
    if (denied) return denied;
  }
  if (!boardEdit && !isAssignee) return { error: "forbidden" };

  const patch: Partial<Task> = {};

  if (body?.status !== undefined) {
    if (!TASK_STATUSES.includes(String(body.status))) return { error: "status" };
    patch.status = String(body.status);
    // Completion time is recorded, not asserted — and clears if reopened.
    patch.completedAt = String(body.status) === "Done" ? (current.completedAt || new Date().toISOString()) : "";
  }

  // Ticking one box says WHICH box, not what the whole list should become — and
  // the flip is applied to the row as it stands when the write actually runs,
  // not to the copy read a moment ago. Clicks landing faster than the screen can
  // refresh, and two people ticking different items, both survive.
  let toggleId = "";
  if (body?.toggle !== undefined) {
    toggleId = str(body.toggle, 20);
    const list = Array.isArray(current.checklist) ? current.checklist : [];
    if (!list.some((c) => c.id === toggleId)) return { error: "item" };
  } else if (body?.checklist !== undefined) {
    // Replacing the whole list is an edit of the task itself — what was ASKED
    // of somebody, not whether they have done it.
    if (!boardEdit) return { error: "forbidden-field", fields: ["checklist"] };
    patch.checklist = cleanChecklist(body.checklist);
  }

  // Everything past "I have done my bit" belongs to whoever runs the board.
  if (!boardEdit) {
    const beyondOwnWork = asked.filter((k) => k !== "status" && k !== "toggle");
    if (beyondOwnWork.length) return { error: "forbidden-field", fields: beyondOwnWork };
  } else {
    if (body?.title !== undefined) { const v = str(body.title, 200); if (!v) return { error: "title" }; patch.title = v; }
    if (body?.description !== undefined) patch.description = str(body.description, 4000);
    if (body?.priority !== undefined && TASK_PRIORITIES.includes(String(body.priority))) patch.priority = String(body.priority);
    if (body?.dueDate !== undefined) patch.dueDate = day(body.dueDate);
    if (body?.assigneeCollaboratorId !== undefined) {
      const assignee = str(body.assigneeCollaboratorId, 60);
      if (assignee) {
        const people = await listCollaborators(studio.id);
        if (!people.some((c) => c.id === assignee)) return { error: "assignee" };
      }
      patch.assigneeCollaboratorId = assignee;
    }
    if (body?.projectId !== undefined) {
      const projectId = str(body.projectId, 60);
      if (projectId) {
        const projects = await projectRows(ctx);
        if (!projects.some((p) => p.id === projectId)) return { error: "project" };
      }
      patch.projectId = projectId;
    }
  }

  // Finishing every checklist item finishes the task; reopening one takes it
  // back to In progress, so status can never contradict the checklist. This runs
  // against `row` — the live record inside the write lock — so the status always
  // matches the checklist that was actually stored.
  const apply = (row: Task) => {
    const changes: Record<string, unknown> = { ...patch };
    // Named rather than read back off `changes`, which is a bag of unknowns:
    // the tick and a checklist sent in the patch are the same thing to the
    // status rule below, and both have to reach it.
    const checklist = toggleId
      ? (row.checklist || []).map((c) => (c.id === toggleId ? { ...c, done: !c.done } : c))
      : (patch.checklist as ChecklistItem[] | undefined);
    if (toggleId) changes.checklist = checklist;
    if (checklist) {
      const done = progressOf(checklist);
      const status = changes.status ?? row.status;
      if (done === 100 && status !== "Done") { changes.status = "Done"; changes.completedAt = row.completedAt || new Date().toISOString(); }
      if (done !== null && done < 100 && status === "Done") { changes.status = "In progress"; changes.completedAt = ""; }
    }
    return changes;
  };

  const task = await Tasks.update(ctx, id, apply);
  return task ? { task: { ...task, progress: progressOf(task.checklist) } } : { error: "notfound" };
}

// Record — or withdraw — ONE authority's decision on a typed task.
//
// The authority is checked against the settings as they stand at the moment of
// the write, not against anything the client sent: the Sales approver approves
// for Sales and can never approve for Management, whatever the payload claims.
// A manager may act for any authority, which is what makes the board unblockable
// when somebody is away.
export async function decideTask(ctx: TasksContext, id: string, body: Record<string, unknown>) {
  const { studio, collaborator, canManage, taskAssignees } = ctx;
  const current = await Tasks.byId(ctx, id);
  if (!current) return { error: "notfound" };
  if (!isApprovalTask(current)) return { error: "not-approval" };

  const authority = str(body?.authority, 20);
  const { authorities, byAuthority } = resolveTaskAssignees(current, taskAssignees);
  if (!authorities.includes(authority)) return { error: "authority" };
  const holds = (byAuthority[authority] || []).includes(collaborator.id);
  if (!holds && !canManage) return { error: "not-yours" };

  const approved = body?.approved !== false;

  // Withdrawing starts a cooldown, so a decision cannot be flipped back and
  // forth at people faster than they can read it.
  if (!approved) {
    const since = Date.parse(current.approvalWithdrawnAt || "");
    if (Number.isFinite(since) && Date.now() - since < APPROVAL_COOLDOWN_MS) {
      return { error: "cooldown", waitMs: APPROVAL_COOLDOWN_MS - (Date.now() - since) };
    }
  }

  // Applied to the live row inside the write lock: two authorities deciding at
  // the same moment must not overwrite each other's approval.
  const apply = (row: Task) => {
    const approvals: Record<string, Approval> = { ...(row.approvals && typeof row.approvals === "object" ? row.approvals as Record<string, Approval> : {}) };
    if (approved) {
      approvals[authority] = { approved: true, byCollaboratorId: collaborator.id, at: new Date().toISOString() };
    } else {
      delete approvals[authority];
    }
    const changes: Partial<Task> = { approvals };
    if (!approved) changes.approvalWithdrawnAt = new Date().toISOString();

    // Every required authority has signed off, so the decision is made. Taking
    // one back reopens it, so the status can never claim more than the
    // approvals under it actually say.
    const complete = authorities.every((c) => approvals[c]?.approved);
    if (complete && row.status !== "Done") { changes.status = "Done"; changes.completedAt = row.completedAt || new Date().toISOString(); }
    if (!complete && row.status === "Done") { changes.status = "In progress"; changes.completedAt = ""; }
    return changes;
  };

  const task = await Tasks.update(ctx, id, apply);
  if (!task) return { error: "notfound" };

  // FINANCE SIGNING THE PO IS WHAT ISSUES THE PROJECT NUMBER. Done here, next
  // to the write that causes it, for the same reason raising the first RFQ
  // moves a Lead to an Opportunity inside requestRfq: both entry points to the
  // decision must have the same consequence, and a screen cannot be trusted to
  // remember it.
  //
  // Best-effort and reported, not enforced: the project may not exist yet — a
  // PO can be authorised before anybody opens the project — and in that case
  // there is simply nothing to number. Whoever opens it later gets a project
  // with a blank number, which is the state this is designed around.
  let numberIssued = "";
  if (task.type === "po" && task.status === "Done" && task.quotationId) {
    const owner = await ownerOf(studio.id, "projects-list", "projects");
    if (owner) {
      const out = await issueProjectNumber({ studio, listSection: owner }, task.quotationId);
      numberIssued = String(out.issued || "");
    }
  }
  return { task, numberIssued };
}

export async function removeTask(ctx: TasksContext, id: string) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "tasks.board.delete");
  if (denied) return denied;

  // AND A TYPED TASK CANNOT BE DELETED EITHER, for the same reason it cannot be
  // edited — plus one more: it is the RECORD of a decision. A quotation
  // approval carries who signed for Sales and who signed for Management and
  // when; deleting it does not undo the approval, it destroys the evidence of
  // one while the quotation goes on being approved. Whoever wants it gone wants
  // the approval withdrawn, and that is what withdrawing is for.
  const current = await Tasks.byId(ctx, id);
  if (!current) return { error: "notfound" };
  if (isApprovalTask(current)) return { error: "typed-immutable" };

  const removed = await Tasks.remove(ctx, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// AN ID PER ITEM THAT NOTHING ELSE HOLDS.
//
// Ticking a box says WHICH box, and the server flips every item matching that
// id — so two items sharing one id means one click ticks both. The client used
// to mint `ck${list.length + 1}`, which repeats as soon as anything is removed:
// drop the second of three items, add another, and the new one is `ck3` again.
// Duplicates arriving from an older client are renamed here rather than trusted,
// because this is the last place before they are stored.
function cleanChecklist(list: unknown): ChecklistItem[] {
  const seen = new Set();
  return (Array.isArray(list) ? list : []).slice(0, 50).map((c, i) => {
    let id = str(c?.id, 20);
    if (!id || seen.has(id)) id = `ck${i + 1}_${Math.random().toString(36).slice(2, 8)}`;
    seen.add(id);
    return { id, text: str(c?.text, 200), done: Boolean(c?.done) };
  }).filter((c) => c.text);
}

// Projects live in another section — read directly, because naming the project
// a task belongs to is not the same as being allowed to open Projects. The link
// itself stays permission-gated in the UI.
// Cross-section reads resolve the sub-section that OWNS the collection, falling
// back to the parent so a studio predating the sub-section model still works.
async function ownerOf(studioId: string, childKey: string, parentKey: string) {
  return (await getSectionByKey(studioId, childKey)) || (await getSectionByKey(studioId, parentKey));
}

async function projectRows({ studio }: Pick<TasksContext, "studio">) {
  const owner = await ownerOf(studio.id, "projects-list", "projects");
  if (!owner) return [];
  // A DIFFERENT SECTION, SAME COLLECTION. The scope is what varies, so reading
  // another department's rows is a different argument rather than a different
  // function — and it still cannot name another studio.
  return Projects.find({ studio, section: owner });
}

export async function taskProjects(ctx: TasksContext) {
  const rows = await projectRows(ctx);
  return rows
    .filter((p) => p.stage !== "Completed")
    .map((p) => ({ id: p.id, number: p.number, title: p.title || "" }));
}

export async function assignablePeople({ studio }: Pick<TasksContext, "studio">) {
  const rows = await listCollaborators(studio.id);
  return rows.map((c) => ({ id: c.id, alias: c.alias || "Unnamed" }));
}

