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
};

/** Oldest-waiting first (a queue drains from the front). Pure. */
export function rankQueue(items: QueueItem[]): QueueItem[] {
  return [...items].sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

export async function awaitingQueue(ctx: MainContext): Promise<QueueItem[]> {
  const meId = ctx.collaborator.id;
  const out: QueueItem[] = [];

  // Tasks waiting on me — the same enrichment main.ts uses for the count.
  const tasksSection = ctx.seen("tasks", null);
  if (tasksSection) {
    const settings = ctx.byKey["tasks-settings"] || ctx.byKey["tasks"];
    const assignees = readTaskAssignees(settings);
    const tasks = await repo<Task>("tasks").find({ studio: ctx.studio, section: tasksSection });
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
        });
      }
    }
  }

  // Quotations awaiting the viewer's action (Draft/Sent handled by Technical).
  const quotesSection = ctx.seen("technical-quotations", "technical");
  if (quotesSection) {
    const quotations = await repo<QuotationRow>("quotations").find({ studio: ctx.studio, section: quotesSection });
    for (const q of quotations) {
      if (q.status === "Draft" || q.status === "Sent") {
        out.push({ kind: "quotation", section: "technical-quotations", id: String(q.id), label: String(q.number || q.id), at: String(q.createdAt || "") });
      }
    }
  }

  return rankQueue(out);
}
