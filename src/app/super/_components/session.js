// The /super console's identity, as design data.
//
// This route is a DESIGN surface only — it deliberately does not read or write
// the database. `src/lib/superAuth.js` already owns the real super-admin record
// (registry key `g:superAdmins`, see src/lib/data/keys.js) and is untouched
// here; when this console is wired up, `SUPER_ADMINS` below is the allowlist to
// seed through `seedSuperAdmin()` and the header identity should come from
// `publicSuperAdmin(await findSuperBySession(...))` instead of this constant.

export const SUPER_ADMIN_EMAIL = "abdullahabuhammed@gmail.com";

// Everyone who holds the super-admin role on this console.
export const SUPER_ADMINS = [SUPER_ADMIN_EMAIL];

export const ROLE = "Super Admin";

export const CURRENT_USER = {
  name: "Abdullah Abu Hammed",
  email: SUPER_ADMIN_EMAIL,
  role: ROLE,
  initials: "AA",
};

export function isSuperAdmin(email) {
  return SUPER_ADMINS.includes(String(email || "").trim().toLowerCase());
}
