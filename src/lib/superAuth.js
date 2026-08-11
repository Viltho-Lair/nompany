// nompany OWNER auth for the /super console — a standalone identity, separate
// from the User model entirely (an owner is not a subscriber). Super admins are
// platform data: they sit OUTSIDE every cascade and outlive every user/studio.
//
// RESTRUCTURED: this now reads/writes the new registry key `g:superAdmins`
// (src/lib/data/keys.js REG.superAdmins). The old `nompany:g:c:superAdmins`
// location is gone along with the rest of the old structure.
//
// A superAdmin record: { id, email, passwordHash, sessionTokens[], createdAt,
//   passwordSetAt }.

import { REG, makeId } from "@/lib/data/keys";
import { readArr, writeArr } from "@/lib/data/store";
import { hashPassword, verifyPassword, newSessionToken, generatePassword } from "@/lib/passwords";

export const SUPER_COOKIE = "nc_super";
const MAX_SESSIONS = 6;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function normEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function patchAdmin(id, patch) {
  const rows = await readArr(REG.superAdmins);
  let updated = null;
  const next = rows.map((a) => {
    if (a.id !== id) return a;
    updated = { ...a, ...patch, id: a.id };
    return updated;
  });
  if (updated) await writeArr(REG.superAdmins, next);
  return updated;
}

export async function findSuperByEmail(email) {
  const e = normEmail(email);
  if (!e) return null;
  const rows = await readArr(REG.superAdmins);
  return rows.find((a) => normEmail(a.email) === e) || null;
}

export async function findSuperBySession(token) {
  if (!token) return null;
  const rows = await readArr(REG.superAdmins);
  return rows.find((a) => Array.isArray(a.sessionTokens) && a.sessionTokens.includes(token)) || null;
}

// Create a super-admin. If `password` is omitted, a random one is generated and
// returned in cleartext EXACTLY ONCE (for relaying) — never stored raw.
// Idempotent on email.
export async function seedSuperAdmin({ email, password } = {}) {
  const mail = normEmail(email);
  if (!EMAIL_RE.test(mail)) return { error: "email" };
  const existing = await findSuperByEmail(mail);
  if (existing) return { admin: existing, existed: true };

  const plain = password || generatePassword(16);
  const now = new Date().toISOString();
  const admin = {
    id: makeId("sup"),
    email: mail,
    passwordHash: await hashPassword(plain),
    sessionTokens: [],
    createdAt: now,
    passwordSetAt: now,
  };
  const rows = await readArr(REG.superAdmins);
  await writeArr(REG.superAdmins, [admin, ...rows]);
  return { admin, password: plain, existed: false };
}

// Verify credentials, mint a new session token. Generic failure (never reveals
// whether the email exists).
export async function loginSuper(email, password) {
  const admin = await findSuperByEmail(email);
  if (!admin) return null;
  if (!(await verifyPassword(password, admin.passwordHash))) return null;
  const token = newSessionToken();
  const prior = Array.isArray(admin.sessionTokens) ? admin.sessionTokens : [];
  const next = [token, ...prior.filter(Boolean)].slice(0, MAX_SESSIONS);
  await patchAdmin(admin.id, { sessionTokens: next });
  return { ...admin, sessionTokens: next, token };
}

// Invalidate only the presented token (other devices stay signed in).
export async function logoutSuper(token) {
  const admin = await findSuperBySession(token);
  if (!admin) return;
  const next = (admin.sessionTokens || []).filter((t) => t && t !== token);
  await patchAdmin(admin.id, { sessionTokens: next });
}

// Client-safe projection — never the hash or tokens.
export function publicSuperAdmin(a) {
  if (!a) return null;
  return { id: a.id, email: a.email };
}
