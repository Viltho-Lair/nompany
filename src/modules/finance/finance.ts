// FINANCE — what the studio has billed, what it has collected, and what its
// work actually cost.
//
// Rows live under the studio's *finance section*:
//   s:<StudioID>:sec:<SectionID>:c:invoices
//   s:<StudioID>:sec:<SectionID>:c:expenses
//
// MONEY IS ALWAYS DERIVED. Invoice totals are computed from their lines, the
// amount paid is summed from the payments recorded against them, and "Paid" is
// a consequence of those payments rather than a status anyone can assert. A
// client can never tell the server what something is worth.
//
// Profitability reads across sections: the quoted value comes from the project
// (snapshotted from its quotation), costs come from Inventory's purchase orders
// plus expenses booked here. Nothing is copied into Finance and left to rot —
// it is recomputed on every read.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { getSectionByKey, updateSection } from "@/platform/db/sections";
import { attachToProjectEngagement, detachFromItsEngagement } from "@/platform/db/engagement";
import { moduleContext } from "../context";

import { listCollaborators } from "@/platform/auth/collaborators";
import { traverseIn } from "@/platform/relations";
import { nextReference } from "@/modules/main/references";
import type { Invoice, InvoiceView, Expense, InvoiceLine, Payment, FinanceContext } from "./types";
import type { Row } from "@/platform/db/store";

const INVOICES = "invoices";
const EXPENSES = "expenses";
const PROJECTS = "projects";
const ORDERS = "materialOrders";

// THE COLLECTIONS THIS MODULE QUERIES, named once. A repository binds a
// collection, not a scope — the studio and section arrive per call, which is
// what stops a query naming another tenant's keys and what lets one object
// answer for a sibling department's rows as easily as its own.
const Invoices = repo<Invoice>(INVOICES);
const Expenses = repo<Expense>(EXPENSES);
const Projects = repo(PROJECTS);
const Orders = repo(ORDERS);

export const INVOICE_STATUSES = ["Draft", "Sent", "Paid", "Cancelled"];
export const EXPENSE_CATEGORIES = [
  "Materials", "Subcontractor", "Transport", "Travel", "Salaries",
  "Rent", "Utilities", "Software", "Equipment", "Fees", "Other",
];
export const PAYMENT_METHODS = ["Bank transfer", "Cash", "Card", "Cheque", "Other"];
export const DEFAULT_VAT_RATE = 15;

export const str = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);
export const day = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "").trim()) ? String(v).trim() : "");
export const cash = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0; };
const round = (n: unknown) => Math.round((Number(n) || 0) * 100) / 100;

// THE COLLECTIONS THIS MODULE QUERIES, named once. Projects and Orders belong
// to other departments; reading them is a different SCOPE rather than a
// different function, and the scope still cannot cross a studio.
export const financeContext = moduleContext<FinanceContext>({
  root: "finance",
  sub: { cash: "finance-cash", ledger: "finance-ledger", payables: "finance-payables", assets: "finance-assets", settings: "finance-settings" },
  // Projects and Inventory sheets, when the studio has them. Read on the same
  // terms Sales reads Technical: what a project cost is part of the invoice's
  // own story, and a studio without those sections simply has no margin column.
  foreign: { projectsList: ["projects-list", "projects"], sheets: ["inventory-sheets", "inventory"] },
  flags: ["cash", "ledger", "payables", "assets", "settings"],
  extend: ({ settingsSection }) => ({
    cashCategories: readCashCategories(settingsSection as { settings?: Record<string, unknown> }),
  }),
});

// The Old System's "Finance Settings - Cash categories": the list an expense is
// filed under. Stored on the finance-settings sub-section's own settings object.
export const DEFAULT_CASH_CATEGORIES = ["Materials", "Transport", "Accommodation", "Fuel", "Tools", "Other"];

export function readCashCategories(settingsSection: { settings?: Record<string, unknown> } | null | undefined): string[] {
  const raw = settingsSection?.settings?.cashCategories;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of Array.isArray(raw) ? raw : []) {
    const t = String(v ?? "").trim().slice(0, 80);
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
  }
  return out.length ? out : [...DEFAULT_CASH_CATEGORIES];
}

