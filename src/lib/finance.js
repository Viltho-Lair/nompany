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

import { getSectionByKey, readCol, addRow, updateRow, deleteRow, updateSection, listGrants, listSections } from "@/lib/data/sections";
import { studioContext, canViewSection, canManageSection, sectionNav } from "@/lib/studios";
import { listCollaborators } from "@/lib/data/collaborators";
import { currentUser } from "@/lib/identity";

const INVOICES = "invoices";
const EXPENSES = "expenses";
const PROJECTS = "projects";
const ORDERS = "materialOrders";

export const INVOICE_STATUSES = ["Draft", "Sent", "Paid", "Cancelled"];
export const EXPENSE_CATEGORIES = [
  "Materials", "Subcontractor", "Transport", "Travel", "Salaries",
  "Rent", "Utilities", "Software", "Equipment", "Fees", "Other",
];
export const PAYMENT_METHODS = ["Bank transfer", "Cash", "Card", "Cheque", "Other"];
export const DEFAULT_VAT_RATE = 15;

const str = (v, max = 300) => String(v ?? "").trim().slice(0, max);
const day = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "").trim()) ? String(v).trim() : "");
const cash = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0; };
const round = (n) => Math.round((Number(n) || 0) * 100) / 100;

export async function financeContext(user, slug) {
  const context = await studioContext(user, slug);
  if (context.error) return context;
  const { studio, collaborator } = context;

  const [grants, sections] = await Promise.all([listGrants(studio.id), listSections(studio.id)]);
  const byKey = Object.fromEntries(sections.map((x) => [x.key, x]));
  const section = byKey["finance"];
  if (!section) return { error: "no-section" };
  if (!canViewSection(studio, collaborator, section.id, grants)) return { error: "forbidden" };

  // Cash owns the money rows; Settings owns the categories they are filed under.
  const cashSection = byKey["finance-cash"] || section;
  const settingsSection = byKey["finance-settings"] || section;
  const projectsListSection = byKey["projects-list"] || byKey["projects"] || null;
  const sheetsSection = byKey["inventory-sheets"] || byKey["inventory"] || null;

  return {
    studio, collaborator, section, cashSection, settingsSection, projectsListSection, sheetsSection,
    canManage: canManageSection(studio, collaborator, section.id, grants),
    canManageCash: canManageSection(studio, collaborator, cashSection.id, grants),
    canManageSettings: canManageSection(studio, collaborator, settingsSection.id, grants),
    cashCategories: readCashCategories(settingsSection),
    nav: sectionNav(studio, collaborator, sections, grants),
  };
}

// The Old System's "Finance Settings - Cash categories": the list an expense is
// filed under. Stored on the finance-settings sub-section's own settings object.
export const DEFAULT_CASH_CATEGORIES = ["Materials", "Transport", "Accommodation", "Fuel", "Tools", "Other"];

export function readCashCategories(settingsSection) {
  const raw = settingsSection?.settings?.cashCategories;
  const out = [];
  const seen = new Set();
  for (const v of Array.isArray(raw) ? raw : []) {
    const t = String(v ?? "").trim().slice(0, 80);
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
  }
  return out.length ? out : [...DEFAULT_CASH_CATEGORIES];
}

export async function saveFinanceSettings(ctx, body) {
  const { studio, settingsSection } = ctx;
  const next = { ...(settingsSection.settings || {}) };
  if (body?.cashCategories !== undefined) {
    next.cashCategories = readCashCategories({ settings: { cashCategories: body.cashCategories } });
  }
  const updated = await updateSection(studio.id, settingsSection.id, { settings: next });
  return updated ? { cashCategories: readCashCategories({ settings: next }) } : { error: "notfound" };
}

export async function financeGuard(paramsPromise, { write } = {}) {
  const user = await currentUser();
  if (!user) return { fail: Response.json({ error: "unauthorized" }, { status: 401 }) };
  const { slug } = await paramsPromise;
  const fin = await financeContext(user, slug);
  if (fin.error) {
    const status = fin.error === "notfound" || fin.error === "no-section" ? 404 : 403;
    return { fail: Response.json({ error: fin.error }, { status }) };
  }
  if (write && !fin.canManage) return { fail: Response.json({ error: "read-only" }, { status: 403 }) };
  return fin;
}

