// Studio auth: per-user credentials with bcrypt-hashed passwords.
//
// Migration model:
//   • Users are stored in the `users` collection (id, userId, fullName,
//     passwordHash, tags[], sessionToken, createdAt).
//   • First-boot bootstrap: if `users` is empty AND the ADMIN_USER/ADMIN_PASS
//     env vars are set, the very first successful login with those creds seeds
//     an initial admin user, then env creds are no longer authoritative.
//   • Break-glass: as long as ADMIN_USER/ADMIN_PASS env vars are set, they
//     ALSO log the caller in as the seeded admin — so admin can regain access
//     if they lose their user password. Unset the env vars in Vercel once
//     you're comfortable with the user-based flow.
//   • Cookie carries an opaque session token; each user record holds their
//     current token (rotated on login and on logout).

import { getCollection, createItem, updateItem } from "@/lib/db";
import { hashPassword, verifyPassword, newSessionToken } from "@/lib/passwords";
import { SESSION_COOKIE, ADMIN_TAG } from "@/lib/authConstants";

// Re-export for existing server-side imports.
export { SESSION_COOKIE, ADMIN_TAG };

// Defaults exist so a fresh install / local dev still works with admin/admin.
// Override in production by setting ADMIN_USER / ADMIN_PASS in Vercel.
const ENV_ADMIN_USER = process.env.ADMIN_USER || "admin";
const ENV_ADMIN_PASS = process.env.ADMIN_PASS || "admin";

// Look up an active user by their session token. Returns null when the token
// doesn't match any user (logged out, rotated, or token forged). Supports both
// the legacy single-token field (`sessionToken`) and the multi-session array
// (`sessionTokens`) so remembered cookies survive a login from another device.
export async function findUserBySession(token) {
  if (!token) return null;
  const users = await getCollection("users");
  return (
    users.find((u) => {
      if (u.sessionToken && u.sessionToken === token) return true;
      if (Array.isArray(u.sessionTokens) && u.sessionTokens.includes(token)) return true;
      return false;
    }) || null
  );
}

// Find a user by their login id (case-insensitive) — the string the person
// types into the login form.
async function findUserByUserId(userId) {
  const id = String(userId || "").trim().toLowerCase();
  if (!id) return null;
  const users = await getCollection("users");
  return users.find((u) => (u.userId || "").toLowerCase() === id) || null;
}

// Seed the first admin from env vars when the collection is empty. Returns
// the newly-created user or null if no env-based seed is available.
async function bootstrapAdminIfNeeded() {
  if (!ENV_ADMIN_USER || !ENV_ADMIN_PASS) return null;
  const users = await getCollection("users");
  if (users.length > 0) return null;
  const passwordHash = await hashPassword(ENV_ADMIN_PASS);
  return createItem("users", {
    userId: ENV_ADMIN_USER,
    fullName: "Administrator",
    passwordHash,
    tags: [ADMIN_TAG],
    sessionToken: "",
    createdAt: new Date().toISOString(),
  });
}

// Verify credentials, rotate the session token on success, and return the
// updated user record. Returns null on any failure.
//
// Three code paths, in order:
//   1. Empty users collection + env creds match → bootstrap the initial admin.
//   2. User exists → verify bcrypt hash.
//   3. Break-glass: env creds match AND an existing admin user exists → log
//      the caller in as that admin (with an audit-friendly banner in the UI).
export async function login(userId, password) {
  if (!userId || !password) return null;

  // Bootstrap path — first-ever login with env creds seeds the first admin.
  const users = await getCollection("users");
  if (users.length === 0) {
    if (userId === ENV_ADMIN_USER && password === ENV_ADMIN_PASS) {
      const seeded = await bootstrapAdminIfNeeded();
      if (!seeded) return null;
      return rotateSession(seeded);
    }
    return null;
  }

  const user = await findUserByUserId(userId);

  // Normal path — stored user + password.
  if (user && (await verifyPassword(password, user.passwordHash))) {
    return rotateSession(user);
  }

  // Break-glass path — env creds still work as long as they're set, and
  // authenticate the caller as the first admin user (however that admin is
  // named in the users collection).
  if (
    ENV_ADMIN_USER &&
    ENV_ADMIN_PASS &&
    userId === ENV_ADMIN_USER &&
    password === ENV_ADMIN_PASS
  ) {
    const admin = users.find((u) => Array.isArray(u.tags) && u.tags.includes(ADMIN_TAG));
    if (admin) return rotateSession(admin);
  }

  return null;
}

// Issue a fresh session token WITHOUT invalidating previous ones. This lets a
// user stay signed in on their desktop after logging in on their phone (or
// vice-versa). We keep at most MAX_SESSIONS most-recent tokens per user so the
// list can't grow unbounded.
const MAX_SESSIONS = 6;
async function rotateSession(user) {
  const sessionToken = newSessionToken();
  const prior = Array.isArray(user.sessionTokens) ? user.sessionTokens : [];
  const merged = user.sessionToken && !prior.includes(user.sessionToken)
    ? [user.sessionToken, ...prior]
    : prior;
  const next = [sessionToken, ...merged].slice(0, MAX_SESSIONS);
  await updateItem("users", user.id, { sessionToken, sessionTokens: next });
  return { ...user, sessionToken, sessionTokens: next };
}

// Remove ONLY the token whose cookie was presented — other devices stay
// signed in. Falls back to clearing the legacy single field for old records.
export async function logout(token) {
  const user = await findUserBySession(token);
  if (!user) return;
  const prior = Array.isArray(user.sessionTokens) ? user.sessionTokens : [];
  const next = prior.filter((t) => t && t !== token);
  const patch = { sessionTokens: next };
  if (user.sessionToken === token) patch.sessionToken = "";
  await updateItem("users", user.id, patch);
}

// Convenience shape used by client code. Never includes the password hash.
export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    userId: user.userId,
    fullName: user.fullName,
    position: user.position || "",
    avatarUrl: user.avatarUrl || "",
    // `tags` here is the EFFECTIVE set (stored "admin" flag + the department
    // code / "Leader" status projected in by lib/employeeAuth.js when this
    // user record was resolved) — not necessarily what's literally stored.
    tags: Array.isArray(user.tags) ? user.tags : [],
    departmentCode: user.departmentCode || "",
    accessCodes: Array.isArray(user.accessCodes) ? user.accessCodes : [],
  };
}

export function hasTag(user, tag) {
  if (!user) return false;
  const tags = Array.isArray(user.tags) ? user.tags : [];
  return tags.includes(ADMIN_TAG) || tags.includes(tag);
}

export function isAdmin(user) {
  return hasTag(user, ADMIN_TAG);
}