export async function saveFinanceSettings(ctx: FinanceContext, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "finance.settings.edit");
  if (denied) return denied;

  const { studio, settingsSection } = ctx;
  const next = { ...(settingsSection.settings || {}) };
  if (body?.cashCategories !== undefined) {
    next.cashCategories = readCashCategories({ settings: { cashCategories: body.cashCategories } });
  }
  const updated = await updateSection(studio.id, settingsSection.id, { settings: next });
  return updated ? { cashCategories: readCashCategories({ settings: next }) } : { error: "notfound" };
}

// ---- money -----------------------------------------------------------------
// One place computes an invoice's numbers, so the list, the detail and the
// totals can never disagree.
// Takes the minimal shape it reads — lines, a VAT rate, payments — so both an
// Invoice and a Bill (which share exactly those) total through the one function.
export function invoiceTotals(invoice: { lines?: unknown; vatRate?: unknown; payments?: unknown } | null | undefined) {
  const lines = Array.isArray(invoice?.lines) ? invoice.lines : [];
  const subtotal = round(lines.reduce(
    (sum: number, l: Record<string, unknown>) => sum + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0),
    0,
  ));
  const vat = round(subtotal * ((Number(invoice?.vatRate) || 0) / 100));
  const total = round(subtotal + vat);
  const paid = round((Array.isArray(invoice?.payments) ? invoice.payments : [])
    .reduce((s: number, p: Record<string, unknown>) => s + (Number(p.amount) || 0), 0));
  return { subtotal, vat, total, paid, outstanding: round(Math.max(0, total - paid)) };
}

// "Paid" is a consequence of the payments, never an assertion. A cancelled
// invoice stays cancelled; a draft stays a draft until it is issued.
function statusFor(
  invoice: Invoice,
  totals: { total: number; paid: number; outstanding: number },
) {
  if (invoice.status === "Cancelled" || invoice.status === "Draft") return invoice.status;
  return totals.paid >= totals.total && totals.total > 0 ? "Paid" : "Sent";
}

// ---- invoices --------------------------------------------------------------
export async function listInvoices({ studio, cashSection }: Pick<FinanceContext, "studio" | "cashSection">) {
  const [invoices, projects] = await Promise.all([
    Invoices.find({ studio, section: cashSection }),
    projectRows({ studio }),
  ]);
  const projectNumber = Object.fromEntries(projects.map((p) => [p.id, p.number]));

  const today = new Date().toISOString().slice(0, 10);
  return [...invoices]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .map((inv) => {
      const totals = invoiceTotals(inv);
      const status = statusFor(inv, totals);
      return {
        ...inv, ...totals, status,
        projectNumber: projectNumber[inv.projectId] || "",
        // Overdue is derived from the due date, so it is never a stale flag.
        overdue: status === "Sent" && !!inv.dueDate && inv.dueDate < today,
      };
    });
}

export async function createInvoice(ctx: FinanceContext, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "finance.cash.create");
  if (denied) return denied;

  const { studio, cashSection, collaborator } = ctx;
  const projectId = str(body?.projectId, 60);
  let clientName = str(body?.clientName, 160);

  if (projectId) {
    const projects = await projectRows(ctx);
    const project = projects.find((p) => p.id === projectId);
    if (!project) return { error: "project" };
    // Snapshot the client, so the invoice still reads correctly if the project
    // is edited later.
    clientName = clientName || String(project.clientName || "");
  }
  if (!clientName) return { error: "client" };

  const lines = cleanLines(body?.lines);
  if (!lines.length) return { error: "lines" };

  const invoices = await Invoices.find({ studio, section: cashSection });
  const today = new Date().toISOString().slice(0, 10);
  const invoice = await Invoices.create({ studio, section: cashSection }, {
    // Derived from the highest INV already issued, never from how many exist:
    // deleting a draft must not hand its number to the next invoice, and two
    // raised at once must not both be INV-0004. See modules/main/references.js.
    reference: await nextReference(studio.id, { rows: invoices, field: "reference", prefix: "INV" }),
    projectId, clientName,
    lines,
    vatRate: body?.vatRate === undefined ? DEFAULT_VAT_RATE : Math.max(0, Math.min(100, Number(body.vatRate) || 0)),
    status: "Draft",
    issueDate: day(body?.issueDate) || today,
    dueDate: day(body?.dueDate),
    notes: str(body?.notes, 2000),
    payments: [],
    createdByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
  });
  // THE INVOICE JOINS THE DEAL IT BILLS. Resolved from the PROJECT — an invoice
  // carries no ticket or quotation of its own, and the project already knows
  // which engagement it belongs to. An invoice raised with no project (a
  // studio-level bill) simply does not attach, which is the honest end state:
  // there is no deal to put it in. Best-effort by construction — see
  // attachToProjectEngagement — so billing never fails because an index did.
  await attachToProjectEngagement(studio.id, "invoice", invoice.id, projectId, invoice.createdAt as string);
  return { invoice: { ...invoice, ...invoiceTotals(invoice) } };
}

