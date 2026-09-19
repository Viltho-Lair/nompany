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

import { switchboard } from "@/lib/dashboardWidgets";
import { isFiledOnlySection } from "@/platform/db/keys";
import { repo } from "@/platform/db/repo";
import { listSections, parentKeyMap } from "@/platform/db/sections";
import { studioContext, sectionNav, visibleSections } from "@/lib/studios";
import { roundMoney } from "@/shared/money";
import { sectionViewable, can } from "@/platform/access";
import { listCollaborators } from "@/platform/auth/collaborators";
import type { Approval } from "@/modules/approvals/schema";
import { approvalQueueFrom, concernsMe } from "./awaiting";
import type { Permit } from "@/modules/operations/types";
// The sections' OWN definitions of "below reorder level" and "expiring", so the
// front door cannot quietly disagree with the screen it is summarising.
import { balances } from "@/modules/inventory/inventory";
import { permitState } from "@/modules/operations/operations";
import { invoiceTotals } from "@/modules/finance/finance";
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
 * `access` itself travels on MainContext too now (below) — engagements needs
 * the raw permission set to filter stages ACROSS sections, which `seen`
 * cannot answer. `seen` stays for headlines/recent, which still ask the
 * per-section question and would otherwise re-derive `sectionViewable` at
 * every call site instead of once, here.
 */
/**
 * `switchKey` is the section the owner turns on and off for what is being
 * read — see `seen` below. It defaults to `key`, and must be given whenever
 * `key` is a filed-only storage row.
 */
export type SeenFn = (key: string, fallbackKey?: string | null, switchKey?: string) => Section | null;

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
  // Engagements reads ACROSS sections rather than through one, so it cannot be
  // asked through `seen` the way headlines/recent are — it needs the raw
  // permission set to filter stages itself (src/modules/main/engagements.ts).
  // `access` used to be dropped on the way out deliberately, because nothing
  // here needed it; that reason expired the day engagements.ts needed
  // `ctx.access`, so it now travels on MainContext like it does on every
  // other module context (src/modules/context.ts) — still resolved once, in
  // studioContext, never twice.
  access: PermissionSet;
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
  const sectionKeys = sections.map((x) => x.key);
  const parentOf = parentKeyMap(sections);

  // One helper, used everywhere below: the section that owns a collection, but
  // only if this person may see it AND the studio runs it. Everything else keys
  // off this — the tiles, the feed, the executive widgets, Awaiting you and
  // Nova's bubble — so a switched-off department drops out of all of them at
  // once rather than one screen at a time.
  //
  // THE SWITCH WAS MISSING until 17/09/2026: this asked the reader's rights
  // alone, an owner holds every right, and so a studio that had switched
  // Projects off was still shown "Projects running" on its front door.
  //
  // THE SWITCH IS NAMED BY THE CALLER, because storage is not the switch.
  // Quotations and RFQs are filed under two rows kept only for storage
  // (FILED_ONLY_SECTION_KEYS), which follow CRM & Sales and Engineering, while
  // the owner switches the Quotations department. A filed-only row can hold
  // more than one kind of record, so this cannot guess which screen a read is
  // for — it refuses to, loudly, rather than answer with the wrong switch.
  const on = switchboard(sections);
  const seen = (key: string, fallbackKey?: string | null, switchKey: string = key) => {
    if (isFiledOnlySection(switchKey)) {
      throw new Error(`seen(${key}): a filed-only row is not a switch — name the section its records are worked in`);
    }
    if (!on(switchKey)) return null;
    const section = byKey[key] || (fallbackKey ? byKey[fallbackKey] : null);
    if (!section) return null;
    // WHO MAY SEE IT IS ASKED OF WHERE IT IS SHOWN, not where it is stored.
    // Finance's split made the difference real (18/09/2026): invoices are filed
    // under Cash & Bank and worked in Receivables, each with its own right, so
    // asking the storage section would show a treasury clerk the outstanding
    // invoices and hide them from the receivables clerk. Where the two agree —
    // every caller naming no switch — nothing changes.
    const shown = switchKey !== key ? byKey[switchKey] : undefined;
    return sectionViewable(access, (shown || section).key, sectionKeys, parentOf) ? section : null;
  };

  return {
    studio, collaborator, sections, byKey, seen,
    visible: visibleSections(studio, collaborator, sections, access),
    nav: sectionNav(studio, collaborator, sections, access),
    access,
  };
}

