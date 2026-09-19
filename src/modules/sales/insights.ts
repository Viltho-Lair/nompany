// CUSTOMER INSIGHTS — the owner's buying-pattern analysis, on the studio's own
// records (19/09/2026). The arithmetic is ./insightsModel, pure; this file
// decides WHAT COUNTS AS A SALE, reads it, and acts on the answer.
//
// WHAT COUNTS AS A SALE, and why each source is where it is:
//
// - AN ISSUED INVOICE (Sent or Paid), less the credit notes issued against it.
//   This is the owner's own source — the Excel system stacked the month's
//   exported invoices. A draft has gone to nobody and a cancelled invoice sold
//   nothing. Dated by its issue date, because that is the month it belongs to.
// - A TILL RECEIPT THAT NAMES A CUSTOMER. A walk-in sale names nobody, and a
//   customer analysis can do nothing with a sale it cannot attribute — but it
//   still counts on the team scatter, which is about who SOLD.
// - WON DEALS feed the scatter only. A won deal is invoiced later, and counting
//   both would count the same money twice on the customer side.
//
// EVERY SOURCE ANSWERS TO ITS OWN SWITCH, not to where its rows are filed: an
// invoice is filed under Cash & Bank and belongs to Receivables, a receipt is
// filed under `crm-sales-pos` and belongs to Point of Sale. A part the studio
// switched off is not read, and the screen says which sources it used, because
// "no customers" and "nothing was read" are different sentences.
//
// MONEY IS THE STUDIO'S CURRENCY. A document in another currency converts at
// today's table; one the table cannot convert is left out and COUNTED, rather
// than added at a rate of one, which would put a dollar and a dirham on one
// axis and call it a customer's value.
import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { moduleContext } from "../context";
import { listCollaborators } from "@/platform/auth/collaborators";
import { getExchangeSnapshot } from "@/lib/data/exchangeRates";
import { crossRate } from "@/shared/currencies";
import { roundMoney } from "@/shared/money";
import { invoiceTotals } from "@/modules/finance/finance";
import { creditedSoFar } from "@/modules/finance/creditNotes";
import { toCsv } from "@/modules/inventory/itemImport";
import { notifyHolders } from "@/modules/people/holders";
import { NOTIFY } from "@/platform/notify/notifications";
import { insightsDict } from "@/shared/studio/customerInsights";
import type { Locale } from "@/shared/locale";
import { isClosed, isWon } from "./pipeline";
import { clientContacts, normaliseClientName } from "./salesClients";
import { quotedTotalFor, ticketValue, raiseLead, campaignById, campaignChoices } from "./sales";
import {
  analyse, movement, patternTotals, scatter, PERIOD_UNITS, MEASURES, PATTERNS, WINDOW,
  type PeriodUnit, type Measure, type Sale, type Credit, type Pattern,
} from "./insightsModel";
import type { ModuleContext } from "../context";
import type { Section } from "@/platform/db/sections";
import type { Client } from "./types";
import type { SalesTicket } from "./schema";
import type { Quotation } from "@/modules/technical/types";
import type { Invoice } from "@/modules/finance/types";
import type { PosReceipt, PosTerminal } from "./pos";
import type { Department } from "@/modules/administration/types";

export type InsightsContext = ModuleContext & {
  insightsSection: Section;
  ticketsSection: Section;
  clientsSection: Section;
  quotationsSection: Section | null;
  cashSection: Section | null;
  posSection: Section | null;
  campaignsSection: Section | null;
  masterSection: Section | null;
};

export const insightsContext = moduleContext<InsightsContext>({
  root: "crm-sales",
  sub: { insights: "crm-sales-insights", tickets: "crm-sales-tickets", clients: "crm-sales-clients" },
  // WHERE EACH SOURCE IS FILED, read with the studio's authority behind the
  // one right `crmSales.insights` — the owner's decision: the analysis is its
  // own grant, and holding it is holding a view of what each customer bought.
  foreign: {
    quotations: ["crm-sales-quotations", "crm-sales"],
    cash: ["finance-cash"],
    pos: ["crm-sales-pos"],
    campaigns: ["marketing-campaigns"],
    master: ["administration-master"],
  },
  flags: ["insights"],
});

const Clients = repo<Client>("salesClients");
const Tickets = repo<SalesTicket>("salesTickets");
const Quotations = repo<Quotation>("quotations");
const Invoices = repo<Invoice>("invoices");
const CreditNotes = repo<{ id: string; invoiceId: string; amount: number; status: string }>("creditNotes");
const Receipts = repo<PosReceipt>("posReceipts");
const Terminals = repo<PosTerminal>("posTerminals");
const Departments = repo<Department>("departments");

