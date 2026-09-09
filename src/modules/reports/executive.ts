// THE EXECUTIVE DASHBOARD — the whole company on one screen.
//
// FOURTEEN SECTIONS EACH HAVE THEIR OWN DASHBOARD and nothing puts them side by
// side. A director asking "how is the company doing" opened eight screens and
// held the answers in their head, and the one question nobody could ask at all
// is whether a figure moved: every section dashboard reports TODAY.
//
// IT IS BUILT ON `./datasets`, WHICH ALREADY EXISTS, and that is the whole
// design decision. That catalogue names each collection, the section it lives
// under and the permission that opens it — everything a tile needs — so this
// mints no second list of where the numbers live. A tile that named its own
// collection would be free to disagree with the export and the report builder
// about what "invoices" means, and the three would drift the first time a
// section moved.
//
// A TILE THE READER MAY NOT SEE IS NEVER READ. The customer-360 rule: a figure
// derived from records somebody cannot open would leak exactly what the gate is
// for, and reading them to throw the answer away would cost a round trip for
// nothing.
//
// PURE. No imports, no store — the screen and the server agree by construction,
// and every rule here is asserted without a database.

export type Measure = "count" | "sum";

export type Tile = {
  key: string;
  label: string;
  /** A `DATASETS` key. The permission and the section come from there. */
  dataset: string;
  measure: Measure;
  /** For `sum`. Ignored for `count`. */
  field?: string;
  /** Which date splits this period from the last. */
  dateField: string;
  /**
   * Statuses that do not count. A draft invoice is not revenue and a cancelled
   * one never was — a headline that included them would overstate the company
   * by exactly the amount somebody was still thinking about.
   */
  excludeStatuses?: readonly string[];
  /** `up` when a rise is good. Nothing is neutral: every tile has a direction. */
  goodWhen: "up" | "down";
  /**
   * WHAT THE NUMBER IS IN. Declared rather than inferred from `measure`,
   * because a sum is not always money: leave is days and both format to two
   * decimals. "Invoiced 0.00" with no currency beside it is a figure a director
   * cannot act on — the studio's own currency is what the money tiles carry.
   */
  unit: "money" | "count" | "days";
};

/**
 * THE TILES, and the list is deliberately short.
 *
 * A dashboard with forty numbers is a report. These are the figures a director
 * is answerable for — what came in, what went out, what is owed, what is being
 * built, and who is doing it — one per section that has a number worth putting
 * on a board at all.
 */
export const TILES: readonly Tile[] = Object.freeze([
  {
    key: "invoiced", label: "Invoiced", dataset: "invoices", measure: "sum",
    field: "total", dateField: "issueDate",
    excludeStatuses: ["Draft", "Cancelled"], goodWhen: "up", unit: "money",
  },
  {
    key: "billed", label: "Supplier bills", dataset: "bills", measure: "sum",
    field: "total", dateField: "billDate",
    excludeStatuses: ["Draft", "Cancelled"], goodWhen: "down", unit: "money",
  },
  {
    key: "deals", label: "Deals opened", dataset: "tickets", measure: "count",
    dateField: "createdAt", goodWhen: "up", unit: "count",
  },
  {
    key: "quoted", label: "Quoted", dataset: "quotations", measure: "sum",
    field: "total", dateField: "createdAt",
    excludeStatuses: ["Draft", "Cancelled", "Rejected"], goodWhen: "up", unit: "money",
  },
  {
    key: "projectsOpened", label: "Projects opened", dataset: "projects", measure: "count",
    dateField: "createdAt", goodWhen: "up", unit: "count",
  },
  {
    key: "ordersPlaced", label: "Purchase orders", dataset: "orders", measure: "sum",
    field: "total", dateField: "createdAt",
    excludeStatuses: ["Draft", "Cancelled"], goodWhen: "down", unit: "money",
  },
  {
    key: "tendersEntered", label: "Tenders entered", dataset: "tenders", measure: "count",
    dateField: "createdAt", goodWhen: "up", unit: "count",
  },
  {
    key: "leaveTaken", label: "Leave days", dataset: "vacations", measure: "sum",
    field: "days", dateField: "from",
    excludeStatuses: ["Declined", "Cancelled"], goodWhen: "down", unit: "days",
  },
]);

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const day = (v: unknown): string => {
  const s = String(v ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : "";
};

/** Inclusive both ends, which is how a person reads "1st to the 30th". */
export const inWindow = (date: string, from: string, to: string): boolean =>
  Boolean(date) && date >= from && date <= to;

/**
 * THE WINDOW BEFORE THIS ONE, of the same length.
 *
 * SAME LENGTH, NOT "LAST MONTH". Comparing a 30-day window to a 31-day one
 * reports a 3% fall that is the calendar rather than the company, and comparing
 * a part-finished month to a whole one reports a collapse every first of the
 * month. The comparison is only honest between equal spans.
 */
export function previousWindow(from: string, to: string): { from: string; to: string } {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return { from: "", to: "" };
  }
  const dayMs = 24 * 60 * 60 * 1000;
  const span = end - start + dayMs;
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  return { from: iso(start - span), to: iso(start - dayMs) };
}