export async function editInvoice(ctx: FinanceContext, id: string, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "finance.cash.edit");
  if (denied) return denied;

  const { studio, cashSection } = ctx;
  const invoices = await Invoices.find({ studio, section: cashSection });
  const current = invoices.find((i) => i.id === id);
  if (!current) return { error: "notfound" };

  const patch: Record<string, unknown> = {};

  if (body?.status !== undefined) {
    if (!INVOICE_STATUSES.includes(String(body.status))) return { error: "status" };
    // Paid follows the payments — you record money, you don't declare it.
    if (body.status === "Paid") return { error: "derived-status" };
    if (body.status === "Cancelled" && (current.payments || []).length) return { error: "has-payments" };
    patch.status = String(body.status);
  }

  // An invoice that has left the building is frozen. Changing what a client was
  // billed after the fact is how records stop matching reality.
  const issued = current.status !== "Draft";
  if (body?.lines !== undefined) {
    if (issued) return { error: "issued" };
    const lines = cleanLines(body.lines);
    if (!lines.length) return { error: "lines" };
    patch.lines = lines;
  }
  if (body?.vatRate !== undefined) {
    if (issued) return { error: "issued" };
    patch.vatRate = Math.max(0, Math.min(100, Number(body.vatRate) || 0));
  }
  if (body?.projectId !== undefined) {
    if (issued) return { error: "issued" };
    const projectId = str(body.projectId, 60);
    if (projectId) {
      const projects = await projectRows(ctx);
      if (!projects.some((p) => p.id === projectId)) return { error: "project" };
    }
    patch.projectId = projectId;
  }
  if (body?.dueDate !== undefined) patch.dueDate = day(body.dueDate);
  if (body?.issueDate !== undefined) patch.issueDate = day(body.issueDate);
  if (body?.notes !== undefined) patch.notes = str(body.notes, 2000);

  const updated = await Invoices.update({ studio, section: cashSection }, id, patch);
  return updated ? { invoice: { ...updated, ...invoiceTotals(updated) } } : { error: "notfound" };
}

// Recording a payment is append-only: the history of what was received, and
// when, is what makes the balance defensible.
export async function recordPayment(ctx: FinanceContext, id: string, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "finance.cash.edit");
  if (denied) return denied;

  const { studio, cashSection, collaborator } = ctx;
  const invoices = await Invoices.find({ studio, section: cashSection });
  const invoice = invoices.find((i) => i.id === id);
  if (!invoice) return { error: "notfound" };
  if (invoice.status === "Draft") return { error: "not-issued" };
  if (invoice.status === "Cancelled") return { error: "cancelled" };

  const amount = cash(body?.amount);
  if (!amount) return { error: "amount" };

  const totals = invoiceTotals(invoice);
  // Overpayment is refused rather than absorbed — it means something is wrong
  // with the invoice or the payment, and a human should decide which.
  if (amount > totals.outstanding) return { error: "overpayment", outstanding: totals.outstanding };

  const payments = [...(invoice.payments || []), {
    id: `pay${(invoice.payments || []).length + 1}`,
    amount,
    date: day(body?.date) || new Date().toISOString().slice(0, 10),
    method: PAYMENT_METHODS.includes(String(body?.method)) ? String(body?.method) : PAYMENT_METHODS[0],
    reference: str(body?.reference, 120),
    byCollaboratorId: collaborator.id,
  }];

  const updated = await Invoices.update({ studio, section: cashSection }, id, { payments });
  // The invoice was read before the write, so it can be gone by the time the
  // compare-and-set lands. Every other writer here answers "notfound" for that;
  // this one used to spread a null and then read `.status` off it.
  if (!updated) return { error: "notfound" };
  const after = invoiceTotals(updated);
  return { invoice: { ...updated, ...after, status: statusFor(updated, after) } };
}

