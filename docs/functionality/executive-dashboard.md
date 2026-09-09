# The executive dashboard — the whole company on one screen

At the top of Reports & BI (`/<slug>/reports`), above the exports. One route,
`/api/studios/<slug>/reports/executive`. **No new permission key** —
`reports.exports.view` opens the surface and each tile is gated by the right its
own dataset already requires.

## What it is

**Fourteen sections each have their own dashboard and nothing put them side by
side.** A director asking "how is the company doing" opened eight screens and
held the answers in their head. And the one question nobody could ask at all is
whether a figure **moved**: every section dashboard reports today.

Eight tiles — invoiced, supplier bills, deals opened, quoted, projects opened,
purchase orders, tenders entered, leave days — each against the same length of
time before it.

**A dashboard with forty numbers is a report.** These are the figures a director
is answerable for, one per section that has a number worth putting on a board.

## The rules

**It is built on `modules/reports/datasets`, which already existed.** That
catalogue names each collection, the section that owns it and the permission
that opens it — everything a tile needs — so the board mints no second list of
where the numbers live. A tile naming its own collection would be free to
disagree with the export and the report builder about what "invoices" means, and
the three would drift the first time a section moved.

**Four datasets were added to that catalogue** (deals, quotations, purchase
orders, leave) because the board needed them, so the export and the report
builder gain them in the same change. Each names the right its own section
already requires, and the columns are chosen rather than spread — quotations
carry line prices and leave carries a reason somebody wrote in confidence, and
neither is on the list.

**A tile the reader may not see is never read.** The customer-360 rule:
`readDataset` refuses before it touches the store, so a refused dataset costs no
round trip. The tile is **omitted, not zeroed** — zero is a real answer and "you
may not see this" is not, and a board that showed them alike would tell a sales
manager the company invoiced nothing. What is missing is named as a count, so
the gap reads as "ask for these rights" rather than as a quiet company.

**The previous window is the same length, not "last month".** Comparing a 30-day
window to a 31-day one reports a 3% fall that is the calendar rather than the
company, and comparing a part-finished month to a whole one reports a collapse
every first of the month. The comparison is only honest between equal spans.

**Nothing divides by nought.** A period following one with no activity has no
percentage — the company did not grow infinitely, it started. `change` is null
and the screen says "no comparison" in words. Both periods at nought is
different: that is flat, and known.

**A rise is not automatically good.** Supplier bills going up is bills going up.
`goodWhen` is declared per tile so nothing infers it from the label.

**A draft is not revenue and a cancelled invoice never was.** Excluded statuses
are declared per tile; a headline that counted them would overstate the company
by exactly the amount somebody was still thinking about.

**Every tile declares its unit.** A sum is not always money — leave is days, and
both format to two decimals. Money tiles carry the studio's own currency, and
show nothing rather than guessing when the studio has not set one.

**Rounded once, at the end.** Rounding each row drifts by up to half a penny per
row, which on a thousand invoices is a headline that disagrees with the ledger.

**The clock travels with the answer**, so "this month" is one instant rather than
whenever each figure happened to be computed.

## The figures are free and the analysis is sold

Analytics in this product is tiered: a tier carries a master switch and an
explicit per-widget selection, and `lib/dashboardWidgets` is the registry every
dashboard asks through `useWidgetVisible`. Reports & BI is the ninth section to
join it, not a special case.

**What is free is the figures**, because a tile is a sum of records the reader
can already open on the screen that owns them — charging for arithmetic somebody
could do by hand is charging for nothing. **What is sold is the analysis:**
`reports.movement` (this period against the same length before it, the one
question no section dashboard in this product can answer) at the first paid
rung, and `reports.window` (choosing the period) one rung above that.

**On the free floor the numbers stay and the comparison becomes a dash**, with a
line saying why. A locked teaser per tile would put a padlock under every figure
on the board, which reads as broken rather than as an offer.

**The gate fails open** — a key the registry does not list answers true — which
is right for adding a widget and dangerous for removing one: deleting
`reports.movement` would silently make it free on every studio, and nothing else
would notice. `tests/executive-model.mjs` is what notices.

## Not built yet

- **No chart.** Every tile is a number and its movement; there is no series, so
  "when in the month did that happen" has no answer here.
- **Eight tiles, fixed.** A studio cannot add, remove or reorder them, and
  cannot change what counts as excluded. The report builder is where a studio
  asks its own question.
- **No drill-through.** A tile does not link to the records behind it.
- **No currency conversion.** A money tile sums the stored amounts; a studio
  invoicing in two currencies gets their arithmetic sum, which is wrong. The FX
  table exists (`docs/functionality/approvals.md`) and this does not use it.
- **`quotations` and `orders` sum a stored `total`**, where invoices and bills
  derive theirs through `invoiceTotals`. If either stored total has drifted from
  its own lines, the tile carries the drift.
- **Nothing is cached.** Every open reads eight collections in full.
- **No targets on the board.** KPI targets exist in the builder below and are
  not drawn against these figures.
- **The paid path is asserted, not opened.** The free floor was verified in
  the sandbox, whose tier buys neither widget; the paid rungs are pinned by
  `tests/executive-model.mjs` and by the same `useWidgetVisible` nine other
  dashboards already use, rather than by a studio moved onto a paid tier.
