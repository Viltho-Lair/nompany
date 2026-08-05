// Access grants store (Phase 2 of the access rebuild). WHO can do WHAT is a
// grant tree persisted in settings.accessControl:
//   { departments: { code: { node: { action: "allow"|"deny" } } },
//     users:       { userId: { node: { action } } } }
// The catalog of nodes/actions + the resolver `can()` live in
// lib/accessControl.js (client-safe). The check itself is `canAccessSection`
// in sectionAccessConstants.js, which now delegates to `can()`.
//
// `getSectionAccess()` keeps its name for the many existing callers, but now
// returns the grant tree (not the legacy tag map). On first read — before any
// admin has saved the new tree — it MIGRATES the legacy `section_access`
// ({ node: [codes] }) into view+manage grants so nobody loses access on cutover.

import { getSettings, updateSettings } from "@/lib/db";
import { DEFAULT_SECTION_ACCESS, SECTION_PARENTS, SECTION_CATEGORIES, canAccessSection } from "@/lib/sectionAccessConstants";

export { DEFAULT_SECTION_ACCESS, SECTION_PARENTS, SECTION_CATEGORIES, canAccessSection };

function migrateLegacy(section_access) {
  const departments = {};
  for (const [node, codes] of Object.entries(section_access || {})) {
    for (const code of Array.isArray(codes) ? codes : []) {
      if (!code || code === "admin") continue; // admin is implicit all-access
      departments[code] = departments[code] || {};
      departments[code][node] = { view: "allow", manage: "allow" };
    }
  }
  return { departments, users: {} };
}

// The effective grant tree. Callers pass this straight to canAccessSection().
export async function getSectionAccess() {
  const settings = await getSettings();
  const ac = settings?.accessControl;
  if (ac && typeof ac === "object" && (ac.departments || ac.users)) {
    return { departments: ac.departments || {}, users: ac.users || {} };
  }
  // Not migrated yet — derive from the legacy section-access map.
  return migrateLegacy(settings?.section_access && typeof settings.section_access === "object" ? settings.section_access : {});
}

// Alias with a clearer name for new code.
export const getAccessGrants = getSectionAccess;

// Save the whole grant tree.
export async function setSectionAccess(next) {
  const departments = (next && typeof next.departments === "object" && next.departments) || {};
  const users = (next && typeof next.users === "object" && next.users) || {};
  await updateSettings({ accessControl: { departments, users } });
  return { departments, users };
}
export const setAccessGrants = setSectionAccess;

// Clear every grant (admins keep all-access regardless).
export async function resetSectionAccess() {
  await updateSettings({ accessControl: { departments: {}, users: {} } });
  return { departments: {}, users: {} };
}
