// HUMAN RESOURCES — the fourth ERP module rebuilt on the restructured model.
//
// Rows live under the studio's *hr section*:
//   s:<StudioID>:sec:<SectionID>:c:certifications
//   s:<StudioID>:sec:<SectionID>:c:vacations
//
// TWO LISTS HR USED TO OWN ARE GONE, and both for the same reason: they were a
// second copy of something the studio already said.
//
//   departments — MOVED, not deleted, and this line has now been true in three
//                 different ways. HR owned a departments collection; it was
//                 replaced by "a department IS a top-level section", which made
//                 every studio's org chart the product's fifteen nav entries
//                 plus Tasks — a shape no company has. The register is stored
//                 again, under Master data, because an org unit and a product
//                 surface are different things and re-parenting one is an
//                 access act. HR reads it and places people in it; see
//                 modules/administration/departments.ts.
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

import { moduleContext } from "../context";

import { listCollaborators, getCollaborator, updateCollaborator } from "@/platform/auth/collaborators";
import { listRoles, createRole, createRoles, updateRole, deleteRole, ADMIN_ROLE_ID } from "@/modules/people/roles";
import { findLibraryRole, permissionsForLibraryRole, scopesForLibraryRole, searchLibrary } from "@/modules/people/roleLibrary";
import { studioTypesForGrants } from "@/platform/engine/records";
import { listDepartmentsIn } from "@/modules/administration/departments";
import { TAXONOMIES, resolveValue } from "@/modules/administration/taxonomy";
import { subtreeIds } from "@/shared/departments/tree";
import { getProfilesByIds } from "@/platform/auth/users";
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

// THE SHIPPED LEAVE TYPES, READ BACK FROM THE REGISTER THAT OWNS THEM. They
// were five strings here and no studio could add study leave; the list moved
// to administration/taxonomy the way UNITS moved to administration/units, so
// there is one copy rather than a second free to disagree. Callers that only
// want what the product ships still import this name.
export const LEAVE_TYPES = TAXONOMIES.find((a) => a.key === "leaveTypes")!.defaults;
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
  // Employees owns the reference lists (certifications); vacations stay on the
  // parent as studio-wide HR settings.
  sub: { employees: "hr-employees" },
  // THE ORG CHART IS MASTER DATA'S, and HR reads it. Foreign, so it is null on
  // a studio that somehow has no Master data section — which reads as "no
  // departments" rather than a 500, the same way a studio with no Field
  // Operations has nothing that could point at a location.
  // MANPOWER PLANNING HANGS A HEADCOUNT ON A PROJECT, so the project register
  // is read here — foreign and nullable, so a studio that has not opened
  // Projects can still see its roles and simply has no project to plan for.
  foreign: { master: "administration-master", projectsList: ["projects-list", "projects"] },
  flags: ["employees"],
  extend: ({ access }) => ({
    // Handing somebody a role is an ACCESS act, not an HR one, so it is gated on
    // the access permission wherever it is done from — including here.
    canAssignRoles: !requirePermission(access, "administration.members.edit"),
  }),
});

// ---- departments -----------------------------------------------------------
// STORED, AND NOT HR'S. The studio's org chart lives under Master data — see
// modules/administration/departments.ts for why an org unit and a section are
// different things, and why re-parenting one is an access act that must not sit
// behind an HR right.
//
// HR READS IT AND PLACES PEOPLE IN IT. That split is the whole of this module's
// relationship with departments: the picker below is fed from here, and
// `updateEmployee` validates a chosen id against it, but nothing in HR creates,
// renames or re-parents a department.
export async function listDepartments(ctx: Pick<HrContext, "studio" | "masterSection">) {
  return listDepartmentsIn(ctx.studio, ctx.masterSection);
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
      // WHICH DEPARTMENT THIS JOB SITS IN, "" for studio-wide. The screen groups
      // by it; it decides nothing about access.
      departmentId: String(r.departmentId || ""),
      // Whether it came out of the role library or was typed. The screen treats
      // the two differently — a library role arrived with access, a custom one
      // started empty — so it has to be able to tell them apart.
      source: r.source === "library" ? "library" : "custom",
      held: held(r.id),
    }));
}

