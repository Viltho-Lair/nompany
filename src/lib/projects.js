// PROJECTS — where an approved quotation becomes delivered work.
//
// Completes the chain: Sales ticket -> RFQ -> quotation -> PROJECT. Each step
// snapshots the one before it, so a project can show its whole lineage without
// reading three other sections, and still reads correctly if an upstream record
// is edited later.
//
// A project may only be opened from an APPROVED quotation — that approval is the
// commercial gate, and it lives in Technical/Sales, not here.

import { sectionViewable, sectionManageable, requirePermission } from "@/lib/access";
import { readCol, addRow, updateRow, deleteRow, updateSection, listGrants, listSections } from "@/lib/data/sections";
import { studioContext, sectionNav, manageMap } from "@/lib/studios";
import { listCollaborators } from "@/lib/data/collaborators";
import { REQUIREMENT_WEIGHTS, DEFAULT_SUPPORT_DAYS, hoursBetween } from "@/lib/projectSchedule";

export const PROJECT_STAGES = ["Received", "In Progress", "On Hold", "Completed"];
export const DEFAULT_STAGE = "Received";
// A sensible starting checklist; every project can edit its own.
export const DEFAULT_MILESTONES = ["Kick-off", "Procurement", "Execution", "Testing", "Handover"];

const PROJECTS = "projects";
const QUOTATIONS = "quotations";
const SLAS = "slas";
const OVERTIMES = "overtimes";
// Departments live under HR; Projects reads them so the overtime picker can
// filter by one, and works without them when a studio has no HR section.
const DEPARTMENTS = "departments";
const str = (v, max = 300) => String(v ?? "").trim().slice(0, max);
const nonNeg = (v, fallback = 0) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : fallback; };

export async function projectsContext(user, slug) {
  const context = await studioContext(user, slug);
  if (context.error) return context;
  // `access` is resolved in studioContext; forwarding it is what lets every
  // service function guard itself without resolving anything again.
  // `roles` travels with `access`: scopeFor needs it, and a context that
  // carries one without the other is half an answer.
  const { studio, collaborator, access, roles } = context;

  const [grants, sections] = await Promise.all([listGrants(studio.id), listSections(studio.id)]);
  const byKey = Object.fromEntries(sections.map((x) => [x.key, x]));
  const section = byKey["projects"];
  const technical = byKey["technical"];
  if (!section) return { error: "no-section" };
  // THE VIEW GUARD, asked of the permission set. It read grants until now, so
  // anybody holding a role but no legacy grant — every new hire once roles are
  // in use — was shown the section in the nav and refused when they opened it.
  if (!sectionViewable(access, section.key, sections.map((s) => s.key))) return { error: "forbidden" };

  // Sub-sections own the collections; the parent is the fallback for a studio
  // predating the model. Quotations still live under Technical.
  const listSection = byKey["projects-list"] || section;
  const slaSection = byKey["projects-sla"] || section;
  const overtimesSection = byKey["projects-overtimes"] || section;
  const settingsSection = byKey["projects-settings"] || section;
  const quotationsSection = byKey["technical-quotations"] || technical;
  // HR owns the department list. Projects only reads it, to filter the overtime
  // people picker, and copes with a studio that has no HR section at all.
  const hrEmployeesSection = byKey["hr-employees"] || byKey["hr"] || null;

  return {
    studio, collaborator, access, roles, section, technicalSection: technical, hrEmployeesSection,
    listSection, slaSection, overtimesSection, settingsSection, quotationsSection,
    canManage: sectionManageable(access, section.key),
    canManageList: sectionManageable(access, listSection.key),
    canManageSla: sectionManageable(access, slaSection.key),
    canManageOvertimes: sectionManageable(access, overtimesSection.key),
    canManageSettings: sectionManageable(access, settingsSection.key),
    settings: settingsSection.settings || {},
    nav: sectionNav(studio, collaborator, sections, grants, access),
    // Manage, per section key — each screen asks about itself.
    manage: manageMap(studio, collaborator, sections, grants, access),
  };
}

