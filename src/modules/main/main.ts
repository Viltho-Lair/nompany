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

import { repo } from "@/platform/db/repo";
import { listSections } from "@/platform/db/sections";
import { studioContext, sectionNav, visibleSections } from "@/lib/studios";
import { sectionViewable } from "@/platform/access";
import { listCollaborators } from "@/platform/auth/collaborators";
import { enrichTask, readTaskAssignees } from "@/modules/tasks/taskRouting";
import type { Task } from "@/modules/tasks/types";
import type { Permit } from "@/modules/operations/types";
// The sections' OWN definitions of "below reorder level" and "expiring", so the
// front door cannot quietly disagree with the screen it is summarising.
import { balances } from "@/modules/inventory/inventory";
import { permitState } from "@/modules/operations/operations";
import type { ModuleContext } from "../context";
import type { StudioRef, CollaboratorRef } from "../context";
import type { PermissionSet } from "@/platform/access";
import type { Section } from "@/platform/db/sections";
import type { Movement } from "@/modules/inventory/types";
import type { Row } from "@/platform/db/store";

/**
 * WHAT `seen` IS, and why main hands one out instead of a list of flags. It
 * answers "the section that owns this collection, if this person may see it" —
 * one question, asked a dozen times below, with `access` captured inside it.
 * That is why mainContext is the one context exempt from "every context returns
 * access": it returns something better.
 */
export type SeenFn = (key: string, fallbackKey?: string | null) => Section | null;

/**
 * WHAT mainContext HANDS BACK. Written out rather than inferred because the
 * function returns `context` unchanged on the error path, so its inferred type
 * is a union with an error object and every consumer would have to narrow it
 * again. The route already checks `.error` before calling anything here.
 */
export type MainContext = {
  studio: StudioRef;
  collaborator: CollaboratorRef;
  sections: Section[];
  byKey: Record<string, Section | undefined>;
  seen: SeenFn;
  visible: ReturnType<typeof visibleSections>;
  nav: ReturnType<typeof sectionNav>;
};

export async function mainContext(user: { id?: unknown } | null | undefined, slug: string) {
  const context = await studioContext(user, slug);
  if (context.error) return context;
  // `access` comes from studioContext; dropping it here is what silently
  // disarms every check downstream.
  // `roles` travels with `access`: scopeFor needs it, and a context that
  // carries one without the other is half an answer.
  // studioContext is still JavaScript, so what it hands back arrives untyped.
  // Named here, once — main is the one context that is hand-rolled rather than
  // built by the factory, which is why this line has no sibling.
  const { studio, collaborator, access, roles } = context as unknown as {
    studio: StudioRef; collaborator: CollaboratorRef; access: PermissionSet; roles: unknown[];
  };

  const sections = await listSections(studio.id);
  const byKey = Object.fromEntries(sections.map((s) => [s.key, s]));

// One helper, used everywhere below: the section that owns a collection, but
  // only if this person may see it. Everything else keys off this.
  const seen = (key: string, fallbackKey?: string | null) => {
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
export async function readIfVisible<T extends Row = Row>(
  ctx: MainContext,
  key: string,
  fallbackKey: string | null,
  collection: string,
): Promise<T[] | null> {
  const section = ctx.seen(key, fallbackKey);
  if (!section) return null;
  // The collection is chosen by the caller, so the repository is built per call
  // rather than hoisted — it binds a name, not a connection.
  return repo<T>(collection).find({ studio: ctx.studio, section });
}

// The headline figures, each one omitted entirely when its section is not the
// viewer's to see. `null` means "not yours to know", which the screen renders as
// an absent tile rather than a zero — a zero would be a claim.
export async function headlines(ctx: MainContext) {
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
    readIfVisible<Task>(ctx, "tasks", null, "tasks"),
    readIfVisible(ctx, "finance-cash", "finance", "invoices"),
    readIfVisible<Permit>(ctx, "operations", null, "permits"),
    ctx.seen("hr-employees", "hr") ? listCollaborators(ctx.studio.id) : null,
  ]);

  // Derived exactly as the Inventory screen derives it, from the same helper.
  const onHand = movements ? balances(movements as Movement[]) : null;

  // Tasks waiting on THIS person, resolved through the same routing the board
  // uses — so the number on the home page and the number on the board agree.
  let awaitingMe: number | null = null;
  if (tasks) {
    const byKey = ctx.byKey;
    const settingsSection = byKey["tasks-settings"] || byKey["tasks"];
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
      ? items.filter((i) => Number(i.reorderLevel) > 0 && (onHand[String(i.id)] || 0) <= Number(i.reorderLevel)).length
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
export async function recent(ctx: MainContext, limit = 8) {
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
