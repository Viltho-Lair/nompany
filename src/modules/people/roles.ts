import { readArr, editArr } from "@/platform/db/store";
import { defaultLocale } from "@/shared/locale";
import { starterRoleWord } from "@/shared/studio/starterRoles";
import { S, ID } from "@/platform/db/keys";
import { emit, SCOPE, TYPE } from "@/platform/realtime/events";
import { cascadeDeleteRole } from "@/platform/db/cascade";
import { cleanPermissions, keysForLevel, AREAS, SCOPES, ADMIN_ROLE_ID } from "@/platform/access";
import { CATCH_UP_IDS, catchUpFor } from "./catchUps";
import type { Role } from "./types";
import type { Scope, Level } from "@/platform/access";

// CHANGING A ROLE CHANGES WHAT EVERYONE HOLDING IT MAY DO, so it is announced.
//
// The live stream re-resolves a connection's permissions when it hears this and
// closes the connection if the caller has lost the right to be there at all.
// That machinery was built for the grants model and, when grants gave way to
// roles, nothing was left emitting the event — so the most consequential access
// change in the product reached nobody until they happened to reconnect, and an
// open screen kept offering buttons its owner no longer had.
const announce = (studioId: string) => emit(studioId, { type: TYPE.grantsChanged, scope: SCOPE.PEOPLE });

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

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

function cleanScopes(v: unknown): Record<string, Scope> {
  const out: Record<string, Scope> = {};
  for (const [area, scope] of Object.entries((v || {}) as Record<string, unknown>)) {
    // The `as Scope` is earned by the line it sits on: SCOPES.includes has just
    // established that the value is one of the three.
    if (AREAS.some((a) => a.key === area && a.scoped) && SCOPES.includes(scope as Scope)) {
      out[area] = scope as Scope;
    }
  }
  return out;
}

export function cleanRole(body: Record<string, unknown>) {
  return {
    name: str(body?.name, 60) || "New role",
    description: str(body?.description, 200),
    permissions: cleanPermissions(body?.permissions),
    // Only where the area declares itself scoped; anywhere else a scope would
    // be a stored value nothing reads.
    scopes: cleanScopes(body?.scopes),
    // "" IS A REAL ANSWER — the studio-wide role — so this is deliberately NOT
    // checked against the register here. cleanRole is a pure shaper with no
    // studio in scope; the caller that HAS a department context does the
    // checking, and a blank one needs none.
    departmentId: str(body?.departmentId, 60),
    // Anything but the two known values is "custom". The field decides how a
    // screen treats the row, so a third value would mean neither of the two
    // things it can mean — the same reason cleanScopes drops a scope the area
    // never declared.
    source: body?.source === "library" ? "library" : "custom",
    wildcard: false,
  };
}

// A STUDIO STARTS WITH ADMIN, AND ITS DEPARTMENTS BRING THE REST.
//
// It used to start with five — Admin, Manager, Team Lead, Member, Viewer — and
// the reason was sound: an empty permission grid is where over-granting begins,
// because faced with 159 unchecked boxes people tick everything to make the
// product work and never come back. That reason has not gone away. What changed
// is who answers it.
//
// Departments are real records now, seeded per field of work, and each brings
// the roles its trade usually has. So a new studio still never meets a blank
// editor — it meets "Site Engineer" under Site Execution and "Estimator" under
// Estimation, which is what the generic four could never say. Two of them in
// different departments can also hold different access, which one flat list
// could not express at all.
//
// ADMIN STAYS, AND STAYS STUDIO-WIDE. It is the one wildcard, and a
// per-department wildcard is a contradiction: "everything, within one
// department" is not everything. It is also the role that has to keep meaning
// everything as the product grows, which is why it holds no explicit list.
//
// A STARTER ROLE NAMES AREAS THAT EXIST, so a miss here is a typo in the list
// below rather than a runtime condition — but the seeded roles are what every
// new studio gets, so it fails loudly rather than silently granting nothing.
export const STARTER_ROLES = [
  {
    id: ADMIN_ROLE_ID, name: "Admin", wildcard: true,
    description: "Everything, including capabilities added in future releases.",
    permissions: [], scopes: {}, departmentId: "", source: "custom" as const,
  },
];

