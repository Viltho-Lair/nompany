import { cookies } from "next/headers";
import { SESSION_COOKIE, findUserBySession, hasTag, isAdmin, publicUser } from "@/lib/auth";
import { getSectionAccess } from "@/lib/sectionAccess";
import { canAccessSection, canManageSection } from "@/lib/sectionAccessConstants";
import { enrichUser } from "@/lib/employeeAuth";

// Return the currently-logged-in user record (or null). Server-side only —
// cookies() only works in a request context. The record is enriched with the
// user's EFFECTIVE tags — their stored "admin" flag plus the department code
// (and "Leader" status) resolved from their linked Employee record — so every
// existing tag-based check downstream (hasTag, canSeeAllIn, section access,
// task approvals, quotation cost visibility, ...) keeps working unchanged.
export async function currentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const user = await findUserBySession(token);
  return user ? enrichUser(user) : null;
}

// Legacy shape: any authenticated user counts as "admin request" for the
// purpose of accessing the shared APIs (services, projects, gallery, etc.).
// Fine-grained tag-based access is enforced separately by the routes/pages
// that actually need it.
export async function isAdminRequest() {
  const user = await currentUser();
  return Boolean(user);
}

// Guard a server component or API handler by required tag(s). Any of the
// passed tags will do, plus the built-in `admin` super-tag always passes.
// Returns the user on success; returns null when unauthenticated or the tag
// requirement isn't met (caller decides what to do — 401, 403, notFound()).
export async function requireTag(...tags) {
  const user = await currentUser();
  if (!user) return null;
  if (isAdmin(user)) return user;
  if (tags.length === 0) return user;
  if (tags.some((t) => hasTag(user, t))) return user;
  return null;
}

// Guard a server component or API handler by the admin-configurable section
// access map (not a hardcoded tag) — this is the real enforcement boundary
// mirrored by the sidebar's visual greying. Each section key is checked on its
// own (no parent→child cascade). Returns the user on success, null otherwise.
export async function requireSection(sectionKey) {
  const user = await currentUser();
  if (!user) return null;
  const accessMap = await getSectionAccess();
  if (!canAccessSection(user, sectionKey, accessMap)) return null;
  return user;
}

// Like requireSection, but requires the MANAGE action — use on every mutating
// handler (POST/PUT/DELETE) so a View-only grant can read but not change. GET
// handlers keep using requireSection (view). Admin always passes.
export async function requireManage(sectionKey) {
  const user = await currentUser();
  if (!user) return null;
  const accessMap = await getSectionAccess();
  if (!canManageSection(user, sectionKey, accessMap)) return null;
  return user;
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}

export { publicUser };
