// PROJECTS — where an approved quotation becomes delivered work.
//
// Completes the chain: Sales ticket -> RFQ -> quotation -> PROJECT. Each step
// snapshots the one before it, so a project can show its whole lineage without
// reading three other sections, and still reads correctly if an upstream record
// is edited later.
//
// A project opened FROM A QUOTATION may only be opened from an APPROVED one —
// that approval is the commercial gate, and it lives in Technical/Sales, not
// here. Work handed to the studio directly has no quotation to gate on and is
// raised without one; it is the deal's own root rather than a link in a chain.
// See the two heads above openProject.

import { requirePermission, can } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { getJSON, editJSON, delKeys } from "@/platform/db/store";
import { PROJECT } from "@/platform/db/keys";
import {
  readEngagement, attachRecord, setApprovedQuotation,
  detachRecord, engagementIdFor, engagementIdForLineage,
  attachToProjectEngagement, attachProjectEngagement, detachFromItsEngagement,
} from "@/platform/db/engagement";
import { removeProjectPlans, progressByProject } from "@/modules/operations/planner";
import { updateSection } from "@/platform/db/sections";
import { moduleContext } from "../context";

import { listCollaborators } from "@/platform/auth/collaborators";
import { clientContacts, resolveClientFor } from "@/modules/sales/salesClients";
import type { Client } from "@/modules/sales/types";
import { notifyCollaborators, NOTIFY } from "@/platform/notify/notifications";
import { DEFAULT_SUPPORT_DAYS, hoursBetween } from "./projectSchedule";
import { nextReference } from "@/modules/main/references";
import { ticketFacts } from "@/modules/technical/technical";
import { departmentsFromSections } from "@/lib/departments";
// Whether a quotation is approved is answered by its APPROVAL, not by a copy of
// one — see the note on quotationApproved.
import { quotationApproved } from "@/modules/tasks/taskRouting";
import type { ProjectsContext, Project, Sla, Overtime } from "./types";
import type { Section } from "@/platform/db/sections";
import type { Row } from "@/platform/db/store";
import type { Task } from "@/modules/tasks/types";

export const PROJECT_STAGES = ["Received", "In Progress", "On Hold", "Completed"];
export const DEFAULT_STAGE = "Received";

const PROJECTS = "projects";
const QUOTATIONS = "quotations";
const SLAS = "slas";
const OVERTIMES = "overtimes";
// Project Sheets live under INVENTORY in this product, matching the Old System.
// Projects writes one when a project is opened and never reads it again.
const SHEETS = "projectSheets";
// Sales' clients collection, read (never written) for a project's client box.
const CLIENTS = "salesClients";
// Two sheets per project, and they are two READINGS of the quotation's rows
// rather than two copies of them — see openProject.
export const SHEET_KINDS = ["main", "bulk"];
const TASKS = "tasks";

// THE COLLECTIONS THIS MODULE QUERIES, named once. A repository binds a
// collection, not a scope — the studio and section arrive per call, which is
// what stops a query naming another tenant's keys and what lets one object
// answer for a sibling department's rows as easily as its own.
const Overtimes = repo<Overtime>(OVERTIMES);
const Projects = repo<Project>(PROJECTS);
const Quotations = repo(QUOTATIONS);
// Sales owns clients; Projects only reads them (see listProjectClients).
const Clients = repo<Client>(CLIENTS);
// Projects writes the project sheet under Inventory's section when a project is
// opened and never reads it back, so this binds the collection without a type.
const Sheets = repo(SHEETS);
const Slas = repo<Sla>(SLAS);
const Tasks = repo<Task>(TASKS);
// A department is a top-level SECTION, so the overtime picker's filter is
// derived from the studio's own structure rather than read out of HR — see
// lib/departments.js.
const str = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);
const nonNeg = (v: unknown, fallback = 0) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : fallback; };

export const projectsContext = moduleContext<ProjectsContext>({
  root: "projects",
  sub: {
    list: "projects-list", sla: "projects-sla", overtimes: "projects-overtimes",
    settings: "projects-settings",
    // The same section as `list`, under the name the cross-department readers
    // use for it. Both spellings existed before this and resolved identically.
    projectsList: "projects-list",
  },
  foreign: {
    technical: "technical",
    quotations: ["technical-quotations", "technical"],
    salesTickets: ["sales-tickets", "sales"],
    salesClients: ["sales-clients", "sales"],
    sheets: ["inventory-sheets", "inventory"],
    items: ["inventory-items", "inventory"],
    vendors: ["inventory-vendors", "inventory"],
    tasks: "tasks",
  },
  flags: ["list", "sla", "overtimes", "settings"],
  extend: ({ settingsSection }) => ({
    settings: (settingsSection as { settings?: Record<string, unknown> })?.settings || {},
  }),
});

// Projects Settings live on the projects-settings sub-section's own `settings`
// object, so they need no key of their own and die with the sub-section.
// Patch semantics: only the keys present in the body are touched.
export async function saveProjectsSettings(ctx: ProjectsContext, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "projects.settings.edit");
  if (denied) return denied;

  const { studio, settingsSection } = ctx;
  const next = { ...(settingsSection.settings || {}) };
  if (body?.stages !== undefined) {
    next.stages = (Array.isArray(body.stages) ? body.stages : [])
      .map((v) => String(v ?? "").trim().slice(0, 120)).filter(Boolean).slice(0, 40);
  }
  // How a project's completion percentage divides across its requirements. The
  // requirements are the studio's own SERVICE ACTIONS, so the weights are keyed by
  // action name — only actions the studio actually named are stored, and a value
  // outside that set is dropped rather than kept as an orphan. A blank is "not
  // set" and stored as such, so it falls back to an even split rather than a zero
  // that would silently drop the requirement.
  if (body?.requirementWeights !== undefined) {
    const raw: Record<string, unknown> = body.requirementWeights && typeof body.requirementWeights === "object"
      ? body.requirementWeights as Record<string, unknown>
      : {};
    const actions = Array.isArray(studio.serviceActions) ? (studio.serviceActions as string[]) : [];
    next.requirementWeights = Object.fromEntries(
      actions.map((a) => [a, raw[a] === "" || raw[a] == null ? "" : nonNeg(raw[a], 0)]),
    );
  }
  if (body?.overtimeDefaultDepartmentId !== undefined) {
    next.overtimeDefaultDepartmentId = str(body.overtimeDefaultDepartmentId, 60);
  }
  if (body?.supportPeriodDays !== undefined) next.supportPeriodDays = nonNeg(body.supportPeriodDays, DEFAULT_SUPPORT_DAYS);

  const updated = await updateSection(studio.id, settingsSection.id, { settings: next });
  return updated ? { settings: next } : { error: "notfound" };
}

