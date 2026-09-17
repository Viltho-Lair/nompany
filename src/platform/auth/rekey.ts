// MOVING STORED CREDENTIALS ONTO NOMPANY_DATA_KEY — the owner's decision of
// 17/09/2026: one key, FIELD_ENCRYPTION_KEY retired.
//
// Shared by the console action (/api/super/rekey) and the CLI
// (scripts/migrate/rekey-field-crypto.mjs). The console action exists because
// the retired key cannot be read out of Vercel (a Sensitive variable is never
// shown again), so the conversion has to run WHERE THE KEY IS — inside the
// deployment — and the key never has to leave it.
//
// WHERE THE VALUES ARE, by explicit key — never a prefix scan (invariant 17):
//   REG.novaConfig                     the platform's Nova API key
//   REG.googleCalendar                 the console's Google connection
//   REG.superAdmins                    each console admin's MFA secret
//   U.profile(user)                    the retired per-person Nova key
//   U.calendarConnection(user, p)      each person's calendar tokens
//   S.collaborators(studio)            HR ID/passport numbers not yet removed
//
// NOTHING IS WRITTEN UNLESS EVERY VALUE OPENS. A run that converted half and
// failed on the rest would leave both keys needed; one that blanked what it
// could not read would destroy a credential silently.

import { REG, U, S } from "@/platform/db/keys";
import { getJSON, setJSON, editJSON } from "@/platform/db/store";
import { currentMasterKey } from "@/platform/db/masterKeys";
import { listUsers } from "./users";
import { listStudios } from "@/modules/main/studios";
import { CALENDAR_PROVIDERS } from "./calendarProviders";
import { isEncrypted, reencryptField } from "./fieldCrypto";

export type StaleDocument = { key: string; doc: unknown; paths: string[] };
export type RekeyReport = {
  master: string;
  checked: number;
  documents: { key: string; values: number; paths: string[] }[];
  values: number;
  unreadable: { key: string; reason: string }[];
};

function currentId(): string {
  const m = currentMasterKey();
  if (!m) throw new Error("NOMPANY_DATA_KEY is not set — there is nothing to re-encrypt under");
  return m.id;
}

const stale = (v: unknown, id: string) => isEncrypted(v) && !String(v).startsWith(`enc:v2:${id}:`);

// Where each stale value sits, so a report names WHERE and never WHAT.
function stalePaths(value: unknown, id: string, path = "", out: string[] = []): string[] {
  if (stale(value, id)) out.push(path || "(value)");
  else if (Array.isArray(value)) value.forEach((v, i) => stalePaths(v, id, `${path}[${i}]`, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) stalePaths(v, id, path ? `${path}.${k}` : k, out);
  }
  return out;
}

// The document with every stale value moved. THROWS on one that will not open.
function moved(value: unknown, id: string): unknown {
  if (stale(value, id)) return reencryptField(value);
  if (Array.isArray(value)) return value.map((v) => moved(v, id));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, moved(v, id)]));
  }
  return value;
}

export async function rekeyTargets(): Promise<string[]> {
  const keys = [REG.novaConfig, REG.googleCalendar, REG.superAdmins];
  for (const user of await listUsers()) {
    const id = String((user as { id?: unknown }).id || "");
    if (!id) continue;
    keys.push(U.profile(id));
    for (const p of Object.keys(CALENDAR_PROVIDERS)) keys.push(U.calendarConnection(id, p));
  }
  for (const studio of await listStudios()) {
    const id = String((studio as { id?: unknown }).id || "");
    if (id) keys.push(S.collaborators(id));
  }
  return keys;
}

async function scan(keys: string[], id: string): Promise<StaleDocument[]> {
  const found: StaleDocument[] = [];
  for (const key of keys) {
    const doc = await getJSON(key);
    const paths = doc == null ? [] : stalePaths(doc, id);
    if (paths.length) found.push({ key, doc, paths });
  }
  return found;
}

/** What a run would do. Reads only. */
export async function rekeyReport(): Promise<RekeyReport & { pending: StaleDocument[] }> {
  const id = currentId();
  const keys = await rekeyTargets();
  const pending = await scan(keys, id);
  const unreadable: RekeyReport["unreadable"] = [];
  for (const p of pending) {
    try { moved(p.doc, id); } catch (e) { unreadable.push({ key: p.key, reason: (e as Error).message }); }
  }
  return {
    master: id,
    checked: keys.length,
    documents: pending.map((p) => ({ key: p.key, values: p.paths.length, paths: p.paths })),
    values: pending.reduce((n, p) => n + p.paths.length, 0),
    unreadable,
    pending,
  };
}

/**
 * Convert every stale value. Refuses outright if any value will not open.
 * Every document is copied to REG.rekeyBackup BEFORE the first rewrite, then
 * each is rewritten by compare-and-set against the document as it NOW is, and
 * the targets are scanned again to prove nothing is left.
 */
export async function applyRekey() {
  const report = await rekeyReport();
  if (report.unreadable.length) return { error: "unreadable" as const, report: strip(report) };
  if (!report.pending.length) return { ok: true as const, converted: 0, left: 0, report: strip(report) };

  const id = report.master;
  const prior = (await getJSON<{ at: string; documents: { key: string; doc: unknown }[] }[]>(REG.rekeyBackup)) || [];
  await setJSON(REG.rekeyBackup, [
    ...prior,
    { at: new Date().toISOString(), documents: report.pending.map(({ key, doc }) => ({ key, doc })) },
  ]);

  let converted = 0;
  for (const p of report.pending) {
    const changed = await editJSON<unknown, boolean>(p.key, (doc) => (
      doc == null || !stalePaths(doc, id).length ? { result: false } : { next: moved(doc, id), result: true }
    ));
    if (changed) converted += 1;
  }
  const left = await scan(await rekeyTargets(), id);
  return { ok: true as const, converted, left: left.length, leftKeys: left.map((l) => l.key), report: strip(report) };
}

// The report without the documents themselves — never sent to a screen.
function strip({ pending: _pending, ...rest }: RekeyReport & { pending: StaleDocument[] }): RekeyReport {
  return rest;
}

export const publicReport = strip;
