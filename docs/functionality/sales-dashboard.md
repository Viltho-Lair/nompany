# The CRM & Sales dashboard — what the department looks like, in one screen

**The screen:** the top of `/<slug>/crm-sales`, behind `crmSales.dashboard.view`.
**The arithmetic:** `src/modules/sales/salesAnalytics.ts`, pure and client-safe.
**Every widget is tier-gated** — analytics is sold, see `src/lib/dashboardWidgets.ts`.

## What it is

A summary row everyone with the dashboard right gets, and six widgets each gated by a
registry key the studio's tier may or may not include:

| Widget | Rung | Answers |
|---|---|---|
| Sales funnel | simple | how many deals reached each rung |
| Probability forecast | simple | what the open pipeline is worth, raw and weighted |
| Stage mix | simple | where every deal actually sits |
| At-risk tickets | moderate | what is due soon or flagged urgent |
| **Why deals are lost** | moderate | what the studio loses to, across all deals |
| **Stalled deals** | moderate | what has stopped moving |

The free row is: open deals, weighted pipeline, won count, **won value**, at-risk count.

## What it stores

**Nothing.** It is drawn entirely from the ticket list `/api/studios/<slug>/sales` already
returns — no fetch of its own, no new route, no new right. Every number is derived at render
time by pure functions.

## What it does

**It reads one vocabulary.** `salesAnalytics` used to keep its own list of which statuses are
closed, its own copy of the stage climb, and its own weighted-value arithmetic — three answers
to questions `modules/sales/pipeline` already owned. They agreed on the day they were written,
which is the only day duplication looks harmless: **a stage added to `TICKET_STATUSES` and not
to the hand-written arrays does not throw — it stops being counted**, and every figure on the
dashboard quietly excludes it. The stage order, the closed/open classification and the weighted
sum all come from the registry now, and a test asserts the two agree on *every* status.

**The stage names are translated.** The funnel returned `label: "Lead"` and the screen drew
that string, so an Arabic studio read an English funnel; the donut's slices and the at-risk
rows had the same problem, and `"tickets"`, `"pipeline"`, `"weighted"`, `"12d overdue"` and
`"3d left"` were hard-coded English with no dictionary entry at all. The funnel returns
**tokens** now and the screen chooses the words: the three rungs that are ticket statuses
translate through `shared/studio/statuses` keyed by the stored token, like every status in the
product; the two that are milestones of this funnel (RFQ, Quotation) are ordinary dictionary
strings.

**Won value sits beside won count.** The count was there from the start and the value was not —
the difference between "we won four" and "we won four hundred thousand", and the second is what
a department is judged on.

**Why deals are lost** groups every deal carrying a `lostReason`, commonest first, with the
value behind each. This is the question the field was added to answer and that nothing asked:
it was written on every losing close and read back one deal at a time, and one deal at a time
cannot tell a studio it loses on price. The reason the *system* writes is a token
(`CHAIN_LOST_REASON`) and is translated; a reason a *person* typed is data and is shown exactly
as typed — which is also why this counts strings rather than analysing them.

**Stalled deals** lists open deals sitting in one stage for 30 days or more, longest first. The
pipeline board shows this per column; nothing showed it across the department, and a list
sorted by creation date buries the ninety-day deal under the one raised this morning.
Days-in-stage falls back through `updatedAt` to `createdAt`, so it reads correctly for deals
older than the stage history — **no backfill**.

**The forecast counts held deals; the board's headline does not.** That difference is
deliberate rather than drift: this widget forecasts everything not yet *decided*, while the
board's "open value" excludes On-Hold because a held deal is not money to count on. Both are
asserted.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **No time dimension anywhere.** Every figure is "as of now": no month-on-month, no trend, no
  comparison against a previous period, and no date-range filter. `stageHistory` and `closedAt`
  make several of these derivable and none is derived.
- **No conversion rates between stages** and no average time per stage, though the stage history
  now holds what both need.
- **No target or quota**, so nothing says whether the pipeline is enough.
- **No per-salesperson view.** `assignedToCollaboratorId` is on every ticket and the dashboard
  never groups by it, so there is no leaderboard and no per-owner funnel.
- **Nothing about contracts or margin.** Signed value, approved movement and the quoted-vs-cost
  margin all exist as data after the contracts and pricing slices, and no widget reads them.
- **Loss reasons are free text**, so "price" and "too expensive" are two rows. The studio-settings
  vocabulary that would fix that is not built (see `pricing.md` and `pipeline.md`).
- **The stall threshold is fixed at 30 days** and is not a studio setting.
- **The dashboard is not exportable** and does not print.