export function readProjectsSettings(
  settingsSection: { settings?: Record<string, unknown> } | null | undefined,
) {
  const s = settingsSection?.settings || {};
  return {
    stages: Array.isArray(s.stages) && s.stages.length ? s.stages : PROJECT_STAGES,
    requirementWeights: s.requirementWeights && typeof s.requirementWeights === "object" ? s.requirementWeights : {},
    overtimeDefaultDepartmentId: s.overtimeDefaultDepartmentId || "",
    supportPeriodDays: nonNeg(s.supportPeriodDays, DEFAULT_SUPPORT_DAYS),
  };
}

export async function listProjects(ctx: ProjectsContext) {
  const { studio, listSection } = ctx;
  // Progress is the project PLAN's overall completion, read back through the
  // studio-level plans index (one key), never stored on the project — so it
  // can't drift from the schedule it summarises. A project with no plan reads 0.
  const [rows, { factsFor }, progressFor] = await Promise.all([
    Projects.find({ studio, section: listSection }),
    ticketFacts(ctx),
    progressByProject(studio.id),
  ]);
  return [...rows]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .map((p) => {
      // THE TICKET'S REFERENCE, read back through the ticketId the project
      // carries — so the profile can name where the work came from without the
      // project holding a second copy of it.
      const t = factsFor(p.ticketId);
      return { ...p, ticketRef: t.ticketRef, progress: progressFor.get(p.id) ?? 0 };
    });
}

// Quotations that are Approved and not already delivering — what "open a
// project" can choose from.
export async function approvedQuotations(ctx: ProjectsContext) {
  const { studio, listSection, quotationsSection, tasksSection } = ctx;
  if (!quotationsSection) return [];
  const [quotes, projects, tasks, { factsFor, clientsById }] = await Promise.all([
    Quotations.find({ studio, section: quotationsSection }),
    Projects.find({ studio, section: listSection }),
    tasksSection ? Tasks.find({ studio, section: tasksSection }) : [],
    ticketFacts(ctx),
  ]);
  const used = new Set(projects.map((p) => p.quotationId).filter(Boolean));
  return quotes
    // Approved BY THE TASK or by hand — the picker offers what may actually be
    // opened, which is the same question openProject asks below.
    .filter((q) => quotationApproved(q, tasks) && !used.has(String(q.id)))
    // Title and client are the TICKET'S, reached through the quotation's
    // ticketId. An Internal quotation has no ticket and titles itself.
    .map((q) => {
      const t = factsFor(String(q.ticketId || ""));
      // AN INTERNAL QUOTATION'S CLIENT is resolved the same way listQuotations
      // resolves it (technical.ts) — LIVE off Sales' own Client record via
      // clientsById, never off the quotation's own stored clientName, which is
      // free text left over from before this branch gave internal quotations a
      // real clientId. Picking the picker offered "Abdullah Abu Hamad" for a
      // client the row itself never named was this same defect one screen
      // earlier: openProject already resolves the client correctly once a
      // quotation is chosen, but this list is what choses it, and it was still
      // reading the ticket-only path (blank for every internal quotation) even
      // after that fix landed. The stored name is kept only as the fallback
      // for a client that has no row yet.
      const clientId = String(q.clientId || "");
      const clientName = q.ticketId
        ? t.clientName
        : (clientId && clientsById.get(clientId)) || String(q.clientName || "") || "";
      return {
        id: q.id, number: q.number, total: q.total,
        title: q.ticketId ? t.title : (q.title || ""),
        clientName,
      };
    });
}

// TELL THE MANAGER A PROJECT IS THEIRS. "A new project is assigned" is a real
// event the studio produced nothing for. Same three rules as a task assignment:
// never on a no-op (the manager did not change), never on a self-assignment, and
// never on un-assignment. `previousManagerId` is "" for a freshly opened project.
async function announceProjectManager(
  ctx: ProjectsContext,
  project: Record<string, unknown>,
  previousManagerId: string,
) {
  const manager = String(project.managerCollaboratorId || "");
  if (!manager || manager === previousManagerId || manager === ctx.collaborator.id) return;
  const person = (await listCollaborators(ctx.studio.id)).find((c) => c.id === manager);
  if (!person) return;
  await notifyCollaborators(
    ctx.studio.id,
    [manager],
    {
      type: NOTIFY.projectAssigned,
      title: "You're managing a new project",
      body: String(project.title || ""),
      href: "projects-list",
      tone: "primary",
    },
    { userIdOf: (id) => (id === person.id ? String(person.userId) : undefined) },
  );
}

// WHAT A PROJECT IS OPENED FROM, resolved to one shape.
//
// Two heads, one body. The quotation head reads the whole chain off an approved
// quotation; the direct head takes the job as typed. Everything below the split
// — the row, the sheets, the engagement, the manager notification — cannot tell
// which one ran, and that is the point: a second create path is a second place
// for the engagement dual-write to be forgotten, which is precisely how a
// record ends up on no deal at all.
type ProjectSource = {
  title: string;
  clientId: string;
  clientName: string;
  value: number;
  quotationId: string;
  quotationNumber: string;
  rfqId: string;
  ticketId: string;
  // THE ENGAGEMENT THIS PROJECT JOINS, when it is knowable before the row
  // exists. Blank for the direct head, whose engagement is rooted ON the
  // project and therefore cannot be derived until the project has an id — see
  // the attach below.
  engId: string;
  // The resolved Client record, carried only by the direct head, so the
  // engagement it mints names the client live rather than from a copy.
  client: Client | null;
};

