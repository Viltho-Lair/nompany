// API KEYS — the crypto, the store, and the door.
//
// IT LIVES IN `platform/auth` RATHER THAN IN THE ADMINISTRATION MODULE, and
// that is the important placement decision: this is an AUTHENTICATION path, and
// authentication paths belong beside the session, the password and the OTP,
// where a reviewer looking for "every way into this product" finds them all in
// one folder. `modules/administration/apiKeys` holds the rules a screen also
// needs; nothing there can open a door.
//
// A KEY DOES NOT CREATE A NEW WAY IN. It names a COLLABORATOR, and the request
// it makes is then resolved through the same `studioContext` and the same
// `effectivePermissions` a browser request is (invariants 2, 3 and 4 untouched).
// What it adds is a second proof of identity and a NARROWING of that person's
// reach through this particular string.
//
// SHA-256 AND NOT BCRYPT, deliberately. Bcrypt's work factor exists to slow the
// guessing of LOW-ENTROPY input — a password somebody chose. A key is 256 bits
// from `randomBytes`, so there is nothing to guess, and a per-request bcrypt
// verification would put ~100ms of CPU on every API call to defend against an
// attack that cannot be mounted. The digest is compared in constant time all
// the same, because a lookup that leaks its own timing leaks the digest.
//
// THE FULL KEY IS RETURNED ONCE AND NEVER STORED. Only the digest, and the
// first few characters in clear so a register can name a row.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { REG, S } from "@/platform/db/keys";
import { readArr, editArr, getJSON, editJSON } from "@/platform/db/store";
import {
  KEY_PREFIX, KEY_PATTERN, looksLikeKey, visiblePart,
  usable, shouldTouch, effectiveScopes,
  type ApiKey,
} from "@/modules/administration/apiKeys";

/** What the register stores. The key itself is not in here. */
export type StoredKey = ApiKey & {
  id: string;
  name: string;
  prefix: string;
  digest: string;
  scopes: string[];
  collaboratorId: string;
  createdAt: string;
  lastUsedAt: string;
  revokedAt: string;
  expiresAt: string;
};

type IndexEntry = { studioId: string; keyId: string };

const digestOf = (key: string): string =>
  createHash("sha256").update(String(key ?? ""), "utf8").digest("hex");

/**
 * CONSTANT TIME, even though both sides are already digests.
 *
 * The digest of a guess is not secret, so this is belt and braces — but the
 * habit is the point: the day somebody compares a raw key here, `===` would
 * leak it a byte at a time and nothing would look different.
 */
