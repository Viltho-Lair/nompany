import { readArr, editArr } from "@/platform/db/store";
import { S, ID } from "@/platform/db/keys";
import { emit, SCOPE, TYPE } from "@/lib/data/events";
import { cascadeDeleteRole } from "@/platform/db/cascade";
import { cleanPermissions, keysForLevel, AREAS, SCOPES, ADMIN_ROLE_ID } from "@/platform/access";

// CHANGING A ROLE CHANGES WHAT EVERYONE HOLDING IT MAY DO, so it is announced.
//
// The live stream re-resolves a connection's permissions when it hears this and
// closes the connection if the caller has lost the right to be there at all.
// That machinery was built for the grants model and, when grants gave way to
// roles, nothing was left emitting the event — so the most consequential access
// change in the product reached nobody until they happened to reconnect, and an
// open screen kept offering buttons its owner no longer had.
const announce = (studioId) => emit(studioId, { type: TYPE.grantsChanged, scope: SCOPE.PEOPLE });

// ROLES — named bundles of permissions, defined per studio.
//
// A role is NOT a department and not a position. Those are org-chart facts: two
// people in Sales can be an engineer and a manager and must not have the same
// access. Access shape is its own axis, so it gets its own concept.
//
// Roles live under the studio prefix, so they die with the studio and need no
// cascade — the same reasoning as sections and grants.
//
// WHY NAMED BUNDLES: a per-person grid preserves only the residue of a
// decision. Six months later nobody can say why Omar has those eleven ticks.
// "Sales Engineer" says what was meant, and fixing the role fixes everyone.

// Exactly ONE wildcard role, and it is labelled as one. Admin has to keep
// meaning "everything" as the product grows, or admins silently stop being
// admins each time a feature ships. Every other role is an explicit list, which
// is why a new permission reaches nobody until somebody says so.
//
// Defined in platform/access/catalogue.ts and re-exported here, so server code can keep
// importing it from the module it belongs to while the browser gets it without
// the store.
export { ADMIN_ROLE_ID };

const str = (v, max) => String(v ?? "").trim().slice(0, max);

function cleanScopes(v) {
  const out = {};
  for (const [area, scope] of Object.entries(v || {})) {
    if (AREAS.some((a) => a.key === area && a.scoped) && SCOPES.includes(scope)) out[area] = scope;
  }
  return out;
}

export function cleanRole(body) {
  return {
    name: str(body?.name, 60) || "New role",
    description: str(body?.description, 200),
    permissions: cleanPermissions(body?.permissions),
    // Only where the area declares itself scoped; anywhere else a scope would
    // be a stored value nothing reads.
    scopes: cleanScopes(body?.scopes),
    wildcard: false,
  };
}

// A studio starts with roles rather than a blank editor. An empty permission
// grid is where over-granting begins: faced with 110 unchecked boxes, people
// tick everything to make the product work and never come back.
const level = (areaKey, lvl) => keysForLevel(AREAS.find((a) => a.key === areaKey), lvl);