// THE DIRECT HEAD — no quotation, so no commercial gate and no
// one-project-per-quotation check. What it must do instead is resolve the
// client the same way every other create resolves it: find-or-create by
// normalised name, then fold this deal's contact and site onto the Client
// record. That is `resolveClientFor`, which createTicket and createQuotation
// both call — a third implementation is how three clients named "Acme" end up
// in one studio.
async function directSource(
  ctx: ProjectsContext, body: Record<string, unknown>,
): Promise<ProjectSource | { error: string }> {
  const { studio, salesClientsSection, collaborator } = ctx;
  const title = str(body?.title, 200);
  if (!title) return { error: "missing" };
  // A studio with no Sales clients section has no client model to resolve
  // into, and refuses exactly as createQuotation refuses in that case.
  if (!salesClientsSection) return { error: "client" };

  const site = (body?.site && typeof body.site === "object" ? body.site : {}) as Record<string, unknown>;
  const client = await resolveClientFor(
    { studio, section: salesClientsSection },
    {
      clientId: str(body?.clientId, 60),
      clientName: str(body?.clientName, 200),
      // INDUSTRY IS THE CLIENT'S FACT and is written onto the Client record.
      // The project stores no copy — a fourth copy of something the Client row
      // owns is the drift this product keeps removing.
      industry: str(body?.industry, 120),
      contact: {
        name: str(body?.contactName, 200),
        email: str(body?.contactEmail, 200),
        phone: str(body?.contactPhone, 60),
        position: str(body?.contactPosition, 120),
      },
      site: {
        name: str(site.name, 200), country: str(site.country, 120),
        city: str(site.city, 120), url: str(site.url, 500),
      },
      collaboratorId: collaborator.id,
    },
  );
  if (!client) return { error: "client" };

  return {
    title,
    clientId: client.id,
    clientName: client.name || "",
    // TYPED, because there is no quotation total to read. A direct project may
    // legitimately start at zero — the figure is agreed later — so this is a
    // default, not a refusal.
    value: nonNeg(body?.value, 0),
    quotationId: "", quotationNumber: "", rfqId: "", ticketId: "",
    engId: "",
    client,
  };
}

// THE QUOTATION HEAD — the original path, unchanged: an approved quotation and
// the whole chain behind it. Everything from the commercial gate down to the
// client fallback is the code that used to sit inline in openProject.
async function quotationSource(
  ctx: ProjectsContext, body: Record<string, unknown>,
): Promise<ProjectSource | { error: string }> {
  const { studio, listSection, technicalSection, quotationsSection, tasksSection, salesClientsSection, salesTicketsSection } = ctx;
  if (!technicalSection) return { error: "no-technical" };

  const quotationId = str(body?.quotationId, 60);
  // FOREIGN AND THEREFORE NULLABLE — a studio without Technical has no
  // quotations to open a project from, and the guard above this has already
  // refused that case.
  const quotes = await Quotations.find({ studio, section: quotationsSection as Section });
  const quote = quotes.find((q) => q.id === quotationId);
  if (!quote) return { error: "quotation" };
  // THE COMMERCIAL GATE: only approved work becomes a project. Asked of the
  // approval task rather than of the quotation's own status — the decision is
  // made on the board, and nothing writes it back onto the document. This is
  // exactly what refused every project opened from a quotation the studio had
  // just approved.
  const tasks = tasksSection ? await Tasks.find({ studio, section: tasksSection }) : [];
  if (!quotationApproved(quote, tasks)) return { error: "not-approved" };

  const existing = await Projects.find({ studio, section: listSection });
  if (existing.some((p) => p.quotationId === quotationId)) return { error: "already" };

  // THE ENGAGEMENT THIS QUOTATION BELONGS TO — the ticket's when it has one,
  // the quotation's own otherwise (an internal quotation mints its own, see
  // attachQuotationEngagement). Resolved once, here, because both the client
  // (below) and the attach/approve calls further down need the same id.
  //
  // The rule itself now lives in engagementIdForLineage rather than inline: the
  // delete path has to reach the SAME id to detach what this attached, and two
  // copies of "ticket's, else its own" is exactly the kind of near-miss that
  // detaches from an engagement nobody ever attached to and still reports ok.
  const engId = engagementIdForLineage({ ticketId: quote.ticketId, quotationId: quote.id });

  // THE CLIENT COMES FROM THE ENGAGEMENT'S CONTEXT, not from the ticket.
  // ticketFacts(quote.ticketId) is blank for every internal quotation — no
  // ticket behind it — which is the reported defect: "Project Home Invasion"
  // carries clientId "" because its quotation (Q-0002) is internal, so asking
  // the ticket for a client that was never a ticket's to have returned
  // nothing. The engagement carries clientId as a fact regardless of which
  // stage started the deal; the display name is resolved live against the
  // Client record (the composeTicket pattern in sales.ts) so it can never go
  // stale, with the engagement's own stored clientName only a fallback for a
  // client that has no row yet.
  //
  // STILL STORED ON THE PROJECT ROW BELOW, AND STILL A COPY. Under the rule
  // this row should hold nothing but the lineage ids and read the client back
  // through the engagement every time, the way this block itself just did.
  // It does not yet, because the Projects screens and Finance's cash sheet
  // read clientId/clientName straight off the raw project row, and those have
  // to be moved onto the engagement-read path first — the same drift item
  // Task 3 already named for the ticket's own title/client copies.
  const engagement = await readEngagement(studio.id, engId);
  const engContext = (engagement?.context || {}) as { clientId?: string; clientName?: string };
  let engClientId = String(engContext.clientId || "");
  let clientName = String(engContext.clientName || "");

  // ONE READ OF SALES' CLIENTS COLLECTION, not two. ticketFacts already reads
  // it — to build clientsById (an internal quotation's own client name, see
  // approvedQuotations above and listQuotations in technical.ts) and factsFor
  // (the title, below) — so the live client name comes off that same map
  // instead of a second Clients.find sequenced after it; see the comment on
  // ticketFacts for why folding a caller's own lookup in here is what keeps a
  // route's hop count from regressing.
  //
  // GUARD: ticketFacts short-circuits to an empty clientsById the moment the
  // studio has no Sales TICKETS section — a fact about tickets, not about
  // clients — so a studio with a Sales clients section but no tickets section
  // falls back to the direct read this replaces, rather than losing client
  // resolution it has today.
  const { factsFor, clientsById } = await ticketFacts(ctx);
  if (engClientId) {
    const liveName = salesTicketsSection
      ? clientsById.get(engClientId)
      : salesClientsSection
        ? (await Clients.find({ studio, section: salesClientsSection })).find((c) => c.id === engClientId)?.name
        : undefined;
    if (liveName) clientName = liveName;
  }

  // The title still reads the ticket the way it always did — untouched by
  // this fix, which is about the client only.
  const t = factsFor(String(quote.ticketId || ""));

  // FALLBACK, NOT A SECOND SOURCE. The engagement is still where the client
  // comes from — this only covers a dual-write that never landed: createTicket
  // attaches the ticket's engagement best-effort (see attachTicketEngagement's
  // own comment), so a crash or a race between "ticket written" and "engagement
  // root written" leaves a real ticket with no engagement root at all, not yet
  // healed by the backfill/reconcile job. Sourcing the client ONLY from the
  // engagement in that case would blank it on the project — the exact defect
  // this increment exists to remove, reappearing in a narrower shape. So: only
  // when the engagement had nothing AND there IS a ticket behind this
  // quotation (an internal quotation has none to fall back to, and does not
  // need one — createQuotation guarantees its own engagement carries a real
  // client) is the ticket asked directly, exactly as the old code always did.
  // The engagement is asked FIRST and always; this never runs when it answered.
  if (!engClientId && quote.ticketId) {
    engClientId = t.clientId;
    clientName = t.clientName;
  }

  return {
    title: str(body?.title, 200) || t.title || String(quote.title || ""),
    clientId: engClientId, clientName,
    value: Number(quote.total) || 0,
    quotationId, quotationNumber: String(quote.number || ""),
    rfqId: String(quote.rfqId || ""), ticketId: String(quote.ticketId || ""),
    engId, client: null,
  };
}

