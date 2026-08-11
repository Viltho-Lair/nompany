// PROJECTS — where an approved quotation becomes delivered work.
//
// Completes the chain: Sales ticket -> RFQ -> quotation -> PROJECT. Each step
// snapshots the one before it, so a project can show its whole lineage without
// reading three other sections, and still reads correctly if an upstream record
// is edited later.
//
// A project may only be opened from an APPROVED quotation — that approval is the
// commercial gate, and it lives in Technical/Sales, not here.

import { getSectionByKey, readCol, addRow, updateRow, deleteRow, listGrants } from "@/lib/data/sections";
import { studioContext, canViewSection, canManageSection } from "@/lib/studios";
import { listCollaborators } from "@/lib/data/collaborators";

export const PROJECT_STAGES = ["Received", "In Progress", "On Hold", "Completed"];
export const DEFAULT_STAGE = "Received";
// A sensible starting checklist; every project can edit its own.
export const DEFAULT_MILESTONES = ["Kick-off", "Procurement", "Execution", "Testing", "Handover"];

const PROJECTS = "projects";
const QUOTATIONS = "quotations";
const str = (v, max = 300) => String(v ?? "").trim().slice(0, max);

export async function projectsContext(user, slug) {
  const context = await studioContext(user, slug);
  if (context.error) return context;
  const { studio, collaborator } = context;

  const [section, technical] = await Promise.all([
    getSectionByKey(studio.id, "projects"),
    getSectionByKey(studio.id, "technical"),
  ]);
  if (!section) return { error: "no-section" };

  const grants = await listGrants(studio.id);
  if (!canViewSection(studio, collaborator, section.id, grants)) return { error: "forbidden" };

  return {
    studio, collaborator, section, technicalSection: technical,
    canManage: canManageSection(studio, collaborator, section.id, grants),
  };
}

// Progress is DERIVED from the milestone checklist — never stored independently,
// so it can't drift out of step with the work.
export function progressOf(milestones) {
  const list = Array.isArray(milestones) ? milestones : [];
  if (!list.length) return 0;
  return Math.round((list.filter((m) => m.done).length / list.length) * 100);
}

export async function listProjects({ studio, section }) {
  const rows = await readCol(studio.id, section.id, PROJECTS);
  return [...rows]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .map((p) => ({ ...p, progress: progressOf(p.milestones) }));
}

// Quotations that are Approved and not already delivering — what "open a
// project" can choose from.
export async function approvedQuotations({ studio, section, technicalSection }) {
  if (!technicalSection) return [];
  const [quotes, projects] = await Promise.all([
    readCol(studio.id, technicalSection.id, QUOTATIONS),
    readCol(studio.id, section.id, PROJECTS),
  ]);
  const used = new Set(projects.map((p) => p.quotationId).filter(Boolean));
  return quotes
    .filter((q) => q.status === "Approved" && !used.has(q.id))
    .map((q) => ({ id: q.id, number: q.number, title: q.title, clientName: q.clientName, total: q.total }));
}

export async function openProject(ctx, body) {
  const { studio, section, technicalSection, collaborator } = ctx;
  if (!technicalSection) return { error: "no-technical" };

  const quotationId = str(body?.quotationId, 60);
  const quotes = await readCol(studio.id, technicalSection.id, QUOTATIONS);
  const quote = quotes.find((q) => q.id === quotationId);
  if (!quote) return { error: "quotation" };
  // The commercial gate: only approved work becomes a project.
  if (quote.status !== "Approved") return { error: "not-approved" };

  const existing = await readCol(studio.id, section.id, PROJECTS);
  if (existing.some((p) => p.quotationId === quotationId)) return { error: "already" };

  const now = new Date().toISOString();
  const project = await addRow(studio.id, section.id, PROJECTS, {
    number: `PRJ-${String(existing.length + 1).padStart(4, "0")}`,
    title: str(body?.title, 200) || quote.title,
    // Lineage — the whole chain, snapshotted.
    quotationId, quotationNumber: quote.number,
    rfqId: quote.rfqId || "", ticketId: quote.ticketId || "",
    clientId: quote.clientId || "", clientName: quote.clientName || "",
    value: Number(quote.total) || 0,
    stage: DEFAULT_STAGE,
    managerCollaboratorId: str(body?.managerCollaboratorId, 60),
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
  const { studio, section } = ctx;
  const rows = await readCol(studio.id, section.id, PROJECTS);
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

  const project = await updateRow(studio.id, section.id, PROJECTS, id, patch);
  return { project: { ...project, progress: progressOf(project.milestones) } };
}

export async function removeProject(ctx, id) {
  const removed = await deleteRow(ctx.studio.id, ctx.section.id, PROJECTS, id);
  return removed ? { ok: true } : { error: "notfound" };
}

export async function projectPeople({ studio }) {
  const rows = await listCollaborators(studio.id);
  return rows.map((c) => ({ id: c.id, alias: c.alias || "Unnamed" }));
}
