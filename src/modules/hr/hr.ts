// HUMAN RESOURCES — the fourth ERP module rebuilt on the restructured model.
//
// Rows live under the studio's *hr section*:
//   s:<StudioID>:sec:<SectionID>:c:certifications
//   s:<StudioID>:sec:<SectionID>:c:vacations
//
// TWO LISTS HR USED TO OWN ARE GONE, and both for the same reason: they were a
// second copy of something the studio already said.
//
//   departments — the studio's top-level SECTIONS are its departments. See
//                 lib/departments.js. Nothing to create, nothing to delete,
//                 and no way for the org chart to disagree with the nav.
//   positions   — a position was a job title with a description, sitting
//                 beside the ROLES that decide what a job may actually do.
//                 Two lists naming the same thing, one of which was load-
//                 bearing. They are one list now: HR names the role, Access
//                 says what it may do, and both read s:<StudioID>:roles.
//
// THE EMPLOYEE RECORD IS THE COLLABORATOR ROW. Per the approved plan,
// Collaborator and Employee are ONE entity, so HR does not invent a parallel
// people table — it fills in the HR fields that already sit on
// s:<StudioID>:collaborators (departmentId, employeeCode, …). That is why
// someone's department exists only inside this studio: the field lives on their
// studio-local row, not on their user account.
//
// ID and passport NUMBERS are encrypted at rest and only ever decrypted for a
// viewer who can *manage* HR. Everyone else sees that a document is on file and
// when it expires — never the number.

import { requirePermission, scopeFor, can, escalates, cleanAssignment, effectivePermissions } from "@/platform/access";
import { repo } from "@/platform/db/repo";

import { addRow, updateRow, deleteRow } from "@/platform/db/sections";
import { moduleContext } from "../context";

import { listCollaborators, getCollaborator, updateCollaborator } from "@/platform/auth/collaborators";
import { listRoles, createRole, updateRole, deleteRole, ADMIN_ROLE_ID } from "@/modules/people/roles";
import { departmentsFromSections } from "@/lib/departments";
import { getProfile } from "@/platform/auth/users";
import { notifyCollaborators, NOTIFY } from "@/platform/notify/notifications";
import { encryptField, decryptField } from "@/platform/auth/fieldCrypto";
import type { Certification, Vacation, ExpiringDocument, HrContext } from "./types";
import type { StudioRef, CollaboratorRef } from "../context";
import type { Section } from "@/platform/db/sections";

const CERTIFICATIONS = "certifications";
const VACATIONS = "vacations";

// THE COLLECTIONS THIS MODULE QUERIES, named once. A repository binds a
// collection, not a scope — the studio and section arrive per call, which is
// what stops a query naming another tenant's keys and what lets one object
// answer for a sibling department's rows as easily as its own.
const Certifications = repo<Certification>(CERTIFICATIONS);
const Vacations = repo<Vacation>(VACATIONS);

export const LEAVE_TYPES = ["Annual", "Sick", "Unpaid", "Parental", "Compassionate"];
export const LEAVE_STATUSES = ["Pending", "Approved", "Declined", "Cancelled"];
export const DEFAULT_LEAVE_TYPE = "Annual";

// A document counts as "expiring" this far ahead, so HR sees it coming.
export const EXPIRY_WINDOW_DAYS = 60;

const str = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);
const day = (v: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "").trim()) ? String(v).trim() : "";

// Resolve studio + membership + the hr section + this person's rights on it.
// THE COLLECTIONS THIS MODULE QUERIES, named once. A repository binds a
// collection name, not a scope — the studio and section arrive with each call,
// which is what keeps a query from ever naming another tenant's keys.
export const hrContext = moduleContext<HrContext>({
  root: "hr",
  // Employees owns the reference lists (departments/certifications); vacations
  // stay on the parent as studio-wide HR settings.
  sub: { employees: "hr-employees" },
  flags: ["employees"],
  extend: ({ access }) => ({
    // Handing somebody a role is an ACCESS act, not an HR one, so it is gated on
    // the access permission wherever it is done from — including here.
    canAssignRoles: !requirePermission(access, "people.members.edit"),
  }),
});