// Projects Settings live on the projects-settings sub-section's own `settings`
// object, so they need no key of their own and die with the sub-section.
// Patch semantics: only the keys present in the body are touched.
export async function saveProjectsSettings(ctx, body) {
  // Guarded before anything is read or written — see lib/access.js.
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
    const raw = body.requirementWeights && typeof body.requirementWeights === "object" ? body.requirementWeights : {};
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

export function readProjectsSettings(settingsSection) {
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
export function progressOf(milestones) {
  const list = Array.isArray(milestones) ? milestones : [];
  if (!list.length) return 0;
  return Math.round((list.filter((m) => m.done).length / list.length) * 100);
}

export async function listProjects({ studio, listSection }) {
  const rows = await readCol(studio.id, listSection.id, PROJECTS);
  return [...rows]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .map((p) => ({ ...p, progress: progressOf(p.milestones) }));
}

// Quotations that are Approved and not already delivering — what "open a
// project" can choose from.
export async function approvedQuotations({ studio, listSection, quotationsSection }) {
  if (!quotationsSection) return [];
  const [quotes, projects] = await Promise.all([
    readCol(studio.id, quotationsSection.id, QUOTATIONS),
    readCol(studio.id, listSection.id, PROJECTS),
  ]);
  const used = new Set(projects.map((p) => p.quotationId).filter(Boolean));
  return quotes
    .filter((q) => q.status === "Approved" && !used.has(q.id))
    .map((q) => ({ id: q.id, number: q.number, title: q.title, clientName: q.clientName, total: q.total }));
}

export async function openProject(ctx, body) {
  // Guarded before anything is read or written — see lib/access.js.
  const denied = requirePermission(ctx.access, "projects.list.create");
  if (denied) return denied;

  const { studio, listSection, technicalSection, collaborator, quotationsSection } = ctx;
  if (!technicalSection) return { error: "no-technical" };

  const quotationId = str(body?.quotationId, 60);
  const quotes = await readCol(studio.id, quotationsSection.id, QUOTATIONS);
  const quote = quotes.find((q) => q.id === quotationId);
  if (!quote) return { error: "quotation" };
  // The commercial gate: only approved work becomes a project.
  if (quote.status !== "Approved") return { error: "not-approved" };

  const existing = await readCol(studio.id, listSection.id, PROJECTS);
  if (existing.some((p) => p.quotationId === quotationId)) return { error: "already" };

  const now = new Date().toISOString();
  const project = await addRow(studio.id, listSection.id, PROJECTS, {
    number: `PRJ-${String(existing.length + 1).padStart(4, "0")}`,
    title: str(body?.title, 200) || quote.title,
    // Lineage — the whole chain, snapshotted.
    quotationId, quotationNumber: quote.number,
    rfqId: quote.rfqId || "", ticketId: quote.ticketId || "",
    clientId: quote.clientId || "", clientName: quote.clientName || "",
    value: Number(quote.total) || 0,
    stage: DEFAULT_STAGE,
    managerCollaboratorId: str(body?.managerCollaboratorId, 60),
    location: str(body?.location, 200),
    // The complementary support window runs from the project's END date, so it
    // means nothing until the project has one — but the length is decided now.
    supportPeriodDays: nonNeg(body?.supportPeriodDays, ctx.settings?.supportPeriodDays ?? DEFAULT_SUPPORT_DAYS),
    receivedDate: now.slice(0, 10),
    startDate: str(body?.startDate, 10),
    endDate: str(body?.endDate, 10),
    milestones: DEFAULT_MILESTONES.map((name, i) => ({ id: `ms${i + 1}`, name, done: false, doneAt: "" })),
    notes: "",
    openedByCollaboratorId: collaborator.id,
    createdAt: now,
  });
  return { project: { ...project, progress: 0 } };
}

export async function updateProject(ctx, id, body) {
  // Guarded before anything is read or written — see lib/access.js.
  const denied = requirePermission(ctx.access, "projects.list.edit");
  if (denied) return denied;

  const { studio, listSection } = ctx;
  const rows = await readCol(studio.id, listSection.id, PROJECTS);
  const current = rows.find((p) => p.id === id);
  if (!current) return { error: "notfound" };

  const patch = {};
  if (body?.title !== undefined) { const v = str(body.title, 200); if (!v) return { error: "title" }; patch.title = v; }
  if (body?.stage !== undefined) {
    if (!PROJECT_STAGES.includes(body.stage)) return { error: "stage" };
    patch.stage = body.stage;
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
  return { project: { ...project, progress: progressOf(project.milestones) } };
}

export async function removeProject(ctx, id) {
  // Guarded before anything is read or written — see lib/access.js.
  const denied = requirePermission(ctx.access, "projects.list.delete");
  if (denied) return denied;

  const removed = await deleteRow(ctx.studio.id, ctx.listSection.id, PROJECTS, id);
  return removed ? { ok: true } : { error: "notfound" };
}

export async function projectPeople({ studio }) {
  const rows = await listCollaborators(studio.id);
  return rows.map((c) => ({ id: c.id, alias: c.alias || "Unnamed" }));
}

// ---- SLA contracts ----------------------------------------------------------
// A support contract against a delivered project: signed on a date, running for
// a duration, with a number of planned visits and an allowance of emergency
// ones. The SCHEDULE ITSELF IS NOT STORED — lib/sla.js derives the visit dates
// from the start, duration and count, so changing the contract reschedules
// everything instead of leaving stale dates behind. Only what cannot be derived
// is kept: which visits were completed, and the emergency visits actually used.
export async function listSlas({ studio, slaSection }) {
  const rows = await readCol(studio.id, slaSection.id, SLAS);
  return [...rows].sort((a, b) => String(b.signingDate || "").localeCompare(String(a.signingDate || "")));
}

function slaFields(body) {
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

export async function createSla(ctx, body) {
  // Guarded before anything is read or written — see lib/access.js.
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

export async function updateSla(ctx, id, body) {
  // Guarded before anything is read or written — see lib/access.js.
  const denied = requirePermission(ctx.access, "projects.sla.edit");
  if (denied) return denied;

  const { studio, slaSection } = ctx;
  const rows = await readCol(studio.id, slaSection.id, SLAS);
  const current = rows.find((s) => s.id === id);
  if (!current) return { error: "notfound" };

  const patch = {};
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
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= limit))].sort((a, b) => a - b);
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
    if (list.length > cap) return { error: "emergency-cap", cap };
    patch.emergencyVisitsList = list;
  }

  const sla = await updateRow(studio.id, slaSection.id, SLAS, id, patch);
  return { sla };
}

export async function removeSla(ctx, id) {
  // Guarded before anything is read or written — see lib/access.js.
  const denied = requirePermission(ctx.access, "projects.sla.delete");
  if (denied) return denied;

  const removed = await deleteRow(ctx.studio.id, ctx.slaSection.id, SLAS, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// ---- overtime ---------------------------------------------------------------
// Hours somebody worked on a project outside the plan. One row per person per
// stretch, so the matrix can add them up per project and per person, and one
// person's record can be corrected without touching anyone else's.
export async function listOvertimes({ studio, overtimesSection }) {
  const rows = await readCol(studio.id, overtimesSection.id, OVERTIMES);
  return [...rows].sort((a, b) =>
    String(b.date || "").localeCompare(String(a.date || "")) ||
    String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

// Who overtime can be logged against, and the departments the picker filters by.
// People are COLLABORATORS — the studio-local identity every other module
// assigns work to — carrying whatever department HR has put them in.
export async function overtimeDirectory({ studio, hrEmployeesSection }) {
  const [people, departments] = await Promise.all([
    listCollaborators(studio.id),
    hrEmployeesSection ? readCol(studio.id, hrEmployeesSection.id, DEPARTMENTS) : [],
  ]);
  const depName = Object.fromEntries(departments.map((d) => [d.id, d.name || ""]));
  return {
    people: people
      .map((c) => ({
        id: c.id,
        alias: c.alias || "Unnamed",
        departmentId: c.departmentId || "",
        departmentName: depName[c.departmentId] || "",
      }))
      .sort((a, b) => a.alias.localeCompare(b.alias)),
    departments: departments
      .map((d) => ({ id: d.id, name: d.name || "" }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

// One record per person selected, so logging a whole crew's evening is one
// action here and several rows in the collection — which is what the matrix
// needs to attribute the hours.
export async function createOvertime(ctx, body) {
  // Guarded before anything is read or written — see lib/access.js.
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
    readCol(studio.id, listSection.id, PROJECTS),
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

export async function updateOvertime(ctx, id, body) {
  // Guarded before anything is read or written — see lib/access.js.
  const denied = requirePermission(ctx.access, "projects.overtimes.edit");
  if (denied) return denied;

  const { studio, overtimesSection, listSection } = ctx;
  const rows = await readCol(studio.id, overtimesSection.id, OVERTIMES);
  const current = rows.find((o) => o.id === id);
  if (!current) return { error: "notfound" };

  const patch = {};
  if (body?.projectId !== undefined) {
    const projects = await readCol(studio.id, listSection.id, PROJECTS);
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

export async function removeOvertime(ctx, id) {
  // Guarded before anything is read or written — see lib/access.js.
  const denied = requirePermission(ctx.access, "projects.overtimes.delete");
  if (denied) return denied;

  const removed = await deleteRow(ctx.studio.id, ctx.overtimesSection.id, OVERTIMES, id);
  return removed ? { ok: true } : { error: "notfound" };
}