// Only a draft can be deleted. Once issued it is part of the record — cancel it.
export async function removeInvoice(ctx: FinanceContext, id: string) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "finance.cash.delete");
  if (denied) return denied;

  const { studio, cashSection } = ctx;
  const invoices = await Invoices.find({ studio, section: cashSection });
  const invoice = invoices.find((i) => i.id === id);
  if (!invoice) return { error: "notfound" };
  if (invoice.status !== "Draft") return { error: "issued" };

  // ENGAGEMENT STATE COMES OFF FIRST, THE ROW SECOND — the recoverable
  // direction, and the mirror of the attach in createInvoice. The other order
  // leaves the deal's member set naming an invoice that no longer exists, which
  // the engagements card renders as "Invoice · present · 1" with a blank
  // reference and nothing ever heals.
  await detachFromItsEngagement(studio.id, "invoice", id);

  const removed = await Invoices.remove({ studio, section: cashSection }, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// ---- expenses --------------------------------------------------------------
export async function listExpenses({ studio, cashSection }: Pick<FinanceContext, "studio" | "cashSection">) {
  const [expenses, projects, people] = await Promise.all([
    Expenses.find({ studio, section: cashSection }),
    projectRows({ studio }),
    listCollaborators(studio.id),
  ]);
  const projectNumber = Object.fromEntries(projects.map((p) => [p.id, p.number]));
  const alias = Object.fromEntries(people.map((c) => [c.id, c.alias || "Unnamed"]));

  return [...expenses]
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .map((e) => ({
      ...e,
      projectNumber: projectNumber[e.projectId || ""] || "",
      paidByAlias: alias[e.paidByCollaboratorId || ""] || "",
    }));
}

export async function createExpense(ctx: FinanceContext, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "finance.cash.create");
  if (denied) return denied;

  const { studio, cashSection, collaborator } = ctx;
  const amount = cash(body?.amount);
  if (!amount) return { error: "amount" };

  const projectId = str(body?.projectId, 60);
  if (projectId) {
    const projects = await projectRows(ctx);
    if (!projects.some((p) => p.id === projectId)) return { error: "project" };
  }

  const expenses = await Expenses.find({ studio, section: cashSection });
  const expense = await Expenses.create({ studio, section: cashSection }, {
    reference: await nextReference(studio.id, { rows: expenses, field: "reference", prefix: "EXP" }),
    description: str(body?.description, 300),
    category: EXPENSE_CATEGORIES.includes(String(body?.category)) ? String(body?.category) : "Other",
    amount,
    date: day(body?.date) || new Date().toISOString().slice(0, 10),
    projectId,
    paidByCollaboratorId: str(body?.paidByCollaboratorId, 60) || collaborator.id,
    notes: str(body?.notes, 1000),
    createdByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
  });
  return { expense };
}

export async function editExpense(ctx: FinanceContext, id: string, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "finance.cash.edit");
  if (denied) return denied;

  const { studio, cashSection } = ctx;
  const patch: Record<string, unknown> = {};
  if (body?.amount !== undefined) { const v = cash(body.amount); if (!v) return { error: "amount" }; patch.amount = v; }
  if (body?.description !== undefined) patch.description = str(body.description, 300);
  if (body?.category !== undefined && EXPENSE_CATEGORIES.includes(String(body.category))) patch.category = String(body.category);
  if (body?.date !== undefined) patch.date = day(body.date);
  if (body?.notes !== undefined) patch.notes = str(body.notes, 1000);
  if (body?.paidByCollaboratorId !== undefined) patch.paidByCollaboratorId = str(body.paidByCollaboratorId, 60);
  if (body?.projectId !== undefined) {
    const projectId = str(body.projectId, 60);
    if (projectId) {
      const projects = await projectRows(ctx);
      if (!projects.some((p) => p.id === projectId)) return { error: "project" };
    }
    patch.projectId = projectId;
  }

  const expense = await Expenses.update({ studio, section: cashSection }, id, patch);
  return expense ? { expense } : { error: "notfound" };
}

