import { ALL_PERMISSIONS, isPermission } from "./catalogue";
import type { PermissionKey, Scope } from "./catalogue";

// THE THREE ROWS THIS MODULE READS, described by what it needs from them rather
// than by what they are. A collaborator row carries a dozen fields; access cares
// about four, and saying so keeps this module from becoming a second definition
// of the collaborator record that is free to drift from the real one. The row
// types themselves arrive with platform/db.
//
// STRINGS, NOT PermissionKey, on the stored lists. These come out of Redis,
// written by a request that could have said anything — which is why every read
// of them below goes through isPermission rather than trusting the field. A
// role whose `permissions` were typed as the union would be a promise the
// database cannot keep.
export type Collaborator = {
  readonly role?: string;
  readonly alias?: string;
  readonly roleIds?: readonly string[];
  readonly overrides?: { readonly allow?: readonly string[]; readonly deny?: readonly string[] };
};

export type Role = {
  readonly id: string;
  readonly name?: string;
  readonly wildcard?: boolean;
  readonly permissions?: readonly string[];
  readonly scopes?: Readonly<Record<string, Scope>>;
};

// What resolution hands back, and what every guard takes. Readonly because
// nothing downstream may add to somebody's access after the fact — that is the
// whole of invariant 3, expressed in a way the compiler can hold.
export type PermissionSet = ReadonlySet<PermissionKey>;

// The question every one of these functions is asked about: who, in which
// studio, holding which roles.
export type Subject = {
  readonly studio?: unknown;
  readonly collaborator?: Collaborator | null;
  readonly roles?: readonly Role[];
};

// THE ONE PLACE THAT ANSWERS "MAY THIS PERSON DO THIS".
//
// The old model had twenty-two files each reading a flag and deciding for
// itself. That is why the UI and the write paths disagreed, and why every fix
// was an audit rather than an edit. Everything now goes through `can` and
// `requirePermission`, so a rule change is one change and a missing check is
// findable.
//
// Resolution is deliberately DUMB: a set of strings, membership tested. No
// inheritance, no wildcards except the one Admin flag, no cascading. Anything
// clever here becomes something nobody can reason about at 2am.

// Section key -> the area(s) behind it. The nav asks about SECTIONS and the
// model holds AREAS, so this is the one place that maps between them.
export const SECTION_AREAS: Readonly<Record<string, readonly string[]>> = {
  // THE PARENTS THAT ARE NOT ONLY HEADINGS. Each of these renders a dashboard of
  // its own, so each has a right of its own — see DASHBOARD_AREAS in
  // platform/access/catalogue.ts. They still have children, and both answers matter:
  // sectionViewable below asks the parent's own area FIRST and falls through to
  // the children, so withholding the dashboard hides the summary without making
  // the ticket screen underneath it unreachable.
  sales: ["sales.dashboard"],
  technical: ["technical.dashboard"],
  projects: ["projects.dashboard"],
  inventory: ["inventory.dashboard"],
  hr: ["hr.dashboard"],
  finance: ["finance.dashboard"],
  operations: ["operations.dashboard"],
  quality: ["quality.dashboard"],

  "sales-tickets": ["sales.tickets"],
  "sales-clients": ["sales.clients"],
  "sales-live": ["sales.live"],
  "sales-settings": ["sales.settings"],
  "technical-rfq": ["technical.rfq"],
  "technical-quotations": ["technical.quotations"],
  "technical-live": ["technical.live"],
  "technical-settings": ["technical.settings"],
  "projects-list": ["projects.list"],
  "projects-sla": ["projects.sla"],
  "projects-overtimes": ["projects.overtimes"],
  "projects-settings": ["projects.settings"],
  "inventory-stock": ["inventory.stock"],
  "inventory-vendors": ["inventory.vendors"],
  "inventory-items": ["inventory.items"],
  "inventory-sheets": ["inventory.sheets"],
  "inventory-awb": ["inventory.awb"],
  "hr-employees": ["hr.employees", "hr.vacations"],
  "finance-cash": ["finance.cash"],
  "finance-settings": ["finance.settings"],
  "operations-tracking": ["operations.tracking"],
  "operations-settings": ["operations.settings"],
  "quality-documents": ["quality.documents"],
  "tasks-settings": ["tasks.settings"],
  tasks: ["tasks.board"],
};


