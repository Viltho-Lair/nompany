// PROJECTS — where an approved quotation becomes delivered work.
//
// Completes the chain: Sales ticket -> RFQ -> quotation -> PROJECT. Each step
// snapshots the one before it, so a project can show its whole lineage without
// reading three other sections, and still reads correctly if an upstream record
// is edited later.
//
// A project may only be opened from an APPROVED quotation — that approval is the
// commercial gate, and it lives in Technical/Sales, not here.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { addRow, updateRow, deleteRow, updateSection } from "@/platform/db/sections";
import { moduleContext } from "../context";

import { listCollaborators } from "@/platform/auth/collaborators";
import { REQUIREMENT_WEIGHTS, DEFAULT_SUPPORT_DAYS, hoursBetween } from "./projectSchedule";
import { nextReference } from "@/modules/main/references";
import { ticketFacts } from "@/modules/technical/technical";
import { departmentsFromSections } from "@/lib/departments";
// Whether a quotation is approved is answered by its APPROVAL, not by a copy of
// one — see the note on quotationApproved.
import { quotationApproved } from "@/modules/tasks/taskRouting";
import type { ProjectsContext, Project, Sla, Overtime } from "./types";
import type { Section } from "@/platform/db/sections";
import type { Task } from "@/modules/tasks/types";

export const PROJECT_STAGES = ["Received", "In Progress", "On Hold", "Completed"];
export const DEFAULT_STAGE = "Received";
// A sensible starting checklist; every project can edit its own.
export const DEFAULT_MILESTONES = ["Kick-off", "Procurement", "Execution", "Testing", "Handover"];

const PROJECTS = "projects";
const QUOTATIONS = "quotations";
const SLAS = "slas";
const OVERTIMES = "overtimes";
// Project Sheets live under INVENTORY in this product, matching the Old System.
// Projects writes one when a project is opened and never reads it again.
const SHEETS = "projectSheets";
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
const Slas = repo<Sla>(SLAS);
const Tasks = repo<Task>(TASKS);
// A department is a top-level SECTION, so the overtime picker's filter is
// derived from the studio's own structure rather than read out of HR — see
// lib/departments.js.
const str = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);
const nonNeg = (v: unknown, fallback = 0) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : fallback; };

