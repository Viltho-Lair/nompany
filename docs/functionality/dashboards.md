# The section dashboards — one chart kit, one time arithmetic, many views of each section

Every department's first screen is its dashboard: Main (the overview), CRM & Sales,
Technical, Projects, Procurement, Inventory, HR, Finance and Operations, and the register
summary that Manufacturing, Assets, Quality & HSE, Field Operations and Logistics share.
Since 10/09/2026 each one draws its own records several ways — over time, by share, by rank,
by weekday and against a second measure — rather than counting them one way at a time.

The per-department detail lives with each department (`sales-dashboard.md`,
`procurement-dashboard.md`, `executive-dashboard.md`, `engineering-dashboard.md`); this file is what they share.

**Engineering & Documents has its own since 13/09/2026** — documents waiting on the reader, late RFIs
and submittals, where the ball is, and reviews coming due (`engineering-dashboard.md`). The
"Technical" dashboard below is the Quotations department's now.

## What it is

**One chart kit, `components/charts`, dependency-free.** Area, bar (grouped or stacked),
the thin meter list, donut, ring and sparkline were there already; four shapes joined them:

| Shape | What it answers | Where it is used |
|---|---|---|
| `ComboChart` | Two quantities that do not share a unit, on one time axis — bars for one, a line on its own scale for the other | Deals opened (value + count), quotation value, purchase orders, income vs expense with the month's net |
| `HeatGrid` | When, or where — a grid whose depth is the count | Deals and quotations by weekday × week, the rota by location × day |
| `ShareBar` | Part of a whole in one line | Open deals by urgency, project schedule health |
| `Scatter` | Each record on two measures at once | Project value against plan progress, quotation turnaround in order |

**One time arithmetic, `components/dashboard/series`.** Month and week buckets, weekday grids,
"the largest few and the rest", days a span covers — pure, UTC, and asserted by
`tests/dashboard-series.mjs`.

**Two dashboard helpers, `components/dashboard`.** `DonutLegend` (a donut with its own key)
and `DashEmpty` (the line a widget says when it has nothing yet), because nine dashboards were
each writing both by hand.

## The rules

**UTC, always.** Every stored date is an ISO string on the server's clock, so every bucket is
keyed by the stored date's own UTC day and month. Bucketing by the reader's local midnight
moves a record a day for half the world and dropped today's quotations off the end of a window
once already (see `technicalAnalytics`).

**A ranking still adds up to the whole.** "Top clients", "spend by category" and the like fold
everything beyond the top few into one **Other** row rather than dropping it, and a stacked
month puts rows with no category into Other too. A chart shorter than the month it claims to
show is worse than no chart.

**A donut is for exclusive parts only.** Supplier standing, invoice state and stock health are
one state per record, so they are slices of a whole. Orders in flight (late, due soon, never
chased, undated) and receiving exceptions overlap — an order can be late *and* unchased — so
they are bars, never a donut whose slices would claim to add up.

**Null is not nought.** A figure the reader was not shown is withheld, not zero: the over-billed
count is left off the receiving chart when no bill was read, exactly as its tile says "hidden".

**Every new widget is paid, and has its own key.** Each is registered in
`lib/dashboardWidgets.ts` with a rung and gated by `useWidgetVisible`, like every widget before
it. The KPI rows stay the free floor.

**A dashboard loads when it is shown.** Each department screen imports its dashboard through a
client-side `next/dynamic` boundary, so a tenant page that is not on a dashboard does not carry
the dashboards or the chart kit in its first load (see `HeavyScreens.jsx` for why the same call
in the Server Component page would defer nothing).

**Arabic reads right-to-left on the axis too.** Month and weekday labels come from `Intl` in the
reader's language, and every new chart takes `rtl` so bar 0 sits under label 0 in a mirrored grid.

## What each section gained (10/09/2026)

| Section | New widgets (registry keys) |
|---|---|
| CRM & Sales | open value by stage, top clients by open value, open deals by urgency, deals opened per month, won and lost by month, when deals arrive (`sales.value-by-stage`, `.top-clients`, `.urgency-mix`, `.intake-trend`, `.win-loss`, `.activity-heat`) |
| Technical | quotations by status, quotation value by month, turnaround per quotation, when quotations are raised (`technical.status-mix`, `.value-trend`, `.turnaround-scatter`, `.weekday-heat`) |
| Projects | schedule health, value by client, overtime by month, value against progress (`projects.schedule-health`, `.value-by-client`, `.overtime-trend`, `.value-vs-progress`) |
| Procurement | supplier standing, orders in flight, receiving exceptions (`procurement.supplier-health`, `.delivery-status`, `.receiving-exceptions`) |
| Inventory | stock health, most valuable stock, stock in and out by week, purchase orders per month (`inventory.stock-health`, `.top-items`, `.movement-trend`, `.order-trend`) |
| HR | documents expiring by week, leave days by month (spread across the days each request covers), who is away over the next 30 days (`hr.expiry-by-week`, `.leave-trend`, `.away-forecast`) |
| Finance | invoices by state, owed to us vs owed by us per aging band, spend by category over time; income vs expense now carries the month's net as a line (`finance.invoice-status`, `.receivable-vs-payable`, `.expense-trend`) |
| Operations | permits lapsing by month, hours by location, permit state by type, the rota by location and day (`operations.permit-expiry`, `.hours-by-location`, `.state-by-type`, `.shift-heat`) |
| Main | department activity on one axis (the busiest five) with a named row per department; headline trends with the movement drawn as a bar |
| Register sections | a status strip on each register card, and open against overdue across every register on one chart |

## The rollout consequence

**A tier that was given an explicit widget selection does not include the new keys**, because
the selection is exactly what was ticked (`enabledWidgets`). A studio on such a tier sees each
new widget as the locked teaser until somebody ticks it in `/super` → Tiers. A tier with no
explicit selection derives its widgets from its rung and picks the new ones up by rung
immediately. This is the registry working as designed, not a gap, and it is written here so it
is not mistaken for one.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **The windows are fixed.** Twelve months, eight or twelve weeks, thirty days — no date-range
  filter on any of the new widgets, and no comparison against a previous period (the Reports
  board is where that is sold).
- **Nothing drills through.** A bar or a cell does not open the records behind it.
- **No hover values on the charts.** Bars and lines show their shape; the exact figure is on the
  row lists and in the tooltips of the heat grid, share bar and scatter dots only.
- **Stored tokens are shown as stored in three places** — quotation statuses, urgencies and
  permit states read in English in an Arabic studio, as they already did on the widgets beside
  them.
- **Opening and closing are the only sales dates read.** Conversion between stages and time in
  each stage are derivable from `stageHistory` and are not drawn.
- **Per-person views** — deals per salesperson, quotations per handler over time — are not built.
- **No new section got a dashboard of its own.** Tendering, Manufacturing, Assets, Quality & HSE,
  Logistics and Reports still reach the register summary (or their own screen), not a bespoke
  dashboard.
