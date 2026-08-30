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
import { enabledCapabilities, type NovaConfig } from "@/lib/nova/capabilities";
import { ACTION_IMPLS, MAPPED_ACTION_KEYS, type PreparedAction } from "@/platform/nova/actions";
import { studioContext } from "@/lib/studios";

import { financeContext, listInvoices, listExpenses, summarise } from "@/modules/finance/finance";
import { listBills } from "@/modules/finance/payables";
import { listAssets } from "@/modules/finance/assets";
import { hrContext, listVacations, listEmployees } from "@/modules/hr/hr";
import { tasksContext, listTasks } from "@/modules/tasks/tasks";
import { salesContext, listTickets, listClients } from "@/modules/sales/sales";
import { technicalContext, listRfqs, listQuotations } from "@/modules/technical/technical";
import { projectsContext, listProjects, listSlas, listOvertimes } from "@/modules/projects/projects";
import { inventoryContext, listItems, listVendors, listOrders } from "@/modules/inventory/inventory";
import { listShipments } from "@/modules/inventory/awbTracking";
import { operationsContext, listPermits, listShifts } from "@/modules/operations/operations";
import { mainContext, headlines } from "@/modules/main/main";
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
      const denied = requirePermission(ctx.access, "crmSales.tickets.view");
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
      const denied = requirePermission(ctx.access, "crmSales.clients.view");
      if (refusal(denied)) return denied;
      return capped(await listClients(ctx));
    },
  },
  "read.technical.rfqs": {
    description: "List RFQs (requests for quotation) with status and the ticket they belong to.",
    inputSchema: NO_INPUT,
    run: async (user, slug) => {
      const ctx = await technicalContext(user, slug);
      if ("error" in ctx) return { error: ctx.error };
      const denied = requirePermission(ctx.access, "engineeringDocs.rfq.view");
      if (refusal(denied)) return denied;
      return capped(await listRfqs(ctx));
    },
  },
  "read.technical.quotations": {
    description: "List internal quotations with number, status, value and who handles each.",
    inputSchema: NO_INPUT,
    run: async (user, slug) => {
      const ctx = await technicalContext(user, slug);
      if ("error" in ctx) return { error: ctx.error };
      const denied = requirePermission(ctx.access, "crmSales.quotations.view");
      if (refusal(denied)) return denied;
      return capped(await listQuotations(ctx));
    },
  },
  "read.projects.list": {
    description: "List projects with stage, progress, manager and the ticket they came from.",
    inputSchema: NO_INPUT,
    run: async (user, slug) => {
      const ctx = await projectsContext(user, slug);
      if ("error" in ctx) return { error: ctx.error };
      const denied = requirePermission(ctx.access, "projects.list.view");
      if (refusal(denied)) return denied;
      return capped(await listProjects(ctx));
    },
  },
  "read.projects.slas": {
    description: "List SLA support contracts with their visits and duration.",
    inputSchema: NO_INPUT,
    run: async (user, slug) => {
      const ctx = await projectsContext(user, slug);
      if ("error" in ctx) return { error: ctx.error };
      const denied = requirePermission(ctx.access, "projects.sla.view");
      if (refusal(denied)) return denied;
      return capped(await listSlas(ctx));
    },
  },
  "read.projects.overtimes": {
    description: "List logged overtime with date, hours and the people on it.",
    inputSchema: NO_INPUT,
    run: async (user, slug) => {
      const ctx = await projectsContext(user, slug);
      if ("error" in ctx) return { error: ctx.error };
      const denied = requirePermission(ctx.access, "projects.overtimes.view");
      if (refusal(denied)) return denied;
      return capped(await listOvertimes(ctx));
    },
  },
  "read.inventory.items": {
    description: "List registered stock items with on-hand quantity and whether each is below its reorder level.",
    inputSchema: NO_INPUT,
    run: async (user, slug) => {
      const ctx = await inventoryContext(user, slug);
      if ("error" in ctx) return { error: ctx.error };
      const denied = requirePermission(ctx.access, "inventory.items.view");
      if (refusal(denied)) return denied;
      return capped(await listItems(ctx));
    },
  },
  "read.inventory.vendors": {
    description: "List suppliers with their contact details.",
    inputSchema: NO_INPUT,
    run: async (user, slug) => {
      const ctx = await inventoryContext(user, slug);
      if ("error" in ctx) return { error: ctx.error };
      const denied = requirePermission(ctx.access, "procurement.suppliers.view");
      if (refusal(denied)) return denied;
      return capped(await listVendors(ctx));
    },
  },
  "read.inventory.orders": {
    description: "List purchase / material orders with vendor, status and what is outstanding.",
    inputSchema: NO_INPUT,
    run: async (user, slug) => {
      const ctx = await inventoryContext(user, slug);
      if ("error" in ctx) return { error: ctx.error };
      const denied = requirePermission(ctx.access, "inventory.stock.view");
      if (refusal(denied)) return denied;
      return capped(await listOrders(ctx));
    },
  },
  "read.inventory.awb": {
    description: "List air-waybill shipments with carrier, status and tracking.",
    inputSchema: NO_INPUT,
    run: async (user, slug) => {
      const ctx = await inventoryContext(user, slug);
      if ("error" in ctx) return { error: ctx.error };
      const denied = requirePermission(ctx.access, "logistics.shipments.view");
      if (refusal(denied)) return denied;
      return capped(await listShipments(ctx));
    },
  },
  "read.operations.permits": {
    description: "List permits with type, validity state and days until each expires.",
    inputSchema: NO_INPUT,
    run: async (user, slug) => {
      const ctx = await operationsContext(user, slug);
      if ("error" in ctx) return { error: ctx.error };
      const denied = requirePermission(ctx.access, "fieldService.tracking.view");
      if (refusal(denied)) return denied;
      return capped(await listPermits(ctx));
    },
  },
  "read.operations.shifts": {
    description: "List scheduled shifts with date, location and who is on each.",
    inputSchema: NO_INPUT,
    run: async (user, slug) => {
      const ctx = await operationsContext(user, slug);
      if ("error" in ctx) return { error: ctx.error };
      const denied = requirePermission(ctx.access, "fieldService.tracking.view");
      if (refusal(denied)) return denied;
      return capped(await listShifts(ctx));
    },
  },
  "read.main.home": {
    description: "The studio home headlines — open tickets, low stock, permits expiring, headcount, outstanding money, tasks awaiting the user. Each figure is only present if the user may see that department.",
    inputSchema: NO_INPUT,
    run: async (user, slug) => {
      const ctx = await mainContext(user as { id?: unknown }, slug);
      if ("error" in ctx) return { error: ctx.error };
      return headlines(ctx);   // self-gates per figure; no leaf key
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

type ToolEntry = { kind: "read" | "action"; capKey: string };

/**
 * Build the toolset for this user: ENABLED ∩ MAPPED ∩ PERMITTED. Returns the
 * neutral tool definitions the model may call and an executor that runs one by
 * name in the user's context. A capability the user cannot exercise is never put
 * in front of the model, so it cannot be asked for.
 *
 * READ tools answer directly. ACTION tools only ever PREPARE — they validate the
 * fields and record a proposal (never write); `takePrepared()` hands the endpoint
 * the last proposal so the person can confirm it. The write happens elsewhere,
 * on their click.
 */
export function buildToolset(config: NovaConfig | null | undefined, access: PermissionSet) {
  const tools: NeutralTool[] = [];
  const byName = new Map<string, ToolEntry>();
  const prepared: PreparedAction[] = [];

  for (const cap of enabledCapabilities(config)) {
    if (cap.permissionKey && !can(access, cap.permissionKey as PermissionKey)) continue;  // not permitted
    if (cap.kind === "read") {
      const impl = TOOL_IMPLS[cap.key];
      if (!impl) continue;                                // not mapped yet
      const name = toolName(cap.key);
      tools.push({ name, description: impl.description, parameters: impl.inputSchema });
      byName.set(name, { kind: "read", capKey: cap.key });
    } else {
      const impl = ACTION_IMPLS[cap.key];
      if (!impl) continue;                                // not mapped yet
      const name = toolName(cap.key);
      tools.push({ name, description: impl.description, parameters: impl.fields });
      byName.set(name, { kind: "action", capKey: cap.key });
    }
  }

  async function execute(user: unknown, slug: string, name: string, input?: unknown): Promise<unknown> {
    const entry = byName.get(name);
    if (!entry) return { error: "unknown-tool" };
    if (entry.kind === "read") return TOOL_IMPLS[entry.capKey].run(user, slug);

    // ACTION: prepare only. Ask for missing fields, else record the proposal and
    // tell the model to seek the user's confirmation — NOT to claim it is done.
    const impl = ACTION_IMPLS[entry.capKey];
    const fields = (input && typeof input === "object") ? (input as Record<string, unknown>) : {};
    const missing = impl.required.filter((r) => fields[r] === undefined || fields[r] === "");
    if (missing.length) return { prepared: false, need: missing, message: `Still needed before I can prepare this: ${missing.join(", ")}` };
    const preview = impl.summarise(fields);
    prepared.push({ capKey: entry.capKey, label: impl.label, preview, fields });
    return { prepared: true, preview, message: "Prepared. Ask the user to confirm it below — do not say it is done until they have." };
  }

  return {
    tools,
    execute,
    count: tools.length,
    // The last action the model prepared this turn, for the person to confirm.
    takePrepared: (): PreparedAction | null => (prepared.length ? prepared[prepared.length - 1] : null),
  };
}

// Exported for the Gate A scan: which capability keys have an implementation
// (reads and actions together — every one must be a real capability).
export const MAPPED_CAPABILITY_KEYS: ReadonlySet<string> = new Set([
  ...Object.keys(TOOL_IMPLS),
  ...MAPPED_ACTION_KEYS,
]);