// ---- resolution ------------------------------------------------------------

// Everything this person may do in this studio, as a flat Set of keys.
//
// Roles and personal overrides, and nothing else. There is no fallback: a
// person with no role can do nothing, which is the default-deny the old model
// claimed and never quite managed.
export function effectivePermissions({ collaborator, roles = [] }: Subject): PermissionSet {
  // The owner is not permissioned. They own the studio, and a studio that can
  // lock out its own owner is a support ticket that cannot be answered.
  if (collaborator?.role === "owner") return new Set(ALL_PERMISSIONS);

  const held = new Set<PermissionKey>();
  const assigned = Array.isArray(collaborator?.roleIds) ? collaborator.roleIds : [];
  const mine = (roles || []).filter((r) => assigned.includes(r.id));

  // Exactly one wildcard, and it is Admin. Everything else is an explicit list,
  // which is what stops a new permission reaching anyone by accident.
  if (mine.some((r) => r.wildcard)) return new Set(ALL_PERMISSIONS);
  for (const r of mine) for (const k of r.permissions || []) if (isPermission(k)) held.add(k);


  // Personal exceptions, applied last and stored as a DIFF from the role. Deny
  // is applied after allow so an exception can genuinely take something away.
  const ov = collaborator?.overrides || {};
  for (const k of ov.allow || []) if (isPermission(k)) held.add(k);
  // The guard on the deny side is the type asking a question worth answering:
  // deleting a key the catalogue does not have was always a no-op, so nothing
  // changes, and the set stays a set of permissions rather than of strings.
  for (const k of ov.deny || []) if (isPermission(k)) held.delete(k);

  return held;
}

// The scope for an area: the widest any assigned role gives. Absent means the
// area is not scoped, or nothing granted one — callers treat that as "own".
export function scopeFor({ collaborator, roles = [] }: Subject, areaKey: string): Scope {
  if (collaborator?.role === "owner") return "all";
  const assigned = Array.isArray(collaborator?.roleIds) ? collaborator.roleIds : [];
  const order: Record<Scope, number> = { own: 0, department: 1, all: 2 };
  let best: Scope | null = null;
  for (const r of (roles || []).filter((x) => assigned.includes(x.id))) {
    if (r.wildcard) return "all";
    const s = r.scopes?.[areaKey];
    if (s && (best === null || order[s] > order[best])) best = s;
  }
  return best || "own";
}

// ---- enforcement -----------------------------------------------------------

// The read side. Cheap, so screens can ask it per button.
export const can = (access: PermissionSet | null | undefined, key: PermissionKey): boolean =>
  Boolean(access?.has?.(key));

// The WRITE side, and the reason this module exists. Every mutation calls this
// before it touches anything, so "who may do this" is answered in one place
// instead of being re-decided per route.
//
// Returns a plain error rather than throwing: every caller here already returns
// { error } shapes, and an exception would need a try/catch around each one.
/**
 * THE TWO WAYS A WRITE IS REFUSED, as LITERALS rather than `string`.
 *
 * Every service returns this refusal straight to its route, and every route
 * reads `if (result.error) return ...`. A `string` there does not narrow —
 * the empty string is a string, so the refusal arm survives into the false
 * branch and the success fields read as missing. Two literals, and the guard
 * every route already writes means what it looks like.
 */
export type Refusal = { error: "unknown-permission" | "forbidden"; key: string };

export function requirePermission(
  access: PermissionSet | null | undefined,
  key: PermissionKey,
): Refusal | null {
  // THE RUNTIME CHECK STAYS, and is not made dead by the parameter type. Every
  // caller today is JavaScript, which this signature does not grade at all, and
  // the ones that will be TypeScript still pass keys that came off a request.
  // It becomes redundant on the day the last caller is typed — and on that day
  // it will be a line that has never once fired, which is a different argument
  // from this one.
  if (!isPermission(key)) return { error: "unknown-permission", key };
  if (!can(access, key)) return { error: "forbidden", key };
  return null;
}

// ---- the read side ---------------------------------------------------------
// The nav asks about SECTIONS; the model holds AREAS. This is the one place
// that bridges the two, so the sidebar and the guards cannot drift apart —
// so the sidebar and the guards cannot drift apart.

