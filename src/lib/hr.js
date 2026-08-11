// HUMAN RESOURCES — the fourth ERP module rebuilt on the restructured model.
//
// Rows live under the studio's *hr section*:
//   s:<StudioID>:sec:<SectionID>:c:departments
//   s:<StudioID>:sec:<SectionID>:c:positions
//   s:<StudioID>:sec:<SectionID>:c:certifications
//   s:<StudioID>:sec:<SectionID>:c:vacations
//
// THE EMPLOYEE RECORD IS THE COLLABORATOR ROW. Per the approved plan,
// Collaborator and Employee are ONE entity, so HR does not invent a parallel
// people table — it fills in the HR fields that already sit on
// s:<StudioID>:collaborators (departmentId, positionId, employeeCode, …).
// That is why someone's department exists only inside this studio: the field
// lives on their studio-local row, not on their user account.
//
// ID and passport NUMBERS are encrypted at rest and only ever decrypted for a
// viewer who can *manage* HR. Everyone else sees that a document is on file and
// when it expires — never the number.

import { getSectionByKey, readCol, addRow, updateRow, deleteRow, listGrants, listSections } from "@/lib/data/sections";
import { studioContext, canViewSection, canManageSection, sectionNav } from "@/lib/studios";
import { listCollaborators, getCollaborator, updateCollaborator } from "@/lib/data/collaborators";
import { encryptField, decryptField } from "@/lib/fieldCrypto";
import { currentUser } from "@/lib/identity";

const DEPARTMENTS = "departments";
const POSITIONS = "positions";
const CERTIFICATIONS = "certifications";
const VACATIONS = "vacations";

export const LEAVE_TYPES = ["Annual", "Sick", "Unpaid", "Parental", "Compassionate"];
export const LEAVE_STATUSES = ["Pending", "Approved", "Declined", "Cancelled"];
export const DEFAULT_LEAVE_TYPE = "Annual";

// A document counts as "expiring" this far ahead, so HR sees it coming.
export const EXPIRY_WINDOW_DAYS = 60;

const str = (v, max = 300) => String(v ?? "").trim().slice(0, max);
const day = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "").trim()) ? String(v).trim() : "";

// Resolve studio + membership + the hr section + this person's rights on it.
export async function hrContext(user, slug) {
  const context = await studioContext(user, slug);
  if (context.error) return context;
  const { studio, collaborator } = context;

  const section = await getSectionByKey(studio.id, "hr");
  if (!section) return { error: "no-section" };

  const [grants, sections] = await Promise.all([listGrants(studio.id), listSections(studio.id)]);
  if (!canViewSection(studio, collaborator, section.id, grants)) return { error: "forbidden" };

  return {
    studio, collaborator, section,
    canManage: canManageSection(studio, collaborator, section.id, grants),
    nav: sectionNav(studio, collaborator, sections, grants),
  };
}

// Viewing HR is enough to read; CHANGING it needs the Manage grant. HR has more
// sub-routes than the other modules, so the guard is written once here rather
// than copied into each of them.
export async function hrGuard(paramsPromise, { write } = {}) {
  const user = await currentUser();
  if (!user) return { fail: Response.json({ error: "unauthorized" }, { status: 401 }) };
  const { slug } = await paramsPromise;
  const hr = await hrContext(user, slug);
  if (hr.error) {
    const status = hr.error === "notfound" || hr.error === "no-section" ? 404 : 403;
    return { fail: Response.json({ error: hr.error }, { status }) };
  }
  if (write && !hr.canManage) return { fail: Response.json({ error: "read-only" }, { status: 403 }) };
  return hr;
}