export const STARTER_ROLES = [
  {
    id: ADMIN_ROLE_ID, name: "Admin", wildcard: true,
    description: "Everything, including capabilities added in future releases.",
    permissions: [], scopes: {},
  },
  {
    id: "role_manager", name: "Manager",
    description: "Runs a department: full control of its work, sight of the rest.",
    permissions: [
      // THE DASHBOARDS. A module's summary is now its own right, so it has to be
      // granted rather than arriving with any child. A manager runs a
      // department, so seeing the department whole is the job.
      ...level("sales.dashboard", "view"), ...level("technical.dashboard", "view"),
      ...level("projects.dashboard", "view"), ...level("inventory.dashboard", "view"),
      ...level("hr.dashboard", "view"), ...level("finance.dashboard", "view"),
      ...level("sales.tickets", "full"), ...level("sales.clients", "full"), ...level("sales.live", "view"),
      ...level("technical.rfq", "edit"), ...level("technical.quotations", "full"),
      ...level("projects.list", "full"), ...level("projects.sla", "edit"),
      ...level("inventory.stock", "view"), ...level("inventory.items", "view"),
      ...level("operations.tracking", "edit"), ...level("tasks.board", "full"),
      ...level("hr.employees", "view"), ...level("hr.vacations", "edit"),
      "hr.vacations.approve", "technical.rfq.convert",
    ],
    scopes: { "hr.employees": "department", "hr.vacations": "department" },
  },
  {
    id: "role_lead", name: "Team Lead",
    description: "Does the work and assigns it, without settings or deletion.",
    permissions: [
      // The three they work in. Not Finance, and not HR — a lead assigns work,
      // which is not the same as being shown what the department costs or who
      // is in it. Member and Viewer get no dashboard at all: the summary is the
      // thing a studio most often means to withhold, so it is not a default.
      ...level("sales.dashboard", "view"), ...level("technical.dashboard", "view"),
      ...level("projects.dashboard", "view"),
      ...level("sales.tickets", "edit"), ...level("sales.clients", "edit"),
      ...level("technical.rfq", "edit"), ...level("technical.quotations", "edit"),
      ...level("projects.list", "edit"), ...level("tasks.board", "full"),
      ...level("inventory.items", "view"), ...level("operations.tracking", "edit"),
      ...level("hr.vacations", "view"),
    ],
    scopes: { "hr.vacations": "own" },
  },
  {
    id: "role_member", name: "Member",
    description: "Does the work: raises and edits records, deletes nothing.",
    permissions: [
      ...level("sales.tickets", "edit"), ...level("sales.clients", "view"),
      ...level("technical.quotations", "view"), ...level("projects.list", "view"),
      ...level("tasks.board", "edit"), ...level("inventory.items", "view"),
      ...level("hr.vacations", "edit"),
    ],
    scopes: { "hr.vacations": "own" },
  },
  {
    id: "role_viewer", name: "Viewer",
    description: "Reads, changes nothing.",
    permissions: [
      ...level("sales.tickets", "view"), ...level("sales.clients", "view"),
      ...level("technical.quotations", "view"), ...level("projects.list", "view"),
      ...level("inventory.items", "view"), ...level("tasks.board", "view"),
    ],
    scopes: {},
  },
];

// Seeded lazily on first read, the same way the default plan is: a studio that
// existed before roles did gets them the first time anybody looks, with no
// migration to run and nothing to remember.
export async function listRoles(studioId) {
  const rows = await readArr(S.roles(studioId));
  if (rows.length) return rows;
  const seeded = STARTER_ROLES.map((r) => ({ ...r, studioId, createdAt: new Date().toISOString() }));
  await editArr(S.roles(studioId), (cur) => ({ next: cur.length ? cur : seeded }));
  return readArr(S.roles(studioId));
}

export async function createRole(studioId, body) {
  const row = { id: ID.role(), studioId, ...cleanRole(body), createdAt: new Date().toISOString() };
  await editArr(S.roles(studioId), (rows) => ({ next: [...rows, row] }));
  await announce(studioId);
  return row;
}

export async function updateRole(studioId, id, body) {
  // The wildcard's permission list is meaningless and its name is load-bearing,
  // so Admin takes a description and nothing else.
  const out = await editArr(S.roles(studioId), (rows) => ({
    next: rows.map((r) => {
      if (r.id !== id) return r;
      if (r.wildcard) return { ...r, description: str(body?.description, 200) || r.description };
      return { ...r, ...cleanRole({ ...r, ...body }) };
    }),
  }));
  await announce(studioId);
  return out;
}

// DELETING A ROLE DELETES ITS ACCESS, because they are the same row — and it
// takes the reference off everybody holding it, so nobody is left pointing at a
// job that no longer exists. That reaping is cascade.js's, like every other
// deletion in this product; this function is the door onto it.
//
// It never REFUSES on account of holders. A held role is exactly the one
// somebody means to delete, and the studio saying "this job is gone" is a
// decision, not an accident — the screens confirm how many people lose access
// before asking for it. Admin is the one exception, and not because it is held:
// a studio with no wildcard role is one where a new capability reaches nobody,
// including whoever is meant to fix that.
export async function deleteRole(studioId, id) {
  if (id === ADMIN_ROLE_ID) return { error: "protected" };
  const out = await cascadeDeleteRole(studioId, id);
  await announce(studioId);
  // How many people just lost it. The caller says so out loud rather than
  // letting a handful of quiet permission changes go unremarked.
  return { ok: true, stripped: out.stripped };
}
