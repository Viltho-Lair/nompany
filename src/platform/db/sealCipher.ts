// CLIENT DATA IS SEALED AT REST — the pure half: what is sealed, and how.
//
// The owner's instruction, 17/09/2026: nobody who reaches the DATABASE — a
// dump, a backup, a console, somebody who should not have been there — may
// read a client, while inside a studio every client reads normally. So values
// are encrypted on their way into Postgres and decrypted on their way out, in
// the app, with keys the database never holds. `sealing.ts` is the half that
// knows where a studio's key is stored; this file knows nothing about storage
// and is asserted by tests/sealing-model.mjs without a database.
//
// NO KEY SERVICE, by the same instruction. Two layers, both ours:
//
//   the MASTER keyring — `NOMPANY_DATA_KEY`, held in Vercel's environment and
//   on the owner's machine, NEVER in Google Cloud, which is where the data is.
//   Someone with the project and not Vercel has ciphertext and nothing to open
//   it with. That separation is the whole of the protection; the cipher is the
//   easy part.
//
//   a DATA key per studio — random, 32 bytes, stored in the studio's own
//   documents WRAPPED by the master key. One studio's key opens nothing of
//   another's, one studio's key can be rotated alone, and deleting a studio
//   deletes its key, so a backup of its rows becomes unreadable for good.
//
// THE CIPHER IS NODE'S, NEVER OURS: AES-256-GCM through OpenSSL. Writing a
// cipher is the one way this could be done badly while looking finished.
//
// THE IV IS SYNTHETIC — an HMAC of the value and its binding, not random. Three
// reasons, and the first is the one that decided it:
//
//   1. A FUNCTION PATCH IS RE-RUN. updateRow re-applies a patch on every
//      contended attempt and, under NOMPANY_DB=parity, once per store — the
//      parity harness compares what the two stores hold as TEXT, so two
//      encryptions of one value must be one string.
//   2. A row rewritten unchanged stays byte-identical, so a write does not
//      churn every sealed field it did not touch.
//   3. GCM's one fatal misuse is one IV with two different plaintexts. Here an
//      IV is a function OF the plaintext, so the same IV means the same value.
//
// What that costs is that equal values are visibly equal — and only within ONE
// field of ONE row of ONE studio, because the binding goes into both the IV and
// the authenticated data. Nobody can see that two clients share a name, or that
// a ticket names the same client as an invoice. They can see that a name did
// not change between two versions of the same row, which a backup shows anyway.
//
// THE BINDING (`studioId|rowId|field`) is authenticated. A sealed value copied
// into another row, another field or another tenant fails to open rather than
// reading as somebody else's data. The collection is deliberately NOT in it:
// registers have been folded from one collection into another before
// (fold-maintenance-registers), and a move that goes through the row
// primitives must not orphan what it carries.

import crypto from "crypto";

// ---- what is sealed ---------------------------------------------------------
//
// DEFAULT-SEALED for a client: every field EXCEPT the few the store needs to
// find a row. A field added to ClientSchema next month is sealed without anyone
// remembering to list it, which is what "by default" has to mean.
const CLEAR_ON_CLIENT = new Set([
  "id", "studioId", "sectionId", "createdAt", "updatedAt", "createdByCollaboratorId",
  // A KEYED HASH, NOT THE NUMBER (./lookupKeys): the till finds a repeat
  // customer by it, which a sealed value cannot answer. Useless without the key.
  "phoneKey",
  // WHERE THE CLIENT CAME FROM ("pos"), and whether its name is still the
  // placeholder the till gave it — neither says anything about the client.
  "source", "autoNamed",
]);
const WHOLE_ROW: Record<string, Set<string>> = {
  salesClients: CLEAR_ON_CLIENT,
};

// A CLIENT'S DETAILS COPIED ONTO SOMETHING ELSE, sealed wherever they land.
// By NAME rather than by collection, because the copies are many — tickets,
// quotations, projects, invoices, credit notes, orders — and the next record to
// copy `clientName` should be sealed by the same line, not by somebody noticing.
const EVERYWHERE = new Set([
  "clientName", "contactName", "contactEmail", "contactPhone", "contactPosition",
  // A ticket's reference is the client's code — "ACME-001" names ACME.
  "ticketRef",
  // A tender's issuer IS its client until the handover says otherwise.
  "issuer",
]);

// Fields that are only a client's on particular records.
const BY_COLLECTION: Record<string, Set<string>> = {
  // A deal: its reference carries the client's code, its title and description
  // are about the client's work, and its location is the client's site.
  salesTickets: new Set(["ref", "title", "description", "location"]),
  // RFQ-ACME-001.
  rfqs: new Set(["reference"]),
  // A deal copied onto its approval — "Q-0004 · ACME", the client's PO
  // and its file name. Sealed WHOLE: `source` is one field holding the title,
  // and nothing queries inside it (approvals are found by `type`).
  approvals: new Set(["source", "note", "attachment"]),
  // "Invoice INV-0003 — ACME".
  journalEntries: new Set(["memo"]),
  // A STRANGER'S ANSWERS TO A STUDIO'S FORM (19/09/2026) — a name, a phone, an
  // email, what they want. Sealed WHOLE: the answers are one field, and nothing
  // queries inside them (responses are found by `formId`).
  marketingFormResponses: new Set(["answers"]),
};

