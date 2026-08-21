// MAIN — the studio's front door. What is happening across the whole place, for
// the person looking at it.
//
// This module reads ACROSS sections, which makes one rule matter more than
// anything else here: A SECTION THE VIEWER CANNOT SEE IS NEVER READ. Not read
// and hidden — not read at all. A count is information; "there are 14 open
// tickets" tells you something real about a studio you were not given Sales
// access to, so the figure is not fetched, not summarised, and not sent.
//
// Everything is derived on read, like every other module: nothing here is a
// stored dashboard that could drift from what the sections actually say.

import { repo } from "@/lib/data/repo";
import { listSections } from "@/lib/data/sections";
import { studioContext, sectionNav, visibleSections } from "@/lib/studios";
import { sectionViewable } from "@/lib/access";
import { listCollaborators } from "@/lib/data/collaborators";
import { enrichTask, readTaskAssignees } from "@/lib/taskRouting";
// The sections' OWN definitions of "below reorder level" and "expiring", so the
// front door cannot quietly disagree with the screen it is summarising.
import { balances } from "@/lib/inventory";
import { permitState } from "@/lib/operations";

export async function mainContext(user, slug) {
  const context = await studioContext(user, slug);
  if (context.error) return context;
  // `access` comes from studioContext; dropping it here is what silently
  // disarms every check downstream.
  // `roles` travels with `access`: scopeFor needs it, and a context that
  // carries one without the other is half an answer.
  const { studio, collaborator, access, roles } = context;

  const sections = await listSections(studio.id);
  const byKey = Object.fromEntries(sections.map((s) => [s.key, s]));

  // One helper, used everywhere below: the section that owns a collection, but
  // only if this person may see it. Everything else keys off this.
  const seen = (key, fallbackKey) => {
    const section = byKey[key] || (fallbackKey ? byKey[fallbackKey] : null);
    if (!section) return null;
    return sectionViewable(access, section.key, sections.map((x) => x.key)) ? section : null;
  };

  return {
    studio, collaborator, sections, byKey, seen,
    visible: visibleSections(studio, collaborator, sections, access),
    nav: sectionNav(studio, collaborator, sections, access),
  };
}

// Read a collection only when its section is visible; otherwise answer with
// nothing at all, so a caller cannot accidentally count what it may not see.
async function readIfVisible(ctx, key, fallbackKey, collection) {
  const section = ctx.seen(key, fallbackKey);
  if (!section) return null;
  // The collection is chosen by the caller, so the repository is built per call
  // rather than hoisted — it binds a name, not a connection.
  return repo(collection).find({ studio: ctx.studio, section });
}