const anyKey = (access: PermissionSet, sectionKey: string, suffixes: readonly string[]) =>
  (SECTION_AREAS[sectionKey] || []).some((area) =>
    suffixes.some((v) => access.has(`${area}.${v}` as PermissionKey)));

// A section is worth showing if the person may see anything in it.
//
// A section with no areas of its own is a HEADING — "Sales" — and is shown when
// any of its children are, so a parent never hides a child the person may use.
// A heading with no children either (the dashboard home) has nothing to
// protect, so it stays.
// A section with areas of its own is worth showing if those areas are held. A
// section with CHILDREN is worth showing if any child is — otherwise the parent
// hides screens the person may use.
//
// A section can now be BOTH, which is what a module dashboard is: its own right
// AND a nav parent. So the two tests are asked in turn rather than the first
// short-circuiting the second. Asking only the parent's own area would bury
// every ticket screen behind the dashboard right; asking only the children would
// make the dashboard right unwithholdable, since anybody who may see a child
// would see the summary of all of them.
export function sectionViewable(access: PermissionSet, sectionKey: string, allKeys: readonly string[] = []): boolean {
  const own = SECTION_AREAS[sectionKey];
  if (own && anyKey(access, sectionKey, ["view"])) return true;
  const children = allKeys.filter((k) => k.startsWith(`${sectionKey}-`));
  if (children.length) return children.some((k) => sectionViewable(access, k, allKeys));
  // A leaf with areas answered "no" above. A heading with neither areas nor
  // children — the studio home — has nothing to protect, so it stays.
  return !own;
}

// A section's screens are editable if the person holds ANY write on its areas.
// Deliberately coarse: this only decides whether buttons are offered. What each
// button actually does is guarded by its own key at the point of doing it.
export function sectionManageable(access: PermissionSet, sectionKey: string, allKeys: readonly string[] = []): boolean {
  const own = SECTION_AREAS[sectionKey];
  if (own && anyKey(access, sectionKey, ["create", "edit", "delete"])) return true;
  // A HEADING has no writes of its own — "sales" is a nav parent, not a right.
  // Without falling through to the children it answered false for everybody,
  // owners included, and asking "may they manage Sales?" is exactly what raising
  // an RFQ does.
  //
  // The dashboard areas do not change that. They are view-only, so a parent that
  // now HAS an area still has nothing manageable of its own and still has to ask
  // its children — which is why this falls through rather than short-circuiting
  // on `own` the way it used to.
  const children = allKeys.filter((k) => k.startsWith(`${sectionKey}-`));
  return children.some((k) => sectionManageable(access, k, allKeys));
}

// MAY THEY OPEN THE MODULE'S OWN SCREEN — the dashboard, as opposed to anything
// underneath it. Asked by each module's context so every screen answers the
// question the same way, and answers `true` for a section that has no dashboard
// right declared, so nothing that never had one starts refusing.
export function dashboardViewable(access: PermissionSet, sectionKey: string): boolean {
  const key = `${sectionKey}.dashboard.view`;
  // The guard narrows the string to the union, which is exactly the border this
  // function sits on: `sectionKey` is a nav id, and only some nav ids name a
  // dashboard right.
  return isPermission(key) ? can(access, key) : true;
}

// ---- assigning access to somebody ------------------------------------------

// What a collaborator row may carry about access, cleaned. updateCollaborator
// spreads whatever it is handed, so without this an unknown key or a made-up
// role id would be stored verbatim and read back as real.
export type Assignment = {
  roleIds?: string[];
  overrides?: { allow: PermissionKey[]; deny: PermissionKey[] };
};

// `patch` is `unknown` because it is a request body. Anything narrower would be
// a claim about data nobody has checked yet, which is the claim this function
// exists to stop being made.
export function cleanAssignment(patch: Record<string, unknown>, knownRoleIds: readonly string[] = []): Assignment {
  const p = (patch || {}) as { roleIds?: unknown; overrides?: { allow?: unknown; deny?: unknown } };
  const out: Assignment = {};
  if (p.roleIds !== undefined) {
    const known = new Set(knownRoleIds);
    out.roleIds = [...new Set((Array.isArray(p.roleIds) ? p.roleIds : []).map(String))]
      .filter((id) => known.has(id)).slice(0, 10);
  }
  if (p.overrides !== undefined) {
    const ov = p.overrides || {};
    const keys = (list: unknown): PermissionKey[] =>
      [...new Set((Array.isArray(list) ? list : []).map(String).filter(isPermission))].slice(0, 60);
    out.overrides = { allow: keys(ov.allow), deny: keys(ov.deny) };
  }
  return out;
}

