// The /super console's identity, as design data.
//
// AUTH IS REAL: `src/lib/superAuth.js` owns the super-admin record (registry key
// `g:superAdmins`), (shell)/layout.js gates every console page on it, and the
// header's identity comes from that session — not from `CURRENT_USER` below.
//
// What is left here is presentation: the display name and initials for the one
// seeded owner (the record itself stores only an email), and `SUPER_ADMINS` as
// the allowlist to seed through `seedSuperAdmin()`. The remaining console pages
// are still design surfaces and read these constants for their sample rows.

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