const may = (ctx: InsightsContext, key: Parameters<typeof requirePermission>[1]) => !requirePermission(ctx.access, key);
const str = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);
const today = () => new Date().toISOString().slice(0, 10);
/** Somebody who sold directly rather than through a campaign — a token, worded on the screen. */
export const DIRECT = "~direct";

/** The analysis's three knobs, each from a closed list so a query string cannot invent one. */
export function readOptions(q: { unit?: unknown; measure?: unknown; current?: unknown }) {
  const unit = (PERIOD_UNITS as readonly string[]).includes(String(q.unit)) ? String(q.unit) as PeriodUnit : "month";
  const measure = (MEASURES as readonly string[]).includes(String(q.measure)) ? String(q.measure) as Measure : "value";
  // THE OWNER'S ROUTINE LOOKED AT THE LAST COMPLETE MONTH, and a month three
  // days old reads every customer as slipping. So "this period so far" is the
  // choice somebody makes, and complete periods are the default.
  const current = q.current === true || q.current === "1" || q.current === "true";
  return { unit, measure, current };
}

type Customer = { key: string; name: string; clientId: string };

/**
 * EVERYTHING THE ANALYSIS READS, once. Customers are the studio's clients where
 * a sale can be matched to one — an invoice by the client's name, as Sales
 * spells it, a receipt by the client it names — and otherwise the name on the
 * invoice itself, so a company invoiced before anybody made it a client is
 * still somebody.
 */
async function gather(ctx: InsightsContext) {
  const { studio } = ctx;
  const base = String(studio.currency || "").toUpperCase();
  const reads = {
    invoices: Boolean(ctx.cashSection) && ctx.on("finance-receivables"),
    receipts: Boolean(ctx.posSection) && ctx.on("pos"),
    deals: ctx.on("crm-sales-tickets"),
  };
  const none = <T,>(): Promise<T[]> => Promise.resolve([]);
  const [clients, invoices, notes, receipts, terminals, tickets, quotations, team, departments] = await Promise.all([
    Clients.find({ studio, section: ctx.clientsSection }),
    reads.invoices ? Invoices.find({ studio, section: ctx.cashSection! }) : none<Invoice>(),
    reads.invoices ? CreditNotes.find({ studio, section: ctx.cashSection! }) : none<{ id: string; invoiceId: string; amount: number; status: string }>(),
    reads.receipts ? Receipts.find({ studio, section: ctx.posSection! }) : none<PosReceipt>(),
    reads.receipts ? Terminals.find({ studio, section: ctx.posSection! }) : none<PosTerminal>(),
    reads.deals ? Tickets.find({ studio, section: ctx.ticketsSection }) : none<SalesTicket>(),
    reads.deals && ctx.quotationsSection ? Quotations.find({ studio, section: ctx.quotationsSection }) : none<Quotation>(),
    listCollaborators(studio.id),
    ctx.masterSection ? Departments.find({ studio, section: ctx.masterSection }) : none<Department>(),
  ]);
  // THE RATE TABLE IS ASKED FOR ONLY WHEN SOMETHING IS FOREIGN — most studios
  // sell in one currency, and the table can mean a fetch.
  const foreign = (c: unknown) => Boolean(base && c && String(c).toUpperCase() !== base);
  const rates = [...invoices, ...receipts].some((d) => foreign(d.currency)) ? (await getExchangeSnapshot()).rates : null;
  let unconverted = 0;
  const inBase = (amount: number, currency: unknown): number | null => {
    const from = String(currency || "").toUpperCase();
    if (!base || !from || from === base) return amount;
    const rate = crossRate(rates, from, base);
    if (rate == null) { unconverted += 1; return null; }
    return roundMoney(amount * rate, base);
  };

  const clientById = new Map(clients.map((c) => [c.id, c]));
  const clientByName = new Map(clients.map((c) => [normaliseClientName(c.name), c]));
  const customers = new Map<string, Customer>();
  const customerFor = (clientId: string, name: string): string => {
    const client = (clientId && clientById.get(clientId)) || clientByName.get(normaliseClientName(name));
    const key = client ? client.id : `name:${normaliseClientName(name)}`;
    if (!customers.has(key)) customers.set(key, { key, name: client ? client.name : str(name, 160), clientId: client ? client.id : "" });
    return key;
  };

  const sales: Sale[] = [];
  for (const inv of invoices) {
    if (inv.status === "Draft" || inv.status === "Cancelled" || !str(inv.clientName)) continue;
    const currency = inv.currency || base;
    const gross = invoiceTotals(inv, base).total - creditedSoFar(notes, inv.id, currency);
    if (!(gross > 0)) continue;
    const value = inBase(gross, currency);
    if (value == null) continue;
    sales.push({ customer: customerFor("", inv.clientName), at: inv.issueDate || String(inv.createdAt || ""), value });
  }

  // WHO SOLD — for the scatter. A person is their alias, a team their department.
  const alias = new Map(team.map((c) => [String(c.id), String(c.alias || "")]));
  const deptOf = new Map(team.map((c) => [String(c.id), String((c as { departmentId?: unknown }).departmentId || "")]));
  const deptName = new Map(departments.map((d) => [d.id, d.name]));
  const teamOf = (collaboratorId: string) => deptName.get(deptOf.get(collaboratorId) || "") || "";
  const tillName = new Map(terminals.map((t) => [t.id, t.name]));
  const credits: Credit[] = [];

  for (const r of receipts) {
    if (r.status !== "Completed" || ((r as { kind?: string }).kind || "sale") !== "sale") continue;
    const value = inBase(Number(r.total) || 0, r.currency);
    if (value == null) continue;
    if (r.clientId && clientById.has(r.clientId)) sales.push({ customer: customerFor(r.clientId, ""), at: r.at, value });
    credits.push({
      person: alias.get(r.cashierCollaboratorId) || "",
      team: teamOf(r.cashierCollaboratorId),
      channel: tillName.get(r.terminalId) || "",
      at: r.at, value,
    });
  }

  const campaignName = new Map<string, string>();
  for (const t of tickets) {
    if (!isWon(t.status || "")) continue;
    const who = String(t.assignedToCollaboratorId || t.createdByCollaboratorId || "");
    const campaignId = String((t as { campaignId?: unknown }).campaignId || "");
    if (campaignId && !campaignName.has(campaignId)) campaignName.set(campaignId, "");
    credits.push({
      person: alias.get(who) || "",
      team: teamOf(who),
      channel: campaignId ? `campaign:${campaignId}` : DIRECT,
      at: String((t as { closedAt?: unknown }).closedAt || t.updatedAt || t.createdAt || ""),
      value: ticketValue(t, quotedTotalFor(t.id, quotations)),
    });
  }
  // A CAMPAIGN IS NAMED, not shown as an id. Read only when a won deal names one.
  if (campaignName.size && ctx.campaignsSection) {
    for (const id of campaignName.keys()) {
      const c = await campaignById(ctx, id, { anyStatus: true });
      if (c) campaignName.set(id, [c.reference, c.name].filter(Boolean).join(" · "));
    }
  }
  for (const c of credits) {
    if (c.channel.startsWith("campaign:")) c.channel = campaignName.get(c.channel.slice(9)) || DIRECT;
  }

  const openDeals = new Set(tickets.filter((t) => !isClosed(t.status || "")).map((t) => t.clientId));
  return { sales, credits, customers, clientById, openDeals, unconverted, reads, base };
}