export function isSealedField(collection: string, field: string): boolean {
  const whole = WHOLE_ROW[collection];
  if (whole) return !whole.has(field);
  return EVERYWHERE.has(field) || Boolean(BY_COLLECTION[collection]?.has(field));
}

/** Whether a write to this collection could need a key at all. */
export function rowNeedsSealing(collection: string, row: Record<string, unknown>): boolean {
  for (const [field, value] of Object.entries(row)) {
    if (value != null && isSealedField(collection, field)) return true;
  }
  return false;
}

// ---- the token --------------------------------------------------------------
//
// `ns1.<dataKeyId>.<base64url(iv ‖ tag ‖ ciphertext)>`, where the plaintext is
// the value's JSON — so a sealed array comes back an array, a number a number.
// The key id rides on the value so a rotated studio still opens what the old
// key wrote.
export const TOKEN_PREFIX = "ns1.";
const KEY_ID = /^[a-z0-9]{1,12}$/;

export const isSealed = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith(TOKEN_PREFIX);

type DataKey = { id: string; enc: Buffer; mac: Buffer };

// Two keys out of one, so the HMAC that makes the IV and the cipher never share
// a key. HKDF is Node's.
export function deriveDataKey(id: string, raw: Buffer): DataKey {
  if (!KEY_ID.test(id)) throw new Error(`sealing: bad data key id "${id}"`);
  if (raw.length !== 32) throw new Error("sealing: a data key is 32 bytes");
  const sub = (label: string) => Buffer.from(crypto.hkdfSync("sha256", raw, Buffer.alloc(0), label, 32));
  return { id, enc: sub("nompany/seal/enc"), mac: sub("nompany/seal/iv") };
}

const bindingOf = (studioId: string, rowId: string, field: string) =>
  Buffer.from(`${studioId}|${rowId}|${field}`, "utf8");

export function sealValue(key: DataKey, studioId: string, rowId: string, field: string, value: unknown): string {
  if (!rowId) throw new Error(`sealing: ${field} has no row id to be bound to`);
  const plain = Buffer.from(JSON.stringify(value), "utf8");
  const aad = bindingOf(studioId, rowId, field);
  const iv = crypto.createHmac("sha256", key.mac)
    .update(aad).update(Buffer.from([0])).update(plain)
    .digest().subarray(0, 12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key.enc, iv);
  cipher.setAAD(aad);
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  const body = Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64url");
  return `${TOKEN_PREFIX}${key.id}.${body}`;
}

/** The data key id a token names, or "" for anything that is not a token. */
export function tokenKeyId(token: unknown): string {
  if (!isSealed(token)) return "";
  const dot = token.indexOf(".", TOKEN_PREFIX.length);
  return dot > 0 ? token.slice(TOKEN_PREFIX.length, dot) : "";
}

// THROWS on anything that does not open. A client list that silently showed a
// blank, or the token itself, where a name should be would be a wrong key or a
// tampered row passing as data — the one failure this must never hide.
export function openValue(key: DataKey, studioId: string, rowId: string, field: string, token: string): unknown {
  const body = Buffer.from(token.slice(TOKEN_PREFIX.length + key.id.length + 1), "base64url");
  if (body.length < 28) throw new Error(`sealing: ${field} on ${rowId} is not a whole token`);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key.enc, body.subarray(0, 12));
  decipher.setAAD(bindingOf(studioId, rowId, field));
  decipher.setAuthTag(body.subarray(12, 28));
  let plain: Buffer;
  try {
    plain = Buffer.concat([decipher.update(body.subarray(28)), decipher.final()]);
  } catch {
    throw new Error(`sealing: ${field} on ${rowId} did not open — wrong key, or the row was altered`);
  }
  return JSON.parse(plain.toString("utf8"));
}

// ---- rows -------------------------------------------------------------------
//
// KEY ORDER IS KEPT: a sealed row has the same keys in the same order as the
// plain one, with the values swapped, because JSON.stringify's order is part of
// what the store and its tests compare.

export type Keyset = { current: DataKey; byId: Map<string, DataKey> };

export function sealRow<T extends Record<string, unknown>>(
  keys: Keyset, studioId: string, collection: string, rowId: string, row: T,
): T {
  const out: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(row)) {
    // ALWAYS SEALED, even a value that already looks like a token: text a
    // person typed must never be stored as though the app had sealed it, or a
    // pasted token would sit in the table waiting to fail somebody's read.
    out[field] = value != null && isSealedField(collection, field)
      ? sealValue(keys.current, studioId, rowId, field, value)
      : value;
  }
  return out as T;
}

