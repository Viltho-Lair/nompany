// THE REDIS ROW PRIMITIVES, lifted out of sections.ts unchanged so that the
// Postgres implementation can be measured against them side by side. Nothing in
// here was rewritten during the move: the comments explaining why `id` precedes
// the spread and why addRows is a single write are the reasons those behaviours
// have to survive the migration, so they travel with the code.
//
// SIBLINGS IMPORT EACH OTHER RELATIVELY (./store, ./keys) — a folder's internals
// routing through its own public door is how a module ends up importing itself.

import { SEC, ID } from "./keys";
import { readArr, editArr } from "./store";
import { emit, TYPE } from "@/platform/realtime/events";
import { bumpMainAgg } from "./mainAgg";
import type { Row } from "./store";

// ---- operational rows (each carries studioId + sectionId) ------------------
// Reading is free-form; WRITING is only ever addRow/updateRow/deleteRow. There
// is deliberately no writeCol(): a blind whole-collection write is exactly the
// lost update those three exist to prevent, so the door is not left open.
export async function redisReadCol<T extends Row = Row>(
  studioId: string, sectionId: string, name: string,
): Promise<T[]> {
  return readArr<T>(SEC.col(studioId, sectionId, name));
}
// The three mutators each apply their change to the collection AS IT ACTUALLY
// STANDS at the instant of the write, not to a copy read moments earlier. Two
// people ticking different checklist items on the same board both land.
export async function redisAddRow<T extends Row = Row>(
  studioId: string, sectionId: string, name: string, item: Row,
): Promise<T> {
  const row = await editArr<T, T>(SEC.col(studioId, sectionId, name), (rows) => {
    // `id` STAYS FIRST, before the spread. It reads like a formality and is not:
    // JSON.stringify emits keys in insertion order, the golden responses pin
    // that order, and moving this line below `...item` failed 34 of them. The
    // cast is because `item.id` is `unknown` off a Row — every caller passes a
    // string or nothing, and ID.row supplies one when they pass nothing.
    const created = { id: (item.id as string) || ID.row(name), ...item, studioId, sectionId } as unknown as T;
    return { next: [created, ...rows], result: created };
  });
  await emit(studioId, { type: TYPE.rowCreated, sectionId, collection: name, rowId: row.id as string });
  void bumpMainAgg(studioId, sectionId, name); // best-effort rollup, never awaited (§3)
  return row;
}

// MANY ROWS, ONE WRITE. addRow in a loop is correct and unusably slow for an
// import: each call is its own compare-and-set, so N rows are N contended
// rounds against the same key plus N events — and every OTHER writer to that
// collection queues behind the whole run. Appending the batch inside a single
// editArr costs exactly one write no matter how long the list is.
//
// The event carries NO rowId, which is the shape emit already supports (it
// defaults to ""), and it is the honest one: this announces that the collection
// changed, not which row. Every consumer today reads the collection back, so
// naming one row out of two hundred would be a detail nobody could use and a
// lie to anyone who later tried.
export async function redisAddRows<T extends Row = Row>(
  studioId: string, sectionId: string, name: string, items: readonly Row[],
): Promise<T[]> {
  if (!items.length) return [];
  const created = await editArr<T, T[]>(SEC.col(studioId, sectionId, name), (rows) => {
    // `id` first, before the spread — same reason as addRow: key order is
    // pinned by the golden responses.
    const batch = items.map((item) =>
      ({ id: (item.id as string) || ID.row(name), ...item, studioId, sectionId } as unknown as T));
    // Prepended as a block, so the batch is newest-first like a single add and
    // the rows keep the order they arrived in among themselves.
    return { next: [...batch, ...rows], result: batch };
  });
  await emit(studioId, { type: TYPE.rowCreated, sectionId, collection: name });
  // BY THE SIZE OF THE BATCH. One write, so this fires once — a bare bump would
  // count two hundred rows as one and leave the nightly reconcile to find it.
  void bumpMainAgg(studioId, sectionId, name, created.length); // best-effort, never awaited (§3)
  return created;
}

// `patch` may be a function of the current row, which is how a caller expresses
// "flip this field" rather than "set it to what I last saw". On a contended
// write the function is re-applied to the row as it now is — so the flip stays
// a flip instead of silently reverting someone else's change.
export async function redisUpdateRow<T extends Row = Row>(
  studioId: string, sectionId: string, name: string, rowId: string,
  patch: Row | ((row: T) => Row),
): Promise<T | null> {
  const updated = await editArr<T, T | null>(SEC.col(studioId, sectionId, name), (rows) => {
    let hit: T | null = null;
    const next = rows.map((r) => {
      if (r.id !== rowId) return r;
      const changes = typeof patch === "function" ? patch(r) : patch;
      hit = { ...r, ...changes, id: r.id, studioId: r.studioId, sectionId: r.sectionId } as unknown as T;
      return hit;
    });
    return hit ? { next, result: hit } : { result: null };
  });
  // Only a real change is announced — a miss changed nothing to tell anyone about.
  if (updated) await emit(studioId, { type: TYPE.rowUpdated, sectionId, collection: name, rowId });
  return updated;
}
export async function redisDeleteRow(
  studioId: string, sectionId: string, name: string, rowId: string,
): Promise<boolean> {
  const removed = await editArr<Row, boolean>(SEC.col(studioId, sectionId, name), (rows) => {
    const next = rows.filter((r) => r.id !== rowId);
    return next.length === rows.length ? { result: false } : { next, result: true };
  });
  if (removed) await emit(studioId, { type: TYPE.rowDeleted, sectionId, collection: name, rowId });
  return removed;
}