// ---- departments -----------------------------------------------------------
// DERIVED, NOT STORED. There is no departments collection any more and no CRUD
// to reach it — the studio's top-level sections are its departments, so this is
// a projection of the section list the context already carries. See
// lib/departments.js for why.
export function listDepartments({ sections }: { sections: Section[] }) {
  return departmentsFromSections(sections);
}

// ---- roles -------------------------------------------------------------------
// WHAT HR CALLS A ROLE AND WHAT ACCESS CALLS A ROLE ARE THE SAME ROW.
//
// HR used to keep `positions`: a title, a department and a description. Access
// keeps `roles`: a name, a description and the permissions that name implies.
// Two lists for one idea, and only one of them meant anything — somebody's
// position said what they were called, their role said what they could do, and
// nothing tied the two together.
//
// So the split is by QUESTION, not by list:
//
//   HR names the job          -> name + description, here, on hr.employees.*
//   Access says what it may do -> permissions + scopes, there, on
//                                 people.members.edit
//
// NAMING A JOB CANNOT ESCALATE ANYTHING, which is what makes that split safe:
// a role created here carries no permissions at all, so the worst somebody with
// HR rights and nothing else can do is invent a job title that grants nothing.
// Deciding what it may do stays where it was.
//
// Admin is excluded from every write below. It is the studio's built-in
// wildcard rather than a role anybody created, and it is not HR's to rename.
export async function listHrRoles(ctx: HrContext) {
  const [roles, people] = await Promise.all([
    listRoles(ctx.studio.id),
    listCollaborators(ctx.studio.id),
  ]);
  const held = (id: string) => people.filter((c) => ((c.roleIds || []) as string[]).includes(id)).length;
  return [...roles]
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
    .map((r) => ({
      id: r.id,
      name: r.name || "",
      description: r.description || "",
      // BUILT-IN, not created — the badge the screen shows and the reason the
      // edit and delete buttons are withheld.
      wildcard: Boolean(r.wildcard),
      // What Access has said about it, carried so HR can show whether the job
      // has been given any access yet without a second call.
      permissionCount: r.wildcard ? null : (r.permissions || []).length,
      held: held(r.id),
    }));
}

export async function createHrRole(ctx: HrContext, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "hr.employees.create");
  if (denied) return denied;

  const name = str(body?.name, 60);
  if (!name) return { error: "name" };

  const roles = await listRoles(ctx.studio.id);
  if (roles.some((r) => (r.name || "").toLowerCase() === name.toLowerCase())) return { error: "duplicate" };

  // NO PERMISSIONS AND NO SCOPES, whatever the payload says. cleanRole would
  // keep them, and this route is not the one that may hand access out.
  const role = await createRole(ctx.studio.id, {
    name, description: str(body?.description, 200), permissions: [], scopes: {},
  });
  return { role };
}

export async function editHrRole(ctx: HrContext, id: string, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "hr.employees.edit");
  if (denied) return denied;

  if (id === ADMIN_ROLE_ID) return { error: "protected" };
  const roles = await listRoles(ctx.studio.id);
  const current = roles.find((r) => r.id === id);
  if (!current) return { error: "notfound" };
  if (current.wildcard) return { error: "protected" };

  const patch: Record<string, unknown> = {};
  if (body?.name !== undefined) {
    const name = str(body.name, 60);
    if (!name) return { error: "name" };
    if (roles.some((r) => r.id !== id && (r.name || "").toLowerCase() === name.toLowerCase())) return { error: "duplicate" };
    patch.name = name;
  }
  if (body?.description !== undefined) patch.description = str(body.description, 200);

  // SPREAD OVER THE CURRENT ROW, so renaming a job cannot quietly wipe the
  // permissions Access put on it — updateRole cleans whatever it is handed,
  // and a patch without `permissions` would clean to an empty list.
  await updateRole(ctx.studio.id, id, { ...current, ...patch });
  return { ok: true };
}

