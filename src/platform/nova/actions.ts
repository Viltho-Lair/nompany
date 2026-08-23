// NOVA'S ACTIONS — the simple self-service things a person can ask Nova to do,
// each mapping to a service they could already reach by hand.
//
// TWO-STEP, always. The model only ever PREPARES an action: it gathers the
// fields conversationally and Nova shows a preview. Nothing is written until the
// person clicks Confirm, which posts to /nova/act and runs `submit` here — under
// their own context, through the same permission-checked service the screen uses.
// The model cannot submit; only the human's click can. So a hallucinated field
// becomes a preview the person can reject, never a silent write.

import { hrContext, requestVacation } from "@/modules/hr/hr";
import { tasksContext, updateTask } from "@/modules/tasks/tasks";
import { salesContext, editTicket } from "@/modules/sales/sales";
import { studioContext } from "@/lib/studios";
import { markRead } from "@/platform/notify/notifications";

export type PreparedAction = { capKey: string; label: string; preview: string; fields: Record<string, unknown> };

export type ActionImpl = {
  label: string;
  description: string;                 // the tool description the model reads
  fields: Record<string, unknown>;     // JSON schema for the prepare tool's input
  required: string[];                  // fields that must be present before a preview
  summarise: (f: Record<string, unknown>) => string;
  submit: (user: unknown, slug: string, f: Record<string, unknown>) => Promise<unknown>;
};

const str = (v: unknown) => String(v ?? "").trim();
const idList = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x)) : []);

export const ACTION_IMPLS: Record<string, ActionImpl> = {
  "action.hr.request-leave": {
    label: "Request leave",
    description: "Prepare a leave request for the user to confirm. Gather the start date, and the end date and type if given. Does NOT submit — the user confirms it afterwards.",
    fields: {
      type: "object",
      properties: {
        from: { type: "string", description: "First day of leave, YYYY-MM-DD" },
        to: { type: "string", description: "Last day, YYYY-MM-DD; same as from for a single day" },
        type: { type: "string", enum: ["Annual", "Sick", "Unpaid", "Parental", "Compassionate"], description: "Kind of leave" },
        reason: { type: "string", description: "Optional reason" },
      },
      required: ["from"],
    },
    required: ["from"],
    summarise: (f) => `Request ${str(f.type) || "Annual"} leave from ${str(f.from)}${f.to && f.to !== f.from ? ` to ${str(f.to)}` : ""}${f.reason ? ` — "${str(f.reason)}"` : ""}`,
    submit: async (user, slug, f) => {
      const ctx = await hrContext(user, slug);
      if ("error" in ctx) return { error: ctx.error };
      return requestVacation(ctx, f);
    },
  },

  "action.notifications.mark-read": {
    label: "Mark notifications read",
    description: "Mark the user's own notifications as read. With no ids, marks all of theirs.",
    fields: {
      type: "object",
      properties: { ids: { type: "array", items: { type: "string" }, description: "Notification ids; omit to mark all" } },
    },
    required: [],
    summarise: (f) => (Array.isArray(f.ids) && f.ids.length ? `Mark ${f.ids.length} notification(s) read` : "Mark all your notifications read"),
    submit: async (user, slug, f) => {
      const ctx = await studioContext(user as { id?: unknown }, slug);
      if ("error" in ctx) return { error: ctx.error };
      return { changed: await markRead(String(ctx.studio.id), String(ctx.collaborator.id), idList(f.ids)) };
    },
  },

  "action.sales.comment-ticket": {
    label: "Comment on a ticket",
    description: "Add a comment to a sales ticket. Needs the ticket id and the comment text.",
    fields: {
      type: "object",
      properties: {
        id: { type: "string", description: "The ticket's id" },
        comment: { type: "string", description: "The comment to add" },
      },
      required: ["id", "comment"],
    },
    required: ["id", "comment"],
    summarise: (f) => `Add a comment to ticket ${str(f.id)}: "${str(f.comment)}"`,
    submit: async (user, slug, f) => {
      const ctx = await salesContext(user, slug);
      if ("error" in ctx) return { error: ctx.error };
      return editTicket(ctx, str(f.id), { addComment: str(f.comment) });
    },
  },

  "action.tasks.advance-mine": {
    label: "Advance my task",
    description: "Change the status of a task assigned to the user. Needs the task id and the new status.",
    fields: {
      type: "object",
      properties: {
        id: { type: "string", description: "The task's id" },
        status: { type: "string", enum: ["Open", "In progress", "Blocked", "Done"] },
      },
      required: ["id", "status"],
    },
    required: ["id", "status"],
    summarise: (f) => `Set task ${str(f.id)} to ${str(f.status)}`,
    submit: async (user, slug, f) => {
      const ctx = await tasksContext(user, slug);
      if ("error" in ctx) return { error: ctx.error };
      return updateTask(ctx, str(f.id), { status: str(f.status) });
    },
  },
};

export const MAPPED_ACTION_KEYS: ReadonlySet<string> = new Set(Object.keys(ACTION_IMPLS));
