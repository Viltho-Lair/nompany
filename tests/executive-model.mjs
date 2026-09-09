// THE EXECUTIVE DASHBOARD, asserted without a database.
//
// The board's only new claim over the section dashboards is MOVEMENT, so most
// of what matters here is what a movement means when there is nothing to
// compare against.
import { register } from "node:module";
import { pathToFileURL } from "node:url";
const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const {
  TILES, inWindow, previousWindow, measure, movement, executiveBoard, datasetsNeeded,
} = await import("@/modules/reports/executive");
const { DATASETS } = await import("@/modules/reports/datasets");

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

// ---- the board is built on the dataset catalogue ----------------------------
// EVERY TILE NAMES A REAL DATASET. A tile with its own collection would be a
// second answer to "where do the numbers live", free to disagree with the
// export and the report builder the first time a section moved.
const known = new Set(DATASETS.map((d) => d.key));
ok("EVERY TILE NAMES A DATASET THE CATALOGUE DECLARES",
  TILES.every((t) => known.has(t.dataset)),
  TILES.filter((t) => !known.has(t.dataset)).map((t) => t.dataset).join(","));
// A SUM WITHOUT A FIELD SUMS NOTHING, silently, forever.
ok("every sum tile names the field it sums",
  TILES.filter((t) => t.measure === "sum").every((t) => Boolean(t.field)));
ok("every tile says which way is good",
  TILES.every((t) => t.goodWhen === "up" || t.goodWhen === "down"));
// A RISE IS NOT AUTOMATICALLY GOOD: supplier bills going up is bills going up.
ok("SUPPLIER BILLS RISING IS NOT GOOD NEWS",
  TILES.find((t) => t.key === "billed").goodWhen === "down");
ok("the caller is told exactly which datasets to read",
  datasetsNeeded().length === new Set(TILES.map((t) => t.dataset)).size);

// ---- the window -------------------------------------------------------------
ok("both ends are inclusive, as a person reads them",
  inWindow("2026-09-01", "2026-09-01", "2026-09-30")
  && inWindow("2026-09-30", "2026-09-01", "2026-09-30"));
ok("outside is outside", !inWindow("2026-10-01", "2026-09-01", "2026-09-30"));
ok("no date is in no window", !inWindow("", "2026-09-01", "2026-09-30"));

// SAME LENGTH, NOT "LAST MONTH": comparing 30 days to 31 reports a 3% fall
// that is the calendar rather than the company.
const prev = previousWindow("2026-09-01", "2026-09-30");
ok("THE PREVIOUS WINDOW IS THE SAME LENGTH",
  prev.from === "2026-08-02" && prev.to === "2026-08-31", JSON.stringify(prev));
ok("a one-day window compares to the day before",
  JSON.stringify(previousWindow("2026-09-09", "2026-09-09"))
    === JSON.stringify({ from: "2026-09-08", to: "2026-09-08" }));
ok("a nonsense window has no predecessor",
  previousWindow("soon", "later").from === "");
ok("a backwards window has no predecessor",
  previousWindow("2026-09-30", "2026-09-01").from === "");

// ---- measuring --------------------------------------------------------------
const INVOICES = [
  { status: "Sent", total: 100, issueDate: "2026-09-05" },
  { status: "Paid", total: 250.005, issueDate: "2026-09-20" },
  // A DRAFT IS NOT REVENUE and a cancelled one never was — a headline that
  // counted them overstates the company by what somebody was still thinking about.
  { status: "Draft", total: 9999, issueDate: "2026-09-06" },
  { status: "Cancelled", total: 5000, issueDate: "2026-09-07" },
  { status: "Paid", total: 400, issueDate: "2026-08-10" },
  { status: "Paid", total: 7, issueDate: "" },
];
const invoiced = TILES.find((t) => t.key === "invoiced");
ok("A DRAFT AND A CANCELLED INVOICE ARE NOT REVENUE",
  measure(invoiced, INVOICES, "2026-09-01", "2026-09-30") === 350.01,
  String(measure(invoiced, INVOICES, "2026-09-01", "2026-09-30")));
ok("a row with no date is in no period",
  measure(invoiced, INVOICES, "2026-01-01", "2026-12-31") === 750.01);
ok("the previous period is measured the same way",
  measure(invoiced, INVOICES, prev.from, prev.to) === 400);