// DELETING A ROLE TAKES ITS ACCESS WITH IT, for everybody holding it — that is
// what deleting a job means, and cascadeDeleteRole reaps the reference so nobody
// is left pointing at one that is gone.
//
// Which is precisely why a HELD role is not HR's alone to delete. Naming a job
// grants nothing, so HR may do that on its own; deleting one that people hold
// CHANGES WHAT THOSE PEOPLE MAY DO, and that answers to the access permission —
// the same rule that governs putting somebody in a role in the first place.
// Without it, an HR grant would be a way to strip every manager in the studio.
//
// An unheld role changes nobody's access, so it stays HR's.
export async function removeHrRole(ctx: HrContext, id: string) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "hr.employees.delete");
  if (denied) return denied;

  if (id === ADMIN_ROLE_ID) return { error: "protected" };
  const people = await listCollaborators(ctx.studio.id);
  const held = people.filter((c) => ((c.roleIds || []) as string[]).includes(id)).length;
  if (held > 0 && !ctx.canAssignRoles) return { error: "role-forbidden", people: held };

  const out = await deleteRole(ctx.studio.id, id);
  return out.error ? out : { ok: true, stripped: out.stripped };
}

// ---- certifications --------------------------------------------------------
export async function listCertifications(
  { studio, employeesSection }: { studio: StudioRef; employeesSection: Section },
) {
  const rows = await Certifications.find({ studio, section: employeesSection });
  return [...rows].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

export async function createCertification(ctx: HrContext, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "hr.employees.create");
  if (denied) return denied;

  const { studio, employeesSection } = ctx;
  const name = str(body?.name, 140);
  if (!name) return { error: "name" };

  const rows = await Certifications.find({ studio, section: employeesSection });
  if (rows.some((c) => c.name.toLowerCase() === name.toLowerCase())) return { error: "duplicate" };

  const certification = await addRow(studio.id, employeesSection.id, CERTIFICATIONS, {
    name,
    issuer: str(body?.issuer, 140),
    validityMonths: Number(body?.validityMonths) > 0 ? Math.floor(Number(body.validityMonths)) : 0,
    notes: str(body?.notes, 1000),
    createdAt: new Date().toISOString(),
  });
  return { certification };
}

