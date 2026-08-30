// AWAITING YOU — the one cross-module executive widget that is new logic, not
// just a chart: the things across Tasks, approvals and Technical that are waiting
// on THIS collaborator (invariant 6: addressed by CollaboratorID). It reuses the
// exact routing main.ts already uses for its awaitingMe COUNT, so the list and the
// count agree by construction. A section the viewer cannot see is never read.

import { repo } from "@/platform/db/repo";
import { enrichTask, readTaskAssignees } from "@/modules/tasks/taskRouting";
import type { MainContext } from "./main";
import type { Task } from "@/modules/tasks/types";
import type { Row } from "@/platform/db/store";

// A NARROW LOCAL TYPE, not `any`: quotations are not yet a typed module (unlike
// Task, which schema.ts already infers), so the fields this reader actually
// touches are named here — the same move executive.ts documents for a row that
// only needs a few fields recognised.
type QuotationRow = Row & { status?: string; number?: string; createdAt?: string };

export type QueueItem = {
  kind: "task" | "approval" | "quotation" | "rfq";
  section: string;
  id: string;
  label: string;
  at: string;
  /** The task's own due date, where it has one. Empty on everything else. */
  dueDate?: string;
};

/** Oldest-waiting first (a queue drains from the front). Pure. */
export function rankQueue(items: QueueItem[]): QueueItem[] {
  return [...items].sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

/**
 * THE PURE HALF, extracted so a second reader cannot invent a second opinion
 * about what "waiting on me" means. Nova's speech bubble asks the same question
 * from its own read of the same rows (src/modules/main/insights.ts), and a
 * bubble that disagreed with the widget beside it about which tasks are yours
 * would be worse than no bubble. Given rows, assignees and a CollaboratorID
 * (invariant 6), it answers; it reads nothing.
 */
export function taskQueueFrom(
  tasks: Task[],
  assignees: ReturnType<typeof readTaskAssignees>,
  meId: string,
): QueueItem[] {
  const out: QueueItem[] = [];
  for (const raw of tasks) {
    if (raw.status === "Done") continue;
    const t = enrichTask(raw, assignees, meId);
    const mineToDo = t.assigneeCollaboratorId === meId;
    const mineToApprove = (t.myAuthorities || []).some((c) => !t.approvals?.[c]?.approved);
    if (mineToDo || mineToApprove) {
      out.push({
        kind: mineToApprove ? "approval" : "task",
        section: "tasks",
        id: String(t.id),
        label: t.title,
        at: t.createdAt || "",
        // The board's own due date, carried so a caller can age the row without
        // reading the task again. Absent on a task nobody dated.
        dueDate: String(raw.dueDate || ""),
      });
    }
  }
  return out;
}

/** Which assignee table the studio's Tasks settings hold, for `taskQueueFrom`. */
export function taskAssigneesOf(ctx: MainContext) {
  return readTaskAssignees(ctx.byKey["tasks-settings"] || ctx.byKey["tasks"]);
}

export async function awaitingQueue(ctx: MainContext): Promise<QueueItem[]> {
  const meId = ctx.collaborator.id;
  const out: QueueItem[] = [];

  // Tasks waiting on me — the same enrichment main.ts uses for the count.
  const tasksSection = ctx.seen("tasks", null);
  if (tasksSection) {
    const tasks = await repo<Task>("tasks").find({ studio: ctx.studio, section: tasksSection });
    out.push(...taskQueueFrom(tasks, taskAssigneesOf(ctx), meId));
  }

  // Quotations awaiting the viewer's action (Draft/Sent handled by Technical).
  // Fallback is crm-sales, not engineering-docs — quotations moved WITH the
  // section (restructure.ts's SECTION_KEY_MAP: technical-quotations ->
  // crm-sales-quotations), so an unprovisioned sub-section falls back to its
  // real parent, CRM & Sales, not the RFQ's home.
  const quotesSection = ctx.seen("crm-sales-quotations", "crm-sales");
  if (quotesSection) {
    const quotations = await repo<QuotationRow>("quotations").find({ studio: ctx.studio, section: quotesSection });
    for (const q of quotations) {
      if (q.status === "Draft" || q.status === "Sent") {
        out.push({ kind: "quotation", section: "crm-sales-quotations", id: String(q.id), label: String(q.number || q.id), at: String(q.createdAt || "") });
      }
    }
  }

  return rankQueue(out);
}
