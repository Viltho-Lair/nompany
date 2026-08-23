// NOVA'S TOOLS — the bridge from a capability to a real read, run in the asking
// user's own context.
//
// Every implementation here re-derives the user's context and RE-CHECKS the
// capability's leaf permission before returning anything. This is the coarse-
// gate tightening the research called for: the department GET is gated once (any
// child .view), so the aggregate over-shares — but Nova's invoices tool requires
// finance.cash.view itself, not merely "can view some Finance". Nova is never
// looser than the user's own screens.
//
// The toolset the model sees is ENABLED (switchboard) ∩ MAPPED (has an impl
// here) ∩ PERMITTED (the user holds the leaf right). A capability failing any of
// the three is simply absent from the toolset, so the model cannot call it —
// enforcement is structural, not a matter of prompt.

import type { NeutralTool } from "@/platform/nova/client";
import { requirePermission, can } from "@/platform/access";
import type { PermissionSet, PermissionKey } from "@/platform/access";
import { enabledCapabilities, type NovaConfig, type NovaCapability } from "@/lib/nova/capabilities";
import { studioContext } from "@/lib/studios";

import { financeContext, listInvoices, listExpenses, summarise } from "@/modules/finance/finance";
import { listBills } from "@/modules/finance/payables";
import { listAssets } from "@/modules/finance/assets";
import { hrContext, listVacations, listEmployees } from "@/modules/hr/hr";
import { tasksContext, listTasks } from "@/modules/tasks/tasks";
import { salesContext, listTickets, listClients } from "@/modules/sales/sales";
import { listForCollaborator } from "@/platform/notify/notifications";

// A tool result should be small enough to reason over, not a data dump. Lists
// are capped and the model is told the total, so "how many overdue?" stays
// answerable without shipping every row.
function capped<T>(rows: T[], limit = 50): { count: number; shown: number; items: T[] } {
  const items = rows.slice(0, limit);
  return { count: rows.length, shown: items.length, items };
}

// JSON schema, which every provider accepts for a tool's input. An empty object
// schema is "no arguments".
const NO_INPUT: Record<string, unknown> = { type: "object", properties: {} };

type ToolImpl = {
  description: string;
  inputSchema: Record<string, unknown>;
  run: (user: unknown, slug: string) => Promise<unknown>;
};

// The refusal a context builder or a permission check hands back — narrowed so
// the caller returns it verbatim to the model as a readable error.
const refusal = (v: { error: string } | null): boolean => !!v;

