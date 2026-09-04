// CUSTOMER 360 — one client, and everything the reader is entitled to know
// about them.
//
// Until now a client was a row in a list. `linkToClient` did not open anything:
// it appended `?client=<id>` and scrolled you to that row, so "what have we
// sold this company, what is open, what are we delivering" was a question you
// answered by opening four screens and filtering each one by hand.
//
// EVERY BLOCK IS GATED BY THE RIGHT THAT GOVERNS ITS OWN RECORDS, and a block
// the reader may not see is NOT READ AT ALL — it costs no round trip either.
// This is the engagement view's rule (§2.8: a record whose existence somebody
// may not know of must stay invisible to them) applied to a party instead of a
// deal. `crmSales.clients.view` opens the page; it does not open the contents.
//
// So two people can legitimately read the same customer differently, and the
// totals below differ with them. That is correct rather than a bug: each is
// told the truth about the part of this company they are entitled to see, and
// the alternative — one figure computed from records the reader cannot open —
// would leak the very thing the gate exists to hide.
import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { isClosed, isWon, weightedValue, enteredStageAt, daysSince, stageDef } from "./pipeline";
import { clientContacts, clientLocations } from "./salesClients";
import { approvedValueDelta } from "./changeOrders";
import type { SalesContext, Client } from "./types";
import type { SalesTicket } from "./schema";
import type { Contract } from "./contractSchema";
import type { ChangeOrder } from "./changeOrderSchema";
import type { Quotation } from "@/modules/technical/types";
import type { Project } from "@/modules/projects/types";
import type { Item } from "@/modules/inventory/types";

const Clients = repo<Client>("salesClients");
const Tickets = repo<SalesTicket>("salesTickets");
const Quotations = repo<Quotation>("quotations");
const Contracts = repo<Contract>("contracts");
const ChangeOrders = repo<ChangeOrder>("changeOrders");
const Projects = repo<Project>("projects");
// Registered Items, for naming a customer's rates and for the editor's picker.
const Items = repo<Item>("inventoryItems");

const num = (v: unknown) => (Number(v) > 0 ? Number(v) : 0);