// NOBODY MAY HAND OUT WHAT THEY DO NOT HOLD.
//
// Editing people is itself a permission, so without this rule anyone with it
// could write themselves an override for anything in the catalogue — including
// permissions nobody ever gave them. That is privilege escalation through the
// front door, and it is the reason assignment needs a check of its own rather
// than just the people.members.edit guard on the route.
//
// An owner or Admin holds everything, so this never obstructs them.
export function escalates(
  actorAccess: PermissionSet | null | undefined,
  assignment: Assignment | null | undefined,
  roles: readonly Role[] = [],
): { error: string; keys: string[] } | null {
  const granting = new Set<PermissionKey>(assignment?.overrides?.allow || []);
  for (const id of assignment?.roleIds || []) {
    const role = roles.find((r) => r.id === id);
    if (!role) continue;
    // Handing somebody the wildcard is handing them everything.
    if (role.wildcard) { for (const k of ALL_PERMISSIONS) granting.add(k); continue; }
    for (const k of role.permissions || []) if (isPermission(k)) granting.add(k);
  }
  const beyond = [...granting].filter((k) => !actorAccess?.has?.(k));
  return beyond.length ? { error: "escalation", keys: beyond.slice(0, 5) } : null;
}

// ---- explaining a decision -------------------------------------------------

// "Why can't Sara lock a quotation?" is the question people actually ask about
// permissions, and an opaque system cannot answer it — which is how support
// requests turn into someone reading the database.
//
// Cheap only because resolution is one function: this re-runs the same steps
// and reports which one settled it, rather than reimplementing the rules and
// risking an explanation that disagrees with the enforcement.
export type Explanation = { allowed: boolean; reason: string };

// TAKES A STRING, deliberately, where everything else takes a PermissionKey.
// "Why can't Sara do X?" is asked about whatever somebody typed, and answering
// "that is not a permission this product has" is one of the useful answers —
// a signature that made the question unaskable would delete it.
export function explain({ collaborator, roles = [] }: Subject, key: string): Explanation {
  const who = collaborator?.alias || "They";
  if (!isPermission(key)) return { allowed: false, reason: `${key} is not a permission this product has.` };

  if (collaborator?.role === "owner") return { allowed: true, reason: `${who} owns the studio, so everything is allowed.` };

  const assigned = Array.isArray(collaborator?.roleIds) ? collaborator.roleIds : [];
  const mine = (roles || []).filter((r) => assigned.includes(r.id));
  const ov = collaborator?.overrides || {};

  // Deny is applied last during resolution, so it is checked first here — the
  // explanation has to follow the order the answer was actually decided in.
  if ((ov.deny || []).includes(key)) {
    return { allowed: false, reason: `${who} has a personal exception that removes this, overriding their role.` };
  }
  if ((ov.allow || []).includes(key)) {
    return { allowed: true, reason: `${who} has a personal exception that adds this.` };
  }

  const wildcard = mine.find((r) => r.wildcard);
  if (wildcard) return { allowed: true, reason: `${who} holds ${wildcard.name}, which includes everything.` };

  const granting = mine.find((r) => (r.permissions || []).includes(key));
  if (granting) return { allowed: true, reason: `${who} holds ${granting.name}, which includes this.` };

  // ASKED OF THE ROLES THAT RESOLVED, not of the ids on the row. A row can
  // carry an id for a role that no longer exists — cascadeDeleteRole reaps
  // those now, but rows written before it did still hold them — and resolution
  // ignores such an id entirely. Reading `assigned` here meant this branch was
  // skipped and the next one answered "holds no role, which does not include
  // this", which is a sentence that explains nothing at the exact moment
  // somebody is trying to find out why their access vanished.
  if (!mine.length) {
    return { allowed: false, reason: `${who} has no role yet, so they can do nothing. Give them one on the access screen.` };
  }

  const names = mine.map((r) => r.name).join(" and ") || "no role";
  return { allowed: false, reason: `${who} holds ${names}, which does not include this. Add it to the role, or give them a personal exception.` };
}
