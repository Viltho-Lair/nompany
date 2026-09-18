# Budgets

**Where:** Finance → Budgets (`finance-budgets`, a new sub-section) · `modules/finance/budgets.ts`
(pure), `modules/finance/budgetService.ts`, `/api/studios/<slug>/finance/budgets`,
`tests/budgets-model.mjs`. Built 18/09/2026 (Finance plan, step 5).

## What it is

What a year was meant to earn and cost, account by account, against what the ledger says it did.
**A budget is twelve months from a month the studio names** (a June year starts in July), and it
may be cut by **one** of the four dimensions a journal line carries — a project, a deal, a cost
code or a department — or cover the whole studio.

**The actual side is the P&L's own arithmetic** (`profitAndLoss` in `statements.ts`) over the same
window and the same cut, so a budget and the Reports screen cannot disagree about what was earned.
Cut by a dimension, a line that names no value of it is NOT counted — a project's budget must not
absorb the studio's overheads. Year-end closing entries are excluded, as the P&L excludes them.

## What it does

- **Lines** are income or expense accounts, once each; a year's amount typed once is spread over
  the twelve months so they add up exactly (the remainder lands in the last month). The API also
  takes twelve monthly figures (`months`).
- **The variance** is to the end of this month while the year is running (the whole year once it
  is over): budget to date, actual, and the difference. **Adverse** — red — is spending above the
  budget so far, or income below it.
- **Spending nobody budgeted is shown**, marked "not budgeted", because an unplanned cost is the
  variance most worth seeing.
- Income, expense and result totals, budget against actual.
- The "which" picker offers the values the ledger has actually posted for that dimension (projects
  by their number and name), so a budget is cut by something it can be measured against.

## Rights — `finance.budgets`, a new area (view, create, edit, delete)

The sub-section is the first in Finance born owning its rows (`budgets`), so nothing is filed
elsewhere. **Catch-ups:** whoever reads `finance.reports` reads budgets; whoever holds
`finance.ledger.close` (the person who closes the books) creates, edits and deletes them. The
`money` archetype holds the area in full. Reading the variance needs no ledger right: the figures
are the P&L's, which Reports already shows. The section plants itself in every studio on its first
read (`listSections`), like every new section.

## Not built yet

- **No monthly phasing on screen** — the form takes a year's amount; twelve figures go in only
  through the API.
- **No commitments** (open purchase orders) on the actual side, and no forecast to year end.
- **No budget versions or approval**, and no copy-from-last-year.
- **One dimension per budget** — not a project within a department.
- **Balance-sheet and cash budgets** (capital expenditure, a cash plan) are not budgets here.
