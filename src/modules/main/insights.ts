// WHAT NOVA SAYS BEFORE SHE IS ASKED.
//
// The launcher wears a badge for unread notifications; this is the sentence
// beside it. Every one of these is derived from the studio's OWN rows at read
// time — there is no stored feed, nothing is precomputed, and nothing here
// invents a figure. The landing page has four hand-written lines about resin
// suppliers and SKU-4471 (components/landing/sections/SmartInsights.js); this
// is the product's real one, and the difference has to stay visible in the
// code: if a row did not say it, Nova does not say it.
//
// THE ONE RULE THAT MATTERS, inherited from main.ts and not re-litigated here:
// A SECTION THE VIEWER CANNOT SEE IS NEVER READ. `readIfVisible` answers `null`
// rather than an empty list, so a department somebody was not granted produces
// no insight, no zero, and no round trip. Several families ALSO re-check their
// own leaf right before reading — the same coarse-gate tightening Nova's tools
// document (platform/nova/tools.ts): being able to open Finance is not being
// able to read what is owed.
//
// NO SENTENCES LEAVE THIS FILE. Each insight is a KIND plus its variables, and
// the words are built on display from the reader's own dictionary
// (shared/studio/misc.ts). That is the house rule for statuses and stages, and
// it holds harder here: a studio set to Arabic must not be handed English prose
// by an API, and a golden must not pin a language.

import { can } from "@/platform/access";
import type { PermissionKey } from "@/platform/access";
import { listCollaborators } from "@/platform/auth/collaborators";
import { listForCollaborator } from "@/platform/notify/notifications";
import { balances } from "@/modules/inventory/inventory";
import { permitState } from "@/modules/operations/operations";
import { invoiceTotals } from "@/modules/finance/finance";
import { expiringDocuments } from "@/modules/hr/hr";
import { readIfVisible, type MainContext } from "./main";
import { taskQueueFrom, taskAssigneesOf, type QueueItem } from "./awaiting";
import type { Task } from "@/modules/tasks/types";
import type { Permit } from "@/modules/operations/types";
import type { Movement } from "@/modules/inventory/types";
import type { Row } from "@/platform/db/store";

// THE WIRE SHAPE AND THE RANKING LIVE IN shared/studio/insights, not here. The
// bubble is a client component and has to import both; importing them from this
// file would drag `repo`, `redis` and the notification store into the browser
// bundle. Derivation stays server-side, which is the half that reads.
export type { Insight, InsightTone } from "@/shared/studio/insights";
export { departmentOf, rankForView } from "@/shared/studio/insights";

import type { Insight, InsightTone } from "@/shared/studio/insights";

// ---- the small shared arithmetic -------------------------------------------

const TONE_WEIGHT: Record<InsightTone, number> = { urgent: 300, warn: 200, info: 100 };