/** The full analysis the screen draws — tiles, bands, every customer, and the scatter three ways. */
export async function customerInsights(ctx: InsightsContext, q: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "crmSales.insights.view");
  if (denied) return denied;
  const opts = readOptions(q);
  const asOf = today();
  const g = await gather(ctx);
  const now = analyse(g.sales, asOf, opts.unit, opts.measure, opts.current);
  const was = movement(g.sales, asOf, opts.unit, opts.measure, opts.current);
  const customers = now.customers
    .map((c) => {
      const who = g.customers.get(c.customer)!;
      const client = who.clientId ? g.clientById.get(who.clientId) : undefined;
      const contact = clientContacts(client)[0];
      return {
        key: c.customer,
        name: who.name,
        clientId: who.clientId,
        contact: contact ? { name: contact.name || "", phone: contact.phone || "", email: contact.email || "" } : null,
        openDeal: Boolean(who.clientId && g.openDeals.has(who.clientId)),
        count: c.count, value: c.value, blocks: c.blocks, levels: c.levels,
        pattern: c.pattern, signature: c.signature,
        was: was.get(c.customer) || null,
        totalValue: c.totalValue, totalCount: c.totalCount, lastSale: c.lastSale,
      };
    })
    .sort((a, b) => b.totalValue - a.totalValue || a.name.localeCompare(b.name));
  const canAct = may(ctx, "crmSales.insights.act") && ctx.on("crm-sales-tickets");
  return {
    asOf, ...opts,
    window: WINDOW,
    currency: g.base,
    periods: now.periods.map((p) => p.key),
    bands: now.bands,
    tiles: patternTotals(now.customers),
    customers,
    scatter: {
      person: scatter(g.credits, now.periods, "person"),
      team: scatter(g.credits, now.periods, "team"),
      channel: scatter(g.credits, now.periods, "channel"),
    },
    sources: g.reads,
    unconverted: g.unconverted,
    can: { export: may(ctx, "crmSales.insights.export"), act: canAct },
    // The open campaigns a send may name, for whoever may send.
    campaigns: canAct ? await campaignChoices(ctx) : [],
  };
}