export async function createHrRole(ctx: HrContext, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "hr.employees.create");
  if (denied) return denied;

  const name = str(body?.name, 60);
  if (!name) return { error: "name" };

  // PLACED IN A DEPARTMENT, checked against the studio's own register. Blank is
  // legal and means studio-wide, which is what Admin is; anything else must
  // name a department that exists right now, so a role cannot be filed under
  // one deleted between the screen loading and the save.
  const departmentId = str(body?.departmentId, 60);
  if (departmentId) {
    const departments = await listDepartments(ctx);
    if (!departments.some((d) => d.id === departmentId)) return { error: "department" };
  }

  const roles = await listRoles(ctx.studio.id);
  // UNIQUE WITHIN THE DEPARTMENT, NOT THE STUDIO — and this is the line that
  // had to change for departmental roles to mean anything. A studio-wide check
  // refused the second "Manager", which is precisely the row the whole design
  // exists to allow: a Manager in Finance and a Manager in Site Execution are
  // two rows on purpose, because they must be able to hold different access.
  //
  // Two names still cannot collide INSIDE one department, because there the
  // name is the only thing telling them apart.
  const clash = roles.some((r) => String(r.departmentId || "") === departmentId
    && (r.name || "").toLowerCase() === name.toLowerCase());
  if (clash) return { error: "duplicate" };

  // NO PERMISSIONS AND NO SCOPES, whatever the payload says. cleanRole would
  // keep them, and this route is not the one that may hand access out. A role
  // typed by hand starts empty; only a library role arrives carrying access,
  // and it arrives through addLibraryRoles rather than here.
  const role = await createRole(ctx.studio.id, {
    name, description: str(body?.description, 200), permissions: [], scopes: {},
    departmentId, source: "custom",
  });
  return { role };
}

/**
 * Add roles to a department from the library.
 *
 * THE PERMISSIONS ARE COPIED, NOT REFERENCED — the same rule a BOQ rate
 * follows, and for the same reason: editing the library afterwards must
 * reprice nothing already created. A role added today keeps what it was given
 * today, and an administrator adjusting it afterwards is adjusting the studio's
 * own row rather than the catalogue.
 *
 * THIS IS THE ONE HR DOOR THAT HANDS OUT ACCESS, and it is worth being explicit
 * about why that is safe when `createHrRole` deliberately refuses to. A custom
 * role is a name somebody typed, so granting anything through it would let HR
 * write its own permissions. A library role's access is decided by the
 * archetype the catalogue assigned, which nobody in the studio can edit — HR
 * chooses WHICH pre-built job to add, not what it may do. An administrator
 * still adjusts it afterwards on the access screen.
 *
 * ADDING THE SAME NAME TWICE IS A NO-OP RATHER THAN A REFUSAL. The screen
 * offers a multi-select, and re-selecting something already there should be
 * quiet rather than an error — the studio asked for that role to exist, and it
 * does.
 */
export async function addLibraryRoles(
  ctx: HrContext,
  { departmentId, names }: { departmentId: string; names: string[] },
) {
  const denied = requirePermission(ctx.access, "hr.employees.create");
  if (denied) return denied;

  const departments = await listDepartments(ctx);
  const department = departments.find((d) => d.id === departmentId);
  if (!department) return { error: "department" };

  // THE SAME TWO NARROWINGS THE PICKER REQUIRES. findLibraryRole would
  // otherwise match a name from any trade, so a stale screen could add Farm
  // Operations Manager to a sales department — the write must refuse on the
  // same terms the read does, or the guard is decoration.
  const industry = str(ctx.studio.fieldOfWork, 200);
  const code = String(department.code || "");
  if (!industry || !code) return { added: 0, roles: [], reason: !industry ? "no-industry" : "no-code" };

  const existing = await listRoles(ctx.studio.id);
  const held = new Set(existing
    .filter((r) => String(r.departmentId || "") === departmentId)
    .map((r) => (r.name || "").toLowerCase()));

  // The studio's own registers, read once: an archetype's `engineSections`
  // expands against what this studio actually holds, custom types included.
  const engineTypes = await studioTypesForGrants(ctx.studio.id);

  const wanted: Record<string, unknown>[] = [];
  for (const raw of Array.isArray(names) ? names : []) {
    const name = str(raw, 60);
    if (!name || held.has(name.toLowerCase())) continue;
    // A NAME THE LIBRARY DOES NOT HOLD FOR THIS DEPARTMENT IS SKIPPED, not
    // created empty. The screen only ever offers names it was served, so a name
    // arriving here that the catalogue cannot place is a stale screen or a
    // hand-made request — and inventing a permissionless role from it would
    // look like the add worked.
    const entry = findLibraryRole(name, industry, code);
    if (!entry) continue;
    held.add(name.toLowerCase());
    wanted.push({
      name: entry.name,
      description: "",
      departmentId,
      source: "library",
      permissions: permissionsForLibraryRole(entry, engineTypes),
      scopes: scopesForLibraryRole(entry),
    });
  }

  const added = await createRoles(ctx.studio.id, wanted);
  return { added: added.length, roles: added };
}

