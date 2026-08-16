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

// ---- legacy bridge ---------------------------------------------------------
// Existing studios hold view/manage grants against section ids. Until the role
// editor ships, those are TRANSLATED into permission keys, so this layer can go
// in without changing what anybody can do today. Delete this when the editor
// lands and grants have been migrated.
//
// Section key -> the area(s) that section covers. Sections with no area behind
// them (the "main" dashboard, live views already covered) simply map to nothing.
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

// A manage grant becomes "full" and a view grant becomes "view", for the areas
// that section covered — and for NO OTHER section, which is the behaviour the
// section model was finally corrected to anyway.
export function permissionsFromGrants(collaboratorId, sections, grants) {
  const out = new Set();
  const byId = new Map((sections || []).map((s) => [s.id, s.key]));
  const mine = (grants || []).filter((g) => g.subjectType === "collaborator" && g.subjectId === collaboratorId);

  const held = new Map(); // sectionKey -> { view, manage, denied }
  for (const g of mine) {
    const key = byId.get(g.sectionId);
    if (!key) continue;
    const row = held.get(key) || { view: false, manage: false, deny: new Set() };
    if (g.effect === "deny") row.deny.add(g.action);
    else if (g.action === "view") row.view = true;
    else if (g.action === "manage") row.manage = true;
    held.set(key, row);
  }

  for (const [key, row] of held) {
    for (const areaKey of SECTION_AREAS[key] || []) {
      const area = AREAS.find((a) => a.key === areaKey);
      if (!area) continue;
      // Manage required view even in the corrected section model, and a deny
      // still wins — both carried across rather than quietly relaxed.
      const canView = row.view && !row.deny.has("view");
      const canManage = canView && row.manage && !row.deny.has("manage");
      for (const k of keysForLevel(area, canManage ? "full" : canView ? "view" : "none")) out.add(k);
    }
  }
  return out;
}

// ---- resolution ------------------------------------------------------------

// Everything this person may do in this studio, as a flat Set of keys.
//
// `roles` and `overrides` are the new model; `sections`/`grants` are the legacy
// bridge. A studio that has been migrated passes roles and no grants; one that
// has not passes grants and no roles. Both work, and a studio mid-migration
// gets the union, which errs toward keeping people working.
export function effectivePermissions({ studio, collaborator, roles = [], sections = [], grants = [] }) {
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

  // LEGACY: no roles assigned yet means this studio has not been migrated, so
  // fall back to what its grants say. Once a role is assigned, roles are the
  // answer — otherwise migrating somebody would only ever add access.
  if (!assigned.length) {
    for (const k of permissionsFromGrants(collaborator?.id, sections, grants)) held.add(k);
  }

  // Personal exceptions, applied last and stored as a DIFF from the role. Deny
  // is applied after allow so an exception can genuinely take something away.
  const ov = collaborator?.overrides || {};
  for (const k of ov.allow || []) if (isPermission(k)) held.add(k);
  for (const k of ov.deny || []) held.delete(k);

  // The old studio-admin flag, kept working until the Admin role replaces it.
  if (collaborator?.isAdmin) return new Set(ALL_PERMISSIONS);
  return held;
}

// The scope for an area: the widest any assigned role gives. Absent means the
// area is not scoped, or nothing granted one — callers treat that as "own".
export function scopeFor({ collaborator, roles = [] }, areaKey) {
  if (collaborator?.role === "owner" || collaborator?.isAdmin) return "all";
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
// which is exactly what they were doing while writes used permissions and reads
// still used grants.

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
export function sectionManageable(access, sectionKey) {
  return anyKey(access, sectionKey, ["create", "edit", "delete"]);
}
