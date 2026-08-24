// THE E IN ETL — read records out of Redis, grouped by SQL table.
//
// READ-ONLY. It calls getJSON / hGetAll / scanPrefix and nothing that writes —
// the same SCAN wrapper the cascade uses, never KEYS. A studio is the unit of
// work (doc §4): SCAN s:<id>:* once, classify each key by suffix, transform.
//
// Rows accumulate in memory grouped by table, because a self-contained schema+data
// dump needs the full column UNION per table before it can emit CREATE TABLE — and
// a table (SalesTicket) spans every studio. A single-studio export is naturally
// bounded; a full export holds the record set transiently. See emit.ts.

import { getJSON, hGetAll, scanPrefix } from "../store";
import { REG, S, SEC } from "../keys";
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
      } else if (sat.shape === "map") {
        const { rows } = transformMap(doc, {
          ownerField: sat.ownerField, ownerId: uid, keyName: sat.keyName || "Key", valueName: sat.valueName || "Value",
        });
        acc.add(sat.table, rows);
      }
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

    // A section's operational collection: sec:<secId>:c:<name>.
    const m = rest.match(/^sec:([^:]+):c:(.+)$/);
    if (m) {
      const sectionId = m[1];
      const name = m[2];
      const table = COLLECTION_TABLE[name];
      if (!table) { acc.unmapped.add(name); continue; }
      const docs = await getJSON<unknown>(SEC.col(studioId, sectionId, name));
      const { rows, anomalies } = transformCollection(name, table, docs, {
        studioId, sectionId, childArrays: CHILD_ARRAYS,
      });
      for (const [t, rs] of Object.entries(rows)) acc.add(t, rs);
      acc.note(anomalies);
      continue;
    }

    // Streams stay in Redis (doc §1): the event log and audit are not records.
    if (rest === "events" || rest === "audit") continue;
    // Settings, chat usage, plans, templates, project boards: a later pass.
    // Recorded, never silently skipped — "no silent caps" (CLAUDE.md).
    acc.unmapped.add(rest.replace(/[a-z0-9_-]{6,}/gi, (s) => (s.length > 20 ? "<id>" : s)));
  }
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
