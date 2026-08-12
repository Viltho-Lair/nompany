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

import { getSectionByKey, readCol, addRow, updateRow, deleteRow, updateSection, listGrants, listSections } from "@/lib/data/sections";
import { studioContext, canViewSection, canManageSection, sectionNav } from "@/lib/studios";
import { listCollaborators } from "@/lib/data/collaborators";
import { currentUser } from "@/lib/identity";

const TASKS = "tasks";
const PROJECTS = "projects";

export const TASK_STATUSES = ["Open", "In progress", "Blocked", "Done"];
export const TASK_PRIORITIES = ["Low", "Normal", "High", "Urgent"];
export const DEFAULT_STATUS = "Open";
export const DEFAULT_PRIORITY = "Normal";

const str = (v, max = 300) => String(v ?? "").trim().slice(0, max);
const day = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "").trim()) ? String(v).trim() : "");

export async function tasksContext(user, slug) {
  const context = await studioContext(user, slug);
  if (context.error) return context;
  const { studio, collaborator } = context;

  const [grants, sections] = await Promise.all([listGrants(studio.id), listSections(studio.id)]);
  const byKey = Object.fromEntries(sections.map((x) => [x.key, x]));
  const section = byKey["tasks"];
  if (!section) return { error: "no-section" };
  if (!canViewSection(studio, collaborator, section.id, grants)) return { error: "forbidden" };

  // The task list stays on the PARENT — in the Old System the Tasks nav item is
  // the list itself, with Settings as its only sub-item.
  const settingsSection = byKey["tasks-settings"] || section;
  const projectsListSection = byKey["projects-list"] || byKey["projects"] || null;

  return {
    studio, collaborator, section, settingsSection, projectsListSection,
    canManage: canManageSection(studio, collaborator, section.id, grants),
    canManageSettings: canManageSection(studio, collaborator, settingsSection.id, grants),
    taskAssignees: readTaskAssignees(settingsSection),
    nav: sectionNav(studio, collaborator, sections, grants),
  };
}

// ---- task routing -----------------------------------------------------------
// The Old System routes each TYPE of task to one or more AUTHORITIES, and Task
// settings records who currently holds each authority. Appointing someone there
// grants them the matching tasks immediately — existing ones included — which is
// why assignment is resolved from settings rather than copied onto the row.
export const TASK_AUTHORITIES = [
  { code: "mng", label: "Management" },
  { code: "fin", label: "Finance" },
  { code: "sales", label: "Sales" },
  { code: "log", label: "Logistics" },
  { code: "hr", label: "Human Resources" },
  { code: "permit", label: "Permit team" },
];
const AUTHORITY_CODES = TASK_AUTHORITIES.map((a) => a.code);

// Two-party types need BOTH authorities to complete, per the Old System.
export const TASK_TYPE_AUTHORITIES = {
  approval: ["sales", "mng"],
  po: ["mng", "fin"],
  "material-po": ["fin", "mng"],
  delivery: ["log"],
  "delivery-return": ["log"],
  "id-update": ["hr"],
  "permit-request": ["permit"],
};
export const TASK_TYPES = Object.keys(TASK_TYPE_AUTHORITIES);

// { authorityCode: [CollaboratorID] } — CollaboratorIDs, never UserIDs.
export function readTaskAssignees(settingsSection) {
  const raw = settingsSection?.settings?.taskAssignees || {};
  const out = {};
  for (const code of AUTHORITY_CODES) {
    const ids = Array.isArray(raw[code]) ? raw[code] : [];
    out[code] = [...new Set(ids.map((v) => String(v ?? "").trim()).filter(Boolean))].slice(0, 50);
  }
  return out;
}

// Who owns a task right now, derived from CURRENT settings.
export function resolveTaskAssignees(task, taskAssignees) {
  const codes = TASK_TYPE_AUTHORITIES[task?.type] || [];
  const byAuthority = {};
  const flat = new Set();
  for (const c of codes) {
    byAuthority[c] = taskAssignees?.[c] || [];
    for (const id of byAuthority[c]) flat.add(id);
  }
  return { authorities: codes, byAuthority, assigneeIds: [...flat] };
}

export async function saveTasksSettings(ctx, body) {
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

export async function tasksGuard(paramsPromise, { write } = {}) {
  const user = await currentUser();
  if (!user) return { fail: Response.json({ error: "unauthorized" }, { status: 401 }) };
  const { slug } = await paramsPromise;
  const t = await tasksContext(user, slug);
  if (t.error) {
    const status = t.error === "notfound" || t.error === "no-section" ? 404 : 403;
    return { fail: Response.json({ error: t.error }, { status }) };
  }
  if (write && !t.canManage) return { fail: Response.json({ error: "read-only" }, { status: 403 }) };
  return t;
}

// Checklist progress, derived on every read.
export function progressOf(checklist) {
  const list = Array.isArray(checklist) ? checklist : [];
  if (!list.length) return null; // no checklist is different from an empty one
  return Math.round((list.filter((c) => c.done).length / list.length) * 100);
}

export async function listTasks({ studio, section, collaborator }) {
  const [tasks, people, projects] = await Promise.all([
    readCol(studio.id, section.id, TASKS),
    listCollaborators(studio.id),
    projectRows({ studio }),
  ]);
  const alias = Object.fromEntries(people.map((c) => [c.id, c.alias || "Unnamed"]));
  const projectNumber = Object.fromEntries(projects.map((p) => [p.id, p.number]));
  const today = new Date().toISOString().slice(0, 10);

  return [...tasks]
    .sort((a, b) => {
      // Open work first, then by due date, then newest.
      const done = (t) => (t.status === "Done" ? 1 : 0);
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
      mine: t.assigneeCollaboratorId === collaborator.id,
    }));
}