// ---- departments -----------------------------------------------------------
export async function listDepartments({ studio, section }) {
  const rows = await readCol(studio.id, section.id, DEPARTMENTS);
  return [...rows].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

export async function createDepartment(ctx, body) {
  const { studio, section } = ctx;
  const name = str(body?.name, 120);
  if (!name) return { error: "name" };

  const rows = await readCol(studio.id, section.id, DEPARTMENTS);
  if (rows.some((d) => d.name.toLowerCase() === name.toLowerCase())) return { error: "duplicate" };

  const department = await addRow(studio.id, section.id, DEPARTMENTS, {
    name,
    code: str(body?.code, 12).toUpperCase() || autoCode(name, rows),
    description: str(body?.description, 1000),
    createdAt: new Date().toISOString(),
  });
  return { department };
}

export async function editDepartment(ctx, id, body) {
  const { studio, section } = ctx;
  const patch = {};
  if (body?.name !== undefined) {
    const name = str(body.name, 120);
    if (!name) return { error: "name" };
    const rows = await readCol(studio.id, section.id, DEPARTMENTS);
    if (rows.some((d) => d.id !== id && d.name.toLowerCase() === name.toLowerCase())) return { error: "duplicate" };
    patch.name = name;
  }
  if (body?.code !== undefined) patch.code = str(body.code, 12).toUpperCase();
  if (body?.description !== undefined) patch.description = str(body.description, 1000);

  const department = await updateRow(studio.id, section.id, DEPARTMENTS, id, patch);
  return department ? { department } : { error: "notfound" };
}

// Refuses while anyone is still in the department, or a position belongs to it —
// a delete must never leave a person pointing at something that no longer exists.
export async function removeDepartment(ctx, id) {
  const { studio, section } = ctx;
  const [people, positions] = await Promise.all([
    listCollaborators(studio.id),
    readCol(studio.id, section.id, POSITIONS),
  ]);
  const staff = people.filter((c) => c.departmentId === id).length;
  const roles = positions.filter((p) => p.departmentId === id).length;
  if (staff || roles) return { error: "in-use", people: staff, positions: roles };

  const removed = await deleteRow(studio.id, section.id, DEPARTMENTS, id);
  return removed ? { ok: true } : { error: "notfound" };
}

function autoCode(name, rows) {
  const base = name.replace(/[^A-Za-z0-9]+/g, " ").trim().split(" ")
    .map((w) => w[0]).join("").toUpperCase().slice(0, 4) || "DEP";
  const taken = new Set(rows.map((d) => d.code));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 100; i++) if (!taken.has(base + i)) return base + i;
  return base;
}

// ---- positions -------------------------------------------------------------
export async function listPositions({ studio, section }) {
  const [rows, departments] = await Promise.all([
    readCol(studio.id, section.id, POSITIONS),
    readCol(studio.id, section.id, DEPARTMENTS),
  ]);
  const nameById = Object.fromEntries(departments.map((d) => [d.id, d.name]));
  return [...rows]
    .sort((a, b) => (a.title || "").localeCompare(b.title || ""))
    .map((p) => ({ ...p, departmentName: nameById[p.departmentId] || "" }));
}

export async function createPosition(ctx, body) {
  const { studio, section } = ctx;
  const title = str(body?.title, 120);
  if (!title) return { error: "title" };

  const departmentId = str(body?.departmentId, 60);
  if (departmentId) {
    const departments = await readCol(studio.id, section.id, DEPARTMENTS);
    if (!departments.some((d) => d.id === departmentId)) return { error: "department" };
  }

  const rows = await readCol(studio.id, section.id, POSITIONS);
  if (rows.some((p) => p.title.toLowerCase() === title.toLowerCase() && p.departmentId === departmentId)) {
    return { error: "duplicate" };
  }

  const position = await addRow(studio.id, section.id, POSITIONS, {
    title,
    departmentId,
    description: str(body?.description, 1000),
    headcountTarget: Number(body?.headcountTarget) > 0 ? Math.floor(Number(body.headcountTarget)) : 0,
    createdAt: new Date().toISOString(),
  });
  return { position };
}