export async function editCertification(ctx: HrContext, id: string, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "hr.employees.edit");
  if (denied) return denied;

  const { studio, employeesSection } = ctx;
  const patch: Record<string, unknown> = {};
  if (body?.name !== undefined) {
    const name = str(body.name, 140);
    if (!name) return { error: "name" };
    const rows = await Certifications.find({ studio, section: employeesSection });
    if (rows.some((c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) return { error: "duplicate" };
    patch.name = name;
  }
  if (body?.issuer !== undefined) patch.issuer = str(body.issuer, 140);
  if (body?.notes !== undefined) patch.notes = str(body.notes, 1000);
  if (body?.validityMonths !== undefined) patch.validityMonths = Number(body.validityMonths) > 0 ? Math.floor(Number(body.validityMonths)) : 0;

  const certification = await updateRow(studio.id, employeesSection.id, CERTIFICATIONS, id, patch);
  return certification ? { certification } : { error: "notfound" };
}

export async function removeCertification(ctx: HrContext, id: string) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "hr.employees.delete");
  if (denied) return denied;

  const { studio, employeesSection } = ctx;
  const people = await listCollaborators(studio.id);
  const held = people.filter((c) => ((c.certificationIds || []) as string[]).includes(id)).length;
  if (held) return { error: "in-use", people: held };

  const removed = await deleteRow(studio.id, employeesSection.id, CERTIFICATIONS, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// ---- the employee record (= the collaborator row) --------------------------
// `reveal` decrypts the ID/passport numbers, and is only ever passed true for a
// viewer who can manage HR. The shape is otherwise identical either way, so the
// screen never has to branch on permission to render a row.
export async function listEmployees(ctx: HrContext, meId = "") {
  const { studio } = ctx;
  const [people, roles] = await Promise.all([
    listCollaborators(studio.id),
    listRoles(studio.id),
  ]);
  const departments = listDepartments(ctx);

  // TWO SEPARATE QUESTIONS, and they used to be one boolean.
  //
  // WHOSE records you may read is scope. WHETHER identity numbers are legible
  // is its own permission — someone may legitimately administer a whole
  // department's records without being entitled to read passport numbers, and
  // `canManage` could not express that.
  const scope = scopeFor(ctx, "hr.employees");
  const reveal = can(ctx.access, "hr.employees.salary");
  const me = people.find((c) => c.id === meId);
  const inScope = (c: CollaboratorRef) => scope === "all"
    || c.id === meId
    || (scope === "department" && Boolean(me?.departmentId) && c.departmentId === me?.departmentId);
  const depName = Object.fromEntries(departments.map((d) => [d.id, d.name]));
  const roleName = Object.fromEntries(roles.map((r) => [r.id, r.name || ""]));

  // THE FACE IS THE PERSON'S, NOT THE STUDIO'S. It used to be a `photo` field on
  // the collaborator row: a copy, in a studio-local record, of something that
  // belongs to the account behind it — so somebody who changed their picture
  // changed it everywhere except here, and HR went on showing whatever was
  // copied in on the day they joined. It is read off the profile now, on every
  // read, exactly as People has always done it.
  //
  // In parallel, and forgiving: a profile that fails or has no picture yields
  // "", which the screen already knows how to draw as initials. Nothing else
  // crosses over from the account — the alias, the role and every HR field
  // below are studio-local and stay that way.
  const visible = people.filter((c) => inScope(c as CollaboratorRef));
  const photos = await Promise.all(
    visible.map((c) => (c.userId ? getProfile(String(c.userId)).then((p) => p?.photo || "").catch(() => "") : "")),
  );

  return visible.map((c, i) => ({
    id: c.id,
    alias: c.alias || "Unnamed",
    role: c.role,
    photo: photos[i] || "",
    departmentId: c.departmentId || "",
    departmentName: depName[String(c.departmentId || "")] || "",
    // WHAT THEY ARE, which is now the same answer as what they may do. Carried
    // off the roles they hold rather than a position id of their own.
    roleIds: Array.isArray(c.roleIds) ? c.roleIds : [],
    roleNames: (Array.isArray(c.roleIds) ? c.roleIds : []).map((id) => roleName[String(id)]).filter(Boolean),
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
  })).sort((a, b) => String(a.alias).localeCompare(String(b.alias)));
}

// Write the HR fields onto someone's studio-local row. Manage-only.
export async function saveEmployment(ctx: HrContext, collaboratorId: string, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "hr.employees.edit");
  if (denied) return denied;

  const { studio, employeesSection } = ctx;
  const person = await getCollaborator(studio.id, collaboratorId);
  if (!person) return { error: "notfound" };

  const patch: Record<string, unknown> = {};

  // A DEPARTMENT IS A SECTION KEY now, so what it is checked against is the
  // studio's own section list rather than a collection of HR's.
  if (body?.departmentId !== undefined) {
    const departmentId = str(body.departmentId, 60);
    if (departmentId && !listDepartments(ctx).some((d) => d.id === departmentId)) return { error: "department" };
    patch.departmentId = departmentId;
  }

  // PUTTING SOMEBODY IN A ROLE IS HANDING THEM ACCESS, and it is the same write
  // the People screen makes — so it answers to the same two rules here as it
  // does there, rather than slipping in through an HR grant:
  //
  //   people.members.edit  — assigning access is its own permission
  //   escalates()          — and nobody may hand out what they do not hold
  //
  // Without both, hr.employees.edit would be a second door onto the studio's
  // entire permission model: give somebody HR and they could give themselves
  // Admin. The role field is simply not offered to anyone who lacks the right.
  if (body?.roleIds !== undefined) {
    if (!ctx.canAssignRoles) return { error: "role-forbidden" };
    const roles = await listRoles(studio.id);
    const assignment = cleanAssignment({ roleIds: body.roleIds }, roles.map((r) => r.id));
    const bad = escalates(ctx.access, assignment, roles);
    if (bad) return bad;
    patch.roleIds = assignment.roleIds;
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
    const certs = await Certifications.find({ studio, section: employeesSection });
    const valid = new Set(certs.map((c) => c.id));
    patch.certificationIds = (Array.isArray(body.certificationIds) ? body.certificationIds : [])
      .map((x) => str(x, 60)).filter((x) => valid.has(x)).slice(0, 50);
  }

  const updated = await updateCollaborator(studio.id, collaboratorId, patch);
  return updated ? { ok: true } : { error: "notfound" };
}