/** One tile's figure over one window. */
export function measure(
  tile: Tile, rows: readonly Record<string, unknown>[], from: string, to: string,
): number {
  const excluded = new Set(tile.excludeStatuses || []);
  let total = 0;
  for (const row of rows) {
    if (excluded.has(String(row.status ?? ""))) continue;
    if (!inWindow(day(row[tile.dateField]), from, to)) continue;
    total += tile.measure === "count" ? 1 : num(row[tile.field || ""]);
  }
  // ROUNDED ONCE, AT THE END. Rounding each row would drift by up to half a
  // penny per row, which on a thousand invoices is a headline that disagrees
  // with the ledger.
  return Math.round(total * 100) / 100;
}

export type TileResult = {
  key: string;
  label: string;
  dataset: string;
  measure: Measure;
  goodWhen: "up" | "down";
  unit: Tile["unit"];
  value: number;
  previous: number;
  /** Per cent, or null — see below. Never Infinity. */
  change: number | null;
  /** "better" | "worse" | "flat" | "unknown", read from `goodWhen`. */
  direction: "better" | "worse" | "flat" | "unknown";
};

/**
 * MOVEMENT, AND NULL RATHER THAN A NUMBER WHERE THERE IS NO ANSWER.
 *
 * NOTHING DIVIDES BY NOUGHT. A period that follows one with no activity has no
 * percentage — the company did not grow infinitely, it started. Reporting that
 * as a rise, or as 100%, invents a baseline nobody had. `direction` says
 * "unknown" and the screen says so in words.
 *
 * A rise is not automatically good: supplier bills going up is bills going up.
 * `goodWhen` is declared per tile so nothing has to infer it from the label.
 */
export function movement(tile: Tile, value: number, previous: number): {
  change: number | null; direction: TileResult["direction"];
} {
  if (previous === 0) {
    // BOTH NOUGHT IS FLAT AND KNOWN, which is different from "we cannot say":
    // nothing happened either period, and that is an answer.
    return value === 0
      ? { change: 0, direction: "flat" }
      : { change: null, direction: "unknown" };
  }
  const change = Math.round(((value - previous) / Math.abs(previous)) * 1000) / 10;
  if (change === 0) return { change, direction: "flat" };
  const up = change > 0;
  return { change, direction: up === (tile.goodWhen === "up") ? "better" : "worse" };
}

/**
 * THE BOARD.
 *
 * `rowsByDataset` carries only what the reader may open — the caller reads
 * nothing else — so a tile whose dataset is absent is OMITTED rather than shown
 * as nought. Zero is a real answer and "you may not see this" is not, and a
 * board that showed them alike would tell a sales manager the company invoiced
 * nothing.
 */
export function executiveBoard(
  rowsByDataset: Readonly<Record<string, readonly Record<string, unknown>[]>>,
  window: { from: string; to: string },
  tiles: readonly Tile[] = TILES,
): TileResult[] {
  const before = previousWindow(window.from, window.to);
  const out: TileResult[] = [];
  for (const tile of tiles) {
    const rows = rowsByDataset[tile.dataset];
    if (!rows) continue;
    const value = measure(tile, rows, window.from, window.to);
    const previous = before.from
      ? measure(tile, rows, before.from, before.to)
      : 0;
    out.push({
      key: tile.key,
      label: tile.label,
      dataset: tile.dataset,
      measure: tile.measure,
      goodWhen: tile.goodWhen,
      unit: tile.unit,
      value,
      previous,
      ...movement(tile, value, previous),
    });
  }
  return out;
}

/** Which datasets a board would need, so the caller reads exactly those. */
export const datasetsNeeded = (tiles: readonly Tile[] = TILES): string[] =>
  [...new Set(tiles.map((t) => t.dataset))];
