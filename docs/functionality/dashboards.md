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

## A widget goes when its section goes (17/09/2026)

**The owner's rule: a visual is bonded to the sections it is drawn from, and a switched-off
section or part takes its visuals with it.** It is not the tier's question — the tier says what
the studio *bought*, this says what the company *runs* — and a widget is drawn only when three
gates pass: the tier includes it, every section it reads is on, and the reader holds the rights.

- **`switchboard(sections)`** (`lib/dashboardWidgets.ts`) answers "is this section on": its own
  `enabled` **and** its department's. A key with no row is on — nobody said no to it.
- **A widget declares its sources**, separately from the dashboard it is drawn on (`section`):
  `needs` (all must be on) or `anyOf` (a widget built from several). **A combined widget drops the
  switched-off parts and stays** while any source is on — the owner's answer — and is gone only
  when none is. `widgetAvailable` is the one test.
- **Sources are sections the owner switches, never storage.** Quotations and RFQs are filed under
  two filed-only rows that follow CRM & Sales and Engineering; the owner switches **Quotations**.
  So every read of a filed-only row names its switch (`readIfVisible(…, switchKey)`,
  `seen(key, fallback, switchKey)`), and `seen` **throws** on a filed-only switch rather than
  guess — one storage row holds quotations, contracts and sales orders, which are worked in two
  departments. `tests/widget-sections-model.mjs` scans Main's modules for a read that forgets.
- **A switched-off department's widget is absent**: not computed, not sent, not a locked teaser
  (the teaser means *not bought yet*; an off section is a choice), not a zero. The route lists it
  in `executive.hidden` and the grid flows on — widgets are ordered by what is available, not by
  space.

**Main is done.** Its one read gate, `ctx.seen`, asked the reader's rights and never the switch,
and an owner holds every right — so a studio with Projects off was shown "Projects running".
`seen` now asks both, which fixes the headline tiles, the activity feed, the four executive
widgets, *Awaiting you* and Nova's bubble together. The activity and trend rows are named by the
switch (`quotations-register`), so their names and links go to the screen the owner knows rather
than to a storage row nobody can open. `tests/crud.mjs` proves it against the database on a
studio created with Projects, Quotations, Inventory and Finance off.

**The department dashboards followed (slice 2, 17/09/2026).** Ninety of the ninety-two
registered widgets declared their sources then; the Reports board's two followed in slice 3.
Four things carry it:

- **The shell passes down the keys that are switched off** with the plan
  (`AnalyticsLevelProvider`, which already carried the tier), so no dashboard reads anything
  new. They are worked out from EVERY section row (`allSections`), never from the visible
  ones: `visibleSections` has already dropped the disabled rows, so a switchboard built from it
  finds no row for a switched-off part and calls it on. That first version shipped in the slice's
  own commit and the sandbox caught it — Pipeline off, its charts still drawn. The model test
  now reads the layout and refuses it.
- **`useWidgetGate()`** answers both gates for a registered widget as the two props `Widget`
  takes — `<Widget {...gate("sales.funnel")}>`. `hidden` (a source is off) wins over `locked`
  (the tier did not buy it), and `Widget` renders nothing when hidden. No dashboard may pass
  `locked={!visible(…)}` for a registered widget any more; the model test refuses it, and
  refuses a registered department widget that is not drawn through `gate`.
- **`useSectionOn()`** gates the free headline tiles, which are not in the registry: each tile
  is wrapped in the check for the part it counts. The tile row skips an empty slot, so nothing
  leaves a gap.
- **Procurement and Engineering build their blocks on the server**, one right per block — and
  now one switch per block too, so a switched-off part is never read there, the way Main's is
  not. `tests/crud.mjs` proves it against the database with a control studio beside it.

**Reports & BI and the server followed (slice 3, 17/09/2026).** All ninety-two registered
widgets now declare their sources.

- **Each figure on the Reports board belongs to its own part** (`switch` and `department` on
  each tile in `modules/reports/executive`): Invoiced → Finance → Cash, Supplier bills →
  Payables, Deals opened → CRM & Sales → Tickets, Quoted → Quotations → Register, Projects
  opened → Projects → List, Purchase orders → Procurement → Orders, Tenders entered →
  Tendering → Register, Leave days → Human Resources. The server drops a switched-off tile
  BEFORE it reads (`tilesRunning`), so its data set is never fetched and it is not counted in
  "N of M hidden" — a switched-off part is a choice, not a missing right. The board draws its
  figures under each department's own name, in sidebar order, and leaves out a department with
  nothing left. The two tier tools (movement, choosing the period) last while any figure does
  (`REPORT_SOURCES`) and go through `useWidgetGate` like every other dashboard.