export async function customerProfile(ctx: SalesContext, id: string) {
  const denied = requirePermission(ctx.access, "crmSales.clients.view");
  if (denied) return denied;

  const { studio, clientsSection, ticketsSection, quotationsSection, projectsSection, access } = ctx;

  const client = await Clients.byId({ studio, section: clientsSection }, id);
  if (!client) return { error: "notfound" };

  // WHAT MAY BE READ, decided before anything is. Each flag gates both the
  // query below and the block on the screen — a `false` means the reader is
  // shown no section at all rather than an empty one, because "no quotations"
  // and "no sight of quotations" are different sentences and only one of them
  // is true.
  const may = {
    deals: !requirePermission(access, "crmSales.tickets.view"),
    quotations: !requirePermission(access, "crmSales.quotations.view"),
    contracts: !requirePermission(access, "crmSales.contracts.view"),
    projects: !requirePermission(access, "projects.list.view"),
    // RATES ARE THE CLIENT'S OWN DATA, like their contacts and their sites, so
    // whoever may read the client may read what the client was promised — there
    // is no separate right and the page's own `crmSales.clients.view` covers it.
    // Changing one is editing the client, and answers to clients.edit; the
    // catalogue below is fetched only for somebody who may actually pick from it.
    editRates: !requirePermission(access, "crmSales.clients.edit"),
  };

  // WHERE IS DATA, NOT A PREDICATE — repo.find's declared vocabulary, so this
  // narrows to one client's rows the way a SQL WHERE will when the seam is
  // satisfied by Postgres rather than by a filter in memory.
  //
  // A SECTION MAY GENUINELY BE ABSENT. Sections are per-studio rows, so a
  // studio without Projects simply has no projects block — an empty result is
  // the honest answer, and offering an error would be inventing a fault.
  const byClient = { where: { clientId: id } };
  const [tickets, quotations, contracts, changeOrders, projects, items] = await Promise.all([
    may.deals && ticketsSection ? Tickets.find({ studio, section: ticketsSection }, byClient) : [],
    may.quotations && quotationsSection ? Quotations.find({ studio, section: quotationsSection }, byClient) : [],
    may.contracts && quotationsSection ? Contracts.find({ studio, section: quotationsSection }, byClient) : [],
    // NOT FILTERED BY CLIENT, because a change order does not name one — it
    // names the CONTRACT it varies. Fetched whole and grouped below against the
    // contracts already narrowed above, which is the only join that exists.
    may.contracts && quotationsSection ? ChangeOrders.find({ studio, section: quotationsSection }) : [],
    may.projects && projectsSection ? Projects.find({ studio, section: projectsSection }, byClient) : [],
    // THE CATALOGUE, for two jobs: naming the items this customer has rates on,
    // and offering the rest to whoever may add one. Read whenever the studio has
    // an Inventory section, because a rate whose item cannot be NAMED is a row
    // that reads "some item: 900", which is worse than not showing it.
    ctx.inventoryItemsSection
      ? Items.find({ studio, section: ctx.inventoryItemsSection })
      : [],
  ]);

  // The agreed rates, each carrying the name of what it prices and the numbers
  // it is to be judged against. `cost` and `sellPrice` sit beside the rate so a
  // reader can see what was given away without opening Inventory.
  const itemById = new Map<string, Item>(items.map((i) => [i.id, i] as const));
  const rates = (Array.isArray(client.rates) ? client.rates : [])
    .map((r) => {
      const item = itemById.get(r.itemId);
      return {
        itemId: r.itemId,
        name: item?.name || "",
        sku: item?.sku || "",
        unitPrice: Number(r.unitPrice) || 0,
        note: r.note || "",
        sellPrice: Number(item?.sellPrice) || 0,
        cost: Number(item?.unitCost) || 0,
      };
    })
    // AN ITEM THAT HAS SINCE BEEN DELETED still shows, named as missing rather
    // than dropped: cleanRates removes it on the next write, and silently
    // hiding a promise the studio made until then would be the wrong way round.
    .sort((a, b) => (a.name || "\uffff").localeCompare(b.name || "\uffff"));

  const nowMs = Date.now();
  const deals = tickets
    .map((t) => {
      const value = num(t.value);
      const probability = Number(t.probability) || 0;
      return {
        id: t.id,
        ref: t.ref || "",
        title: t.title || "",
        status: t.status || "",
        closed: isClosed(t.status || ""),
        won: isWon(t.status || ""),
        value,
        probability,
        // FORECAST, NOT MERELY OPEN. A held deal is live — it is not decided, so
        // it belongs in the open list — but it is not money anybody should be
        // counting on, at a probability nobody has revisited since it stalled.
        // The pipeline board draws exactly this line (its held column reports
        // "Not forecast" rather than a number), and the two screens use the
        // same words for the same figure or the words stop meaning anything.
        forecast: stageDef(t.status || "")?.kind === "open",
        weighted: stageDef(t.status || "")?.kind === "open" ? weightedValue(value, probability) : 0,
        deadline: t.deadline || "",
        lostReason: t.lostReason || "",
        closedAt: t.closedAt || "",
        days: daysSince(enteredStageAt(t), nowMs),
      };
    })
    // Newest activity first for the closed history; the open ones are sorted by
    // how long they have been stuck, the same way the pipeline board does it,
    // because the reason to open a customer page is usually the stalled deal.
    .sort((a, b) => (a.closed === b.closed ? b.days - a.days : a.closed ? 1 : -1));

  const open = deals.filter((d) => !d.closed);
  const decided = deals.filter((d) => d.closed);
  const won = decided.filter((d) => d.won);

  // CONTRACTS CARRY THEIR MOVEMENT, not just what was signed. Only APPROVED
  // variations count, which is `approvedValueDelta`'s rule — the same function
  // the contracts register's server side uses, rather than a second sum here
  // free to disagree about whether a submitted variation is money yet.
  const contractRows = contracts.map((c) => {
    const mine = changeOrders.filter((co) => co.contractId === c.id);
    const delta = approvedValueDelta(mine);
    return {
      id: c.id,
      number: c.number || "",
      title: c.title || "",
      currency: c.currency || "",
      value: num(c.value),
      delta,
      current: num(c.value) + delta,
      pending: mine.filter((co) => co.status === "submitted").length,
      signedDate: c.signedDate || "",
      endDate: c.endDate || "",
    };
  });

  return {
    client: {
      id: client.id,
      name: client.name || "",
      code: client.code || "",
      industry: client.industry || "",
      website: client.website || "",
      notes: client.notes || "",
      createdAt: client.createdAt || "",
      contacts: clientContacts(client),
      locations: clientLocations(client),
    },
    may,
    deals: {
      open,
      decided,
      openValue: open.filter((d) => d.forecast).reduce((s, d) => s + d.value, 0),
      weighted: open.reduce((s, d) => s + d.weighted, 0),
      // WHAT THIS COMPANY HAS ACTUALLY BOUGHT. Won deals only — the one figure
      // a person opens a customer page to find, and the one no screen could
      // answer before.
      wonValue: won.reduce((s, d) => s + d.value, 0),
      // Null rather than zero while nothing has been decided: a customer with
      // three live deals and no history has no win rate, and "0%" would read as
      // a verdict on a relationship that has not concluded anything yet.
      winRate: decided.length ? Math.round((won.length / decided.length) * 100) : null,
    },
    quotations: quotations.map((q) => ({
      id: q.id, number: q.number || "", title: q.title || "",
      status: q.status || "", total: num(q.total), currency: q.currency || "",
      ticketId: q.ticketId || "",
    })),
    rates,
    // What is left to price, for the editor's picker. Only for somebody who may
    // edit — a reader who cannot change a rate has no use for the catalogue and
    // should not be handed it.
    catalogue: may.editRates
      ? items.map((i) => ({ id: i.id, name: i.name || "", sku: i.sku || "", sellPrice: Number(i.sellPrice) || 0, cost: Number(i.unitCost) || 0 }))
        .sort((a, b) => a.name.localeCompare(b.name))
      : [],
    contracts: contractRows,
    contractValue: contractRows.reduce((s, c) => s + c.current, 0),
    projects: projects.map((p) => ({
      id: p.id, number: p.number || "", title: p.title || "",
      stage: p.stage || "", value: num(p.value),
    })),
  };
}
