// TASK ROUTING — who a task belongs to, and who may decide it. Client-safe, so
// the board can import it without pulling the Redis-backed section store in with
// it. Same split modules/sales/tickets.js makes for Sales, modules/technical/quotations.js for Technical
// and modules/operations/operationsCalendar.js for Operations.
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

// WHAT EACH TYPE IS, IN FULL. A task with NO type is an ordinary one somebody
// wrote by hand: it belongs to its assignee and needs nobody's approval. A TYPED
// task is a decision waiting on whoever holds the authority, which is a
// different thing and reads differently on the board.
//
// Four things are said about each, because Task settings has to show all four
// before anybody can sensibly appoint to it:
//
//   label   what it is called wherever it appears
//   hint    what the type IS, in one line — used on the board and in the picker
//   from    WHERE IT COMES FROM. Only `approval` is raised by the system, off
//           the Sales ticket's own button; the rest are raised by hand until
//           the module that owns them can raise its own. Saying so is worth
//           more than implying an automation that does not exist yet.
//   handling  WHO HANDLES IT and what each authority is actually deciding —
//           the sentence that makes an appointment a decision rather than a
//           guess at what "Finance" means on this particular row.
export const TASK_TYPE_LABELS = {
  approval: {
    label: "Quotation approval",
    hint: "Both Sales and Management must approve before it moves on.",
    from: "Raised automatically when Sales presses Send for Approval on a ticket whose latest quotation is finished. One task per quotation — a revision raises its own.",
    handling: "Sales confirms the commercial terms are what was agreed; Management authorises the studio to stand behind the price. It is approved only once both have signed.",
  },
  po: {
    label: "PO approval",
    hint: "Management approves the PO; Finance issues the project number.",
    from: "Raised by hand on the Tasks board when a client's purchase order arrives against an approved quotation.",
    handling: "Management approves the order itself; Finance issues the project number it will be billed under. Both are needed before work is booked against it.",
  },
  "material-po": {
    label: "Material PO",
    hint: "Finance and Management both authorise the order to the vendor.",
    from: "Raised by hand on the Tasks board when materials have to be ordered from a vendor.",
    handling: "Finance commits the spend; Management authorises the order going out. Both are needed before anything is sent to the vendor.",
  },
  delivery: {
    label: "Delivery request",
    hint: "Logistics arranges the delivery.",
    from: "Raised by hand on the Tasks board when goods have to reach a site.",
    handling: "Logistics arranges the delivery and closes the task once it has gone out. One authority, so one sign-off finishes it.",
  },
  "delivery-return": {
    label: "Delivery return",
    hint: "Logistics arranges the collection.",
    from: "Raised by hand on the Tasks board when goods have to come back from a site.",
    handling: "Logistics arranges the collection and closes the task once it is back. One authority, so one sign-off finishes it.",
  },
  "id-update": {
    label: "ID update",
    hint: "HR updates the identity documents on file.",
    from: "Raised by hand on the Tasks board when somebody's identity documents expire or change.",
    handling: "HR updates the documents held against that person and closes the task. One authority, so one sign-off finishes it.",
  },
  "permit-request": {
    label: "Permit request",
    hint: "The permit team issues the permit.",
    from: "Raised by hand on the Tasks board when work at a site needs a permit before it can start.",
    handling: "The permit team obtains the permit and closes the task with it on file. One authority, so one sign-off finishes it.",
  },
};

// How long "approve" stays shut after an approval is WITHDRAWN, so a decision
// cannot be flipped back and forth at people faster than they can read it.
export const APPROVAL_COOLDOWN_MS = 5 * 60 * 1000;

// Is this task waiting on a decision, rather than on somebody doing the work?
export const isApprovalTask = (task) => Boolean(task?.type) && TASK_TYPES.includes(task.type);

// IS THIS QUOTATION APPROVED — asked of the APPROVAL, not of a copy.
//
// A quotation carries a hand-set `status`, and "Approved" is one of its values.
// But the studio's actual decision lives on the approval task: Sales signs,
// Management signs, and the task turns Done. Nothing wrote that back to the
// quotation, so a quotation everybody had approved still read "Completed" — and
// openProject, which asks "is this approved?", refused to open the project with
// "That quotation is not approved", from the very screen that had just approved
// it.
//
// Writing the status across would have been a copy, and a copy of a decision is
// the worst kind: withdraw an approval and the quotation would go on claiming
// it. So the question is asked of the task every time. The stored status still
// counts — a studio may mark a quotation Approved by hand, and quotations
// approved before this existed keep working — but it is no longer the only
// answer, and it is not the one that matters when a real approval exists.
export function quotationApproved(quotation, tasks) {
  if (!quotation) return false;
  if (quotation.status === "Approved") return true;
  return (tasks || []).some((t) => t.type === "approval" && t.quotationId === quotation.id && t.status === "Done");
}

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