// OPENS BY SHAPE, NOT BY POLICY, for sealed fields — so a field later taken off
// the list still reads. A token-shaped string in a field that was NEVER sealed
// is somebody's typing and is returned as typed; one in a sealed field that
// will not open is an error.
export function openRow<T extends Record<string, unknown>>(
  keys: Keyset | null, studioId: string, collection: string, row: T,
): T {
  let out: Record<string, unknown> | null = null;
  const rowId = String(row.id ?? "");
  for (const [field, value] of Object.entries(row)) {
    if (!isSealed(value)) continue;
    const key = keys?.byId.get(tokenKeyId(value));
    const policy = isSealedField(collection, field);
    if (!key) {
      if (!policy) continue;
      throw new Error(keys
        ? `sealing: ${field} on ${rowId} was sealed with a key this studio no longer has`
        : "sealing: a sealed value was read with no data key — is NOMPANY_DATA_KEY set?");
    }
    let plain: unknown;
    try {
      plain = openValue(key, studioId, rowId, field, value);
    } catch (e) {
      if (!policy) continue;
      throw e;
    }
    out ??= { ...row };
    out[field] = plain;
  }
  return (out ?? row) as T;
}

export const rowHasTokens = (row: Record<string, unknown>) => Object.values(row).some(isSealed);

// ---- the master keyring -----------------------------------------------------
//
// `NOMPANY_DATA_KEY` is `<id>:<base64 of 32 bytes>`, comma-separated, CURRENT
// FIRST. A retired master stays listed after the current one so a studio key it
// wrapped still opens; `rewrapStudioKey` then moves that studio onto the new one.
//
// A SANDBOX NEVER HOLDS THE REAL KEY. When the store is namespaced (the test
// suite, dev:sandbox) the keyring is one fixed, public test key, `t0`, whatever
// the environment says — so a test can never seal anything under the key that
// guards production, and the key's absence from a laptop never stops a test.
// `t0` is refused outright in an un-namespaced store, and production ignores
// the namespace entirely (keys.ts), so the public key cannot guard a real row.
export type MasterKey = { id: string; key: Buffer };
export const TEST_MASTER_ID = "t0";
const TEST_MASTER = crypto.createHash("sha256").update("nompany sandbox data key — public, guards nothing").digest();

export function parseMasterKeyring(raw: string | undefined, namespaced: boolean): MasterKey[] {
  if (namespaced) return [{ id: TEST_MASTER_ID, key: TEST_MASTER }];
  const out: MasterKey[] = [];
  for (const part of String(raw || "").split(",").map((s) => s.trim()).filter(Boolean)) {
    const at = part.indexOf(":");
    const id = at > 0 ? part.slice(0, at) : "";
    const key = Buffer.from(part.slice(at + 1), "base64");
    if (!KEY_ID.test(id)) throw new Error("NOMPANY_DATA_KEY: every key needs an id, as <id>:<base64>");
    if (id === TEST_MASTER_ID) throw new Error("NOMPANY_DATA_KEY: t0 is the public sandbox key and cannot guard live data");
    if (key.length !== 32) throw new Error(`NOMPANY_DATA_KEY: key ${id} is not 32 bytes of base64`);
    if (out.some((k) => k.id === id)) throw new Error(`NOMPANY_DATA_KEY: key ${id} is listed twice`);
    out.push({ id, key });
  }
  return out;
}

// A studio's data key, wrapped. Random IV here — a wrapped key is written once
// and never compared — and bound to the studio and the key's own id.
export function wrapDataKey(master: MasterKey, studioId: string, dataKeyId: string, raw: Buffer): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", master.key, iv);
  cipher.setAAD(Buffer.from(`nompany-dek|${studioId}|${dataKeyId}`, "utf8"));
  const ct = Buffer.concat([cipher.update(raw), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64url");
}

export function unwrapDataKey(master: MasterKey, studioId: string, dataKeyId: string, wrapped: string): Buffer {
  const body = Buffer.from(wrapped, "base64url");
  const decipher = crypto.createDecipheriv("aes-256-gcm", master.key, body.subarray(0, 12));
  decipher.setAAD(Buffer.from(`nompany-dek|${studioId}|${dataKeyId}`, "utf8"));
  decipher.setAuthTag(body.subarray(12, 28));
  try {
    return Buffer.concat([decipher.update(body.subarray(28)), decipher.final()]);
  } catch {
    throw new Error(`sealing: studio ${studioId}'s data key ${dataKeyId} did not unwrap under master ${master.id}`);
  }
}

export const newDataKeyMaterial = () => crypto.randomBytes(32);