// ---- money -----------------------------------------------------------------
// One place computes an invoice's numbers, so the list, the detail and the
// totals can never disagree.
export function invoiceTotals(invoice) {
  const lines = Array.isArray(invoice?.lines) ? invoice.lines : [];
  const subtotal = round(lines.reduce((sum, l) => sum + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0), 0));
  const vat = round(subtotal * ((Number(invoice?.vatRate) || 0) / 100));
  const total = round(subtotal + vat);
  const paid = round((Array.isArray(invoice?.payments) ? invoice.payments : []).reduce((s, p) => s + (Number(p.amount) || 0), 0));
  return { subtotal, vat, total, paid, outstanding: round(Math.max(0, total - paid)) };
}

// "Paid" is a consequence of the payments, never an assertion. A cancelled
// invoice stays cancelled; a draft stays a draft until it is issued.
function statusFor(invoice, totals) {
  if (invoice.status === "Cancelled" || invoice.status === "Draft") return invoice.status;
  return totals.paid >= totals.total && totals.total > 0 ? "Paid" : "Sent";
}

// ---- invoices --------------------------------------------------------------
export async function listInvoices({ studio, cashSection }) {
  const [invoices, projects] = await Promise.all([
    readCol(studio.id, cashSection.id, INVOICES),
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

export async function createInvoice(ctx, body) {
  const { studio, cashSection, collaborator } = ctx;
  const projectId = str(body?.projectId, 60);
  let clientName = str(body?.clientName, 160);

  if (projectId) {
    const projects = await projectRows(ctx);
    const project = projects.find((p) => p.id === projectId);
    if (!project) return { error: "project" };
    // Snapshot the client, so the invoice still reads correctly if the project
    // is edited later.
    clientName = clientName || project.clientName || "";
  }
  if (!clientName) return { error: "client" };

  const lines = cleanLines(body?.lines);
  if (!lines.length) return { error: "lines" };

  const invoices = await readCol(studio.id, cashSection.id, INVOICES);
  const today = new Date().toISOString().slice(0, 10);
  const invoice = await addRow(studio.id, cashSection.id, INVOICES, {
    reference: `INV-${String(invoices.length + 1).padStart(4, "0")}`,
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
  return { invoice: { ...invoice, ...invoiceTotals(invoice) } };
}

export async function editInvoice(ctx, id, body) {
  const { studio, cashSection } = ctx;
  const invoices = await readCol(studio.id, cashSection.id, INVOICES);
  const current = invoices.find((i) => i.id === id);
  if (!current) return { error: "notfound" };

  const patch = {};

  if (body?.status !== undefined) {
    if (!INVOICE_STATUSES.includes(body.status)) return { error: "status" };
    // Paid follows the payments — you record money, you don't declare it.
    if (body.status === "Paid") return { error: "derived-status" };
    if (body.status === "Cancelled" && (current.payments || []).length) return { error: "has-payments" };
    patch.status = body.status;
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

  const updated = await updateRow(studio.id, cashSection.id, INVOICES, id, patch);
  return updated ? { invoice: { ...updated, ...invoiceTotals(updated) } } : { error: "notfound" };
}

// Recording a payment is append-only: the history of what was received, and
// when, is what makes the balance defensible.
export async function recordPayment(ctx, id, body) {
  const { studio, cashSection, collaborator } = ctx;
  const invoices = await readCol(studio.id, cashSection.id, INVOICES);
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
    method: PAYMENT_METHODS.includes(body?.method) ? body.method : PAYMENT_METHODS[0],
    reference: str(body?.reference, 120),
    byCollaboratorId: collaborator.id,
  }];

  const updated = await updateRow(studio.id, cashSection.id, INVOICES, id, { payments });
  return { invoice: { ...updated, ...invoiceTotals(updated), status: statusFor(updated, invoiceTotals(updated)) } };
}

// Only a draft can be deleted. Once issued it is part of the record — cancel it.
export async function removeInvoice(ctx, id) {
  const { studio, cashSection } = ctx;
  const invoices = await readCol(studio.id, cashSection.id, INVOICES);
  const invoice = invoices.find((i) => i.id === id);
  if (!invoice) return { error: "notfound" };
  if (invoice.status !== "Draft") return { error: "issued" };

  const removed = await deleteRow(studio.id, cashSection.id, INVOICES, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// ---- expenses --------------------------------------------------------------
export async function listExpenses({ studio, cashSection }) {
  const [expenses, projects, people] = await Promise.all([
    readCol(studio.id, cashSection.id, EXPENSES),
    projectRows({ studio }),
    listCollaborators(studio.id),
  ]);
  const projectNumber = Object.fromEntries(projects.map((p) => [p.id, p.number]));
  const alias = Object.fromEntries(people.map((c) => [c.id, c.alias || "Unnamed"]));

  return [...expenses]
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .map((e) => ({
      ...e,
      projectNumber: projectNumber[e.projectId] || "",
      paidByAlias: alias[e.paidByCollaboratorId] || "",
    }));
}

export async function createExpense(ctx, body) {
  const { studio, cashSection, collaborator } = ctx;
  const amount = cash(body?.amount);
  if (!amount) return { error: "amount" };

  const projectId = str(body?.projectId, 60);
  if (projectId) {
    const projects = await projectRows(ctx);
    if (!projects.some((p) => p.id === projectId)) return { error: "project" };
  }

  const expenses = await readCol(studio.id, cashSection.id, EXPENSES);
  const expense = await addRow(studio.id, cashSection.id, EXPENSES, {
    reference: `EXP-${String(expenses.length + 1).padStart(4, "0")}`,
    description: str(body?.description, 300),
    category: EXPENSE_CATEGORIES.includes(body?.category) ? body.category : "Other",
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

export async function editExpense(ctx, id, body) {
  const { studio, cashSection } = ctx;
  const patch = {};
  if (body?.amount !== undefined) { const v = cash(body.amount); if (!v) return { error: "amount" }; patch.amount = v; }
  if (body?.description !== undefined) patch.description = str(body.description, 300);
  if (body?.category !== undefined && EXPENSE_CATEGORIES.includes(body.category)) patch.category = body.category;
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

  const expense = await updateRow(studio.id, cashSection.id, EXPENSES, id, patch);
  return expense ? { expense } : { error: "notfound" };
}

export async function removeExpense(ctx, id) {
  const removed = await deleteRow(ctx.studio.id, ctx.cashSection.id, EXPENSES, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// ---- profitability ---------------------------------------------------------
// Per project: what it was sold for, what has been billed and collected, and
// what it has cost. Recomputed on every read from the sections that own each
// number, so Finance never holds a stale copy of anyone else's data.
export async function profitability(ctx, { invoices, expenses }) {
  const [projects, orders] = await Promise.all([projectRows(ctx), orderRows(ctx)]);

  return projects.map((p) => {
    const mine = invoices.filter((i) => i.projectId === p.id && i.status !== "Cancelled");
    const invoiced = round(mine.reduce((s, i) => s + i.total, 0));
    const collected = round(mine.reduce((s, i) => s + i.paid, 0));

    const materials = round(orders
      .filter((o) => o.projectId === p.id && o.status !== "Cancelled")
      .reduce((s, o) => s + (o.lines || []).reduce((n, l) => n + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0), 0), 0));
    const booked = round(expenses.filter((e) => e.projectId === p.id).reduce((s, e) => s + e.amount, 0));
    const cost = round(materials + booked);
    const value = round(p.value);

    return {
      id: p.id, number: p.number, title: p.title || "", clientName: p.clientName || "", stage: p.stage,
      value, invoiced, collected, materials, expenses: booked, cost,
      margin: round(value - cost),
      marginPct: value > 0 ? Math.round(((value - cost) / value) * 100) : 0,
      uninvoiced: round(Math.max(0, value - invoiced)),
    };
  }).sort((a, b) => (b.value || 0) - (a.value || 0));
}

// ---- shared ----------------------------------------------------------------
function cleanLines(list) {
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
async function ownerOf(studioId, childKey, parentKey) {
  return (await getSectionByKey(studioId, childKey)) || (await getSectionByKey(studioId, parentKey));
}

async function projectRows({ studio }) {
  const owner = await ownerOf(studio.id, "projects-list", "projects");
  if (!owner) return [];
  return readCol(studio.id, owner.id, PROJECTS);
}

async function orderRows({ studio }) {
  const owner = await ownerOf(studio.id, "inventory-sheets", "inventory");
  if (!owner) return [];
  return readCol(studio.id, owner.id, ORDERS);
}

export async function billableProjects(ctx) {
  const rows = await projectRows(ctx);
  return rows.map((p) => ({ id: p.id, number: p.number, title: p.title || "", clientName: p.clientName || "" }));
}

// Headline numbers for the whole studio.
export function summarise(invoices, expenses) {
  const live = invoices.filter((i) => i.status !== "Cancelled" && i.status !== "Draft");
  return {
    invoiced: round(live.reduce((s, i) => s + i.total, 0)),
    collected: round(live.reduce((s, i) => s + i.paid, 0)),
    outstanding: round(live.reduce((s, i) => s + i.outstanding, 0)),
    overdue: round(invoices.filter((i) => i.overdue).reduce((s, i) => s + i.outstanding, 0)),
    expenses: round(expenses.reduce((s, e) => s + e.amount, 0)),
  };
}