// The headline figures, each one omitted entirely when its section is not the
// viewer's to see. `null` means "not yours to know", which the screen renders as
// an absent tile rather than a zero — a zero would be a claim.
export async function headlines(ctx) {
  const meId = ctx.collaborator.id;
  const today = new Date().toISOString().slice(0, 10);

  const [tickets, quotations, rfqs, projects, items, movements, tasks, invoices, permits, people] = await Promise.all([
    readIfVisible(ctx, "sales-tickets", "sales", "salesTickets"),
    readIfVisible(ctx, "technical-quotations", "technical", "quotations"),
    readIfVisible(ctx, "technical-rfq", "technical", "rfqs"),
    readIfVisible(ctx, "projects-list", "projects", "projects"),
    readIfVisible(ctx, "inventory-items", "inventory", "inventoryItems"),
    // ON-HAND LIVES IN THE LEDGER, not on the item. "Below reorder level" is a
    // comparison between the two, so both are read — and the ledger is its own
    // sub-section, so somebody who may see the catalogue but not the stock
    // movements gets no answer rather than a wrong one.
    readIfVisible(ctx, "inventory-stock", "inventory", "inventoryStock"),
    readIfVisible(ctx, "tasks", null, "tasks"),
    readIfVisible(ctx, "finance-cash", "finance", "invoices"),
    readIfVisible(ctx, "operations", null, "permits"),
    ctx.seen("hr-employees", "hr") ? listCollaborators(ctx.studio.id) : null,
  ]);

  // Derived exactly as the Inventory screen derives it, from the same helper.
  const onHand = movements ? balances(movements) : null;

  // Tasks waiting on THIS person, resolved through the same routing the board
  // uses — so the number on the home page and the number on the board agree.
  let awaitingMe = null;
  if (tasks) {
    const settingsSection = ctx.byKey["tasks-settings"] || ctx.byKey["tasks"];
    const assignees = readTaskAssignees(settingsSection);
    awaitingMe = tasks
      .filter((t) => t.status !== "Done")
      .map((t) => enrichTask(t, assignees, meId))
      .filter((t) => t.assigneeCollaboratorId === meId || (t.myAuthorities || []).some((c) => !t.approvals?.[c]?.approved))
      .length;
  }

  return {
    openTickets: tickets ? tickets.filter((t) => t.status !== "Closed Won" && t.status !== "Closed Lost" && t.status !== "Dropped").length : null,
    openRfqs: rfqs ? rfqs.filter((r) => r.status !== "Converted" && r.status !== "Rejected").length : null,
    liveQuotations: quotations ? quotations.filter((q) => q.status === "Draft" || q.status === "Sent").length : null,
    liveProjects: projects ? projects.filter((p) => p.stage && p.stage !== "Completed").length : null,
    // BELOW REORDER LEVEL, which is a comparison — it counted items that merely
    // HAD a reorder level set, so a studio that had configured its catalogue
    // properly was told everything it owned was running out.
    lowStock: items && onHand
      ? items.filter((i) => Number(i.reorderLevel) > 0 && (onHand[i.id] || 0) <= Number(i.reorderLevel)).length
      : null,
    awaitingMe,
    // Money owed to the studio: everything invoiced and not yet cancelled or
    // paid. Totals are recomputed rather than trusted from a stored field.
    outstanding: invoices
      ? Math.round(invoices
        .filter((i) => i.status === "Sent")
        .reduce((sum, i) => sum + Math.max(0, (Number(i.total) || 0) - (Number(i.paid) || 0)), 0) * 100) / 100
      : null,
    // FALLING DUE, not "still valid". This counted every permit that had not
    // yet expired — the healthy ones — and put the total under a heading that
    // means the opposite. permitState is the same rule the Operations screen
    // paints the row with, so the two now agree by construction.
    permitsExpiring: permits ? permits.filter((p) => permitState(p, today) === "Expiring").length : null,
    headcount: people ? people.length : null,
  };
}

// The few things that changed most recently, across everything the viewer can
// see — so the front door answers "what happened while I was away".
export async function recent(ctx, limit = 8) {
  const [tickets, quotations, projects, tasks] = await Promise.all([
    readIfVisible(ctx, "sales-tickets", "sales", "salesTickets"),
    readIfVisible(ctx, "technical-quotations", "technical", "quotations"),
    readIfVisible(ctx, "projects-list", "projects", "projects"),
    readIfVisible(ctx, "tasks", null, "tasks"),
  ]);

  // A quotation's title is the TICKET'S and is not stored on the quotation, so
  // it is read through the ticketId — off the tickets already loaded above. A
  // viewer who cannot see Sales has no tickets to read, and an Internal
  // quotation has no ticket, so both fall back to the number alone.
  const ticketTitle = new Map((tickets || []).map((t) => [t.id, t.title]));

  const feed = [
    ...(tickets || []).map((t) => ({ kind: "ticket", section: "sales", id: t.id, label: t.title, meta: t.clientName || "", at: t.updatedAt || t.createdAt })),
    ...(quotations || []).map((q) => ({ kind: "quotation", section: "technical", id: q.id, label: q.number, meta: ticketTitle.get(q.ticketId) || q.title || "", at: q.createdAt })),
    ...(projects || []).map((p) => ({ kind: "project", section: "projects", id: p.id, label: p.title, meta: p.number || "", at: p.createdAt })),
    ...(tasks || []).map((t) => ({ kind: "task", section: "tasks", id: t.id, label: t.title, meta: t.type || "", at: t.createdAt })),
  ];

  return feed
    .filter((r) => r.at && r.label)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, limit);
}