// Documents falling due. Derived on every read rather than stored, so it can
// never drift out of date.
export function expiringDocuments(employees: Record<string, unknown>[], today = new Date()) {
  const limit = new Date(today);
  limit.setDate(limit.getDate() + EXPIRY_WINDOW_DAYS);
  const out: ExpiringDocument[] = [];
  for (const e of employees) {
    for (const [kind, date] of [["ID", e.idExpiry], ["Passport", e.passportExpiry]]) {
      if (!date) continue;
      const when = new Date(`${date}T00:00:00`);
      if (Number.isNaN(when.getTime()) || when > limit) continue;
      out.push({
        collaboratorId: String(e.id), alias: String(e.alias), kind: String(kind), date: String(date),
        daysLeft: Math.ceil((when.getTime() - today.getTime()) / 86400000),
      });
    }
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

// ---- leave -----------------------------------------------------------------
export async function listVacations(ctx: HrContext, { meId }: { meId?: string }) {
  const { studio, section } = ctx;
  const [rows, people] = await Promise.all([
    Vacations.find({ studio, section }),
    listCollaborators(studio.id),
  ]);
  const aliasById = Object.fromEntries(people.map((c) => [c.id, c.alias || "Unnamed"]));

  // WHOSE LEAVE, answered by the model rather than by a boolean invented here.
  // This was `canManage || it is mine`, which could only ever express two of the
  // three real answers — a team lead who should see their own department and no
  // further had nowhere to sit.
  const scope = scopeFor(ctx, "hr.vacations");
  const me = people.find((c) => c.id === meId);
  const mine = (v: Vacation) => v.collaboratorId === meId;
  const sameDepartment = (v: Vacation) => {
    if (!me?.departmentId) return false;
    const owner = people.find((c) => c.id === v.collaboratorId);
    return owner?.departmentId === me.departmentId;
  };
  const inScope = scope === "all" ? () => true
    : scope === "department" ? (v: Vacation) => mine(v) || sameDepartment(v)
    : mine;

  return rows
    .filter(inScope)
    .sort((a, b) => (b.from || "").localeCompare(a.from || ""))
    .map((v) => ({ ...v, alias: aliasById[v.collaboratorId] || "Unknown" }));
}

// WHO CAN APPROVE LEAVE, resolved from the same right the screen enforces
// (`hr.vacations.approve`) rather than a flag — a request announced to somebody
// who cannot act on it wastes the one person who saw it, exactly as with a join
// request. Returns collaborators, so the caller has their UserIDs for the bell.
async function leaveApprovers(studioId: string) {
  const [people, roles] = await Promise.all([listCollaborators(studioId), listRoles(studioId)]);
  return people.filter((c) => can(effectivePermissions({ collaborator: c, roles }), "hr.vacations.approve"));
}

// Anyone who can open HR may request their OWN leave; only a manager may file
// it for someone else.
export async function requestVacation(ctx: HrContext, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "hr.vacations.create");
  if (denied) return denied;

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
  const rows = await Vacations.find({ studio, section });
  const clash = rows.find((v) => v.collaboratorId === target
    && v.status !== "Declined" && v.status !== "Cancelled"
    && (v.from || "") <= to && (v.to || "") >= from);
  if (clash) return { error: "overlap", from: clash.from, to: clash.to };

  const vacation = await addRow(studio.id, section.id, VACATIONS, {
    collaboratorId: target,
    type: LEAVE_TYPES.includes(String(body?.type)) ? String(body?.type) : DEFAULT_LEAVE_TYPE,
    from, to, days,
    reason: str(body?.reason, 1000),
    // A manager filing leave directly has already made the decision.
    status: canManage && target !== collaborator.id ? "Approved" : "Pending",
    decidedByCollaboratorId: canManage && target !== collaborator.id ? collaborator.id : "",
    requestedByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
  });
  // A request that is already Approved (a manager filing for someone else) has
  // nobody to ask, so only a genuinely Pending one rings the approvers — and
  // never the requester's own bell for a request they just filed.
  if (vacation?.status === "Pending") {
    const approvers = (await leaveApprovers(studio.id)).filter((c) => c.id !== collaborator.id);
    if (approvers.length) {
      const userIdOf = new Map(approvers.map((c) => [String(c.id), String(c.userId)]));
      await notifyCollaborators(
        studio.id,
        approvers.map((c) => String(c.id)),
        {
          type: NOTIFY.leaveRequested,
          title: "A leave request is waiting",
          body: `${person.alias || "Someone"} requested ${days} day${days === 1 ? "" : "s"} off.`,
          href: "hr",
          tone: "primary",
        },
        { userIdOf: (id) => userIdOf.get(id) },
      );
    }
  }
  return { vacation };
}

export async function decideVacation(ctx: HrContext, id: string, decision: unknown) {
  const { studio, section, collaborator, canManage } = ctx;
  const rows = await Vacations.find({ studio, section });
  const row = rows.find((v) => v.id === id);
  if (!row) return { error: "notfound" };

  // TAKING BACK YOUR OWN REQUEST IS NOT A DECISION ABOUT SOMEBODY'S LEAVE.
  //
  // The approve guard used to sit above this line, which made the branch it
  // exists for unreachable: withdrawing your own pending request needed the
  // right to approve other people's, so anybody without it was stuck with a
  // request they could not take back.
  const isSelfCancel = decision === "Cancelled" && row.collaboratorId === collaborator.id;

  if (!isSelfCancel) {
    // Approving somebody's leave is its own power, not a bigger edit — which is
    // why the catalogue gives it a key rather than folding it into hr.vacations.
    const denied = requirePermission(ctx.access, "hr.vacations.approve");
    if (denied) return denied;
    if (!canManage) return { error: "forbidden" };
  }
  if (!LEAVE_STATUSES.includes(String(decision))) return { error: "status" };
  if (row.status !== "Pending") return { error: "already-decided", status: row.status };

  const vacation = await updateRow(studio.id, section.id, VACATIONS, id, {
    status: decision,
    decidedByCollaboratorId: collaborator.id,
    decidedAt: new Date().toISOString(),
  });
  if (!vacation) return { error: "notfound" };

  // THE HALF OF THE SCENARIO THAT MATTERS: the requester hears the outcome. Not
  // on a self-cancel — you do not notify yourself that you withdrew your own
  // request — and the recipient is whoever ASKED, which on a manager-filed
  // request is the employee, not the manager who typed it.
  const requesterId = row.requestedByCollaboratorId || row.collaboratorId;
  if (!isSelfCancel && requesterId && requesterId !== collaborator.id) {
    const requester = await getCollaborator(studio.id, requesterId);
    if (requester) {
      await notifyCollaborators(
        studio.id,
        [requesterId],
        {
          type: NOTIFY.leaveDecided,
          title: `Your leave was ${String(decision).toLowerCase()}`,
          body: `${row.from}${row.to && row.to !== row.from ? ` – ${row.to}` : ""}`,
          href: "hr",
          tone: decision === "Approved" ? "success" : "warning",
        },
        { userIdOf: (id) => (id === requester.id ? String(requester.userId) : undefined) },
      );
    }
  }
  return { vacation };
}

export async function removeVacation(ctx: HrContext, id: string) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "hr.vacations.edit");
  if (denied) return denied;

  const removed = await deleteRow(ctx.studio.id, ctx.section.id, VACATIONS, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// Inclusive day count — a one-day leave is 1 day, not 0.
function countDays(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
}

// Headcount per department, derived from the people themselves.
export function headcount(
  employees: Record<string, unknown>[],
  departments: { id: string; name?: string }[],
) {
  const byId: Record<string, number> = Object.fromEntries(departments.map((d) => [d.id, 0]));
  let unassigned = 0;
  for (const e of employees) {
    const dept = String(e.departmentId || "");
    if (dept && byId[dept] !== undefined) byId[dept] += 1;
    else unassigned += 1;
  }
  return { byDepartment: byId, unassigned, total: employees.length };
}
