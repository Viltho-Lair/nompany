// TASK ROUTING — who a task belongs to, and who may decide it. Client-safe, so
// the board can import it without pulling the Redis-backed section store in with
// it. Same split lib/tickets.js makes for Sales, lib/quotations.js for Technical
// and lib/operationsCalendar.js for Operations.
//
// The Old System routes each TYPE of task to one or more AUTHORITIES, and Task
// settings records who currently holds each one. Appointing somebody there hands
// them the matching tasks immediately — the ones already open included — which is
// why assignment is RESOLVED FROM SETTINGS on every read rather than copied onto
// the row. A copied assignment would freeze at the moment it was written and
// quietly keep routing work to whoever used to hold the job.

export const TASK_AUTHORITIES = [
  { code: "mng", label: "Management" },
  { code: "fin", label: "Finance" },
  { code: "sales", label: "Sales" },
  { code: "log", label: "Logistics" },
  { code: "hr", label: "Human Resources" },
  { code: "permit", label: "Permit team" },
];
export const AUTHORITY_CODES = TASK_AUTHORITIES.map((a) => a.code);

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

// What each type is called on screen, and what it is for. A task with NO type is
// an ordinary one somebody wrote by hand: it belongs to its assignee and needs
// nobody's approval. A TYPED task is a decision waiting on whoever holds the
// authority, which is a different thing and reads differently on the board.
export const TASK_TYPE_LABELS = {
  approval: { label: "Quotation approval", hint: "Both Sales and Management must approve before it moves on." },
  po: { label: "PO approval", hint: "Management approves the PO; Finance issues the project number." },
  "material-po": { label: "Material PO", hint: "Finance and Management both authorise the order to the vendor." },
  delivery: { label: "Delivery request", hint: "Logistics arranges the delivery." },
  "delivery-return": { label: "Delivery return", hint: "Logistics arranges the collection." },
  "id-update": { label: "ID update", hint: "HR updates the identity documents on file." },
  "permit-request": { label: "Permit request", hint: "The permit team issues the permit." },
};

// How long "approve" stays shut after an approval is WITHDRAWN, so a decision
// cannot be flipped back and forth at people faster than they can read it.
export const APPROVAL_COOLDOWN_MS = 5 * 60 * 1000;

// Is this task waiting on a decision, rather than on somebody doing the work?
export const isApprovalTask = (task) => Boolean(task?.type) && TASK_TYPES.includes(task.type);

// { authorityCode: [CollaboratorID] } — CollaboratorIDs, never UserIDs. Unknown
// codes are dropped, so a typo cannot create a silent bucket routing to nobody.
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

// A typed task with its routing resolved. `myAuthorities` is which of them the
// viewer personally holds — empty means they may be able to SEE it, but it is
// not theirs to decide.
export function enrichTask(task, taskAssignees, meId) {
  if (!isApprovalTask(task)) {
    return { ...task, authorities: [], byAuthority: {}, assigneeIds: [], approvals: {}, approvalState: null, myAuthorities: [] };
  }
  const { authorities, byAuthority, assigneeIds } = resolveTaskAssignees(task, taskAssignees);
  const approvals = task.approvals && typeof task.approvals === "object" ? task.approvals : {};
  // Only the authorities this type actually routes to count toward completion —
  // an approval left behind by a type change must not keep a task alive.
  const decided = authorities.filter((c) => approvals[c]?.approved);
  return {
    ...task,
    authorities,
    byAuthority,
    assigneeIds,
    approvals,
    approvalState: {
      required: authorities.length,
      approved: decided.length,
      complete: authorities.length > 0 && decided.length === authorities.length,
    },
    myAuthorities: authorities.filter((c) => (byAuthority[c] || []).includes(meId)),
  };
}

// Who may see a typed task: a manager, whoever raised it, or anyone holding one
// of its authorities. An untyped task follows the board's ordinary rules.
export function canSeeTask(task, { meId, canManage }) {
  if (!isApprovalTask(task)) return true;
  if (canManage) return true;
  if (task.createdByCollaboratorId === meId) return true;
  return (task.assigneeIds || []).includes(meId);
}

// Checklist progress. No checklist at all is not the same as an empty one, so
// it answers null rather than 0.
export function progressOf(checklist) {
  const list = Array.isArray(checklist) ? checklist : [];
  if (!list.length) return null;
  return Math.round((list.filter((c) => c.done).length / list.length) * 100);
}

// Headline counts, including how much is landing on the person looking.
export function summarise(tasks, meId) {
  const live = tasks.filter((t) => t.status !== "Done");
  return {
    open: live.length,
    mine: live.filter((t) => t.mine).length,
    overdue: live.filter((t) => t.overdue).length,
    unassigned: live.filter((t) => !t.type && !t.assigneeCollaboratorId).length,
    done: tasks.length - live.length,
    // Decisions genuinely waiting on this person, which is the number that
    // should make somebody open this screen.
    awaitingMe: live.filter((t) => (t.myAuthorities || []).some((c) => !t.approvals?.[c]?.approved)).length,
    // Typed tasks routed to an authority nobody has been appointed to. They can
    // never complete, and only Task settings can unstick them.
    stuck: live.filter((t) => (t.authorityStates || []).some((a) => a.orphaned)).length,
  };
}