const deals = TILES.find((t) => t.key === "deals");
ok("a count counts rows, not amounts",
  measure(deals, [{ createdAt: "2026-09-02" }, { createdAt: "2026-09-03" }], "2026-09-01", "2026-09-30") === 2);

// ---- movement ---------------------------------------------------------------
ok("a rise on a good-when-up tile is better",
  movement(invoiced, 120, 100).direction === "better");
ok("...and on a good-when-down tile is worse",
  movement(TILES.find((t) => t.key === "billed"), 120, 100).direction === "worse");
ok("the percentage is one decimal", movement(invoiced, 133, 100).change === 33);
ok("a fall is negative", movement(invoiced, 50, 100).change === -50);
ok("no change is flat", movement(invoiced, 100, 100).direction === "flat");
// NOTHING DIVIDES BY NOUGHT. A period following one with no activity has no
// percentage — the company did not grow infinitely, it started.
ok("A PERIOD FOLLOWING NOTHING HAS NO PERCENTAGE",
  movement(invoiced, 500, 0).change === null
  && movement(invoiced, 500, 0).direction === "unknown");
// BOTH NOUGHT IS FLAT AND KNOWN, which is a different statement from "we
// cannot say": nothing happened either period, and that is an answer.
ok("NOTHING EITHER PERIOD IS FLAT, NOT UNKNOWN",
  movement(invoiced, 0, 0).direction === "flat" && movement(invoiced, 0, 0).change === 0);

// ---- the board --------------------------------------------------------------
const board = executiveBoard({ invoices: INVOICES }, { from: "2026-09-01", to: "2026-09-30" });
// A TILE THE READER MAY NOT SEE IS NEVER READ, so its dataset is absent — and
// it is OMITTED rather than shown as nought. Zero is a real answer and "you may
// not see this" is not; a board that showed them alike would tell a sales
// manager the company invoiced nothing.
ok("A DATASET THE READER CANNOT OPEN IS OMITTED, NOT ZEROED",
  board.length === 1 && board[0].key === "invoiced");
ok("the tile carries both periods and the movement",
  board[0].value === 350.01 && board[0].previous === 400 && board[0].direction === "worse");
ok("an empty read produces an empty board", executiveBoard({}, { from: "2026-09-01", to: "2026-09-30" }).length === 0);
// A DATASET PRESENT BUT EMPTY IS A REAL NOUGHT, not an omission: the reader may
// see it and there is nothing there.
ok("A DATASET PRESENT AND EMPTY IS A REAL NOUGHT",
  executiveBoard({ invoices: [] }, { from: "2026-09-01", to: "2026-09-30" })[0].value === 0);

// ---- what the tier sells ----------------------------------------------------
//
// THE GATE FAILS OPEN, by design: `useWidgetVisible` answers TRUE for a key the
// registry does not list, so a widget added to a screen but not registered is
// never silently hidden. The cost is the mirror failure — REMOVING a key makes
// the thing it gated free, silently, on every studio. Nothing else notices, so
// these assertions are what notices.
const { DASHBOARD_WIDGETS, WIDGET_KEYS, widgetsForRung, widgetsBySection } =
  await import("@/lib/dashboardWidgets");

ok("THE BOARD'S ANALYSIS IS A REGISTERED WIDGET, or it is free to everybody",
  WIDGET_KEYS.has("reports.movement") && WIDGET_KEYS.has("reports.window"));
// THE FIGURES ARE FREE AND THE ANALYSIS IS SOLD. A tile is a sum of records the
// reader can already open, so the free floor must still show the numbers.
ok("THE FREE FLOOR BUYS NEITHER",
  !widgetsForRung("basic").includes("reports.movement")
  && !widgetsForRung("basic").includes("reports.window"));
ok("the first paid rung buys the comparison",
  widgetsForRung("simple").includes("reports.movement"));
ok("...and the period picker costs one rung more",
  !widgetsForRung("simple").includes("reports.window")
  && widgetsForRung("moderate").includes("reports.window"));
// A SECTION WITH NO WIDGETS IS DROPPED FROM THE EDITOR, so registering the
// section without its widgets would leave the /super tier editor unable to
// sell either of them.
ok("Reports & BI appears in the tier editor",
  widgetsBySection().some((g) => g.section === "reports"));
ok("both widgets are filed under it",
  DASHBOARD_WIDGETS.filter((w) => w.section === "reports").length === 2);

console.log(fails ? `\nexecutive model: ${fails} FAILURES\n` : "\nexecutive model: all passed\n");
process.exit(fails ? 1 : 0);