export async function openProject(ctx: ProjectsContext, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "projects.list.create");
  if (denied) return denied;

  const { studio, listSection, collaborator, sheetsSection } = ctx;

  // WHICH HEAD RUNS IS DECIDED BY THE BODY, not by a mode flag. A payload with
  // a quotationId is opening a project from that quotation and must pass the
  // commercial gate; a payload without one is raising new work directly. There
  // is no third case, and no flag a client could set to skip the gate.
  const source = str(body?.quotationId, 60)
    ? await quotationSource(ctx, body)
    : await directSource(ctx, body);
  if ("error" in source) return source;

  const now = new Date().toISOString();
  const project = await Projects.create({ studio, section: listSection }, {
    // BLANK UNTIL FINANCE ISSUES IT, and true of both heads. The project number
    // is quoted on invoices, purchase orders and delivery notes — it is the
    // studio's commitment to bill this work — and issuing it is Finance's act,
    // taken when they authorise the client's PO. A project can exist before
    // that: the work is planned, the handler is named, the sheet is drawn up.
    // What it cannot do is carry a number nobody issued.
    //
    // Blank rather than provisional, deliberately. A placeholder number would
    // be quoted on something before long, and then it would be the number.
    number: "",
    title: source.title,
    // Lineage — the whole chain of keys. Blank in every field for a direct
    // project, which has no chain behind it and must not pretend to one.
    quotationId: source.quotationId, quotationNumber: source.quotationNumber,
    rfqId: source.rfqId, ticketId: source.ticketId,
    clientId: source.clientId, clientName: source.clientName,
    value: source.value,
    stage: DEFAULT_STAGE,
    managerCollaboratorId: str(body?.managerCollaboratorId, 60),
    location: str(body?.location, 200),
    // The complementary support window runs from the project's END date, so it
    // means nothing until the project has one — but the length is decided now.
    supportPeriodDays: nonNeg(body?.supportPeriodDays,
      (ctx.settings as { supportPeriodDays?: number })?.supportPeriodDays ?? DEFAULT_SUPPORT_DAYS),
    receivedDate: now.slice(0, 10),
    startDate: str(body?.startDate, 10),
    endDate: str(body?.endDate, 10),
    // The direct head asks for a description; the quotation head has never sent
    // one and still stores "".
    notes: str(body?.notes, 4000),
    openedByCollaboratorId: collaborator.id,
    createdAt: now,
  });

  // Dual-write: the project joins its engagement as the PROJECT singleton —
  // the ticket's when the quotation has one, the quotation's OWN engagement
  // when it does not (`source.engId`, resolved by quotationSource) — and that same engagement
  // records which quotation was approved into it. Attaching to the
  // ticket-only helper here used to resolve a non-existent engagement for
  // every internal quotation (empty ticketId → a root nothing had created),
  // so `claimSingleton` threw `no-engagement` and the catch below swallowed
  // it — a project born from an internal quotation never joined ANY
  // engagement and never appeared on the engagements screen. Guarded and
  // best-effort regardless — the module's OWN "one project per quotation"
  // rule in quotationSource (`existing.some(...)`) is what actually refuses a second
  // project; this is a mirror of that outcome, not the source of it, so a
  // re-attach the engagement layer would otherwise refuse on is simply
  // swallowed rather than surfaced as an error the caller never asked for.
  //
  // AND THE DIRECT HEAD HAS NO ID TO ATTACH TO. No ticket and no quotation
  // means nothing to derive an engagement id from, so the deal is rooted ON the
  // project instead and can only be minted once the row exists. `engId` is let,
  // not const, because the sheets below join the SAME engagement and the direct
  // head only learns which one that is here.
  let engId = source.engId;
  try {
    if (engId) {
      await attachRecord(studio.id, engId, "project", project.id);
      await setApprovedQuotation(studio.id, engId, String(project.quotationId || ""));
    } else {
      engId = await attachProjectEngagement(
        studio.id, project as Record<string, unknown>,
        source.client as unknown as Record<string, unknown> | null,
      );
    }
  } catch { /* best-effort: reconciled later */ }

  // THE PROJECT SHEETS. Two per project, and NEITHER HOLDS A LINE OF ITS OWN.
  //
  // I built these as a copy first — a line per priced quotation row, written
  // into the sheet — and that was the same mistake this product keeps removing
  // everywhere else. A quotation is edited, revised, renumbered; a sheet that
  // copied it is wrong from the first change and nothing says so.
  //
  // So the quotation OWNS the tables and the rows, and every department BUILDS
  // ON them: Sales reads them with prices, Projects and Inventory read the same
  // rows without prices and add columns of their own. What a sheet stores is
  // only that addition — its own data, keyed by the quotation row it belongs to
  // — and the rows themselves are read back through quotationId every time. See
  // sheetLines in modules/inventory/inventory.js, which is where the two are put together.
  //
  // MAIN and BULK are the same rows asked two ways: Main keeps the quotation's
  // own divisions, Bulk sums each item across the whole project and splits the
  // totals by the vendor each is bought from. Neither is a second copy — they
  // are two readings of one list, which is why both can exist without either
  // being able to disagree with the quotation.
  const sheets: Row[] = [];
  if (sheetsSection) {
    for (const kind of SHEET_KINDS) {
      sheets.push(await Sheets.create({ studio, section: sheetsSection }, {
        // THE KEYS, and nothing else about the job. The project number, the
        // client, the quotation's lines and its numbers are all read back.
        projectId: project.id,
        quotationId: source.quotationId, rfqId: source.rfqId, ticketId: source.ticketId,
        kind,
        // The sheet's OWN data, per quotation row: { [rowId]: { … } }. Empty
        // until somebody works the sheet, which is the honest starting state.
        lines: {},
        openedByCollaboratorId: collaborator.id,
        createdAt: now,
      }));
    }
  }

  // THE SHEETS JOIN THE DEAL TOO — the project's own children, and the first of
  // them to do so. `engId` is the id the project itself just joined — derived
  // from the source for the quotation head, minted on the row for the direct
  // one — so it is used directly rather than
  // read back out of the project's reverse index: that would be a read for an
  // answer this function is holding (the hop-count constraint, 20/08/2026).
  // Guarded exactly like the project's own attach — drawing up a sheet must not
  // fail because an index did, and the backfill is the reconciler. Guarded on
  // `engId` being known at all, because the direct head's attach above may have
  // failed and left it blank — attaching to "" would name no root.
  try {
    if (engId) for (const sheet of sheets) await attachRecord(studio.id, engId, "sheet", String(sheet.id), now);
  } catch { /* best-effort: reconciled later */ }

  await announceProjectManager(ctx, project, "");
  return { project: { ...project, progress: 0 }, sheets };
}

