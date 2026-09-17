// CLIENT DATA IS SEALED AT REST — the half that knows where the keys are.
//
// sealCipher.ts says what is sealed and how; this file hands sections.ts a
// studio's keyset, creating the studio's data key the first time anything of
// that studio needs sealing. sections.ts is the only caller, because it is the
// one door every row passes through on either backend — so no screen, route or
// module can forget to seal, and none of them knows sealing exists.
//
// THE KEY RECORD lives in `documents` under the studio's own prefix
// (S.dataKey): `{ current, keys: [{ id, master, wrapped, createdAt }] }`. Keys
// are never removed from it while a value might still name one, which is what
// lets a rotated studio keep reading what the old key wrote.
//
// FAILS CLOSED. No master key configured means nothing is sealed and nothing
// sealed is opened — both throw, with the variable's name in the message. A
// deploy missing the key must fail loudly on its first client write, never
// write a client in the clear and say nothing, which is the exact failure
// fieldCrypto.ts's H-9 note records paying for once.

import { KEY_PREFIX, S } from "./keys";
import { getJSON, editJSON } from "./store";
import {
  deriveDataKey, newDataKeyMaterial, parseMasterKeyring, unwrapDataKey, wrapDataKey,
  type Keyset, type MasterKey,
} from "./sealCipher";

type StoredKey = { id: string; master: string; wrapped: string; createdAt: string };
export type KeyRecord = { current: string; keys: StoredKey[] };

let keyring: MasterKey[] | null = null;
function masters(): MasterKey[] {
  // Read once per process: the keyring is configuration, and parsing it on
  // every row would only find a bad variable later than necessary.
  keyring ??= parseMasterKeyring(process.env.NOMPANY_DATA_KEY, Boolean(KEY_PREFIX));
  return keyring;
}

function currentMaster(): MasterKey {
  const m = masters()[0];
  if (!m) throw new Error("NOMPANY_DATA_KEY is not set — refusing to store client data unencrypted");
  return m;
}

// A FEW MINUTES IN MEMORY, per process. Unwrapping is cheap next to the read
// that fetches the record, and the record is the one thing a busy studio would
// otherwise ask for on every request. A stale entry can only be missing a key
// minted elsewhere since — which `keysetFor` notices and re-reads for.
const TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; keys: Keyset }>();

function unwrapRecord(studioId: string, record: KeyRecord): Keyset {
  const byMaster = new Map(masters().map((m) => [m.id, m]));
  const byId = new Map<string, ReturnType<typeof deriveDataKey>>();
  for (const k of record.keys) {
    const master = byMaster.get(k.master);
    // A key wrapped by a master this process does not hold is skipped, not
    // fatal: only a value that NAMES it fails, and that failure says so.
    if (!master) continue;
    byId.set(k.id, deriveDataKey(k.id, unwrapDataKey(master, studioId, k.id, k.wrapped)));
  }
  const current = byId.get(record.current);
  if (!current) {
    throw new Error(`sealing: studio ${studioId}'s current data key ${record.current} is wrapped by a master key this deployment does not hold`);
  }
  return { current, byId };
}

const nextKeyId = (record: KeyRecord | null) =>
  `d${1 + Math.max(0, ...(record?.keys || []).map((k) => Number(k.id.slice(1)) || 0))}`;

function freshKey(studioId: string, record: KeyRecord | null): StoredKey {
  const master = currentMaster();
  const id = nextKeyId(record);
  return { id, master: master.id, wrapped: wrapDataKey(master, studioId, id, newDataKeyMaterial()), createdAt: new Date().toISOString() };
}

/**
 * A studio's keys. `create` mints the studio's first data key when it has none
 * — a write asks for that, a read never does: a read of a studio with no key
 * record has nothing sealed to open.
 *
 * `need` is a data key id a value names; a cached keyset without it is re-read
 * once, so a key rotated in another process is found rather than reported
 * missing.
 */
export async function keysetFor(
  studioId: string, { create = false, need = "" }: { create?: boolean; need?: string } = {},
): Promise<Keyset | null> {
  const hit = cache.get(studioId);
  if (hit && Date.now() - hit.at < TTL_MS && (!need || hit.keys.byId.has(need))) return hit.keys;

  let record = await getJSON<KeyRecord>(S.dataKey(studioId));
  if (!record && create) {
    // COMPARE-AND-SET (invariant 8): two first writes racing both see "none",
    // one lands its key, and the other re-reads and takes the winner's — so a
    // studio can never end up with rows sealed under a key that was not kept.
    record = await editJSON<KeyRecord, KeyRecord>(S.dataKey(studioId), (current) => {
      if (current) return { result: current };
      const key = freshKey(studioId, null);
      const next = { current: key.id, keys: [key] };
      return { next, result: next };
    });
  }
  if (!record) return null;
  const keys = unwrapRecord(studioId, record);
  cache.set(studioId, { at: Date.now(), keys });
  return keys;
}

/**
 * ROTATE a studio's data key: new values seal under a new key, and every old
 * key is kept so what it sealed still opens. Re-sealing old rows is the
 * backfill's job (scripts/migrate/seal-clients.mjs), not this function's.
 */
export async function rotateStudioKey(studioId: string): Promise<string> {
  const id = await editJSON<KeyRecord, string>(S.dataKey(studioId), (current) => {
    const key = freshKey(studioId, current);
    return { next: { current: key.id, keys: [...(current?.keys || []), key] }, result: key.id };
  });
  cache.delete(studioId);
  return id;
}

/**
 * RE-WRAP every data key under the CURRENT master — the step that lets a
 * retired master key be removed from NOMPANY_DATA_KEY. The data keys
 * themselves do not change, so no row is touched.
 */
export async function rewrapStudioKeys(studioId: string): Promise<number> {
  const master = currentMaster();
  const byMaster = new Map(masters().map((m) => [m.id, m]));
  const moved = await editJSON<KeyRecord, number>(S.dataKey(studioId), (current) => {
    if (!current) return { result: 0 };
    let n = 0;
    const keys = current.keys.map((k) => {
      if (k.master === master.id) return k;
      const from = byMaster.get(k.master);
      if (!from) throw new Error(`sealing: studio ${studioId}'s key ${k.id} is wrapped by ${k.master}, which is not in NOMPANY_DATA_KEY`);
      n += 1;
      const raw = unwrapDataKey(from, studioId, k.id, k.wrapped);
      return { ...k, master: master.id, wrapped: wrapDataKey(master, studioId, k.id, raw) };
    });
    return n ? { next: { ...current, keys }, result: n } : { result: 0 };
  });
  cache.delete(studioId);
  return moved;
}

/** Whether this deployment holds a master key (always true in a sandbox). */
export const sealingConfigured = () => masters().length > 0;

/** For tests: forget the cached keysets and the parsed keyring. */
export function resetSealingCache() {
  cache.clear();
  keyring = null;
}
