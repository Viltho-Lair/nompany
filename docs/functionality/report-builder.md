# The report builder, saved reports and KPI targets

A question a studio writes itself, saved, and a line drawn across it. On the Reports & BI
page (`/<slug>/reports`), two collections — `savedReports` and `kpiTargets` — and **no new
permission key**.

## What it is

**Exporting gives you the whole collection and every declared column**, which answers "get
me the data" and nothing else. The question an ERP is bought for is narrower: overdue
invoices by client, this quarter's bills over a limit, projects by status with their values
totalled. Before this the answer was a spreadsheet somebody kept by hand.

**And every figure in the product is a fact; none of them was a target.** A studio could
see what it invoiced, what it was short of, how many deals it lost — and nothing anywhere
said what any of those was SUPPOSED to be. A dashboard of correct numbers still cannot say
whether the month went well, which is the question a dashboard is opened to answer.

### It is built on the export's catalogue and mints nothing

A report names a DATA SET, and a data set already declares its columns and the right its
own section requires. So a report cannot reach a field nobody chose to publish, and it
cannot reach a register the reader could not open — **both gates come free**. A second
catalogue would be free to disagree with the first about what is exportable.

**`reports.exports.view` opens the surface, and the second gate is asked where the rows
load** (`readDataset`). A saved report therefore confers nothing: it is a QUESTION, and the
answer is computed against the reader's own access every time it runs. That is what makes a
shared report list safe.

**The row-loading path is shared with the export**, not copied. Two copies would mean two
places that resolve a section, two that ask the second gate, and two that know `total` is
DERIVED rather than stored — and the day one gained a data set the other would export a
column of blanks. That is not hypothetical: the empty Total column `DERIVE` exists to fix
was exactly that failure once.

### What a spec may name, and what it refuses to say

Every column, filter, grouping and sort is checked against the data set's own declared
columns; anything else is dropped. **A spec naming a data set that does not exist is
refused whole** — it is not a report with a bad field, it is a report with nothing to read,
and saving it makes a row that fails every time somebody runs it.

**Comparisons try numbers first and fall back to text**, which is what makes one operator
work on both a money column and an ISO date. Forcing either would break the other, and
offering two sets of operators would ask the studio a question about storage.

**A column with nothing numeric aggregates to NULL, not zero.** "The total is nought" and
"there was nothing to total" are different answers, and a column of dashes summing to 0
reads as a real figure. **`n` travels with every aggregate**: an average over three of ten
rows is a real average of a different population, and a reader not told how many it covered
will read it as the average of ten.

**An empty grouping value is its own group**, not a dropped row — rows with no client, no
status, no cost code are exactly what a studio is looking for when it groups. The
`uncoded` rule from cost reporting.

**A capped list says it was capped.** One that does not is read as complete.

**Only the chosen columns leave.** A row spread whole would carry a field the day somebody
added one — the export's rule, in the builder.

### Targets

**A target is a saved report plus a line.** It reuses the builder rather than growing its
own query language, so anything a studio can measure it can set a target on, and there is
exactly one definition of each number. A separate metric catalogue would be a second place
"revenue" is defined.

**A floor and a ceiling are one rule from opposite sides**, warning at the same fraction of
the way to the line. The default is 0.9: a target that only speaks once it is missed is a
post-mortem, not a control.

**`unknown` is a real state and it is not `breached`.** A report that returned no numeric
rows measures nothing this period — a sales target with no closed deals yet, a defect
ceiling with nothing inspected — and calling that a breach raises an alarm about an absence
of data. It is also not `met`, which is the same mistake in the more dangerous direction.
**A reader who cannot open the register sees `unknown` too**, not a wrong number: the
measurement is computed against their own access, the rule customer 360 already follows.

**Targets are measured on every open, never stored.** A stored measurement is a number that
was true once and cannot say when.

**Deleting a report does not delete its targets.** They become `unknown`, which is visible
and reversible, where a cascade would silently remove a line somebody set deliberately.
**Breached first, then warning, then `unknown`, then met** — a target nobody can measure is
a question to answer; one that is met is news that can wait.

## Not built yet

- **No scheduling.** Nothing runs a report on a timetable or emails it to anybody, which is
  the half of "saved & scheduled reports" this does not cover.
- **No alert delivery.** A breached target is red on the screen and notifies nobody.
- **No date arithmetic.** "This quarter" has to be typed as a date in a filter; there are
  no relative periods, so a saved report does not move with the month.
- **No joins.** A report reads one data set; "invoices by project manager" is not askable
  because the two live in different registers.
- **No charts.** Every answer is a table.
- **Eight data sets.** The builder is only as wide as the export catalogue, so anything not
  in `DATASETS` cannot be reported on at all.
- **No column of its own.** A report cannot compute `total - paid`; it can only aggregate a
  column that already exists.