export async function editPosition(ctx, id, body) {
  const { studio, section } = ctx;
  const patch = {};
  if (body?.title !== undefined) { const v = str(body.title, 120); if (!v) return { error: "title" }; patch.title = v; }
  if (body?.departmentId !== undefined) {
    const departmentId = str(body.departmentId, 60);
    if (departmentId) {
      const departments = await readCol(studio.id, section.id, DEPARTMENTS);
      if (!departments.some((d) => d.id === departmentId)) return { error: "department" };
    }
    patch.departmentId = departmentId;
  }
  if (body?.description !== undefined) patch.description = str(body.description, 1000);
  if (body?.headcountTarget !== undefined) patch.headcountTarget = Number(body.headcountTarget) > 0 ? Math.floor(Number(body.headcountTarget)) : 0;

  const position = await updateRow(studio.id, section.id, POSITIONS, id, patch);
  return position ? { position } : { error: "notfound" };
}

export async function removePosition(ctx, id) {
  const { studio, section } = ctx;
  const people = await listCollaborators(studio.id);
  const held = people.filter((c) => c.positionId === id).length;
  if (held) return { error: "in-use", people: held };

  const removed = await deleteRow(studio.id, section.id, POSITIONS, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// ---- certifications --------------------------------------------------------
export async function listCertifications({ studio, section }) {
  const rows = await readCol(studio.id, section.id, CERTIFICATIONS);
  return [...rows].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

export async function createCertification(ctx, body) {
  const { studio, section } = ctx;
  const name = str(body?.name, 140);
  if (!name) return { error: "name" };

  const rows = await readCol(studio.id, section.id, CERTIFICATIONS);
  if (rows.some((c) => c.name.toLowerCase() === name.toLowerCase())) return { error: "duplicate" };

  const certification = await addRow(studio.id, section.id, CERTIFICATIONS, {
    name,
    issuer: str(body?.issuer, 140),
    validityMonths: Number(body?.validityMonths) > 0 ? Math.floor(Number(body.validityMonths)) : 0,
    notes: str(body?.notes, 1000),
    createdAt: new Date().toISOString(),
  });
  return { certification };
}

export async function editCertification(ctx, id, body) {
  const { studio, section } = ctx;
  const patch = {};
  if (body?.name !== undefined) {
    const name = str(body.name, 140);
    if (!name) return { error: "name" };
    const rows = await readCol(studio.id, section.id, CERTIFICATIONS);
    if (rows.some((c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) return { error: "duplicate" };
    patch.name = name;
  }
  if (body?.issuer !== undefined) patch.issuer = str(body.issuer, 140);
  if (body?.notes !== undefined) patch.notes = str(body.notes, 1000);
  if (body?.validityMonths !== undefined) patch.validityMonths = Number(body.validityMonths) > 0 ? Math.floor(Number(body.validityMonths)) : 0;

  const certification = await updateRow(studio.id, section.id, CERTIFICATIONS, id, patch);
  return certification ? { certification } : { error: "notfound" };
}

export async function removeCertification(ctx, id) {
  const { studio, section } = ctx;
  const people = await listCollaborators(studio.id);
  const held = people.filter((c) => (c.certificationIds || []).includes(id)).length;
  if (held) return { error: "in-use", people: held };

  const removed = await deleteRow(studio.id, section.id, CERTIFICATIONS, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// ---- the employee record (= the collaborator row) --------------------------
// `reveal` decrypts the ID/passport numbers, and is only ever passed true for a
// viewer who can manage HR. The shape is otherwise identical either way, so the
// screen never has to branch on permission to render a row.
export async function listEmployees({ studio, section }, reveal = false) {
  const [people, departments, positions] = await Promise.all([
    listCollaborators(studio.id),
    readCol(studio.id, section.id, DEPARTMENTS),
    readCol(studio.id, section.id, POSITIONS),
  ]);
  const depName = Object.fromEntries(departments.map((d) => [d.id, d.name]));
  const posTitle = Object.fromEntries(positions.map((p) => [p.id, p.title]));

  return people.map((c) => ({
    id: c.id,
    alias: c.alias || "Unnamed",
    role: c.role,
    isAdmin: !!c.isAdmin,
    departmentId: c.departmentId || "",
    departmentName: depName[c.departmentId] || "",
    positionId: c.positionId || "",
    positionTitle: posTitle[c.positionId] || "",
    employeeCode: c.employeeCode || "",
    dateOfJoin: c.dateOfJoin || "",
    mobile: c.mobile || "",
    certificationIds: Array.isArray(c.certificationIds) ? c.certificationIds : [],
    // Documents: presence + expiry are HR-wide; the numbers are gated.
    hasId: !!c.idNumber,
    hasPassport: !!c.passportNumber,
    idExpiry: c.idExpiry || "",
    passportExpiry: c.passportExpiry || "",
    idNumber: reveal ? decryptField(c.idNumber) : "",
    passportNumber: reveal ? decryptField(c.passportNumber) : "",
  })).sort((a, b) => a.alias.localeCompare(b.alias));
}

// Write the HR fields onto someone's studio-local row. Manage-only.
export async function saveEmployment(ctx, collaboratorId, body) {
  const { studio, section } = ctx;
  const person = await getCollaborator(studio.id, collaboratorId);
  if (!person) return { error: "notfound" };

  const patch = {};

  if (body?.departmentId !== undefined) {
    const departmentId = str(body.departmentId, 60);
    if (departmentId) {
      const departments = await readCol(studio.id, section.id, DEPARTMENTS);
      if (!departments.some((d) => d.id === departmentId)) return { error: "department" };
    }
    patch.departmentId = departmentId;
  }
  if (body?.positionId !== undefined) {
    const positionId = str(body.positionId, 60);
    if (positionId) {
      const positions = await readCol(studio.id, section.id, POSITIONS);
      const position = positions.find((p) => p.id === positionId);
      if (!position) return { error: "position" };
      // A position belonging to a department implies that department, so the two
      // fields can never disagree.
      if (position.departmentId) patch.departmentId = position.departmentId;
    }
    patch.positionId = positionId;
  }
  if (body?.employeeCode !== undefined) patch.employeeCode = str(body.employeeCode, 40);
  if (body?.mobile !== undefined) patch.mobile = str(body.mobile, 40);
  if (body?.dateOfJoin !== undefined) patch.dateOfJoin = day(body.dateOfJoin);
  if (body?.idExpiry !== undefined) patch.idExpiry = day(body.idExpiry);
  if (body?.passportExpiry !== undefined) patch.passportExpiry = day(body.passportExpiry);

  // Numbers are encrypted before they touch the store. An empty string clears
  // the field; leaving the key out entirely leaves the stored value alone.
  if (body?.idNumber !== undefined) patch.idNumber = encryptField(str(body.idNumber, 60));
  if (body?.passportNumber !== undefined) patch.passportNumber = encryptField(str(body.passportNumber, 60));

  if (body?.certificationIds !== undefined) {
    const certs = await readCol(studio.id, section.id, CERTIFICATIONS);
    const valid = new Set(certs.map((c) => c.id));
    patch.certificationIds = (Array.isArray(body.certificationIds) ? body.certificationIds : [])
      .map((x) => str(x, 60)).filter((x) => valid.has(x)).slice(0, 50);
  }

  const updated = await updateCollaborator(studio.id, collaboratorId, patch);
  return updated ? { ok: true } : { error: "notfound" };
}

// Documents falling due. Derived on every read rather than stored, so it can
// never drift out of date.
export function expiringDocuments(employees, today = new Date()) {
  const limit = new Date(today);
  limit.setDate(limit.getDate() + EXPIRY_WINDOW_DAYS);
  const out = [];
  for (const e of employees) {
    for (const [kind, date] of [["ID", e.idExpiry], ["Passport", e.passportExpiry]]) {
      if (!date) continue;
      const when = new Date(`${date}T00:00:00`);
      if (Number.isNaN(when.getTime()) || when > limit) continue;
      out.push({
        collaboratorId: e.id, alias: e.alias, kind, date,
        daysLeft: Math.ceil((when - today) / 86400000),
      });
    }
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

// ---- leave -----------------------------------------------------------------
export async function listVacations({ studio, section }, { canManage, meId }) {
  const [rows, people] = await Promise.all([
    readCol(studio.id, section.id, VACATIONS),
    listCollaborators(studio.id),
  ]);
  const aliasById = Object.fromEntries(people.map((c) => [c.id, c.alias || "Unnamed"]));
  // Without manage rights you see your own leave only — a viewer grant on HR
  // is not a licence to read the whole studio's absences.
  return rows
    .filter((v) => canManage || v.collaboratorId === meId)
    .sort((a, b) => (b.from || "").localeCompare(a.from || ""))
    .map((v) => ({ ...v, alias: aliasById[v.collaboratorId] || "Unknown" }));
}

// Anyone who can open HR may request their OWN leave; only a manager may file
// it for someone else.
export async function requestVacation(ctx, body) {
  const { studio, section, collaborator, canManage } = ctx;
  const target = str(body?.collaboratorId, 60) || collaborator.id;
  if (target !== collaborator.id && !canManage) return { error: "forbidden" };

  const person = await getCollaborator(studio.id, target);
  if (!person) return { error: "notfound" };

  const from = day(body?.from);
  const to = day(body?.to) || from;
  if (!from) return { error: "from" };
  if (to < from) return { error: "range" };

  const days = countDays(from, to);

  // Overlapping leave for the same person is almost always a double entry.
  const rows = await readCol(studio.id, section.id, VACATIONS);
  const clash = rows.find((v) => v.collaboratorId === target
    && v.status !== "Declined" && v.status !== "Cancelled"
    && v.from <= to && v.to >= from);
  if (clash) return { error: "overlap", from: clash.from, to: clash.to };

  const vacation = await addRow(studio.id, section.id, VACATIONS, {
    collaboratorId: target,
    type: LEAVE_TYPES.includes(body?.type) ? body.type : DEFAULT_LEAVE_TYPE,
    from, to, days,
    reason: str(body?.reason, 1000),
    // A manager filing leave directly has already made the decision.
    status: canManage && target !== collaborator.id ? "Approved" : "Pending",
    decidedByCollaboratorId: canManage && target !== collaborator.id ? collaborator.id : "",
    requestedByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
  });
  return { vacation };
}

export async function decideVacation(ctx, id, decision) {
  const { studio, section, collaborator, canManage } = ctx;
  const rows = await readCol(studio.id, section.id, VACATIONS);
  const row = rows.find((v) => v.id === id);
  if (!row) return { error: "notfound" };

  // Cancelling your own pending request needs no manage right; deciding
  // someone's leave does.
  const isSelfCancel = decision === "Cancelled" && row.collaboratorId === collaborator.id;
  if (!isSelfCancel && !canManage) return { error: "forbidden" };
  if (!LEAVE_STATUSES.includes(decision)) return { error: "status" };
  if (row.status !== "Pending") return { error: "already-decided", status: row.status };

  const vacation = await updateRow(studio.id, section.id, VACATIONS, id, {
    status: decision,
    decidedByCollaboratorId: collaborator.id,
    decidedAt: new Date().toISOString(),
  });
  return vacation ? { vacation } : { error: "notfound" };
}

export async function removeVacation(ctx, id) {
  const removed = await deleteRow(ctx.studio.id, ctx.section.id, VACATIONS, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// Inclusive day count — a one-day leave is 1 day, not 0.
function countDays(from, to) {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

// Headcount per department, derived from the people themselves.
export function headcount(employees, departments) {
  const byId = Object.fromEntries(departments.map((d) => [d.id, 0]));
  let unassigned = 0;
  for (const e of employees) {
    if (e.departmentId && byId[e.departmentId] !== undefined) byId[e.departmentId] += 1;
    else unassigned += 1;
  }
  return { byDepartment: byId, unassigned, total: employees.length };
}