export async function createTask(ctx, body) {
  const { studio, section, collaborator } = ctx;
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

  const task = await addRow(studio.id, section.id, TASKS, {
    title,
    description: str(body?.description, 4000),
    status: TASK_STATUSES.includes(body?.status) ? body.status : DEFAULT_STATUS,
    priority: TASK_PRIORITIES.includes(body?.priority) ? body.priority : DEFAULT_PRIORITY,
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
export async function updateTask(ctx, id, body) {
  const { studio, section, collaborator, canManage } = ctx;
  const rows = await readCol(studio.id, section.id, TASKS);
  const current = rows.find((t) => t.id === id);
  if (!current) return { error: "notfound" };

  const isAssignee = current.assigneeCollaboratorId === collaborator.id;
  if (!canManage && !isAssignee) return { error: "forbidden" };

  const patch = {};

  if (body?.status !== undefined) {
    if (!TASK_STATUSES.includes(body.status)) return { error: "status" };
    patch.status = body.status;
    // Completion time is recorded, not asserted — and clears if reopened.
    patch.completedAt = body.status === "Done" ? (current.completedAt || new Date().toISOString()) : "";
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
    // Replacing the whole list is an edit of the task itself.
    if (!canManage) return { error: "forbidden-field", fields: ["checklist"] };
    patch.checklist = cleanChecklist(body.checklist);
  }

  // Manager-only fields.
  if (!canManage) {
    const asked = Object.keys(body || {}).filter((k) => k !== "status" && k !== "toggle" && k !== "id");
    if (asked.length) return { error: "forbidden-field", fields: asked };
  } else {
    if (body?.title !== undefined) { const v = str(body.title, 200); if (!v) return { error: "title" }; patch.title = v; }
    if (body?.description !== undefined) patch.description = str(body.description, 4000);
    if (body?.priority !== undefined && TASK_PRIORITIES.includes(body.priority)) patch.priority = body.priority;
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
  const apply = (row) => {
    const changes = { ...patch };
    if (toggleId) {
      changes.checklist = (row.checklist || []).map((c) => (c.id === toggleId ? { ...c, done: !c.done } : c));
    }
    if (changes.checklist) {
      const done = progressOf(changes.checklist);
      const status = changes.status ?? row.status;
      if (done === 100 && status !== "Done") { changes.status = "Done"; changes.completedAt = row.completedAt || new Date().toISOString(); }
      if (done !== null && done < 100 && status === "Done") { changes.status = "In progress"; changes.completedAt = ""; }
    }
    return changes;
  };

  const task = await updateRow(studio.id, section.id, TASKS, id, apply);
  return task ? { task: { ...task, progress: progressOf(task.checklist) } } : { error: "notfound" };
}

export async function removeTask(ctx, id) {
  const removed = await deleteRow(ctx.studio.id, ctx.section.id, TASKS, id);
  return removed ? { ok: true } : { error: "notfound" };
}

function cleanChecklist(list) {
  return (Array.isArray(list) ? list : []).slice(0, 50).map((c, i) => ({
    id: str(c?.id, 20) || `ck${i + 1}`,
    text: str(c?.text, 200),
    done: Boolean(c?.done),
  })).filter((c) => c.text);
}

// Projects live in another section — read directly, because naming the project
// a task belongs to is not the same as being allowed to open Projects. The link
// itself stays permission-gated in the UI.
// Cross-section reads resolve the sub-section that OWNS the collection, falling
// back to the parent so a studio predating the sub-section model still works.
async function ownerOf(studioId, childKey, parentKey) {
  return (await getSectionByKey(studioId, childKey)) || (await getSectionByKey(studioId, parentKey));
}

async function projectRows({ studio }) {
  const owner = await ownerOf(studio.id, "projects-list", "projects");
  if (!owner) return [];
  return readCol(studio.id, owner.id, PROJECTS);
}

export async function taskProjects(ctx) {
  const rows = await projectRows(ctx);
  return rows
    .filter((p) => p.stage !== "Completed")
    .map((p) => ({ id: p.id, number: p.number, title: p.title || "" }));
}

export async function assignablePeople({ studio }) {
  const rows = await listCollaborators(studio.id);
  return rows.map((c) => ({ id: c.id, alias: c.alias || "Unnamed" }));
}

// Headline counts, including how much is landing on the person looking.
export function summarise(tasks, meId) {
  const live = tasks.filter((t) => t.status !== "Done");
  return {
    open: live.length,
    mine: live.filter((t) => t.assigneeCollaboratorId === meId).length,
    overdue: live.filter((t) => t.overdue).length,
    unassigned: live.filter((t) => !t.assigneeCollaboratorId).length,
    done: tasks.length - live.length,
  };
}