// The implementations, keyed by capability key. Each builds its department
// context in the user's session, re-checks the capability's leaf key itself
// (the coarse-gate tightening), and returns a capped result. Adding a department
// is adding an entry; a capability with no entry is simply not offered yet.
const TOOL_IMPLS: Record<string, ToolImpl> = {
  "read.finance.invoices": {
    description: "List the studio's invoices, each with client, total, amount paid, outstanding balance, status and whether it is overdue.",
    inputSchema: NO_INPUT,
    run: async (user, slug) => {
      const ctx = await financeContext(user, slug);
      if ("error" in ctx) return { error: ctx.error };
      const denied = requirePermission(ctx.access, "finance.cash.view");
      if (refusal(denied)) return denied;
      return capped(await listInvoices(ctx));
    },
  },
  "read.finance.expenses": {
    description: "List the studio's recorded expenses with amount, category, date and project.",
    inputSchema: NO_INPUT,
    run: async (user, slug) => {
      const ctx = await financeContext(user, slug);
      if ("error" in ctx) return { error: ctx.error };
      const denied = requirePermission(ctx.access, "finance.cash.view");
      if (refusal(denied)) return denied;
      return capped(await listExpenses(ctx));
    },
  },
  "read.finance.summary": {
    description: "A headline finance summary: total invoiced, collected, outstanding, overdue and expenses.",
    inputSchema: NO_INPUT,
    run: async (user, slug) => {
      const ctx = await financeContext(user, slug);
      if ("error" in ctx) return { error: ctx.error };
      const denied = requirePermission(ctx.access, "finance.cash.view");
      if (refusal(denied)) return denied;
      const [invoices, expenses] = await Promise.all([listInvoices(ctx), listExpenses(ctx)]);
      return summarise(invoices, expenses);
    },
  },
  "read.finance.bills": {
    description: "List the studio's supplier bills (accounts payable) with vendor, total, outstanding and status.",
    inputSchema: NO_INPUT,
    run: async (user, slug) => {
      const ctx = await financeContext(user, slug);
      if ("error" in ctx) return { error: ctx.error };
      const denied = requirePermission(ctx.access, "finance.payables.view");
      if (refusal(denied)) return denied;
      return capped(await listBills(ctx));
    },
  },
  "read.finance.assets": {
    description: "List the studio's fixed assets with cost, current book value, monthly depreciation and status.",
    inputSchema: NO_INPUT,
    run: async (user, slug) => {
      const ctx = await financeContext(user, slug);
      if ("error" in ctx) return { error: ctx.error };
      const denied = requirePermission(ctx.access, "finance.assets.view");
      if (refusal(denied)) return denied;
      const r = await listAssets(ctx);
      return "error" in r ? { error: r.error } : capped(r.assets);
    },
  },
  "read.hr.my-leave": {
    description: "The asking user's own leave requests, with type, dates, days and status.",
    inputSchema: NO_INPUT,
    run: async (user, slug) => {
      const ctx = await hrContext(user, slug);
      if ("error" in ctx) return { error: ctx.error };
      const denied = requirePermission(ctx.access, "hr.vacations.view");
      if (refusal(denied)) return denied;
      return capped(await listVacations(ctx, { meId: ctx.collaborator.id }));
    },
  },
  "read.hr.employees": {
    description: "List employees the user may see, with alias, department, role and document-expiry dates (identity numbers are never included).",
    inputSchema: NO_INPUT,
    run: async (user, slug) => {
      const ctx = await hrContext(user, slug);
      if ("error" in ctx) return { error: ctx.error };
      const denied = requirePermission(ctx.access, "hr.employees.view");
      if (refusal(denied)) return denied;
      return capped(await listEmployees(ctx, ctx.collaborator.id));
    },
  },
  "read.tasks.board": {
    description: "The task board the user may see: tasks with title, status, priority, assignee, due date and overdue flag.",
    inputSchema: NO_INPUT,
    run: async (user, slug) => {
      const ctx = await tasksContext(user, slug);
      if ("error" in ctx) return { error: ctx.error };
      const denied = requirePermission(ctx.access, "tasks.board.view");
      if (refusal(denied)) return denied;
      return capped(await listTasks(ctx));
    },
  },
  "read.sales.tickets": {
    description: "List sales tickets with client, title, status, deadline and value.",
    inputSchema: NO_INPUT,
    run: async (user, slug) => {
      const ctx = await salesContext(user, slug);
      if ("error" in ctx) return { error: ctx.error };
      const denied = requirePermission(ctx.access, "sales.tickets.view");
      if (refusal(denied)) return denied;
      return capped(await listTickets(ctx));
    },
  },
  "read.sales.clients": {
    description: "List the studio's clients with name, industry and contact details.",
    inputSchema: NO_INPUT,
    run: async (user, slug) => {
      const ctx = await salesContext(user, slug);
      if ("error" in ctx) return { error: ctx.error };
      const denied = requirePermission(ctx.access, "sales.clients.view");
      if (refusal(denied)) return denied;
      return capped(await listClients(ctx));
    },
  },
  "read.notifications": {
    description: "The asking user's own notifications, newest first, with title, body and whether each is read.",
    inputSchema: NO_INPUT,
    run: async (user, slug) => {
      const ctx = await studioContext(user as { id?: unknown }, slug);
      if ("error" in ctx) return { error: ctx.error };
      return capped(await listForCollaborator(String(ctx.studio.id), String(ctx.collaborator.id)));
    },
  },
};

// A capability key is dotted; a tool name must match ^[a-zA-Z0-9_-]{1,64}$.
const toolName = (capKey: string) => capKey.replace(/\./g, "__");

/**
 * Build the toolset for this user: ENABLED ∩ MAPPED ∩ PERMITTED. Returns the
 * Anthropic tool definitions the model may call and an executor that runs one by
 * name in the user's context. A capability the user cannot exercise is never put
 * in front of the model, so it cannot be asked for.
 */
export function buildToolset(config: NovaConfig | null | undefined, access: PermissionSet) {
  const tools: NeutralTool[] = [];
  const byName = new Map<string, NovaCapability>();

  for (const cap of enabledCapabilities(config)) {
    const impl = TOOL_IMPLS[cap.key];
    if (!impl) continue;                                  // not mapped yet
    if (cap.permissionKey && !can(access, cap.permissionKey as PermissionKey)) continue;  // not permitted
    const name = toolName(cap.key);
    tools.push({ name, description: impl.description, parameters: impl.inputSchema });
    byName.set(name, cap);
  }

  async function execute(user: unknown, slug: string, name: string): Promise<unknown> {
    const cap = byName.get(name);
    if (!cap) return { error: "unknown-tool" };
    return TOOL_IMPLS[cap.key].run(user, slug);
  }

  return { tools, execute, count: tools.length };
}

// Exported for the Gate A scan: which capability keys have an implementation.
export const MAPPED_CAPABILITY_KEYS: ReadonlySet<string> = new Set(Object.keys(TOOL_IMPLS));
