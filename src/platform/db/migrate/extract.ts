// THE E IN ETL — read records grouped by SQL table, from whichever store is
// live.
//
// READ-ONLY. It calls getJSON / hGetAll / scanPrefix and nothing that writes —
// the same SCAN wrapper the cascade uses, never KEYS — for the studio-level
// and registry documents that still live in Redis regardless of backend. A
// studio is the unit of work (doc §4): SCAN s:<id>:* once, classify each key
// by suffix, transform.
//
// SECTION-SCOPED OPERATIONAL COLLECTIONS (tickets, quotations, projects,
// invoices, …) are a DIFFERENT kind of source and are read through
// `readCol` — the same dispatcher (sections.ts, DB_BACKEND) every route
// reads them through — because those rows moved to Postgres when
// NOMPANY_DB=postgres. A direct Redis read of `sec:<id>:c:<name>` would
// still call cleanly and return zero rows after cutover: it would not error,
// it would just be wrong, and the live export route
// (api/super/migration/export) would return 200 with a file that LOOKS
// complete — studio, users and settings all present — while every
// operational table in it is silently empty. See
// extractOperationalCollections below. This split is why `readCol` is
// itself still read-only here and opens no scope of its own: it defers
// entirely to what pgReadCol/redisReadCol already do per call.
//
// Rows accumulate in memory grouped by table, because a self-contained schema+data
// dump needs the full column UNION per table before it can emit CREATE TABLE — and
// a table (SalesTicket) spans every studio. A single-studio export is naturally
// bounded; a full export holds the record set transiently. See emit.ts.

import { getJSON, hGetAll, scanPrefix } from "../store";
import { REG, S } from "../keys";
// SIBLING IMPORT, NOT THE ALIAS (CLAUDE.md: "siblings import each other
// relatively") — extract.ts lives in platform/db/migrate, one level under
// platform/db, so this is still a relative reach into the folder it belongs
// to, exactly like `../store` and `../keys` above. `readCol` is the same
// dispatcher every route reads operational collections through
// (DB_BACKEND: redis / postgres / parity) — see the note on
// extractOperationalCollections below for why this file now calls it instead
// of reading the Redis key directly.
import { listSections, collectionsForKey, readCol } from "../sections";
import {
  PLATFORM, USER_SATELLITES, STUDIO_LEVEL, COLLECTION_TABLE, CHILD_ARRAYS,
} from "./mapping";
import {
  transformCollection, transformFlat, transformObject, transformMap,
  type Row, type Anomaly,
} from "./transform";

export type Scope = { kind: "all" } | { kind: "studio"; studioId: string };

export interface Extraction {
  tables: Map<string, Row[]>;
  anomalies: Anomaly[];
  unmapped: Set<string>;
  studios: number;
}

interface StudioRow {
  id?: string;
  name?: string;
  slug?: string;
}

// A small accumulator so every path appends the same way.
class Acc implements Extraction {
  tables = new Map<string, Row[]>();
  anomalies: Anomaly[] = [];
  unmapped = new Set<string>();
  studios = 0;

  add(table: string, rows: Row[]): void {
    if (!rows.length) return;
    const bucket = this.tables.get(table);
    if (bucket) bucket.push(...rows);
    else this.tables.set(table, [...rows]);
  }
  note(a: Anomaly[]): void {
    if (a.length) this.anomalies.push(...a);
  }
}

async function extractPlatform(acc: Acc): Promise<void> {
  for (const spec of PLATFORM) {
    const doc = await getJSON<unknown>(spec.key);
    const list = spec.shape === "array"
      ? (Array.isArray(doc) ? doc : [])
      : Object.values((doc as Record<string, unknown>) || {});
    for (const row of list) {
      const { row: flat, anomalies } = transformFlat(spec.table, row);
      acc.add(spec.table, [flat]);
      acc.note(anomalies);
    }
  }
}

async function extractUsers(acc: Acc): Promise<void> {
  const users = (await getJSON<{ id?: string }[]>(REG.users)) || [];
  for (const user of users) {
    const uid = user?.id;
    if (!uid) continue;
    for (const sat of USER_SATELLITES) {
      // A "map" satellite is a Redis HASH (studioVisits is hIncrBy'd, not a JSON
      // string), so it is read with hGetAll — a GET on a hash is a WRONGTYPE
      // error, and reading it with getJSON here is exactly what 500'd the full
      // database export. Read it first, before the getJSON path below.
      if (sat.shape === "map") {
        const hash = await hGetAll(sat.via(uid));
        if (Object.keys(hash).length) {
          const { rows } = transformMap(hash, {
            ownerField: sat.ownerField, ownerId: uid, keyName: sat.keyName || "Key", valueName: sat.valueName || "Value",
          });
          acc.add(sat.table, rows);
        }
        continue;
      }
      const doc = await getJSON<unknown>(sat.via(uid));
      if (doc == null) continue;
      if (sat.shape === "object") {
        const { row, anomalies } = transformObject(sat.table, doc, { ownerField: sat.ownerField, ownerId: uid });
        acc.add(sat.table, [row]);
        acc.note(anomalies);
      } else if (sat.shape === "array") {
        for (const el of Array.isArray(doc) ? doc : []) {
          const { row, anomalies } = transformObject(sat.table, el, { ownerField: sat.ownerField, ownerId: uid });
          acc.add(sat.table, [row]);
          acc.note(anomalies);
        }
      }
    }
  }
}

