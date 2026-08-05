// Shared Tasks constants + visibility/approval helpers. Client-safe (only
// imports client-safe auth constants).
import { ADMIN_TAG, LEADER_TAG, SALES_TAG, FINANCE_TAG, MANAGEMENT_TAG } from "@/lib/authConstants";

// Approval cooldown per ticket (ms) — how long "Send for Approval" stays
// disabled after an approval request is cancelled.
export const APPROVAL_COOLDOWN_MS = 300 * 1000; // 5 minutes

// Departments a quotation-approval task involves. As of the settings-driven
// rework, ONLY Sales and Management are involved (Finance is no longer part of
// the approval), and both must approve before it can go to Projects.
export const APPROVAL_DEPARTMENTS = ["Sales", "Management"];
export const APPROVER_DEPARTMENTS = ["Sales", "Management"];

const DEPT_TAG = { Sales: SALES_TAG, Finance: FINANCE_TAG, Management: MANAGEMENT_TAG };

// Which authorities (Task-settings pickers) feed each task type, and — for the
// per-department approvals — which department each authority approves for. The
// `code` matches the authority key stored in settings.taskAssignees, which is
// the department CODE used in TaskSettingsModal.
const TASK_TYPE_AUTHORITIES = {
  approval: [{ code: "sales", dept: "Sales" }, { code: "mng", dept: "Management" }],
  // PO approval is two-party: Management approves the PO + issues the PO number,
  // Finance enters the project number. Both are required to complete the task.
  po: [{ code: "mng", dept: "Management" }, { code: "fin", dept: "Finance" }],
  // Vendor material-PO approval — Finance + Management both approve to authorise
  // issuing a purchase order to the vendor.
  "material-po": [{ code: "fin", dept: "Finance" }, { code: "mng", dept: "Management" }],
  delivery: [{ code: "log" }],
  "delivery-return": [{ code: "log" }],
  "id-update": [{ code: "hr" }],
  // Permit-request — raised from a project's Client/Permits box to issue a new
  // permit. Single department (configured in Task settings), assignee-only.
  "permit-request": [{ code: "permit" }],
};

function tagsOf(user) {
  return Array.isArray(user?.tags) ? user.tags : [];
}

// Resolve, from the CURRENT Task settings, who is assigned to a task — a flat
// `assigneeIds` (everyone across the task's authorities) plus `approverAssignees`
// (department → userIds) for the per-department approvals. Pure function: pass in
// the settings object. This is the single source of truth for "who owns a task",
// so appointing someone in Task settings immediately grants them access to
// existing AND future tasks (see enrichTask).
export function resolveTaskAssignees(task, settings) {
  const auths = TASK_TYPE_AUTHORITIES[task?.type] || [];
  const ta = settings?.taskAssignees?.[task?.type];
  const flatManagers = (settings?.taskManagers?.[task?.type] || []).filter(Boolean);
  const approverAssignees = {};
  const flat = new Set();
  for (const a of auths) {
    let ids;
    if (ta && typeof ta === "object" && Array.isArray(ta[a.code])) ids = ta[a.code].filter(Boolean);
    else ids = flatManagers; // fallback when structured settings are absent
    if (a.dept) approverAssignees[a.dept] = ids;
    for (const id of ids) flat.add(id);
  }
  const assigneeIds = flat.size ? [...flat] : (Array.isArray(task?.assigneeIds) ? task.assigneeIds : []);
  return { assigneeIds, approverAssignees };
}

// Return the task with its `assigneeIds` / `approverAssignees` refreshed from the
// given settings. Every API route enriches tasks with this before running any
// visibility/approval check, so assignment is always live off Task settings.
export function enrichTask(task, settings) {
  if (!task) return task;
  const { assigneeIds, approverAssignees } = resolveTaskAssignees(task, settings);
  return { ...task, assigneeIds, approverAssignees };
}

// A "leader" in general (admin, or anyone with the Leader tag). Used to gate
// who may assign the project manager on an approval task.
export function isLeader(user) {
  if (!user) return false;
  const tags = tagsOf(user);
  return tags.includes(ADMIN_TAG) || tags.includes(LEADER_TAG);
}

// A department leader = has that department tag + the Leader tag (admin always).
// Kept as a fallback so leader-based flows keep working alongside assignment.
export function isDeptLeader(user, dept) {
  if (!user) return false;
  const tags = tagsOf(user);
  if (tags.includes(ADMIN_TAG)) return true;
  return tags.includes(LEADER_TAG) && tags.includes(DEPT_TAG[dept]);
}