export const projectsContext = moduleContext({
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
  // How a project's completion percentage divides across its requirements. A
  // blank field means "not set" and is stored as such, so it can fall back to an
  // even split rather than to a zero that would silently drop the requirement.
  if (body?.requirementWeights !== undefined) {
    const raw: Record<string, unknown> = body.requirementWeights && typeof body.requirementWeights === "object"
      ? body.requirementWeights as Record<string, unknown>
      : {};
    next.requirementWeights = Object.fromEntries(
      REQUIREMENT_WEIGHTS.map((w) => [w.key, raw[w.key] === "" || raw[w.key] == null ? "" : nonNeg(raw[w.key], 0)]),
    );
  }
  if (body?.overtimeDefaultDepartmentId !== undefined) {
    next.overtimeDefaultDepartmentId = str(body.overtimeDefaultDepartmentId, 60);
  }
  if (body?.supportPeriodDays !== undefined) next.supportPeriodDays = nonNeg(body.supportPeriodDays, DEFAULT_SUPPORT_DAYS);

  const updated = await updateSection(studio.id, settingsSection.id, { settings: next });
  return updated ? { settings: next } : { error: "notfound" };
}

export function readProjectsSettings(settingsSection: Section | null | undefined) {
  const s = settingsSection?.settings || {};
  return {
    stages: Array.isArray(s.stages) && s.stages.length ? s.stages : PROJECT_STAGES,
    requirementWeights: s.requirementWeights && typeof s.requirementWeights === "object" ? s.requirementWeights : {},
    overtimeDefaultDepartmentId: s.overtimeDefaultDepartmentId || "",
    supportPeriodDays: nonNeg(s.supportPeriodDays, DEFAULT_SUPPORT_DAYS),
  };
}

// Progress is DERIVED from the milestone checklist — never stored independently,
// so it can't drift out of step with the work.
export function progressOf(milestones: unknown) {
  const list = Array.isArray(milestones) ? milestones : [];
  if (!list.length) return 0;
  return Math.round((list.filter((m) => m.done).length / list.length) * 100);
}

export async function listProjects(ctx: ProjectsContext) {
  const { studio, listSection } = ctx;
  const [rows, factsFor] = await Promise.all([
    Projects.find({ studio, section: listSection }),
    ticketFacts(ctx),
  ]);
  return [...rows]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .map((p) => {
      // THE TICKET'S REFERENCE, read back through the ticketId the project
      // carries — so the profile can name where the work came from without the
      // project holding a second copy of it.
      const t = factsFor(p.ticketId);
      return { ...p, ticketRef: t.ticketRef, progress: progressOf(p.milestones) };
    });
}

// Quotations that are Approved and not already delivering — what "open a
// project" can choose from.
export async function approvedQuotations(ctx: ProjectsContext) {
  const { studio, listSection, quotationsSection, tasksSection } = ctx;
  if (!quotationsSection) return [];
  const [quotes, projects, tasks, factsFor] = await Promise.all([
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
      const t = factsFor(q.ticketId);
      return {
        id: q.id, number: q.number, total: q.total,
        title: q.ticketId ? t.title : (q.title || ""),
        clientName: t.clientName,
      };
    });
}

export async function openProject(ctx: ProjectsContext, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "projects.list.create");
  if (denied) return denied;

  const { studio, listSection, technicalSection, collaborator, quotationsSection, sheetsSection, tasksSection } = ctx;
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

  // The quotation no longer holds a copy of the ticket's title and client, so
  // they are read from the ticket it points at.
  //
  // STILL STORED ON THE PROJECT, AND STILL WRONG. Under the rule this row should
  // hold the ticketId and read these back like everything else. It does not yet,
  // because the project's title and client are read straight off the raw rows by
  // the Projects screens and by Finance's cash sheet, and those have to resolve
  // first. Next pass — see the note on ticketFacts.
  const t = (await ticketFacts(ctx))(quote.ticketId);
  const now = new Date().toISOString();
  const project = await addRow(studio.id, listSection.id, PROJECTS, {
    // BLANK UNTIL FINANCE ISSUES IT. The project number is quoted on invoices,
    // purchase orders and delivery notes — it is the studio's commitment to
    // bill this work — and issuing it is Finance's act, taken when they
    // authorise the client's PO. A project can exist before that: the work is
    // planned, the handler is named, the sheet is drawn up. What it cannot do
    // is carry a number nobody issued.
    //
    // Blank rather than provisional, deliberately. A placeholder number would
    // be quoted on something before long, and then it would be the number.
    number: "",
    title: str(body?.title, 200) || t.title || quote.title || "",
    // Lineage — the whole chain of keys.
    quotationId, quotationNumber: quote.number,
    rfqId: quote.rfqId || "", ticketId: quote.ticketId || "",
    clientId: t.clientId, clientName: t.clientName,
    value: Number(quote.total) || 0,
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
    milestones: DEFAULT_MILESTONES.map((name, i) => ({ id: `ms${i + 1}`, name, done: false, doneAt: "" })),
    notes: "",
    openedByCollaboratorId: collaborator.id,
    createdAt: now,
  });

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
  const sheets = [];
  if (sheetsSection) {
    for (const kind of SHEET_KINDS) {
      sheets.push(await addRow(studio.id, sheetsSection.id, SHEETS, {
        // THE KEYS, and nothing else about the job. The project number, the
        // client, the quotation's lines and its numbers are all read back.
        projectId: project.id,
        quotationId, rfqId: quote.rfqId || "", ticketId: quote.ticketId || "",
        kind,
        // The sheet's OWN data, per quotation row: { [rowId]: { … } }. Empty
        // until somebody works the sheet, which is the honest starting state.
        lines: {},
        openedByCollaboratorId: collaborator.id,
        createdAt: now,
      }));
    }
  }

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
  const updated = await updateRow(studio.id, listSection.id, PROJECTS, project.id, { number });
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

  if (body?.milestones !== undefined) {
    patch.milestones = (Array.isArray(body.milestones) ? body.milestones : []).slice(0, 40).map((m, i) => ({
      id: str(m?.id, 20) || `ms${i + 1}`,
      name: str(m?.name, 120),
      done: Boolean(m?.done),
      doneAt: m?.done ? (str(m?.doneAt, 30) || new Date().toISOString()) : "",
    })).filter((m) => m.name);

    // Finishing every milestone completes the project; reopening one takes it
    // back to In Progress, so the stage can never contradict the checklist.
    const done = progressOf(patch.milestones);
    const stage = patch.stage ?? current.stage;
    if (done === 100 && stage !== "Completed") patch.stage = "Completed";
    if (done < 100 && stage === "Completed") patch.stage = "In Progress";
  }

  const project = await updateRow(studio.id, listSection.id, PROJECTS, id, patch);
  if (!project) return { error: "notfound" };
  return { project: { ...project, progress: progressOf(project.milestones) } };
}

export async function removeProject(ctx: ProjectsContext, id: string) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "projects.list.delete");
  if (denied) return denied;

  const removed = await deleteRow(ctx.studio.id, ctx.listSection.id, PROJECTS, id);
  return removed ? { ok: true } : { error: "notfound" };
}

export async function projectPeople({ studio }: Pick<ProjectsContext, "studio">) {
  const rows = await listCollaborators(studio.id);
  return rows.map((c) => ({ id: c.id, alias: c.alias || "Unnamed" }));
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

  const sla = await addRow(studio.id, slaSection.id, SLAS, {
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

  const sla = await updateRow(studio.id, slaSection.id, SLAS, id, patch);
  return { sla };
}

export async function removeSla(ctx: ProjectsContext, id: string) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "projects.sla.delete");
  if (denied) return denied;

  const removed = await deleteRow(ctx.studio.id, ctx.slaSection.id, SLAS, id);
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
  const created = [];
  for (const id of known) {
    created.push(await addRow(studio.id, overtimesSection.id, OVERTIMES, {
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

  const overtime = await updateRow(studio.id, overtimesSection.id, OVERTIMES, id, patch);
  return { overtime };
}

export async function removeOvertime(ctx: ProjectsContext, id: string) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "projects.overtimes.delete");
  if (denied) return denied;

  const removed = await deleteRow(ctx.studio.id, ctx.overtimesSection.id, OVERTIMES, id);
  return removed ? { ok: true } : { error: "notfound" };
}
