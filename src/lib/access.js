import { ALL_PERMISSIONS, isPermission, AREAS, keysForLevel } from "@/lib/permissions";

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
export const SECTION_AREAS = {
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
  "tasks-settings": ["tasks.settings"],
  tasks: ["tasks.board"],
};


// ---- resolution ------------------------------------------------------------

// Everything this person may do in this studio, as a flat Set of keys.
//
// Roles and personal overrides, and nothing else. There is no fallback: a
// person with no role can do nothing, which is the default-deny the old model
// claimed and never quite managed.
export function effectivePermissions({ studio, collaborator, roles = [] }) {
  // The owner is not permissioned. They own the studio, and a studio that can
  // lock out its own owner is a support ticket that cannot be answered.
  if (collaborator?.role === "owner") return new Set(ALL_PERMISSIONS);

  const held = new Set();
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
  for (const k of ov.deny || []) held.delete(k);

  return held;
}

// The scope for an area: the widest any assigned role gives. Absent means the
// area is not scoped, or nothing granted one — callers treat that as "own".
export function scopeFor({ collaborator, roles = [] }, areaKey) {
  if (collaborator?.role === "owner") return "all";
  const assigned = Array.isArray(collaborator?.roleIds) ? collaborator.roleIds : [];
  const order = { own: 0, department: 1, all: 2 };
  let best = null;
  for (const r of (roles || []).filter((x) => assigned.includes(x.id))) {
    if (r.wildcard) return "all";
    const s = r.scopes?.[areaKey];
    if (s && (best === null || order[s] > order[best])) best = s;
  }
  return best || "own";
}

// ---- enforcement -----------------------------------------------------------

// The read side. Cheap, so screens can ask it per button.
export const can = (access, key) => Boolean(access?.has?.(key));

// The WRITE side, and the reason this module exists. Every mutation calls this
// before it touches anything, so "who may do this" is answered in one place
// instead of being re-decided per route.
//
// Returns a plain error rather than throwing: every caller here already returns
// { error } shapes, and an exception would need a try/catch around each one.
export function requirePermission(access, key) {
  if (!isPermission(key)) return { error: "unknown-permission", key };
  if (!can(access, key)) return { error: "forbidden", key };
  return null;
}

// ---- the read side ---------------------------------------------------------
// The nav asks about SECTIONS; the model holds AREAS. This is the one place
// that bridges the two, so the sidebar and the guards cannot drift apart —
// so the sidebar and the guards cannot drift apart.

const anyKey = (access, sectionKey, suffixes) =>
  (SECTION_AREAS[sectionKey] || []).some((area) => suffixes.some((v) => access.has(`${area}.${v}`)));

// A section is worth showing if the person may see anything in it.
//
// A section with no areas of its own is a HEADING — "Sales" — and is shown when
// any of its children are, so a parent never hides a child the person may use.
// A heading with no children either (the dashboard home) has nothing to
// protect, so it stays.
export function sectionViewable(access, sectionKey, allKeys = []) {
  if (SECTION_AREAS[sectionKey]) return anyKey(access, sectionKey, ["view"]);
  const children = allKeys.filter((k) => k.startsWith(`${sectionKey}-`));
  if (children.length) return children.some((k) => sectionViewable(access, k, allKeys));
  return true;
}

// A section's screens are editable if the person holds ANY write on its areas.
// Deliberately coarse: this only decides whether buttons are offered. What each
// button actually does is guarded by its own key at the point of doing it.
export function sectionManageable(access, sectionKey, allKeys = []) {
  if (SECTION_AREAS[sectionKey]) return anyKey(access, sectionKey, ["create", "edit", "delete"]);
  // A HEADING has no areas of its own — "sales" is a nav parent, not a right.
  // Without this it answered false for everybody, owners included, and asking
  // "may they manage Sales?" is exactly what raising an RFQ does.
  const children = allKeys.filter((k) => k.startsWith(`${sectionKey}-`));
  return children.some((k) => sectionManageable(access, k, allKeys));
}

// ---- assigning access to somebody ------------------------------------------

// What a collaborator row may carry about access, cleaned. updateCollaborator
// spreads whatever it is handed, so without this an unknown key or a made-up
// role id would be stored verbatim and read back as real.
export function cleanAssignment(patch, knownRoleIds = []) {
  const out = {};
  if (patch?.roleIds !== undefined) {
    const known = new Set(knownRoleIds);
    out.roleIds = [...new Set((Array.isArray(patch.roleIds) ? patch.roleIds : []).map(String))]
      .filter((id) => known.has(id)).slice(0, 10);
  }
  if (patch?.overrides !== undefined) {
    const ov = patch.overrides || {};
    const keys = (list) => [...new Set((Array.isArray(list) ? list : []).map(String).filter(isPermission))].slice(0, 60);
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
export function escalates(actorAccess, assignment, roles = []) {
  const granting = new Set(assignment?.overrides?.allow || []);
  for (const id of assignment?.roleIds || []) {
    const role = roles.find((r) => r.id === id);
    if (!role) continue;
    // Handing somebody the wildcard is handing them everything.
    if (role.wildcard) { for (const k of ALL_PERMISSIONS) granting.add(k); continue; }
    for (const k of role.permissions || []) granting.add(k);
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
export function explain({ collaborator, roles = [] }, key) {
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

  if (!assigned.length) {
    return { allowed: false, reason: `${who} has no role yet, so they can do nothing. Give them one on the access screen.` };
  }

  const names = mine.map((r) => r.name).join(" and ") || "no role";
  return { allowed: false, reason: `${who} holds ${names}, which does not include this. Add it to the role, or give them a personal exception.` };
}