// FINANCE ISSUES THE NUMBER, and this is where it happens: when the `po` task
// for a quotation is fully approved. Called from decideTask, next to the write
// that causes it — the same reasoning that puts "raising the first RFQ moves a
// Lead to an Opportunity" inside requestRfq rather than in a screen.
//
// NOT GUARDED HERE, and deliberately so. This is not an action somebody takes;
// it is the CONSEQUENCE of an authority signing, and decideTask has already
// established that the person signing holds the authority. A permission check
// here would ask Finance for a Projects right they have no reason to hold, and
// the number would silently never be issued.
//
// Idempotent: a project that already has a number keeps it. An approval
// withdrawn and given again must not mint a second number, because the first
// one is on documents the client is holding.
export async function issueProjectNumber(
  { studio, listSection }: Pick<ProjectsContext, "studio" | "listSection">,
  quotationId: string,
) {
  if (!listSection || !quotationId) return { issued: "" };
  const rows = await Projects.find({ studio, section: listSection });
  const project = rows.find((p) => p.quotationId === quotationId);
  if (!project) return { issued: "" };            // no project yet — nothing to number
  if (project.number) return { issued: project.number, project };

  // Derived from the highest already issued, never from how many exist, so a
  // deleted project cannot have its number reused. See modules/main/references.js.
  const number = await nextReference(studio.id, { rows, field: "number", prefix: "PRJ" });
  const updated = await Projects.update({ studio, section: listSection }, project.id, { number });
  return { issued: number, project: updated };
}

export async function updateProject(ctx: ProjectsContext, id: string, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "projects.list.edit");
  if (denied) return denied;

  const { studio, listSection } = ctx;
  const rows = await Projects.find({ studio, section: listSection });
  const current = rows.find((p) => p.id === id);
  if (!current) return { error: "notfound" };

  const patch: Record<string, unknown> = {};
  if (body?.title !== undefined) { const v = str(body.title, 200); if (!v) return { error: "title" }; patch.title = v; }
  if (body?.stage !== undefined) {
    if (!PROJECT_STAGES.includes(String(body.stage))) return { error: "stage" };
    patch.stage = String(body.stage);
  }
  for (const f of ["startDate", "endDate"]) if (body?.[f] !== undefined) patch[f] = str(body[f], 10);
  if (body?.managerCollaboratorId !== undefined) patch.managerCollaboratorId = str(body.managerCollaboratorId, 60);
  if (body?.location !== undefined) patch.location = str(body.location, 200);
  if (body?.supportPeriodDays !== undefined) patch.supportPeriodDays = nonNeg(body.supportPeriodDays, DEFAULT_SUPPORT_DAYS);
  if (body?.notes !== undefined) patch.notes = str(body.notes, 4000);

  const project = await Projects.update({ studio, section: listSection }, id, patch);
  if (!project) return { error: "notfound" };
  await announceProjectManager(ctx, project, current.managerCollaboratorId || "");
  // Progress rides the project's plan, not this row, so it is read back from the
  // plans index rather than recomputed here.
  const progress = (await progressByProject(studio.id)).get(id) ?? 0;
  return { project: { ...project, progress } };
}