function sameDigest(a: string, b: string): boolean {
  const left = Buffer.from(String(a ?? ""), "utf8");
  const right = Buffer.from(String(b ?? ""), "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * MINT ONE. Returns the key in clear — the only time it exists outside the
 * caller's hands — and the row to store.
 *
 * 32 BYTES, base64url, which is 43 characters and matches `KEY_PATTERN`. The
 * pattern is in the pure module so a screen can recognise one; this is the only
 * place that produces one, and the test asserts the two agree.
 */
export function mintKey(): { key: string; digest: string; prefix: string } {
  const key = `${KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
  if (!KEY_PATTERN.test(key)) {
    // A MINTED KEY THAT THE PATTERN REJECTS would be accepted at creation and
    // refused at every use — a credential that works nowhere, issued silently.
    throw new Error("api-key: minted a key the pattern does not admit");
  }
  return { key, digest: digestOf(key), prefix: visiblePart(key) };
}

/** This studio's keys, as stored. Digests included — server only. */
export async function readKeys(studioId: string): Promise<StoredKey[]> {
  return readArr<StoredKey>(S.apiKeys(studioId));
}

/**
 * WRITE A NEW KEY, and index it in the same act.
 *
 * THE ORDER IS LOAD-BEARING: the register first, the index second. A key in the
 * index but not the register resolves to a studio and then to nothing, which is
 * a 500 on somebody's integration; a key in the register but not the index
 * simply does not work yet, which is a 401 and a retry. Failing toward "does
 * not work" is the only acceptable direction for a credential.
 */
export async function storeKey(studioId: string, row: StoredKey): Promise<void> {
  await editArr<StoredKey, void>(S.apiKeys(studioId), (rows) => ({
    next: [...rows.filter((r) => r.id !== row.id), row],
    result: undefined,
  }));
  await editJSON<Record<string, IndexEntry>, void>(REG.apiKeyIndex, (index) => ({
    next: { ...(index || {}), [row.digest]: { studioId, keyId: row.id } },
    result: undefined,
  }));
}

/**
 * REVOKE ONE — out of the index first, out of nothing else.
 *
 * INDEX FIRST HERE, which is the mirror of `storeKey` and for the same reason:
 * the moment that matters is when the key STOPS working, and removing the index
 * entry is what stops it. If the register write then fails, the key is dead and
 * the row says "live" — visible, wrong, and harmless. The other order would
 * leave a revoked-looking key that still opens the door.
 *
 * THE ROW IS KEPT, marked revoked. A key that vanishes on revocation takes with
 * it the only record of what it could reach and when it was last used, which is
 * exactly what somebody investigating a leak needs.
 */
export async function revokeKey(studioId: string, keyId: string): Promise<boolean> {
  const rows = await readKeys(studioId);
  const row = rows.find((r) => r.id === keyId);
  if (!row || row.revokedAt) return false;

  await editJSON<Record<string, IndexEntry>, void>(REG.apiKeyIndex, (index) => {
    const next = { ...(index || {}) };
    delete next[row.digest];
    return { next, result: undefined };
  });
  await editArr<StoredKey, void>(S.apiKeys(studioId), (current) => ({
    next: current.map((r) =>
      r.id === keyId ? { ...r, revokedAt: new Date().toISOString() } : r),
    result: undefined,
  }));
  return true;
}

/** The bearer token on this request, if it looks like one of ours at all. */
export function bearerFrom(request: Request): string {
  const header = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  const token = match ? match[1] : "";
  // CHEAP GATE FIRST. A session token, a JWT or a stray string must not cost a
  // database lookup — `/api/track` is this codebase's reminder of what an
  // unbounded read costs when anybody can trigger it.
  return looksLikeKey(token) ? token : "";
}

export type ResolvedKey = {
  studioId: string;
  collaboratorId: string;
  keyId: string;
  scopes: string[];
};

/**
 * WHICH KEY IS THIS, AND WHOSE?
 *
 * ONE LOOKUP, from the global digest index. No scan, and no way to enumerate:
 * the index is keyed by digest, so holding it tells you nothing you did not
 * already have.
 *
 * A REVOKED OR EXPIRED KEY IS REFUSED HERE even though revocation removes the
 * index entry, because expiry is a DATE and nothing runs on it. The index gets
 * a key out of circulation immediately; this is what makes "expires on the 30th"
 * true without a cron.
 */
export async function resolveKey(token: string): Promise<ResolvedKey | null> {
  if (!looksLikeKey(token)) return null;
  const digest = digestOf(token);

  const index = await getJSON<Record<string, IndexEntry>>(REG.apiKeyIndex);
  const entry = index?.[digest];
  if (!entry?.studioId || !entry?.keyId) return null;

  const rows = await readKeys(entry.studioId);
  const row = rows.find((r) => r.id === entry.keyId);
  if (!row) return null;
  // The index is keyed by digest, so a hit already proves equality — this
  // re-checks against the ROW, which is the copy an administrator can see.
  if (!sameDigest(row.digest, digest)) return null;

  const today = new Date().toISOString().slice(0, 10);
  if (!usable(row, today)) return null;

  return {
    studioId: entry.studioId,
    collaboratorId: String(row.collaboratorId || ""),
    keyId: row.id,
    scopes: [...(row.scopes || [])],
  };
}

/**
 * NOTE THAT A KEY WAS USED — at most once an hour, per `shouldTouch`.
 *
 * BEST-EFFORT, like `events.emit()`: the request has already been authorised,
 * so failing to record that must never fail it. And deliberately NOT awaited by
 * the caller's critical path — see the door in `platform/http/route.ts`.
 */
export async function touchKey(studioId: string, keyId: string): Promise<void> {
  try {
    const now = new Date().toISOString();
    await editArr<StoredKey, void>(S.apiKeys(studioId), (rows) => {
      const row = rows.find((r) => r.id === keyId);
      if (!row || !shouldTouch(row.lastUsedAt, now)) return { next: rows, result: undefined };
      return {
        next: rows.map((r) => (r.id === keyId ? { ...r, lastUsedAt: now } : r)),
        result: undefined,
      };
    });
  } catch {
    // Nothing to do. A missing "last used" is a worse register, not a broken
    // request, and this is not a path a caller can be told about.
  }
}

/** Re-export so the door does not reach into the module for one function. */
export { effectiveScopes };

// ---- the request's key scopes ------------------------------------------------
//
// WHY A REQUEST-SCOPED VALUE AND NOT A PARAMETER. Invariant 3: access is
// resolved ONCE, in `studioContext`, and every module context is built on it.
// The first version of this narrowed the access set AFTER the context was
// built — `{ ...context, access: scoped }` — and it was wrong in a way that
// looked right: `canManage`, `nav` and `manage` are DERIVED inside the builder
// from the access it resolved, so a key holding one HR permission received a
// payload computed as if it were the owner. Found by opening the endpoint with
// a key and reading what came back.
//
// Narrowing has to happen where the resolution happens, and the resolution has
// no parameter to carry a credential's scopes through fourteen module context
// builders. So the scopes ride the request itself.
//
// IT NARROWS THE CALLER, NEVER A SUBJECT. `studioContext` resolves the person
// making the request; `hr.ts` also calls `effectivePermissions` for OTHER
// collaborators, to find who may approve a leave request. Putting the filter
// inside `effectivePermissions` would narrow those answers too, and an API
// request would silently decide that nobody in the studio may approve anything.

import { AsyncLocalStorage } from "node:async_hooks";

const scopeStore = new AsyncLocalStorage<readonly string[]>();

/** Run everything downstream with this key's scopes in force. */
export function withApiKeyScopes<T>(scopes: readonly string[], fn: () => T): T {
  return scopeStore.run(scopes, fn);
}

/**
 * The scopes in force, or null for an ordinary session request.
 *
 * NULL AND EMPTY ARE DIFFERENT: null means "no key is involved, do not narrow";
 * an empty array means "a key is involved and it may do nothing", which is what
 * a fully demoted holder's key resolves to. Collapsing them would give that key
 * the full access of the person it acts as.
 */
export const currentApiKeyScopes = (): readonly string[] | null =>
  scopeStore.getStore() ?? null;