/** Whole days from `iso` to `todayISO`, positive when `iso` is in the past. */
export function daysSince(iso: unknown, todayISO: string): number | null {
  const a = Date.parse(`${String(iso || "").slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${todayISO}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86400000);
}

/** Whole days from today to `iso`, positive when `iso` is still ahead. */
export function daysUntil(iso: unknown, todayISO: string): number | null {
  const d = daysSince(iso, todayISO);
  return d === null ? null : -d;
}

/** One insight, with its weight taken from its tone unless it is nudged. */
function make(
  kind: string, tone: InsightTone, section: string, href: string | null,
  id: string, vars: Record<string, string | number>, nudge = 0,
): Insight {
  return { id: `${kind}:${id}`, kind, tone, section, href, vars, weight: TONE_WEIGHT[tone] + nudge };
}

/** How many others there are beyond the one being named. */
const more = (rows: unknown[]) => Math.max(0, rows.length - 1);

// ---- the pure derivations, one family per exported function -----------------
//
// Each takes rows and a date and returns insights. They are exported for the
// suite, which asserts the conditions that have been got wrong before — the
// reorder-level COMPARISON especially, which main.ts once shipped as "has a
// reorder level at all" and so told well-configured studios that everything
// they owned was running out.

type TaskRow = Row & { status?: string; dueDate?: string };

/** Tasks and decisions waiting on this person. */
export function taskInsights(queue: QueueItem[], todayISO: string): Insight[] {
  const out: Insight[] = [];
  const todo = queue.filter((q) => q.kind === "task");
  const approvals = queue.filter((q) => q.kind === "approval");

  // Overdue outranks merely waiting, and is drawn from the SAME queue rather
  // than from a second read — the board's own due date travels on the item.
  const overdue = todo
    .map((q) => ({ q, days: q.dueDate ? daysSince(q.dueDate, todayISO) : null }))
    .filter((x): x is { q: QueueItem; days: number } => x.days !== null && x.days > 0)
    .sort((a, b) => b.days - a.days);

  if (overdue.length) {
    const top = overdue[0];
    out.push(make("task.overdue", "urgent", "tasks", "tasks", top.q.id,
      { title: top.q.label, days: top.days, more: overdue.length - 1 }, 40));
  }
  if (approvals.length) {
    out.push(make("task.approval", "urgent", "tasks", "tasks", approvals[0].id,
      { title: approvals[0].label, more: more(approvals) }, 20));
  }
  // The plain queue, minus anything already said as overdue above.
  const plain = todo.filter((q) => !overdue.some((o) => o.q.id === q.id));
  if (plain.length) {
    out.push(make("task.awaiting", "warn", "tasks", "tasks", plain[0].id,
      { title: plain[0].label, more: more(plain) }));
  }
  return out;
}

type QuotationRow = Row & { number?: string; status?: string; items?: unknown; createdAt?: string };

/** How long a quotation may sit Sent before nobody is chasing it. */
export const QUOTATION_STALE_DAYS = 14;

/**
 * A quotation that cannot be sent, and one nobody answered.
 *
 * "No assigned items" is `items.length === 0` — the FLAT PRICED LIST the pricer
 * derives from the tables, which is what the document actually quotes. A
 * quotation with tables but no rows has no items either, and that is the point:
 * the number was issued and the work was never priced.
 */
export function quotationInsights(quotations: QuotationRow[], todayISO: string): Insight[] {
  const out: Insight[] = [];
  const empty = quotations.filter((q) => q.status === "Draft" && !(Array.isArray(q.items) && q.items.length));
  if (empty.length) {
    out.push(make("quotation.noItems", "warn", "technical-quotations", "technical-quotations",
      String(empty[0].id || ""), { number: String(empty[0].number || ""), more: more(empty) }, 30));
  }

  const stale = quotations
    .map((q) => ({ q, days: daysSince(q.createdAt, todayISO) }))
    .filter((x): x is { q: QuotationRow; days: number } =>
      x.q.status === "Sent" && x.days !== null && x.days >= QUOTATION_STALE_DAYS)
    .sort((a, b) => b.days - a.days);
  if (stale.length) {
    out.push(make("quotation.stale", "warn", "technical-quotations", "technical-quotations",
      String(stale[0].q.id || ""),
      { number: String(stale[0].q.number || ""), days: stale[0].days, more: more(stale) }));
  }
  return out;
}

type RfqRow = Row & {
  reference?: string; status?: string; quotationId?: string; ticketId?: string; createdAt?: string;
};

/** How long an RFQ may sit unpriced before it is worth mentioning. */
export const RFQ_UNQUOTED_DAYS = 3;

/** An RFQ nobody has turned into a quotation. */
export function rfqInsights(rfqs: RfqRow[], todayISO: string): Insight[] {
  const open = rfqs
    .map((r) => ({ r, days: daysSince(r.createdAt, todayISO) }))
    .filter((x): x is { r: RfqRow; days: number } =>
      !x.r.quotationId && x.r.status !== "Rejected" && x.r.status !== "Converted"
      && x.days !== null && x.days >= RFQ_UNQUOTED_DAYS)
    .sort((a, b) => b.days - a.days);
  if (!open.length) return [];
  return [make("rfq.unquoted", "warn", "technical-rfq", "technical-rfq", String(open[0].r.id || ""),
    { reference: String(open[0].r.reference || ""), days: open[0].days, more: more(open) })];
}

type TicketRow = Row & { ref?: string; status?: string; deadline?: string; clientName?: string };

/** A ticket's deadline is worth raising this far out. */
export const TICKET_DEADLINE_DAYS = 7;

// The three ways a ticket stops being live — the same trio main.ts's
// `openTickets` headline excludes, so the bubble and the tile agree.
const TICKET_CLOSED = new Set(["Closed Won", "Closed Lost", "Dropped"]);

/** Tickets with no RFQ behind them, and tickets running out of time. */
export function ticketInsights(tickets: TicketRow[], rfqs: RfqRow[] | null, todayISO: string): Insight[] {
  const out: Insight[] = [];
  const open = tickets.filter((t) => !TICKET_CLOSED.has(String(t.status || "")));

  // Only answerable when Technical is visible too. A `null` rfqs list means
  // "not yours to know", and "this ticket has no RFQ" would then be a claim
  // about a department the viewer was never granted.
  if (rfqs) {
    const covered = new Set(rfqs.map((r) => String(r.ticketId || "")));
    const bare = open.filter((t) => !covered.has(String(t.id || "")));
    if (bare.length) {
      out.push(make("ticket.noRfq", "info", "sales-tickets", "sales-tickets", String(bare[0].id || ""),
        { reference: String(bare[0].ref || ""), client: String(bare[0].clientName || ""), more: more(bare) }, 20));
    }
  }

  const near = open
    .map((t) => ({ t, days: daysUntil(t.deadline, todayISO) }))
    .filter((x): x is { t: TicketRow; days: number } =>
      Boolean(x.t.deadline) && x.days !== null && x.days <= TICKET_DEADLINE_DAYS)
    .sort((a, b) => a.days - b.days);
  if (near.length) {
    const top = near[0];
    out.push(make("ticket.deadline", top.days < 0 ? "urgent" : "warn", "sales-tickets", "sales-tickets",
      String(top.t.id || ""), { reference: String(top.t.ref || ""), days: top.days, more: more(near) }));
  }
  return out;
}

type ProjectRow = Row & { number?: string; title?: string; stage?: string; endDate?: string };
type InvoiceRow = Row & {
  reference?: string; status?: string; projectId?: string; dueDate?: string;
  issueDate?: string; createdAt?: string;
  lines?: unknown; vatRate?: unknown; payments?: unknown; clientName?: string;
};

/** How long a Draft invoice may sit before nobody has asked for the money. */
export const INVOICE_DRAFT_DAYS = 3;

/** A live project past its end date, and finished work nobody billed. */
export function projectInsights(
  projects: ProjectRow[], invoices: InvoiceRow[] | null, todayISO: string,
): Insight[] {
  const out: Insight[] = [];

  const late = projects
    .map((p) => ({ p, days: p.endDate ? daysSince(p.endDate, todayISO) : null }))
    .filter((x): x is { p: ProjectRow; days: number } =>
      x.p.stage !== "Completed" && x.days !== null && x.days > 0)
    .sort((a, b) => b.days - a.days);
  if (late.length) {
    out.push(make("project.overdue", "warn", "projects-list", "projects-list", String(late[0].p.id || ""),
      { number: String(late[0].p.number || ""), title: String(late[0].p.title || ""),
        days: late[0].days, more: more(late) }, 10));
  }

  // Needs BOTH sections. A `null` invoices list is "not yours to know", and
  // "this was never invoiced" would be a statement about Finance.
  if (invoices) {
    const billed = new Set(invoices.filter((i) => i.status !== "Cancelled").map((i) => String(i.projectId || "")));
    const unbilled = projects.filter((p) => p.stage === "Completed" && !billed.has(String(p.id || "")));
    if (unbilled.length) {
      out.push(make("project.uninvoiced", "warn", "projects-list", "projects-list", String(unbilled[0].id || ""),
        { number: String(unbilled[0].number || ""), title: String(unbilled[0].title || ""), more: more(unbilled) }, 25));
    }
  }
  return out;
}

type ItemRow = Row & { sku?: string; name?: string; reorderLevel?: unknown };

/**
 * WHAT IS ACTUALLY RUNNING OUT. On-hand is the SUM OF THE MOVEMENTS, never a
 * field on the item — `balances()` is the ledger's own arithmetic, and reading
 * it here is what keeps this agreeing with the Stock screen.
 *
 * The comparison is `onHand <= reorderLevel`, and only for items that HAVE a
 * level set. main.ts's headline once counted "has a reorder level" instead,
 * which told every properly configured catalogue that all of it was low.
 */
export function stockInsights(items: ItemRow[], onHand: Record<string, number>): Insight[] {
  const out: Insight[] = [];
  const watched = items.filter((i) => Number(i.reorderLevel) > 0);
  const level = (i: ItemRow) => Number(i.reorderLevel) || 0;
  const qty = (i: ItemRow) => onHand[String(i.id)] || 0;

  const gone = watched.filter((i) => qty(i) <= 0).sort((a, b) => qty(a) - qty(b));
  if (gone.length) {
    out.push(make("stock.out", "urgent", "inventory-items", "inventory-items", String(gone[0].id || ""),
      { name: String(gone[0].name || ""), sku: String(gone[0].sku || ""), more: more(gone) }, 10));
  }

  // Sorted by how far UNDER the line each one is, not by raw quantity — five of
  // something that wants fifty is more urgent than five of something that wants
  // six, and raw quantity puts them the other way round.
  const low = watched
    .filter((i) => qty(i) > 0 && qty(i) <= level(i))
    .sort((a, b) => (qty(a) - level(a)) - (qty(b) - level(b)));
  if (low.length) {
    out.push(make("stock.low", "warn", "inventory-items", "inventory-items", String(low[0].id || ""),
      { name: String(low[0].name || ""), sku: String(low[0].sku || ""),
        qty: qty(low[0]), level: level(low[0]), more: more(low) }));
  }
  return out;
}

/**
 * Money owed to the studio, and money it has not asked for.
 *
 * `invoiceTotals` is the same derivation the Finance screen and the daily notice
 * cron use — outstanding is total minus payments, recomputed, never a stored
 * `balance` field that could have drifted.
 */
export function invoiceInsights(invoices: InvoiceRow[], todayISO: string): Insight[] {
  const out: Insight[] = [];

  const overdue = invoices
    .filter((i) => i.status !== "Draft" && i.status !== "Cancelled" && i.status !== "Paid" && i.dueDate)
    .map((i) => ({ i, days: daysSince(i.dueDate, todayISO), owed: invoiceTotals(i).outstanding }))
    .filter((x): x is { i: InvoiceRow; days: number; owed: number } =>
      x.days !== null && x.days > 0 && x.owed > 0)
    .sort((a, b) => b.days - a.days);
  if (overdue.length) {
    const total = Math.round(overdue.reduce((s, x) => s + x.owed, 0) * 100) / 100;
    out.push(make("invoice.overdue", "urgent", "finance-cash", "finance-cash", String(overdue[0].i.id || ""),
      { reference: String(overdue[0].i.reference || ""), client: String(overdue[0].i.clientName || ""),
        days: overdue[0].days, amount: overdue[0].owed, total, more: more(overdue) }, 50));
  }

  const drafts = invoices
    .map((i) => ({ i, days: daysSince(i.createdAt || i.issueDate, todayISO) }))
    .filter((x): x is { i: InvoiceRow; days: number } =>
      x.i.status === "Draft" && x.days !== null && x.days >= INVOICE_DRAFT_DAYS)
    .sort((a, b) => b.days - a.days);
  if (drafts.length) {
    out.push(make("invoice.draft", "warn", "finance-cash", "finance-cash", String(drafts[0].i.id || ""),
      { reference: String(drafts[0].i.reference || ""), days: drafts[0].days, more: more(drafts) }));
  }
  return out;
}

type BillRow = InvoiceRow & { vendorName?: string };

/** Money the studio owes and has not paid. Same totals, other direction. */
export function billInsights(bills: BillRow[], todayISO: string): Insight[] {
  const overdue = bills
    .filter((b) => b.status !== "Draft" && b.status !== "Cancelled" && b.status !== "Paid" && b.dueDate)
    .map((b) => ({ b, days: daysSince(b.dueDate, todayISO), owed: invoiceTotals(b).outstanding }))
    .filter((x): x is { b: BillRow; days: number; owed: number } =>
      x.days !== null && x.days > 0 && x.owed > 0)
    .sort((a, b) => b.days - a.days);
  if (!overdue.length) return [];
  const total = Math.round(overdue.reduce((s, x) => s + x.owed, 0) * 100) / 100;
  return [make("bill.overdue", "urgent", "finance-payables", "finance-payables", String(overdue[0].b.id || ""),
    { reference: String(overdue[0].b.reference || ""), vendor: String(overdue[0].b.vendorName || ""),
      days: overdue[0].days, amount: overdue[0].owed, total, more: more(overdue) }, 30)];
}

/** Permits lapsed, and permits about to. `permitState` is the Operations rule. */
export function permitInsights(permits: Permit[], todayISO: string): Insight[] {
  const out: Insight[] = [];
  const label = (p: Permit) => String(p.reference || p.kind || "");

  const expired = permits.filter((p) => permitState(p, todayISO) === "Expired");
  if (expired.length) {
    out.push(make("permit.expired", "urgent", "operations", "operations", String(expired[0].id || ""),
      { reference: label(expired[0]), more: more(expired) }, 20));
  }
  const expiring = permits
    .filter((p) => permitState(p, todayISO) === "Expiring")
    .sort((a, b) => String(a.validTo || "").localeCompare(String(b.validTo || "")));
  if (expiring.length) {
    const days = daysUntil(expiring[0].validTo, todayISO) ?? 0;
    out.push(make("permit.expiring", "warn", "operations", "operations", String(expiring[0].id || ""),
      { reference: label(expiring[0]), days, more: more(expiring) }));
  }
  return out;
}

/** Identity documents about to lapse. `expiringDocuments` is the HR rule. */
export function documentInsights(people: Record<string, unknown>[], today: Date): Insight[] {
  const due = expiringDocuments(people, today);
  if (!due.length) return [];
  const top = due[0];
  return [make("hr.docExpiring", top.daysLeft <= 0 ? "urgent" : "warn", "hr-employees", "hr-employees",
    top.collaboratorId, { alias: top.alias, docKind: top.kind, days: top.daysLeft, more: more(due) }, 15)];
}

type VacationRow = Row & { status?: string; collaboratorId?: string; createdAt?: string };

/** Leave nobody has decided — only ever offered to somebody who may decide it. */
export function leaveInsights(vacations: VacationRow[], aliasById: Record<string, string>): Insight[] {
  const pending = vacations
    .filter((v) => String(v.status || "") === "Pending")
    .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  if (!pending.length) return [];
  return [make("hr.leavePending", "warn", "hr-employees", "hr-employees", String(pending[0].id || ""),
    { alias: aliasById[String(pending[0].collaboratorId || "")] || "", more: more(pending) })];
}

// ---- the read ---------------------------------------------------------------

/**
 * Like `readIfVisible`, but refusing on the LEAF right as well as on the
 * section — and refusing BEFORE the read, so a department somebody may open but
 * not read the contents of costs nothing. This is the coarse-gate tightening
 * platform/nova/tools.ts describes, applied to the same person's bubble.
 */
async function readIfAllowed<T extends Row = Row>(
  ctx: MainContext, key: string, fallbackKey: string | null,
  collection: string, permission: PermissionKey,
): Promise<T[] | null> {
  if (!can(ctx.access, permission)) return null;
  return readIfVisible<T>(ctx, key, fallbackKey, collection);
}

/** Capped here rather than at the route: a bubble says one thing at a time. */
export const INSIGHT_LIMIT = 20;

/**
 * EVERYTHING NOVA COULD SAY to this person right now, ordered by weight and
 * capped. It does not know which screen they are on, deliberately — the client
 * ranks with `rankForView`, so one read serves a whole session of navigation
 * instead of a fresh pass over the database per page.
 */
export async function studioInsights(ctx: MainContext): Promise<Insight[]> {
  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  const meId = String(ctx.collaborator.id);

  const [tasks, quotations, rfqs, tickets, projects, items, movements,
    invoices, bills, permits, vacations, people, notifications] = await Promise.all([
    readIfVisible<TaskRow>(ctx, "tasks", null, "tasks"),
    readIfVisible<QuotationRow>(ctx, "technical-quotations", "technical", "quotations"),
    readIfVisible<RfqRow>(ctx, "technical-rfq", "technical", "rfqs"),
    readIfVisible<TicketRow>(ctx, "sales-tickets", "sales", "salesTickets"),
    readIfVisible<ProjectRow>(ctx, "projects-list", "projects", "projects"),
    readIfVisible<ItemRow>(ctx, "inventory-items", "inventory", "inventoryItems"),
    // ON-HAND LIVES IN THE LEDGER, so somebody who may see the catalogue but not
    // the movements gets no stock insight rather than a wrong one — the same
    // pairing main.ts's `lowStock` headline makes.
    readIfVisible<Row>(ctx, "inventory-stock", "inventory", "inventoryStock"),
    readIfAllowed<InvoiceRow>(ctx, "finance-cash", "finance", "invoices", "finance.cash.view"),
    readIfAllowed<BillRow>(ctx, "finance-payables", "finance", "bills", "finance.payables.view"),
    readIfAllowed<Permit>(ctx, "operations", null, "permits", "operations.tracking.view"),
    // LEAVE IS OFFERED ONLY TO SOMEBODY WHO MAY DECIDE IT. `listVacations`
    // narrows by scope (mine / my department / all) and this reads the raw
    // collection, so the APPROVE right — not the view right — is what gates it:
    // "three requests are waiting" is a thing to say to an approver and an
    // over-share to everybody else.
    readIfAllowed<VacationRow>(ctx, "hr", null, "vacations", "hr.vacations.approve"),
    ctx.seen("hr-employees", "hr") && can(ctx.access, "hr.employees.view")
      ? listCollaborators(ctx.studio.id) : null,
    // Always: these are the caller's OWN, addressed to their CollaboratorID.
    listForCollaborator(String(ctx.studio.id), meId),
  ]);

  const out: Insight[] = [];

  if (tasks) out.push(...taskInsights(taskQueueFrom(tasks as Task[], taskAssigneesOf(ctx), meId), todayISO));
  if (quotations) out.push(...quotationInsights(quotations, todayISO));
  if (rfqs) out.push(...rfqInsights(rfqs, todayISO));
  if (tickets) out.push(...ticketInsights(tickets, rfqs, todayISO));
  if (projects) out.push(...projectInsights(projects, invoices, todayISO));
  if (items && movements) out.push(...stockInsights(items, balances(movements as unknown as Movement[])));
  if (invoices) out.push(...invoiceInsights(invoices, todayISO));
  if (bills) out.push(...billInsights(bills, todayISO));
  if (permits) out.push(...permitInsights(permits, todayISO));
  if (people) out.push(...documentInsights(people as unknown as Record<string, unknown>[], now));
  // NO SECOND READ FOR THE NAMES. Leave is gated on `hr.vacations.approve` and
  // the roll on `hr.employees.view`, so an approver who may not read the
  // employee roll reaches here with `people` null — and the request is still
  // worth announcing without a name attached. Fetching the roll anyway to fill
  // one in would be reading past the gate that just refused.
  if (vacations) {
    const aliasById = Object.fromEntries((people || []).map((c) => [c.id, c.alias || ""]));
    out.push(...leaveInsights(vacations, aliasById));
  }

  const unread = notifications.filter((n) => !n.readAt).length;
  if (unread > 0) {
    out.push(make("notifications.unread", "info", "main", null, String(unread), { n: unread }));
  }

  return out.sort((a, b) => b.weight - a.weight).slice(0, INSIGHT_LIMIT);
}