export async function removeProject(ctx: ProjectsContext, id: string) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "projects.list.delete");
  if (denied) return denied;

  const scope = { studio: ctx.studio, section: ctx.listSection };
  // Read before the delete: the ROW carries the lineage (ticketId/quotationId)
  // that says which engagement claimed this project as its `project` singleton,
  // and after the delete there is nothing left to ask.
  const project = await Projects.byId(scope, id);
  if (!project) return { error: "notfound" };

  // ENGAGEMENT STATE COMES OFF FIRST, THE ROW SECOND — the recoverable
  // direction. A crash between the two leaves a real project with no engagement
  // state, which the backfill (the reconciler, additive and idempotent) heals;
  // the other order leaves the engagement root's `project` singleton pointing at
  // a row that no longer exists, and nothing removes that. Best-effort, exactly
  // like the attach in openProject: failing to detach must not refuse a delete
  // the caller holds the right to make.
  try {
    const engId = await engagementIdFor(ctx.studio.id, "project", id,
      { ticketId: project.ticketId, quotationId: project.quotationId, projectId: id });
    if (engId) await detachRecord(ctx.studio.id, engId, "project", id);
  } catch { /* best-effort: reconciled later */ }

  const removed = await Projects.remove(scope, id);
  if (!removed) return { error: "notfound" };
  // Children-first is already satisfied — the project row is what everything
  // else hangs off — but the board and the plans are documents of their OWN,
  // keyed by the project rather than living in a section collection, so nothing
  // sweeps them for us. Delete them here so a removed project leaves neither a
  // board nor an orphan plan behind.
  await delKeys(PROJECT.board(ctx.studio.id, id));
  await removeProjectPlans(ctx.studio.id, id);
  return { ok: true };
}

export async function projectPeople({ studio }: Pick<ProjectsContext, "studio">) {
  const rows = await listCollaborators(studio.id);
  return rows.map((c) => ({ id: c.id, alias: c.alias || "Unnamed" }));
}

// THE CLIENTS A PROJECT'S PROFILE NAMES — read from Sales, where clients live,
// so the project's client box shows the same logo and contacts the Sales ticket
// does rather than a second copy that drifts. Trimmed to what the box draws
// (logo + the normalised contact list), and empty when this viewer has no Sales
// grant, in which case the box falls back to the project's own clientName.
export async function listProjectClients(
  { studio, salesClientsSection }: Pick<ProjectsContext, "studio" | "salesClientsSection">,
) {
  if (!salesClientsSection) return [];
  const rows = await Clients.find({ studio, section: salesClientsSection });
  return rows.map((c) => ({
    id: c.id,
    name: c.name || "",
    logo: c.logo || "",
    contacts: clientContacts(c),
  }));
}

// ---- the project's Kanban board ---------------------------------------------
// THE BOARD IS THE PROJECT PROFILE NOW. One JSON document per project, read and
// written whole (see PROJECT.board): the board screen is a single client store
// whose entire state moves as a unit, so a document keyed by the project matches
// it exactly and keeps every write to one compare-and-set. The server hands the
// document back, gates the write, and bounds the size — the board mechanics live
// on the client. Members are the studio's collaborators in the shape the board
// draws avatars from; the ids are CollaboratorIDs, the identity inside a studio.

type BoardMember = { id: string; name: string; initials: string; from: string; to: string };

// Avatar gradients chosen deterministically by id, so a person keeps the same
// colours between sessions without any per-person choice being stored.
const BOARD_AVATAR_GRADIENTS: ReadonlyArray<readonly [string, string]> = [
  ["#8b5cf6", "#ec4899"], ["#0ea5e9", "#22d3ee"], ["#10b981", "#84cc16"],
  ["#f59e0b", "#f43f5e"], ["#6366f1", "#a855f7"], ["#14b8a6", "#3b82f6"],
];

function boardInitials(name: string): string {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const letters = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0];
  return letters.toUpperCase();
}

function idHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

async function boardMembers(studioId: string): Promise<BoardMember[]> {
  const rows = await listCollaborators(studioId);
  return rows.map((c) => {
    const id = String(c.id || "");
    const name = String(c.alias || "") || "Unnamed";
    const [from, to] = BOARD_AVATAR_GRADIENTS[idHash(id) % BOARD_AVATAR_GRADIENTS.length];
    return { id, name, initials: boardInitials(name), from, to };
  });
}

export async function readProjectBoard(ctx: ProjectsContext, projectId: string) {
  // Seeing the board is seeing the project: holding projectsContext at all means
  // the projects-list grant was given, which is the view gate — the same way
  // listProjects is section-gated rather than permission-gated. Editing is a
  // separate right, reported so the client renders read-only when it is absent.
  const { studio, listSection, access } = ctx;
  const project = (await Projects.find({ studio, section: listSection })).find((p) => p.id === projectId);
  if (!project) return { error: "notfound" };
  const board = await getJSON<Record<string, unknown>>(PROJECT.board(studio.id, projectId));
  return {
    // Null until the first save — the client then seeds the empty four-column
    // board rather than the server writing a document nobody has opened.
    board: board || null,
    canEdit: can(access, "projects.list.edit"),
    members: await boardMembers(studio.id),
    project: { id: project.id, title: project.title },
  };
}

