// Client-safe auth constants. Kept in their own module so client bundles can
// import them without pulling in lib/auth.js (which touches DB + Node built-ins).

export const SESSION_COOKIE = "mt_admin";
// Non-secret companion to the studio session: the tenant's address slug, so the
// edge proxy can map /<slug>/… ⇄ /studio/… without a DB lookup. Set whenever a
// studio session is minted, cleared on logout. See [[nompany-multitenancy]].
export const STUDIO_SLUG_COOKIE = "studio_slug";
export const ADMIN_TAG = "admin";
// `Leader` is a cross-module modifier: paired with `Technical` it means "see
// all Quotations / RFQs across the team", paired with `Sales` it means "see
// all Sales tickets". Admin always sees everything regardless.
export const LEADER_TAG = "Leader";
export const TECHNICAL_TAG = "Technical";
export const SALES_TAG = "Sales";
// Pre-sales engineers: allowed to build/edit quotations alongside Technical.
export const PRESALES_TAG = "Presales";
// Departments used by the Tasks / approval workflow (paired with LEADER_TAG).
export const FINANCE_TAG = "Finance";
export const MANAGEMENT_TAG = "Management";
// HR: manages the Employees directory (departments, positions, certifications,
// and every employee field). Admin always counts as HR.
export const HR_TAG = "HR";

// True when the user may manage the full Employees directory (all fields).
export function isHR(user) {
  if (!user) return false;
  const tags = Array.isArray(user.tags) ? user.tags : [];
  return tags.includes(ADMIN_TAG) || tags.includes(HR_TAG);
}

// True when the user should see records owned by anyone else in the module.
// `scopeTag` is the module gate (e.g. TECHNICAL_TAG or SALES_TAG). Admin always
// passes; otherwise the user needs both the module tag AND the Leader tag.
export function canSeeAllIn(user, scopeTag) {
  if (!user) return false;
  const tags = Array.isArray(user.tags) ? user.tags : [];
  if (tags.includes(ADMIN_TAG)) return true;
  return tags.includes(scopeTag) && tags.includes(LEADER_TAG);
}