export async function removeExpense(ctx: FinanceContext, id: string) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "finance.cash.delete");
  if (denied) return denied;

  const removed = await Expenses.remove({ studio: ctx.studio, section: ctx.cashSection }, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// ---- profitability ---------------------------------------------------------
// Per project: what it was sold for, what has been billed and collected, and
// what it has cost. Recomputed on every read from the sections that own each
// number, so Finance never holds a stale copy of anyone else's data.
export async function profitability(
  ctx: FinanceContext,
  { invoices, expenses }: { invoices: InvoiceView[]; expenses: Expense[] },
) {
  const [projects, orders, people] = await Promise.all([projectRows(ctx), orderRows(ctx), listCollaborators(ctx.studio.id)]);
  const alias = Object.fromEntries(people.map((c) => [c.id, c.alias || "Unnamed"]));

  return projects.map((p) => {
    // Each of these is an edge, and the RULE each carries — that cancelled
    // invoices and cancelled orders do not count — is declared on the edge in
    // platform/relations.js rather than repeated here. Expenses have no such rule,
    // which is now visible in the declaration instead of being an absence
    // somebody has to notice in a filter.
    const of = (node: string, rows: Row[]) => traverseIn("project", p, node, { rows: { [node]: rows } }).records;

    // `traverseIn` walks plain rows, so what comes back is the graph's Row —
    // narrowed here because these two totals are the whole point of the call.
    const mine = of("invoice", invoices) as Invoice[];
    const invoiced = round(mine.reduce((s, i) => s + (i.total || 0), 0));
    const collected = round(mine.reduce((s, i) => s + (i.paid || 0), 0));

    // Two more walks over plain graph rows. `lines` on a material order belongs
    // to Inventory's record rather than Finance's, which is why it is read
    // structurally here instead of being given a name this module would own.
    type OrderLine = { qty?: unknown; unitPrice?: unknown };
    const materials = round((of("materialOrder", orders) as { lines?: OrderLine[] }[])
      .reduce((s, o) => s + (o.lines || []).reduce((n, l) => n + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0), 0), 0));
    const booked = round((of("expense", expenses) as Expense[]).reduce((s, e) => s + (Number(e.amount) || 0), 0));
    const cost = round(materials + booked);
    const value = round(p.value);

    return {
      id: p.id, number: p.number, title: p.title || "", clientName: p.clientName || "", stage: p.stage,
      // The commercial identifiers Finance works by. `quotationNumber` comes
      // from the quotation the project opened from; the other two are Finance's
      // own and are entered here — see setCommercials.
      quotationNumber: p.quotationNumber || "",
      poNumber: p.poNumber || "",
      // THE PROJECT'S NUMBER IS `number`. This used to read a SECOND field of
      // its own, `projectNumber`, which is what setCommercials was writing —
      // so Finance issued a number into a field nothing else read, and Projects
      // and the sheets went on showing none. Same field for everybody now.
      projectNumber: p.number || "",
      managerAlias: alias[String(p.managerCollaboratorId || "")] || "",
      location: p.location || "",
      endDate: p.endDate || "",
      value, invoiced, collected, materials, expenses: booked, cost,
      margin: round(value - cost),
      marginPct: value > 0 ? Math.round(((value - cost) / value) * 100) : 0,
      uninvoiced: round(Math.max(0, value - invoiced)),
    };
  }).sort((a, b) => (b.value || 0) - (a.value || 0));
}