- **Every module context carries `on(key)`**, the switchboard of all its stored rows. The
  per-screen routes skip a read that only a switched-off part shows: Sales skips tickets (unless
  Tickets or the Live view is on) and clients (unless Clients or Tickets is on); Quotations skips
  RFQs, and sends the quotation list only while the Register or the Live view is on (still
  reading it for numbering while the RFQ desk is on); Projects skips overtime and the approved
  quotations a project opens from; Field Operations skips permits while Quality & HSE → Permits
  is off. Inventory reads each list only for its own part — items (Items or Stock), suppliers
  (Items), movements (Stock), purchase orders (Procurement → Orders),
  air waybills, airlines and their project picker (Logistics → Shipments), project sheets.
  **Delivery notes left that response entirely (20/09/2026)** along with `listDeliveries` — the
  list was composed four reads deep and drawn by nothing, the sheet workspace having replaced the
  hand-raised note. The three writes stay.
  Finance reads nothing of Cash's — invoices, expenses, the project margins built from them and
  the invoice form's pickers — while Cash is off, and the landing page drops the margins block.
  Human Resources reads only leave while Employees is off (leave is on the HR root); departments,
  roles, certifications and employees are Employees'. The Inventory dashboard's way-in cards
  leave out a switched-off part rather than dimming it. The Maintenance dashboard
  asks one switch per block, and still reads work orders for planned-work compliance and
  contracts while the Work orders part is off, without sending the backlog. The Finance
  dashboard does not fetch Payables or Fixed assets while they are off.
- **Switching a part back on needs nothing else.** The switchboard is read from the stored rows
  on every request, and the Sections panel refreshes the shell after a toggle, so the next load
  reads and draws the part again. The sandbox measured it both ways: with ten parts off, the
  sales route went from 6 database queries to 0, inventory 11 → 9, projects 10 → 9, field
  operations 5 → 4 and the maintenance dashboard 7 → 4, the board from 8 figures to 5, and the
  Finance dashboard stopped asking for bills; switched back on, every number returned on the next
  request. The second pass measured the same way: with Cash, Employees and every Inventory part
  off, finance went 5 → 0, human resources 3 → 2 and inventory 11 → 0, and all three returned. `tests/widget-sections-model.mjs` holds each guard by name.

**Where a widget is drawn is not what it is drawn from**, and the map follows the data:
*Quotation volume* on the Sales dashboard needs Quotations; purchase-order charts on Inventory
need Procurement → Orders (the orders are filed under Inventory); permit charts on Operations need
Quality & HSE → Permits; the stage-based sales charts need the Pipeline as well as Tickets;
*Owed to us vs owed by us* needs both Finance → Cash and Payables; the RFI and submittal charts
need their record-engine registers (`engine-rfi`, `engine-submittal`), which are real rows
planted per studio.

## The rollout consequence

**A tier that was given an explicit widget selection does not include the new keys**, because
the selection is exactly what was ticked (`enabledWidgets`). A studio on such a tier sees each
new widget as the locked teaser until somebody ticks it in `/super` → Tiers. A tier with no
explicit selection derives its widgets from its rung and picks the new ones up by rung
immediately. This is the registry working as designed, not a gap, and it is written here so it
is not mistaken for one.

### HR: every widget names a sub-section

**Leave is stored on the HR root and switched by `hr-leave`.** When HR split into five
sub-sections (17/09/2026) the five leave widgets went on declaring `needs: ["hr"]` — the
storage answer — so a studio that switched Leave off kept its leave charts. They name
`hr-leave` now, as do the executive board's Leave-days tile and Main's pending-leave card
(which also links to Leave rather than to Employees), and the HR route reads no leave at all
while Leave is off. Headcount and expiring documents stay on `hr-employees`.
`tests/widget-sections-model.mjs` refuses any HR widget that names the bare root, because
`hr` is a real switch and nothing else could tell the declaration was wrong.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **The API does not refuse a switched-off part.** A part's own route still answers if called
  directly; switching decides what is shown and read for the screens, not access.
- **The leave charts and tiles follow the HR department as a whole.** Leave is kept on the HR
  root, which has no part of its own to switch.
- **Free headline tiles are not in the registry.** Main's are gated through `seen` by the read
  behind each figure, which works, but a tile cannot be listed or tested as a widget.
- **Every surface that reads across departments asks the switchboard now (20/09/2026).** A data
  set names the part it belongs to (`switch` on `DATASETS`, the switch and never the storage),
  the export list and the builder's catalogue drop a switched-off one, and `readDataset` —
  the single door the export, the builder, a saved report and the board all read through —
  refuses it with `section-off` (404, the answer a section the studio never had already gives).
  A tile takes its switch from its data set rather than restating it. The engagements view drops
  a stage whose department is off, keyed on the SCREEN the record is worked on (`screenKey`),
  the way its permission lens already works. **A destruction warning is the exception**: what a
  delete will take is counted through rights alone, since a record under a switched-off
  department is still a record and the cascade still takes it.

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
