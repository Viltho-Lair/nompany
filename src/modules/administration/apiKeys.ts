// API KEYS — the rules, without the crypto and without the store.
//
// WHAT A KEY IS. A string a machine sends instead of a session cookie. It does
// not create a new way into a studio: it names a COLLABORATOR, and every
// request it makes is resolved through the same membership and the same
// `effectivePermissions` a browser request is. What it adds is a second way to
// prove you are that collaborator, and a NARROWING of what that collaborator
// may do through this particular string.
//
// THE RULE THAT MATTERS MOST IS `effectiveScopes`. A key's scopes are checked
// against the creator's rights when it is minted (invariant 5, nobody grants
// what they do not hold) — and that check is worthless on its own, because
// rights SHRINK. Somebody demoted out of Finance still holds a key minted while
// they had it. So what a key may do is the INTERSECTION of its stored scopes
// with what its owner may do RIGHT NOW: the key can only ever narrow, never
// preserve. Revoking a person's role revokes their keys' reach in the same act,
// which is the only behaviour an administrator can reason about.
//
// AND THE FULL KEY IS NEVER STORED. Only a digest, and only the first few
// characters in clear so a studio can tell two keys apart in a list. A register
// that could show a key again is a register that leaks every key the day it is
// read by the wrong person.
//
// PURE. No imports, no store, no crypto — the screen refuses exactly what the
// server refuses. Hashing and randomness live in the service, because a client
// component imports this to validate a form.

export type ApiKey = {
  id?: unknown;
  name?: unknown;
  /** The first characters of the key, in clear, so a list can name a row. */
  prefix?: unknown;
  /** What this key may do, as permission keys. Narrowed again at every use. */
  scopes?: unknown;
  /** CollaboratorID (invariant 6). The key acts as this person. */
  collaboratorId?: unknown;
  createdAt?: unknown;
  /** Coarse — see `usedRecently` for why this is not written per request. */
  lastUsedAt?: unknown;
  revokedAt?: unknown;
  /** Optional. A key past it is refused, the same as a revoked one. */
  expiresAt?: unknown;
};

const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const list = (v: unknown): string[] =>
  (Array.isArray(v) ? v : []).map((x) => text(x, 120)).filter(Boolean);

/**
 * THE PREFIX IS PART OF THE PRODUCT, not decoration. A key found in a log, a
 * repository or a paste is recognisable as this product's, which is what makes
 * automated secret scanning possible at all.
 */
export const KEY_PREFIX = "nk_";

/** How much of a minted key is kept in clear. Enough to tell two rows apart. */
export const VISIBLE_CHARS = KEY_PREFIX.length + 6;

/** The shape a minted key has. Asserted so the service cannot drift from it. */
export const KEY_PATTERN = /^nk_[A-Za-z0-9_-]{43}$/;

export const MAX_KEYS = 20;

/** Does this look like one of ours? A cheap gate before any lookup happens. */
export const looksLikeKey = (v: unknown): boolean => KEY_PATTERN.test(String(v ?? ""));

/** The part of a key that may be shown again. */
export const visiblePart = (key: string): string => String(key ?? "").slice(0, VISIBLE_CHARS);

/**
 * WHAT IS WRONG WITH THIS KEY REQUEST, or an empty array.
 *
 * `holderCan` is asked one permission at a time rather than being handed a set,
 * because the caller holds a `PermissionSet` whose `has` is the authority —
 * `size` and iteration are not, since an engine right is structural and is not
 * in the declared catalogue. Passing the set here would invite a `[...set]`
 * that silently omits every `engine.*` scope.
 */
export function keyProblems(
  body: unknown,
  existing: readonly ApiKey[],
  holderCan: (permission: string) => boolean,
): string[] {
  const problems: string[] = [];
  const row = (body ?? {}) as ApiKey;

  // A KEY WITHOUT A NAME IS A KEY NOBODY DARES REVOKE. Six rows reading
  // "nk_a1b2c3…" is a register in which the safe act — revoking the one that
  // leaked — cannot be told from the destructive one.
  const name = text(row.name, 80);
  if (!name) problems.push("a key needs a name");
  if (existing.some((k) => text(k.name, 80).toLowerCase() === name.toLowerCase() && !k.revokedAt)) {
    problems.push(`"${name}" is already the name of a live key`);
  }

  const scopes = list(row.scopes);
  // A KEY THAT MAY DO NOTHING IS A CREDENTIAL WITH NO PURPOSE — invariant 16,
  // and worse than useless: it is a live secret whose only property is that it
  // can be stolen.
  if (!scopes.length) problems.push("a key needs at least one permission");

  // INVARIANT 5, AT THE MOMENT OF MINTING. It is enforced again at every use
  // — see `effectiveScopes` — because this check goes stale the day the
  // creator is demoted.
  const beyond = scopes.filter((s) => !holderCan(s));
  if (beyond.length) {
    problems.push(`you cannot give a key rights you do not hold: ${beyond.slice(0, 5).join(", ")}`);
  }

  const live = existing.filter((k) => !k.revokedAt).length;
  if (live >= MAX_KEYS) problems.push(`no more than ${MAX_KEYS} live keys`);

  const expires = text(row.expiresAt, 10);
  if (expires && !/^\d{4}-\d{2}-\d{2}$/.test(expires)) problems.push("an expiry must be a date");

  return problems;
}