// ---- shared ----------------------------------------------------------------
export function cleanLines(list: unknown): InvoiceLine[] {
  return (Array.isArray(list) ? list : [])
    .map((l) => ({
      description: str(l?.description, 300),
      qty: Number(l?.qty) > 0 ? Math.round(Number(l.qty) * 1000) / 1000 : 0,
      unitPrice: cash(l?.unitPrice),
    }))
    .filter((l) => l.description && l.qty > 0)
    .slice(0, 200);
}

// Projects and purchase orders live in other sections. They're read directly:
// Finance needs to name them and cost them, which is not the same as being
// allowed to open those screens — the links to them stay permission-gated.
// Cross-section reads resolve the sub-section that OWNS the collection, falling
// back to the parent so a studio predating the sub-section model still works.
async function ownerOf(studioId: string, childKey: string, parentKey: string) {
  return (await getSectionByKey(studioId, childKey)) || (await getSectionByKey(studioId, parentKey));
}

async function projectRows({ studio }: Pick<FinanceContext, "studio">) {
  const owner = await ownerOf(studio.id, "projects-list", "projects");
  if (!owner) return [];
  return Projects.find({ studio, section: owner });
}

async function orderRows({ studio }: Pick<FinanceContext, "studio">) {
  const owner = await ownerOf(studio.id, "inventory-sheets", "inventory");
  if (!owner) return [];
  return Orders.find({ studio, section: owner });
}

export async function billableProjects(ctx: FinanceContext) {
  const rows = await projectRows(ctx);
  return rows.map((p) => ({ id: p.id, number: p.number, title: p.title || "", clientName: p.clientName || "" }));
}

// ISSUING THE PROJECT NUMBER IS FINANCE'S, and the PO number with it — in the
// Old System, Management issues the PO number and Finance enters the project
// number, and neither is Delivery's to set. So both are written here, behind
// Finance's Manage grant, and the Projects screen never offers them. Nothing
// else on the project can be touched from this route: a Finance grant is not a
// licence to rename somebody's project.
//
// IT WRITES `number`, WHICH IS THE PROJECT'S NUMBER. It used to write a field
// called `projectNumber` — a second name for the same thing, on the same row,
// that only Finance ever read. So a number entered here was invisible in
// Projects and on every sheet, which is exactly what it looked like: assigned,
// and nowhere. One field, one writer's two doors: this one, and Finance signing
// the PO task, which issues the next number automatically.
//
// UNIQUE, because a project number is quoted on invoices and delivery notes and
// two projects sharing one is not a cosmetic problem.
export async function setCommercials(ctx: FinanceContext, id: string, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "finance.cash.edit");
  if (denied) return denied;

  const { studio } = ctx;
  const owner = await ownerOf(studio.id, "projects-list", "projects");
  if (!owner) return { error: "no-projects" };

  const rows = await Projects.find({ studio, section: owner });
  if (!rows.some((p) => p.id === id)) return { error: "notfound" };

  const patch: Record<string, unknown> = {};
  if (body?.poNumber !== undefined) patch.poNumber = str(body.poNumber, 60);
  if (body?.projectNumber !== undefined) {
    const number = str(body.projectNumber, 60);
    if (number && rows.some((p) => p.id !== id && String(p.number || "").toLowerCase() === number.toLowerCase())) {
      return { error: "duplicate" };
    }
    patch.number = number;
  }
  if (Object.keys(patch).length === 0) return { error: "nothing" };

  const project = await Projects.update({ studio, section: owner }, id, patch);
  return project ? { project } : { error: "notfound" };
}

// Headline numbers for the whole studio.
export function summarise(invoices: InvoiceView[], expenses: Expense[]) {
  const live = invoices.filter((i) => i.status !== "Cancelled" && i.status !== "Draft");
  return {
    invoiced: round(live.reduce((s, i) => s + i.total, 0)),
    collected: round(live.reduce((s, i) => s + i.paid, 0)),
    outstanding: round(live.reduce((s, i) => s + i.outstanding, 0)),
    overdue: round(invoices.filter((i) => i.overdue).reduce((s, i) => s + i.outstanding, 0)),
    expenses: round(expenses.reduce((s, e) => s + e.amount, 0)),
  };
}