// A project board that outgrows this is not a board — the cap keeps one key from
// becoming a hot spot the whole studio pays for.
const BOARD_MAX_BYTES = 1_000_000;

export async function saveProjectBoard(ctx: ProjectsContext, projectId: string, board: unknown) {
  const denied = requirePermission(ctx.access, "projects.list.edit");
  if (denied) return denied;
  const { studio, listSection } = ctx;
  const project = (await Projects.find({ studio, section: listSection })).find((p) => p.id === projectId);
  if (!project) return { error: "notfound" };
  if (!board || typeof board !== "object" || Array.isArray(board)) return { error: "board" };
  // The client holds authoritative state, so this is a whole-document set, not a
  // field patch — but still a compare-and-set through editJSON, and bounded.
  if (JSON.stringify(board).length > BOARD_MAX_BYTES) return { error: "too-large" };
  await editJSON(PROJECT.board(studio.id, projectId), () => ({ next: board }));
  return { ok: true };
}

// ---- SLA contracts ----------------------------------------------------------
// A support contract against a delivered project: signed on a date, running for
// a duration, with a number of planned visits and an allowance of emergency
// ones. The SCHEDULE ITSELF IS NOT STORED — modules/projects/sla.js derives the visit dates
// from the start, duration and count, so changing the contract reschedules
// everything instead of leaving stale dates behind. Only what cannot be derived
// is kept: which visits were completed, and the emergency visits actually used.
export async function listSlas({ studio, slaSection }: Pick<ProjectsContext, "studio" | "slaSection">) {
  const rows = await Slas.find({ studio, section: slaSection });
  return [...rows].sort((a, b) => String(b.signingDate || "").localeCompare(String(a.signingDate || "")));
}

function slaFields(body: Record<string, unknown>) {
  return {
    title: str(body?.title, 200),
    projectId: str(body?.projectId, 60),
    signingDate: str(body?.signingDate, 10),
    startDate: str(body?.startDate, 10),
    durationDays: Math.max(1, Math.round(nonNeg(body?.durationDays, 365)) || 365),
    visits: Math.max(1, Math.round(nonNeg(body?.visits, 1)) || 1),
    emergencyVisits: Math.round(nonNeg(body?.emergencyVisits, 0)),
    notes: str(body?.notes, 4000),
  };
}

export async function createSla(ctx: ProjectsContext, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "projects.sla.create");
  if (denied) return denied;

  const { studio, slaSection, collaborator } = ctx;
  const fields = slaFields(body);
  if (!fields.title) return { error: "title" };
  if (!fields.startDate) return { error: "startDate" };

  const sla = await Slas.create({ studio, section: slaSection }, {
    ...fields,
    completedVisits: [],
    emergencyVisitsList: [],
    createdByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
  });
  return { sla };
}

export async function updateSla(ctx: ProjectsContext, id: string, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "projects.sla.edit");
  if (denied) return denied;

  const { studio, slaSection } = ctx;
  const rows = await Slas.find({ studio, section: slaSection });
  const current = rows.find((s) => s.id === id);
  if (!current) return { error: "notfound" };

  const patch: Record<string, unknown> = {};
  if (body?.title !== undefined) { const v = str(body.title, 200); if (!v) return { error: "title" }; patch.title = v; }
  if (body?.projectId !== undefined) patch.projectId = str(body.projectId, 60);
  if (body?.signingDate !== undefined) patch.signingDate = str(body.signingDate, 10);
  if (body?.startDate !== undefined) { const v = str(body.startDate, 10); if (!v) return { error: "startDate" }; patch.startDate = v; }
  if (body?.durationDays !== undefined) patch.durationDays = Math.max(1, Math.round(nonNeg(body.durationDays, 365)) || 365);
  if (body?.visits !== undefined) patch.visits = Math.max(1, Math.round(nonNeg(body.visits, 1)) || 1);
  if (body?.emergencyVisits !== undefined) patch.emergencyVisits = Math.round(nonNeg(body.emergencyVisits, 0));
  if (body?.notes !== undefined) patch.notes = str(body.notes, 4000);

  // Which planned visits are done. Kept as indexes, de-duplicated and bounded by
  // the visit count so shrinking the contract cannot leave a tick behind on a
  // visit that no longer exists.
  if (body?.completedVisits !== undefined) {
    const limit = patch.visits ?? current.visits ?? 1;
    patch.completedVisits = [...new Set((Array.isArray(body.completedVisits) ? body.completedVisits : [])
      .map((n) => Math.round(Number(n)))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= Number(limit)))].sort((a, b) => a - b);
  }

  // Emergency visits are REAL, dated call-outs, so unlike the planned schedule
  // they are stored. The allowance caps how many a contract may hold.
  if (body?.emergencyVisitsList !== undefined) {
    const cap = patch.emergencyVisits ?? current.emergencyVisits ?? 0;
    const list = (Array.isArray(body.emergencyVisitsList) ? body.emergencyVisitsList : [])
      .map((e, i) => ({
        id: str(e?.id, 30) || `ev${i + 1}`,
        date: str(e?.date, 10),
        completed: Boolean(e?.completed),
      }))
      .filter((e) => e.date);
    if (list.length > Number(cap)) return { error: "emergency-cap", cap };
    patch.emergencyVisitsList = list;
  }

  const sla = await Slas.update({ studio, section: slaSection }, id, patch);
  return { sla };
}

