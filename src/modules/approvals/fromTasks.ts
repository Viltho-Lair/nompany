// THE ONE-OFF CONVERSION OF THE OLD BOARD INTO APPROVALS.
//
// PURE, and TEMPORARY BY DESIGN: the owner's rule is that no trace of the old
// board is left (19/09/2026), so this file is deleted with the rest once the
// conversion has run against every studio. It carries its own copy of the old
// routing table for the same reason — the module it came from goes first, and a
// conversion that imported it could not run afterwards.
//
// THE OWNER'S MAPPING, 19/09/2026:
//   status   Done → Approved · Open, In progress → Pending · Blocked → Rejected
//   typed    each authority becomes a step, in the old order, answered by the
//            people who held it at the conversion; a signature already given is
//            carried as that person's Approved answer on that step
//   by hand  the writer becomes the requester and the assignee the approver,
//            filed as `carried` — the only hand-written approvals there will be
//
// THE STORED STATUS IS THE OLD ONE, even where the answers do not add up to it:
// a board status was often set by hand, and the owner asked for the overall
// status to reflect the previous one. `stepStates` shows the unreached steps as
// Closed rather than as still waiting.

import type { Approval, ApprovalStatus, ApprovalStep, Decision } from "./schema";

const text = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);

/** The old board's authorities and the order each typed task asked them in. */
const OLD_AUTHORITY_LABELS: Record<string, string> = {
  mng: "Management", fin: "Finance", sales: "Sales", log: "Logistics", hr: "Human Resources", permit: "Permit team",
};
const OLD_ROUTING: Record<string, readonly string[]> = {
  approval: ["sales", "mng"],
  po: ["mng", "fin"],
  "material-po": ["fin", "mng"],
  delivery: ["log"],
  "delivery-return": ["log"],
  "id-update": ["hr"],
  "permit-request": ["permit"],
};
const NEW_TYPE: Record<string, string> = {
  approval: "quotation",
  po: "client-po",
  "material-po": "material-po",
  delivery: "delivery",
  "delivery-return": "delivery-return",
  "id-update": "id-update",
  "permit-request": "permit-request",
};
const STATUS: Record<string, ApprovalStatus> = {
  Done: "Approved", Open: "Pending", "In progress": "Pending", Blocked: "Rejected",
};

type OldTask = Record<string, unknown>;

/**
 * ONE OLD TASK AS AN APPROVAL — every field but the store's own (id, studio,
 * section), which the conversion script supplies when it writes.
 *
 * `holders` is the old settings' `{ authority: [CollaboratorID] }` as it stands
 * at the conversion.
 */
export function approvalFromTask(
  task: OldTask,
  holders: Readonly<Record<string, readonly string[]>>,
): Omit<Approval, "id" | "studioId" | "sectionId"> {
  const oldType = text(task.type, 40);
  const routing = OLD_ROUTING[oldType];
  const status = STATUS[text(task.status, 20)] || "Pending";
  const signed = (task.approvals && typeof task.approvals === "object" ? task.approvals : {}) as
    Record<string, { approved?: unknown; byCollaboratorId?: unknown; at?: unknown }>;

  const steps: ApprovalStep[] = [];
  const decisions: Decision[] = [];
  if (routing) {
    for (const code of routing) {
      const approverIds = [...(holders[code] || [])].map((x) => text(x, 60)).filter(Boolean);
      const sign = signed[code];
      const by = text(sign?.byCollaboratorId, 60);
      if (sign?.approved && by) {
        // A MANAGER COULD SIGN FOR ANY AUTHORITY on the old board, so the signer
        // is not always a holder. They are added to the step so their signature
        // stays attributed to someone who was on it, rather than being dropped.
        if (!approverIds.includes(by)) approverIds.push(by);
        decisions.push({ stepId: code, collaboratorId: by, verdict: "Approved", at: text(sign.at, 40), note: "" });
      }
      steps.push({ id: code, label: OLD_AUTHORITY_LABELS[code] || code, approverIds: [...new Set(approverIds)], requireAll: false });
    }
  } else {
    const assignee = text(task.assigneeCollaboratorId, 60);
    steps.push({ id: "s1", label: "", approverIds: assignee ? [assignee] : [], requireAll: false });
  }

  // WHAT THE TASK SAID, KEPT IN WORDS: the description, the due date and the
  // checklist have no field on an approval, and dropping them would lose what
  // somebody wrote down.
  const po = (task.po && typeof task.po === "object" ? task.po : null) as Record<string, unknown> | null;
  const checklist = Array.isArray(task.checklist) ? task.checklist as Record<string, unknown>[] : [];
  const note = [
    text(task.description, 4000),
    text(po?.description, 1000),
    text(task.dueDate, 10) ? `Due ${text(task.dueDate, 10)}` : "",
    ...checklist.map((c) => `${c?.done ? "[x]" : "[ ]"} ${text(c?.text, 200)}`),
  ].filter(Boolean).join("\n").slice(0, 4000);

  const quotationId = text(task.quotationId, 60);
  const projectId = text(task.projectId, 60);
  const source = quotationId
    ? { sectionKey: "crm-sales-quotations", recordId: quotationId }
    : projectId ? { sectionKey: "projects-list", recordId: projectId }
    : { sectionKey: "", recordId: text(task.subjectId, 60) };

  const createdAt = text(task.createdAt, 40);
  return {
    type: routing ? NEW_TYPE[oldType] : "carried",
    status,
    source: { ...source, ref: text(task.subjectRef, 80), title: text(task.title, 200) },
    requestedByCollaboratorId: text(task.createdByCollaboratorId, 60),
    requestedAt: createdAt,
    steps,
    decisions,
    // THE BOARD NEVER RECORDED WHEN A TASK WAS BLOCKED, so a rejected one takes
    // the moment it was written — the latest time anything is known about it.
    decidedAt: status === "Pending" ? "" : (text(task.completedAt, 40) || createdAt),
    note,
    ...(text(po?.attachmentUrl, 2000) ? { attachment: { url: text(po?.attachmentUrl, 2000), name: text(po?.attachmentName, 200) } } : {}),
  };
}