/** The stored shape, minus everything the service supplies. */
export function cleanKey(body: unknown): { name: string; scopes: string[]; expiresAt: string } {
  const row = (body ?? {}) as ApiKey;
  return {
    name: text(row.name, 80),
    // DEDUPED AND SORTED, so two keys with the same rights read the same in the
    // register and a diff of the two is a diff of what they may do.
    scopes: [...new Set(list(row.scopes))].sort(),
    expiresAt: text(row.expiresAt, 10),
  };
}

export type KeyState = "live" | "revoked" | "expired";

export function keyState(key: ApiKey, today: string): KeyState {
  if (key.revokedAt) return "revoked";
  const expires = text(key.expiresAt, 10);
  // EXPIRED ON ITS DATE, NOT AFTER IT. A key dated the 30th stops working on
  // the 30th; "valid until" that silently means "valid through" is a day of
  // access nobody agreed to.
  if (expires && expires <= text(today, 10)) return "expired";
  return "live";
}

export const usable = (key: ApiKey, today: string): boolean => keyState(key, today) === "live";

/**
 * WHAT THIS KEY MAY ACTUALLY DO, RIGHT NOW.
 *
 * THE INTERSECTION, and this is the whole security model. A key's stored scopes
 * were checked against its creator's rights the day it was minted; rights
 * shrink, and a stored list cannot know that. So a scope survives only while
 * the person the key acts as still holds it — a demotion narrows every key that
 * person owns, in the same act, with nothing to remember to run.
 *
 * `holderCan` rather than a set, for `keyProblems`' reason: `has` is the
 * authority on a `PermissionSet`, and iterating one drops every engine right.
 */
export function effectiveScopes(
  key: ApiKey, holderCan: (permission: string) => boolean,
): string[] {
  return list(key.scopes).filter((s) => holderCan(s));
}

/**
 * SHOULD `lastUsedAt` BE WRITTEN?
 *
 * A WRITE PER REQUEST IS A CONTENDED WRITE PER REQUEST. The register is one
 * document, so every call through every key would compare-and-set the same row
 * — which is the shape invariant 9 describes a queue draining, except here the
 * queue never empties. "Last used" only has to be accurate enough to answer
 * "is this key still in use", so it moves at most once an hour.
 *
 * The cost is that a key used at 10:59 and revoked at 11:00 may read as last
 * used at 10:00. Stated on the screen rather than hidden.
 */
export const USED_GRANULARITY_MS = 60 * 60 * 1000;

export function shouldTouch(lastUsedAt: unknown, nowISO: string): boolean {
  const last = Date.parse(String(lastUsedAt ?? ""));
  const now = Date.parse(nowISO);
  if (!Number.isFinite(now)) return false;
  if (!Number.isFinite(last)) return true;
  return now - last >= USED_GRANULARITY_MS;
}

/** What the register shows. The digest never leaves the server. */
export function keyView(keys: readonly ApiKey[], today: string): {
  id: string; name: string; prefix: string; scopes: string[];
  collaboratorId: string; createdAt: string; lastUsedAt: string;
  expiresAt: string; state: KeyState;
}[] {
  return [...keys]
    // LIVE FIRST, then newest — a register is read to find the key to revoke,
    // and a revoked one is history.
    .sort((a, b) =>
      Number(Boolean(a.revokedAt)) - Number(Boolean(b.revokedAt))
      || text(b.createdAt, 40).localeCompare(text(a.createdAt, 40)))
    .map((k) => ({
      id: text(k.id, 60),
      name: text(k.name, 80),
      prefix: text(k.prefix, VISIBLE_CHARS),
      scopes: list(k.scopes),
      collaboratorId: text(k.collaboratorId, 60),
      createdAt: text(k.createdAt, 40),
      lastUsedAt: text(k.lastUsedAt, 40),
      expiresAt: text(k.expiresAt, 10),
      state: keyState(k, today),
    }));
}