export async function removeSla(ctx: ProjectsContext, id: string) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "projects.sla.delete");
  if (denied) return denied;

  const removed = await Slas.remove({ studio: ctx.studio, section: ctx.slaSection }, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// ---- overtime ---------------------------------------------------------------
// Hours somebody worked on a project outside the plan. One row per person per
// stretch, so the matrix can add them up per project and per person, and one
// person's record can be corrected without touching anyone else's.
export async function listOvertimes({ studio, overtimesSection }: Pick<ProjectsContext, "studio" | "overtimesSection">) {
  const rows = await Overtimes.find({ studio, section: overtimesSection });
  return [...rows].sort((a, b) =>
    String(b.date || "").localeCompare(String(a.date || "")) ||
    String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

// Who overtime can be logged against, and the departments the picker filters by.
// People are COLLABORATORS — the studio-local identity every other module
// assigns work to — carrying whatever department HR has put them in.
export async function overtimeDirectory({ studio, sections }: Pick<ProjectsContext, "studio" | "sections">) {
  const people = await listCollaborators(studio.id);
  // NOT HR'S COLLECTION ANY MORE. A department is a top-level section, so the
  // filter is derived from the studio's own structure — which also means
  // Projects no longer needs the HR section to exist before it can name one.
  const departments = departmentsFromSections(sections);
  const depName = Object.fromEntries(departments.map((d) => [d.id, d.name]));
  return {
    people: people
      .map((c) => ({
        id: c.id,
        alias: c.alias || "Unnamed",
        departmentId: c.departmentId || "",
        departmentName: depName[String(c.departmentId || "")] || "",
      }))
      .sort((a, b) => String(a.alias).localeCompare(String(b.alias))),
    departments,
  };
}

// One record per person selected, so logging a whole crew's evening is one
// action here and several rows in the collection — which is what the matrix
// needs to attribute the hours.
export async function createOvertime(ctx: ProjectsContext, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "projects.overtimes.create");
  if (denied) return denied;

  const { studio, overtimesSection, listSection, collaborator } = ctx;
  const projectId = str(body?.projectId, 60);
  const date = str(body?.date, 10);
  const from = str(body?.from, 5);
  const to = str(body?.to, 5);
  const ids = [...new Set((Array.isArray(body?.collaboratorIds) ? body.collaboratorIds : []).map(String).filter(Boolean))];

  if (!projectId) return { error: "project" };
  if (!date) return { error: "date" };
  const hours = hoursBetween(from, to);
  if (hours <= 0) return { error: "times" };
  if (ids.length === 0) return { error: "people" };

  const [projects, { people }] = await Promise.all([
    Projects.find({ studio, section: listSection }),
    overtimeDirectory(ctx),
  ]);
  const project = projects.find((p) => p.id === projectId);
  if (!project) return { error: "project" };
  const byId = Object.fromEntries(people.map((p) => [p.id, p]));
  const known = ids.filter((id) => byId[id]);
  if (known.length === 0) return { error: "people" };

  // Names are SNAPSHOT alongside the ids: an overtime record is a timesheet
  // line, and it has to still read correctly after somebody leaves the studio.
  const created: Overtime[] = [];
  for (const id of known) {
    created.push(await Overtimes.create({ studio, section: overtimesSection }, {
      projectId,
      projectName: project.title || project.number || "",
      collaboratorId: id,
      personName: byId[id].alias,
      departmentId: byId[id].departmentId,
      departmentName: byId[id].departmentName,
      date, from, to, hours,
      loggedByCollaboratorId: collaborator.id,
      createdAt: new Date().toISOString(),
    }));
  }
  // HOURS WORKED ON THIS DEAL'S PROJECT JOIN THE DEAL. One form is one action
  // and several rows, so the engagement is resolved ONCE for the whole crew and
  // every row joins the same member set — see attachToProjectEngagement, which
  // takes the array for exactly this shape and swallows its own failures so a
  // logged evening is never lost to an index write.
  await attachToProjectEngagement(
    studio.id, "overtime", created.map((o) => String(o.id)), projectId, String(created[0]?.createdAt || ""),
  );
  return { overtimes: created };
}

export async function updateOvertime(ctx: ProjectsContext, id: string, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "projects.overtimes.edit");
  if (denied) return denied;

  const { studio, overtimesSection, listSection } = ctx;
  const rows = await Overtimes.find({ studio, section: overtimesSection });
  const current = rows.find((o) => o.id === id);
  if (!current) return { error: "notfound" };

  const patch: Record<string, unknown> = {};
  if (body?.projectId !== undefined) {
    const projects = await Projects.find({ studio, section: listSection });
    const project = projects.find((p) => p.id === str(body.projectId, 60));
    if (!project) return { error: "project" };
    patch.projectId = project.id;
    patch.projectName = project.title || project.number || "";
  }
  if (body?.collaboratorId !== undefined) {
    const { people } = await overtimeDirectory(ctx);
    const person = people.find((p) => p.id === str(body.collaboratorId, 60));
    if (!person) return { error: "people" };
    patch.collaboratorId = person.id;
    patch.personName = person.alias;
    patch.departmentId = person.departmentId;
    patch.departmentName = person.departmentName;
  }
  if (body?.date !== undefined) { const v = str(body.date, 10); if (!v) return { error: "date" }; patch.date = v; }
  // Hours are DERIVED from the times, never taken from the payload — the
  // timesheet has to agree with the window it claims.
  if (body?.from !== undefined || body?.to !== undefined) {
    const from = body?.from !== undefined ? str(body.from, 5) : current.from;
    const to = body?.to !== undefined ? str(body.to, 5) : current.to;
    const hours = hoursBetween(from, to);
    if (hours <= 0) return { error: "times" };
    Object.assign(patch, { from, to, hours });
  }

  const overtime = await Overtimes.update({ studio, section: overtimesSection }, id, patch);
  return { overtime };
}

export async function removeOvertime(ctx: ProjectsContext, id: string) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "projects.overtimes.delete");
  if (denied) return denied;

  // Engagement state first, the row second — the recoverable direction, and the
  // mirror of the attach in createOvertime.
  await detachFromItsEngagement(ctx.studio.id, "overtime", id);
  const removed = await Overtimes.remove({ studio: ctx.studio, section: ctx.overtimesSection }, id);
  return removed ? { ok: true } : { error: "notfound" };
}