// SECTION-SCOPED OPERATIONAL COLLECTIONS — tickets, quotations, projects,
// invoices, and every other row that now lives in Postgres when
// NOMPANY_DB=postgres. Read through `readCol`, the SAME dispatcher every
// route uses, rather than a direct Redis GET — the whole point of this
// function existing. Before this, extractStudio's SCAN found `sec:<id>:c:<name>`
// keys and read them with a bare getJSON; that bypassed the dispatcher, so
// after cutover (operational rows moved to Postgres, `s:<id>:sec:*:c:*` no
// longer written) the SCAN found nothing and the live export route
// (api/super/migration/export) returned 200 with every section-scoped table
// silently empty — no error, so nothing gets investigated. A partial export
// that looks complete is worse than a failed one.
//
// Walking SECTION_COLLECTIONS (via collectionsForKey), rather than
// discovering keys by SCAN, is what makes this complete under Postgres: it is
// the exhaustive, import-time-checked catalogue of every valid
// (sectionKey, collection) pair — mapping.ts throws at import if one is
// missing a table, so nothing genuine is left undiscovered by walking it
// instead. Under Redis it is unchanged in substance: `readCol`'s Redis path
// is exactly `readArr(SEC.col(studioId, sectionId, name))`, the identical
// read this replaced.
//
// Each `readCol` call opens and releases its own tenant scope (pgReadCol via
// withTenant) — nothing here wraps the loop in a scope of its own, which
// would hold a Postgres connection across every collection in the studio
// instead of one at a time.
async function extractOperationalCollections(studioId: string, acc: Acc): Promise<void> {
  const sections = await listSections(studioId);
  for (const section of sections) {
    for (const name of collectionsForKey(section.key)) {
      const docs = await readCol(studioId, section.id, name);
      if (!docs.length) continue;
      const table = COLLECTION_TABLE[name];
      if (!table) { acc.unmapped.add(name); continue; } // unreachable while mapping.ts's import-time check holds; kept as the same defensive shape the old SCAN branch had.
      const { rows, anomalies } = transformCollection(name, table, docs, {
        studioId, sectionId: section.id, childArrays: CHILD_ARRAYS,
      });
      for (const [t, rs] of Object.entries(rows)) acc.add(t, rs);
      acc.note(anomalies);
    }
  }
}

// One studio: SCAN s:<id>:* once, classify each key by its local suffix.
async function extractStudio(studioId: string, acc: Acc): Promise<void> {
  const base = S.prefix(studioId);
  const keys = await scanPrefix(base); // SCAN, not KEYS — bounded, non-blocking

  for (const key of keys) {
    const rest = key.slice(base.length);

    const level = STUDIO_LEVEL.find((s) => s.via(studioId) === key);
    if (level) {
      const docs = await getJSON<unknown>(key);
      const { rows, anomalies } = transformCollection(level.table, level.table, docs, {
        studioId, sectionId: null, childArrays: CHILD_ARRAYS,
      });
      for (const [t, rs] of Object.entries(rows)) acc.add(t, rs);
      acc.note(anomalies);
      continue;
    }

    // Reference counters (a Redis HASH) → Counter rows, one per prefix.
    if (rest === "counters") {
      const hash = await hGetAll(key);
      acc.add("Counter", Object.entries(hash).map(([pfx, val]) => ({
        StudioId: studioId, Prefix: pfx, Value: Number(val) || 0,
      })));
      continue;
    }

    // A section's operational collection: sec:<secId>:c:<name>. SKIPPED here,
    // not read — see extractOperationalCollections below. Under
    // NOMPANY_DB=postgres these rows do not live at this Redis key at all, so
    // a key found by SCAN is proof only that the Redis backend is live; the
    // absence of one is not proof the collection is empty. Falling through to
    // the catch-all `unmapped` bucket at the end of this loop would also be
    // wrong — a real, mapped collection would be reported as unrecognised on
    // every run under Redis. So this branch's only job is to recognise the
    // shape and move on; the actual read happens once per studio, through the
    // dispatcher, so it returns the same rows whichever store is live.
    if (/^sec:[^:]+:c:.+$/.test(rest)) continue;

    // Streams stay in Redis (doc §1): the event log and audit are not records.
    if (rest === "events" || rest === "audit") continue;
    // Settings, chat usage, plans, templates, project boards: a later pass.
    // Recorded, never silently skipped — "no silent caps" (CLAUDE.md).
    acc.unmapped.add(rest.replace(/[a-z0-9_-]{6,}/gi, (s) => (s.length > 20 ? "<id>" : s)));
  }
  await extractOperationalCollections(studioId, acc);
  acc.studios += 1;
}

// The one entry point. `scope` decides breadth; the shape returned is identical.
export async function extract(scope: Scope): Promise<Extraction> {
  const acc = new Acc();

  if (scope.kind === "studio") {
    // A single studio's records, plus its own registry row so the dump names the
    // studio it belongs to. Platform and user tables need the full export.
    const studios = (await getJSON<StudioRow[]>(REG.studios)) || [];
    const self = studios.find((s) => s.id === scope.studioId);
    if (self) {
      const { row } = transformFlat("Studio", self);
      acc.add("Studio", [row]);
    }
    await extractStudio(scope.studioId, acc);
    return acc;
  }

  await extractPlatform(acc);
  await extractUsers(acc);
  const studios = (await getJSON<StudioRow[]>(REG.studios)) || [];
  for (const studio of studios) {
    if (studio?.id) await extractStudio(studio.id, acc);
  }
  return acc;
}