// Read a collection only when its section is visible; otherwise answer with
// nothing at all, so a caller cannot accidentally count what it may not see.
export async function readIfVisible<T extends Row = Row>(
  ctx: MainContext,
  key: string,
  fallbackKey: string | null,
  collection: string,
  switchKey: string = key,
): Promise<T[] | null> {
  const section = ctx.seen(key, fallbackKey, switchKey);
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

  const [tickets, quotations, rfqs, projects, items, movements, invoices, permits, people, approvals] = await Promise.all([
    readIfVisible(ctx, "crm-sales-tickets", "crm-sales", "salesTickets"),
    readIfVisible(ctx, "crm-sales-quotations", "crm-sales", "quotations", "quotations-register"),
    readIfVisible(ctx, "engineering-docs-rfq", "engineering-docs", "rfqs", "quotations-rfq"),
    readIfVisible(ctx, "projects-list", "projects", "projects"),
    readIfVisible(ctx, "inventory-items", "inventory", "inventoryItems"),
    // ON-HAND LIVES IN THE LEDGER, not on the item. "Below reorder level" is a
    // comparison between the two, so both are read — and the ledger is its own
    // sub-section, so somebody who may see the catalogue but not the stock
    // movements gets no answer rather than a wrong one.
    readIfVisible(ctx, "inventory-stock", "inventory", "inventoryStock"),
    // Stored under Cash, worked in Receivables since Finance split (18/09/2026).
    readIfVisible(ctx, "finance-cash", "finance", "invoices", "finance-receivables"),
    // Stored on the Field Operations root, worked in Quality & HSE → Permits.
    readIfVisible<Permit>(ctx, "field-service", null, "permits", "quality-hse-permits"),
    ctx.seen("hr-employees", "hr") ? listCollaborators(ctx.studio.id) : null,
    readIfVisible<Approval>(ctx, "approvals", null, "approvals"),
  ]);

  // Derived exactly as the Inventory screen derives it, from the same helper.
  const onHand = movements ? balances(movements as Movement[]) : null;

  // THE APPROVALS WAITING ON ME, counted by the same function the "Awaiting
  // you" list and the Approvals page use, so the three cannot disagree.
  const awaitingMe: number | null = approvals ? approvalQueueFrom(approvals, meId).length : null;

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
    // paid. Totals are recomputed rather than trusted from a stored field —
    // and recomputed BY FINANCE'S OWN `invoiceTotals`. This summed `total` and
    // `paid` off the row, which are never stored (finance/schema.ts: "derived
    // by invoiceTotals, never stored"), so the tile read 0 in every studio.
    outstanding: invoices
      ? roundMoney(invoices
        .filter((i) => i.status === "Sent")
        .reduce((sum, i) => sum + invoiceTotals(i, ctx.studio.currency).outstanding, 0), ctx.studio.currency)
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
  const meId = String(ctx.collaborator.id);
  const [tickets, quotations, projects, approvals] = await Promise.all([
    readIfVisible(ctx, "crm-sales-tickets", "crm-sales", "salesTickets"),
    readIfVisible(ctx, "crm-sales-quotations", "crm-sales", "quotations", "quotations-register"),
    readIfVisible(ctx, "projects-list", "projects", "projects"),
    readIfVisible<Approval>(ctx, "approvals", null, "approvals"),
  ]);

  // A quotation's title is the TICKET'S and is not stored on the quotation, so
  // it is read through the ticketId — off the tickets already loaded above. A
  // viewer who cannot see Sales has no tickets to read, and an Internal
  // quotation has no ticket, so both fall back to the number alone.
  const ticketTitle = new Map((tickets || []).map((t) => [t.id, t.title]));

  const feed = [
    ...(tickets || []).map((t) => ({ kind: "ticket", section: "crm-sales", id: t.id, label: t.title, meta: t.clientName || "", at: t.updatedAt || t.createdAt })),
    ...(quotations || []).map((q) => ({ kind: "quotation", section: "crm-sales", id: q.id, label: q.number, meta: ticketTitle.get(q.ticketId) || q.title || "", at: q.createdAt })),
    ...(projects || []).map((p) => ({ kind: "project", section: "projects", id: p.id, label: p.title, meta: p.number || "", at: p.createdAt })),
    // ONLY THE APPROVALS THAT CONCERN THE READER — asked, asking, or allowed to
    // see them all — the same line the Approvals page draws. A feed listing
    // every approval's title would show what that page withholds.
    ...(approvals || [])
      .filter((a) => concernsMe(a, meId) || can(ctx.access, "approvals.overview.view"))
      .map((a) => ({ kind: "approval", section: "approvals", id: a.id, label: a.source?.ref || a.source?.title || "", meta: a.status, at: a.requestedAt })),
  ];

  return feed
    .filter((r) => r.at && r.label)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, limit);
}
