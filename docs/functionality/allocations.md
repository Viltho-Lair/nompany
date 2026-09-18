# Allocations — shared costs, shared out

**Where:** Finance → General Ledger → Allocations · `modules/finance/allocations.ts` (pure),
`modules/finance/allocationService.ts`, `/api/studios/<slug>/finance/allocations`, posting
`postAllocation` in `modules/finance/ledger.ts`, `tests/allocations-model.mjs`. Built 18/09/2026
(Finance plan, step 6).

## What it is

Rent, the office manager, the licences are posted to their accounts naming no project, so no
project's figures carry them and every project looks more profitable than the studio is. An
**allocation rule** shares the UNOWNED part of one income or expense account along one dimension
— projects, deals, cost codes or departments — by **fixed percentages** (at least two, adding up
to exactly 100%) or **in proportion to what each value earned that month** (its income lines).

## What it does

- **The run** for a month, previewed then posted, writes one entry per rule on the month's last
  day (`<ruleId>:<YYYY-MM>`): Cr the account naming nothing (the pool, taken out), Dr the same
  account naming each value (its share). **Same account both sides, so the P&L's total never
  moves** — only who carries it; the Reports P&L cut by a project now includes its share.
- **The pool is only what names nothing** for that dimension in that month: a cost already posted
  to a project is that project's and is never shared again, and once the month is allocated its
  pool is nought — a second run reports "already shared".
- **Shares are split in minor units**, the remainder to the last, so they add up to the pool
  exactly. With the revenue basis and no value earning anything that month, the run says there is
  nothing to share by rather than guessing.
- The "which" list offers the values the ledger has actually posted (projects by number and name),
  the same list Budgets offers.
- Rights: reading is `finance.ledger.view`; rules and runs post, on `finance.ledger.post`. Rules
  are filed under the ledger (`allocationRules`).

## Not built yet

- **Other drivers** — headcount, floor area, hours booked on timesheets, cost — only fixed
  percentages and revenue.
- **Allocating to a different account** (a "shared services recharge"), step-down or reciprocal
  allocations between departments, and allocating a balance-sheet account.
- **No automatic monthly run**, and reversing an allocation is a manual reversal of its entry.
- Department and cost-code values appear in the list only once something has been posted naming
  them.