/** What the library offers for one department, for the screen's picker. */
export async function libraryRolesFor(
  ctx: HrContext,
  { departmentId, q = "" }: { departmentId: string; q?: string },
) {
  const denied = requirePermission(ctx.access, "hr.employees.create");
  if (denied) return denied;

  const departments = await listDepartments(ctx);
  const department = departments.find((d) => d.id === departmentId);
  if (!department) return { error: "department" };

  // AN UNFILTERED CATALOGUE IS WORSE THAN AN EMPTY ONE, and this was visible
  // the moment the picker was opened on a real screen. `searchLibrary` treats a
  // blank industry or department as "no filter", so a studio with no field of
  // work, opening a department the migration created without a code, was
  // offered the first twenty rows of the whole library — Farm Operations
  // Manager and Head of Agronomy, for a CRM & Sales department.
  //
  // Nothing failed. It would have quietly invited somebody to file a role in a
  // department it has no business in, which is the one error the department
  // mapping is held to 95% to avoid. So both narrowings are REQUIRED, and the
  // screen is told which one is missing rather than shown a plausible list.
  const industry = str(ctx.studio.fieldOfWork, 200);
  const code = String(department.code || "");
  if (!industry) return { results: [], reason: "no-industry" };
  if (!code) return { results: [], reason: "no-code" };

  const held = new Set((await listRoles(ctx.studio.id))
    .filter((r) => String(r.departmentId || "") === departmentId)
    .map((r) => (r.name || "").toLowerCase()));

  // ALREADY-HELD ROLES ARE MARKED RATHER THAN HIDDEN. A picker that silently
  // drops what you already have reads as a search that cannot find it.
  return {
    results: searchLibrary(q, { industry, department: code, limit: 20 })
      .map((e) => ({ name: e.name, archetype: e.archetype, held: held.has(e.name.toLowerCase()) })),
  };
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
    // Scoped to the role's OWN department, for the same reason the create
    // check is — renaming a Finance role to "Manager" must not be refused
    // because Site Execution already has one.
    const home = String(current.departmentId || "");
    if (roles.some((r) => r.id !== id && String(r.departmentId || "") === home
      && (r.name || "").toLowerCase() === name.toLowerCase())) return { error: "duplicate" };
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

  const certification = await Certifications.create({ studio, section: employeesSection }, {
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

  const certification = await Certifications.update({ studio, section: employeesSection }, id, patch);
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

  const removed = await Certifications.remove({ studio, section: employeesSection }, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// ---- the employee record (= the collaborator row) --------------------------
// `reveal` decrypts the ID/passport numbers, and is only ever passed true for a
// viewer who can manage HR. The shape is otherwise identical either way, so the
// screen never has to branch on permission to render a row.
export async function listEmployees(ctx: HrContext, meId = "") {
  const { studio } = ctx;
  const [people, roles, departments] = await Promise.all([
    listCollaborators(studio.id),
    listRoles(studio.id),
    listDepartments(ctx),
  ]);

  // TWO SEPARATE QUESTIONS, and they used to be one boolean.
  //
  // WHOSE records you may read is scope. WHETHER identity numbers are legible
  // is its own permission — someone may legitimately administer a whole
  // department's records without being entitled to read passport numbers, and
  // `canManage` could not express that.
  const scope = scopeFor(ctx, "hr.employees");
  const reveal = can(ctx.access, "hr.employees.salary");
  const me = people.find((c) => c.id === meId);
  // MY DEPARTMENT AND THE ONES UNDER IT.
  //
  // This was `c.departmentId === me.departmentId` — the same string — which on
  // the derived model meant "the same SECTION" and could not express a manager
  // with teams beneath them at all. An Operations Manager over three sites saw
  // none of the three. `subtreeIds` is the pure walk that answers it, shared
  // with the screen that draws the same tree so the two cannot disagree about
  // anybody's reach.
  const mine = scope === "department" ? subtreeIds(departments, String(me?.departmentId || "")) : null;
  const inScope = (c: CollaboratorRef) => scope === "all"
    || c.id === meId
    || Boolean(mine && mine.has(String(c.departmentId || "")));
  const depName = Object.fromEntries(departments.map((d) => [d.id, d.name]));
  const roleName = Object.fromEntries(roles.map((r) => [r.id, r.name || ""]));

  // THE FACE IS THE PERSON'S, NOT THE STUDIO'S. It used to be a `photo` field on
  // the collaborator row: a copy, in a studio-local record, of something that
  // belongs to the account behind it — so somebody who changed their picture
  // changed it everywhere except here, and HR went on showing whatever was
  // copied in on the day they joined. It is read off the profile now, on every
  // read, exactly as People has always done it.
  //
  // ONE MGET FOR THE WHOLE ROLL, not one GET per person (R9). This was a
  // getProfile-per-employee N+1 — N distinct commands for a screen that lists
  // everyone. getProfilesByIds fetches the visible people's profiles in a single
  // hop; the request cache shares any that were already read.
  //
  // Still forgiving: a profile with no picture yields "", which the screen draws
  // as initials, and a read that fails outright degrades the WHOLE roll to blank
  // faces rather than breaking the list — the same "never let a photo break HR"
  // guarantee the per-row `.catch` gave. Nothing else crosses over from the
  // account: the alias, the role and every HR field below are studio-local.
  const visible = people.filter((c) => inScope(c as CollaboratorRef));
  const userIds = [...new Set(visible.map((c) => String(c.userId || "")).filter(Boolean))];
  const photoByUserId = new Map<string, string>();
  try {
    (await getProfilesByIds(userIds)).forEach((p, i) => photoByUserId.set(userIds[i], p?.photo || ""));
  } catch { /* blank faces, drawn as initials — never break the employee list */ }

  return visible.map((c) => ({
    id: c.id,
    alias: c.alias || "Unnamed",
    role: c.role,
    photo: c.userId ? (photoByUserId.get(String(c.userId)) || "") : "",
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

  // PLACING SOMEBODY IS HR'S; the register is not. The id is checked against
  // the studio's stored org chart, so a person cannot be filed under a
  // department that was deleted between the screen loading and the save.
  if (body?.departmentId !== undefined) {
    const departmentId = str(body.departmentId, 60);
    const departments = await listDepartments(ctx);
    if (departmentId && !departments.some((d) => d.id === departmentId)) return { error: "department" };
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
  const [rows, people, departments] = await Promise.all([
    Vacations.find({ studio, section }),
    listCollaborators(studio.id),
    // READ EVEN WHEN THE SCOPE IS `own` OR `all`, because scopeFor has not been
    // asked yet and asking it first would mean two code paths through this
    // function for one list. The register is a handful of rows on a section the
    // context already resolved; branching to save that read is the kind of
    // cleverness that leaves the department arm untested.
    listDepartments(ctx),
  ]);
  const aliasById = Object.fromEntries(people.map((c) => [c.id, c.alias || "Unnamed"]));

  // WHOSE LEAVE, answered by the model rather than by a boolean invented here.
  // This was `canManage || it is mine`, which could only ever express two of the
  // three real answers — a team lead who should see their own department and no
  // further had nowhere to sit.
  const scope = scopeFor(ctx, "hr.vacations");
  const me = people.find((c) => c.id === meId);
  const mine = (v: Vacation) => v.collaboratorId === meId;
  // The same subtree the employee list is scoped by — a lead who may see their
  // department's records and its sub-teams' must see the same people's leave,
  // or the two screens disagree about who reports to them.
  const underMe = subtreeIds(departments, String(me?.departmentId || ""));
  const sameDepartment = (v: Vacation) => {
    if (!me?.departmentId) return false;
    const owner = people.find((c) => c.id === v.collaboratorId);
    return underMe.has(String(owner?.departmentId || ""));
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

  const vacation = await Vacations.create({ studio, section }, {
    collaboratorId: target,
    // WHAT THIS STUDIO ADMITS, not what the product ships. `resolveValue`
    // returns the register's own spelling, so "annual" is filed as "Annual"
    // and one list cannot split into two on case alone.
    type: resolveValue("leaveTypes", studio.taxonomies, body?.type, DEFAULT_LEAVE_TYPE),
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
          // PRE-FORMATTED, because only the producer knows "3 days" is
          // three days rather than the 3rd, and a template cannot format
          // what it is handed.
          params: {
            who: String(person.alias || "Someone"),
            days: `${days} day${days === 1 ? "" : "s"}`,
          },
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

  const vacation = await Vacations.update({ studio, section }, id, {
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
          params: {
            outcome: String(decision).toLowerCase(),
            dates: `${row.from}${row.to && row.to !== row.from ? ` – ${row.to}` : ""}`,
          },
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

  const removed = await Vacations.remove({ studio: ctx.studio, section: ctx.section }, id);
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