// Seeded lazily on first read, the same way the default plan is: a studio that
// existed before roles did gets them the first time anybody looks, with no
// migration to run and nothing to remember.
//
// AND RIGHTS CATCH UP ON THE SAME READ (12/09/2026) — see ./catchUps for what a
// catch-up may say and the four properties that keep it safe. This is the same
// move `plantMissingSections` made for sections the day before, for the owner's
// reason: an update is for the whole ERP, not for whichever studio somebody
// remembered to run a script against.
export async function listRoles(studioId: string, locale = defaultLocale) {
  const rows = await readArr<Role>(S.roles(studioId));
  if (rows.length) return catchUpRights(studioId, rows);
  const seeded = STARTER_ROLES.map((r) => ({
    ...r,
    name: starterRoleWord(locale, r.name),
    description: starterRoleWord(locale, r.description),
    studioId,
    // Born marked, like every role created from now on: a studio seeded today
    // holds what the product seeds it with, not that plus a list of yesterdays.
    catchUps: [...CATCH_UP_IDS],
    createdAt: new Date().toISOString(),
  }));
  await editArr(S.roles(studioId), (cur) => ({ next: cur.length ? cur : seeded }));
  return readArr<Role>(S.roles(studioId));
}

/**
 * THE CATCH-UP, APPLIED ONCE. Asked of the rows already read, so a studio with
 * nothing pending — which is every studio after the first read — pays one
 * `some()` over a handful of rows and writes nothing.
 *
 * INSIDE ONE COMPARE-AND-SET (invariant 8), and re-decided against the rows
 * being written rather than the ones read: two requests arriving together both
 * see work to do, and the second finds the first has done it and writes the same
 * answer. The announcement re-resolves every open connection, so somebody
 * looking at the screen when their role widens sees it without reconnecting.
 */
async function catchUpRights(studioId: string, rows: Role[]): Promise<Role[]> {
  if (!rows.some((r) => catchUpFor(r))) return rows;
  const next = await editArr<Role, Role[]>(S.roles(studioId), (cur) => {
    const updated = cur.map((r) => {
      const caught = catchUpFor(r);
      return caught ? { ...r, ...caught } : r;
    });
    return { next: updated, result: updated };
  });
  await announce(studioId);
  return next || rows;
}

export async function createRole(studioId: string, body: Record<string, unknown>) {
  // BORN MARKED. Whoever writes a role ticks exactly what they mean; adding to
  // it on the next read because of an entry dated last week would be ./catchUps
  // overruling a person.
  const row = {
    id: ID.role(), studioId, ...cleanRole(body),
    catchUps: [...CATCH_UP_IDS], createdAt: new Date().toISOString(),
  };
  await editArr(S.roles(studioId), (rows) => ({ next: [...rows, row] }));
  await announce(studioId);
  return row;
}

/**
 * Append MANY roles in ONE write.
 *
 * Not `createRole` in a loop, and the difference is not a micro-optimisation:
 * looping is one compare-and-set per row, so seeding a department's ten roles
 * is ten contended rounds on one key while every other writer to that studio's
 * roles waits. This is one round whatever the length — the same reasoning
 * `createMany` states for collection rows.
 *
 * ONE ANNOUNCEMENT, not one per role. `announce` re-resolves every open
 * connection's permissions, so firing it ten times for one seed would do the
 * expensive thing nine times for nothing.
 */
export async function createRoles(studioId: string, bodies: readonly Record<string, unknown>[]) {
  if (!bodies.length) return [];
  const now = new Date().toISOString();
  const batch = bodies.map((body) => ({
    id: ID.role(), studioId, ...cleanRole(body),
    // Born marked, for the reason `createRole` states: a library role arrives
    // with its archetype's rights and nothing else.
    catchUps: [...CATCH_UP_IDS], createdAt: now,
  }));
  await editArr(S.roles(studioId), (rows) => ({ next: [...rows, ...batch] }));
  await announce(studioId);
  return batch;
}

export async function updateRole(studioId: string, id: string, body: Record<string, unknown>) {
  // The wildcard's permission list is meaningless and its name is load-bearing,
  // so Admin takes a description and nothing else.
  const out = await editArr(S.roles(studioId), (rows) => ({
    next: rows.map((r) => {
      if (r.id !== id) return r;
      if (r.wildcard) return { ...r, description: str(body?.description, 200) || r.description };
      // THE MARKS ARE THE ROW'S, NEVER THE BODY'S. `cleanRole` shapes what a
      // person sent and knows nothing of them, so they are carried across
      // explicitly — an edit that dropped them would hand back, on the next
      // read, exactly the rights this edit may have just removed.
      return { ...r, ...cleanRole({ ...r, ...body }), catchUps: r.catchUps || [] };
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
export async function deleteRole(studioId: string, id: string) {
  if (id === ADMIN_ROLE_ID) return { error: "protected" };
  const out = await cascadeDeleteRole(studioId, id);
  await announce(studioId);
  // How many people just lost it. The caller says so out loud rather than
  // letting a handful of quiet permission changes go unremarked.
  return { ok: true, stripped: out.stripped };
}