/** The same rows as a file — the list a team works from, in the reader's language. */
export async function insightsCsv(ctx: InsightsContext, q: Record<string, unknown>, locale: Locale) {
  const denied = requirePermission(ctx.access, "crmSales.insights.export");
  if (denied) return denied;
  const result = await customerInsights(ctx, q);
  if ("error" in result) return result;
  const tr = insightsDict(locale);
  const only = str(q.pattern, 20);
  const rows = result.customers.filter((c) => !only || c.pattern === only);
  const head = [
    tr.colCustomer, tr.colPattern, tr.colSignature, tr.colWas,
    ...result.periods.map((p) => tr.periodLabel(p)),
    tr.colTotalValue, tr.colTotalCount, tr.colLastSale, tr.colContact, tr.colPhone, tr.colEmail,
  ];
  const series = (c: (typeof rows)[number]) => (result.measure === "count" ? c.count : c.value);
  return {
    csv: toCsv([head, ...rows.map((c) => [
      c.name, tr.pattern(c.pattern), c.signature, c.was ? tr.pattern(c.was) : "",
      ...series(c), c.totalValue, c.totalCount, c.lastSale,
      c.contact?.name || "", c.contact?.phone || "", c.contact?.email || "",
    ])]),
  };
}

/** The most customers one send may raise leads for — a batch, not a mailing list. */
export const ACT_LIMIT = 100;

/**
 * SEND CUSTOMERS TO SALES: one unassigned lead each, through the same door a
 * campaign uses (`raiseLead`), so each waits for a Sales manager to hand it to
 * an executive (docs/functionality/leads.md). The lead says why it exists —
 * the customer's pattern, their signature and what they bought — in the
 * sender's language, because a lead that only says "call them" is a lead that
 * gets the wrong call. A customer with a deal already open is SKIPPED and
 * counted: somebody is already talking to them.
 */
export async function sendToSales(ctx: InsightsContext, body: Record<string, unknown>, locale: Locale) {
  const denied = requirePermission(ctx.access, "crmSales.insights.act");
  if (denied) return denied;
  if (!ctx.on("crm-sales-tickets")) return { error: "no-sales" };
  const keys = [...new Set((Array.isArray(body?.customers) ? body.customers : []).map((k) => str(k, 200)).filter(Boolean))];
  if (!keys.length) return { error: "insights-none" };
  if (keys.length > ACT_LIMIT) return { error: "insights-too-many" };
  const campaignId = str(body?.campaignId, 80);
  const campaign = campaignId ? await campaignById(ctx, campaignId) : null;
  if (campaignId && !campaign) return { error: "campaign" };

  const result = await customerInsights(ctx, body);
  if ("error" in result) return result;
  const tr = insightsDict(locale);
  const byKey = new Map(result.customers.map((c) => [c.key, c]));
  const note = str(body?.note, 1000);
  let raised = 0;
  let skipped = 0;
  for (const key of keys) {
    const c = byKey.get(key);
    if (!c || c.openDeal) { skipped += 1; continue; }
    const lines = [
      note,
      tr.leadWhy(tr.pattern(c.pattern), c.signature, tr.unitWord(result.unit)),
      tr.leadFigures(c.totalCount, c.totalValue, result.currency, c.lastSale),
    ].filter(Boolean);
    const sent = await raiseLead(
      { studio: ctx.studio, ticketsSection: ctx.ticketsSection, clientsSection: ctx.clientsSection },
      {
        title: tr.leadTitle(tr.pattern(c.pattern), c.name),
        clientName: c.name, clientId: c.clientId,
        contactName: c.contact?.name || "", contactEmail: c.contact?.email || "", contactPhone: c.contact?.phone || "",
        description: lines.join("\n"),
        campaignId: campaign?.id || "",
        leadDeadlineHours: campaign?.leadDeadlineHours ?? null,
        raisedBy: ctx.collaborator.id,
        notify: false,
      },
    );
    if ("ticket" in sent && sent.ticket) raised += 1; else skipped += 1;
  }
  // ONE NOTICE FOR THE BATCH, not one per lead — forty buzzes for one decision
  // is how a bell stops being read.
  if (raised) {
    await notifyHolders(ctx.studio.id, "crmSales.tickets.assign", {
      type: NOTIFY.leadsWaiting,
      title: "New leads are waiting to be assigned",
      body: `${raised}`,
      params: { count: String(raised) },
      href: "crm-sales-tickets",
      tone: "warning",
    }, [ctx.collaborator.id]);
  }
  return { raised, skipped };
}

export type { Pattern };
export { PATTERNS };
