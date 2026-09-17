// THE STORE HALF OF `./executive`.
//
// IT MINTS NO PERMISSION KEY. A tile is a figure over records the reader can
// already open, and a right over "the executive dashboard" would gate the
// PICTURE without gating anything in it — while a director who could not open
// Finance would still see the invoiced total. The gate that matters is the one
// on each dataset, and `readDataset` already asks it.
//
// `reports.exports.view` OPENS THE SCREEN and nothing else, exactly as
// `crmSales.clients.view` opens a customer's page without opening its contents.
// A studio can therefore give somebody the board without giving them the export.
//
// A TILE THE READER MAY NOT SEE IS NEVER READ. `readDataset` refuses before it
// touches the store, so a refused dataset costs nothing and its tile is
// OMITTED — see `executiveBoard` for why omitted rather than zeroed.

import { requirePermission } from "@/platform/access";
import { datasetFor } from "./datasets";
import { readDataset } from "./read";
import { executiveBoard, datasetsNeeded, previousWindow, tilesRunning, groupByDepartment } from "./executive";
import { switchboard } from "@/lib/dashboardWidgets";
import { SECTION_DEFS } from "@/platform/db/keys";
import type { ReportsContext } from "./reportService";
import type { Section } from "@/platform/db/sections";

const day = (v: unknown): string => {
  const s = String(v ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
};

/** The calendar month `today` falls in — what the board opens on. */
function thisMonth(today: string): { from: string; to: string } {
  const from = `${today.slice(0, 7)}-01`;
  const [y, m] = today.split("-").map(Number);
  // Day 0 of the next month is the last day of this one, which is the only
  // arithmetic here that has to know February exists.
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { from, to: last };
}

export async function executiveDashboard(
  // EVERY stored section row, switched-off ones included — studioContext's list.
  ctx: ReportsContext & { sections?: Section[] }, query: { from?: unknown; to?: unknown } = {},
) {
  const denied = requirePermission(ctx.access, "reports.exports.view");
  if (denied) return denied;

  // THE CLOCK TRAVELS WITH THE ANSWER, so "this month" is one instant rather
  // than whenever each figure happened to be computed — the rule the tender
  // register and the cost breakdown already follow.
  const today = new Date().toISOString().slice(0, 10);
  const asked = { from: day(query.from), to: day(query.to) };
  const window = asked.from && asked.to && asked.from <= asked.to ? asked : thisMonth(today);

  // WHAT THE STUDIO RUNS COMES FIRST. A tile whose part is switched off is
  // dropped here, so its data set is never read and it is not counted among
  // the figures withheld for want of a right. Asked of every stored row on
  // each request, so a part switched back on is on the board at the next load.
  const sections = ctx.sections || [];
  const running = tilesRunning(switchboard(sections));

  // READ ONLY WHAT A TILE NEEDS, and only what the reader may open. Both halves
  // matter: the first stops the board reading eight collections to draw six
  // tiles, the second is the customer-360 rule.
  const rowsByDataset: Record<string, Record<string, unknown>[]> = {};
  const refused: string[] = [];
  await Promise.all(datasetsNeeded(running).map(async (key) => {
    const dataset = datasetFor(key);
    if (!dataset) return;
    const read = await readDataset(ctx, dataset);
    if ("error" in read) { refused.push(key); return; }
    rowsByDataset[key] = read.rows;
  }));

  const tiles = executiveBoard(rowsByDataset, window, running, (ctx.studio as { currency?: unknown }).currency);
  // A DEPARTMENT IS NAMED AS THE STUDIO NAMED IT — a section's name is data
  // the tenant owns, never translated — and listed in the sidebar's order.
  const nameOf = new Map(sections.map((s) => [s.key, String(s.name || "")]));
  const order = SECTION_DEFS.map((d) => d.key);

  return {
    asOf: today,
    window,
    previous: previousWindow(window.from, window.to),
    tiles,
    departments: groupByDepartment(tiles, order).map((g) => ({
      key: g.department, name: nameOf.get(g.department) || g.department, tiles: g.tiles.map((t) => t.key),
    })),
    // WHAT THE MONEY TILES ARE IN. Blank when the studio has not set one,
    // and the screen then says nothing rather than guessing — the same
    // refusal to invent a currency the approval engine already makes.
    currency: String((ctx.studio as { currency?: unknown }).currency || ""),
    // WHAT THE READER IS NOT BEING SHOWN, by dataset rather than by tile. A
    // board that silently omitted six of eight figures reads as a company doing
    // very little; naming the gap turns it into "ask for these rights".
    hidden: refused.sort(),
    // Out of the figures the studio RUNS — a switched-off part is not a gap.
    total: running.length,
  };
}