// Is this user one of the people assigned to this task in Task settings
// (snapshotted/refreshed onto task.assigneeIds by enrichTask)?
export function isAssignee(user, task) {
  return !!user && Array.isArray(task?.assigneeIds) && task.assigneeIds.includes(user.id);
}

// Who can see a task: admin, the creator, or anyone ASSIGNED to it in Task
// settings (the primary rule now). A department leader of one of the task's
// departments still sees approval tasks as a fallback. PO tasks are also visible
// to Management; delivery/return tasks are assignee-only.
export function canSeeTask(user, task) {
  if (!user || !task) return false;
  const tags = tagsOf(user);
  if (tags.includes(ADMIN_TAG)) return true;
  if (task.createdBy && task.createdBy === user.id) return true;
  // Anyone assigned to this task (any type) can see it — this is what makes an
  // appointed user "own" the task.
  if (isAssignee(user, task)) return true;
  if (task.type === "delivery" || task.type === "delivery-return" || task.type === "permit-request") return false;
  // A PO / material-PO task is visible to Management and Finance (the two
  // parties) — plus assignees (handled above) and admin.
  if (task.type === "po" || task.type === "material-po") return tags.includes(MANAGEMENT_TAG) || tags.includes(FINANCE_TAG);
  const depts = Array.isArray(task.departments) ? task.departments : [];
  return tags.includes(LEADER_TAG) && depts.some((d) => tags.includes(DEPT_TAG[d]));
}

// PO approval is two-party. Management approves the PO + enters the PO number;
// Finance enters the project number. Each side is gated to its own department's
// assignee (from Task settings), that department's tag, or admin.
export function canApprovePo(user, task) {
  if (!user) return false;
  const tags = tagsOf(user);
  if (tags.includes(ADMIN_TAG)) return true;
  const forDept = task?.approverAssignees?.Management;
  if (Array.isArray(forDept) && forDept.includes(user.id)) return true;
  return tags.includes(MANAGEMENT_TAG);
}
export function canEnterProjectNumber(user, task) {
  if (!user) return false;
  const tags = tagsOf(user);
  if (tags.includes(ADMIN_TAG)) return true;
  const forDept = task?.approverAssignees?.Finance;
  if (Array.isArray(forDept) && forDept.includes(user.id)) return true;
  return tags.includes(FINANCE_TAG);
}
// Both parties done: PO approved (with a PO number) and a project number issued.
export function poFullyApproved(task) {
  return !!(task?.poApproved && task?.poNumber && task?.projectNumber);
}

// While a PO is pending approval the whole project is frozen — no edits, no
// project-sheet booking, no material orders, no delivery requests — until both
// parties have signed off.
export function isProjectLocked(project) {
  return !!project && project.poState === "pending";
}

// Vendor material-PO approval — Finance + Management each approve to authorise
// issuing a purchase order to the vendor. Each party is gated to its own
// department's assignee (from Task settings), that department's tag, or admin.
export const MATERIAL_APPROVER_DEPARTMENTS = ["Finance", "Management"];
export function canApproveMaterial(user, dept, task) {
  if (!user) return false;
  if (!MATERIAL_APPROVER_DEPARTMENTS.includes(dept)) return false;
  const tags = tagsOf(user);
  if (tags.includes(ADMIN_TAG)) return true;
  const forDept = task?.approverAssignees?.[dept];
  if (Array.isArray(forDept) && forDept.includes(user.id)) return true;
  return tags.includes(DEPT_TAG[dept]);
}
export function materialBothApproved(task) {
  return MATERIAL_APPROVER_DEPARTMENTS.every((d) => task?.approvals?.[d]?.approved);
}

// Can this user click the approve button for a given department — the specific
// person assigned to THAT department in Task settings, admin, or (fallback) the
// department leader. The Sales-assigned person approves for Sales, the
// Management-assigned person approves for Management — never each other's.
export function canApprove(user, dept, task) {
  if (!user) return false;
  if (!APPROVER_DEPARTMENTS.includes(dept)) return false;
  const tags = tagsOf(user);
  if (tags.includes(ADMIN_TAG)) return true;
  const forDept = task?.approverAssignees?.[dept];
  if (Array.isArray(forDept) && forDept.includes(user.id)) return true;
  return isDeptLeader(user, dept);
}

// Have all required departments approved?
export function bothApproved(task) {
  return APPROVER_DEPARTMENTS.every((d) => task?.approvals?.[d]?.approved);
}

// Any approver (an assigned Sales/Management person, admin, or a dept leader) may
// push an approved task to Projects.
export function canSendToProjects(user, task) {
  if (!bothApproved(task)) return false;
  if (isAssignee(user, task)) return true;
  return APPROVER_DEPARTMENTS.some((d) => isDeptLeader(user, d));
}
