# Groups of studios, and their books read as one

**Where:** Finance → Reports → Group · `modules/finance/consolidation.ts` (pure),
`modules/finance/groupService.ts`, `/api/studios/<slug>/finance/group`, the platform key
`REG.studioGroups`, `tests/consolidation-model.mjs`. Built 18/09/2026 (Finance plan, step 6).

## What it is

Multi-entity, the way the owner chose (18/09/2026): **each company is its own studio, unchanged**,
and a **group** links studios one person owns so their books can be read as one. Nothing inside a
studio changed — no row gained an entity, no posting path learned about companies. The Finance
plan's `X-Company-Id` header was not used: it would have let a header choose whose books are read,
which invariant 2 forbids.

## Who may do what

- **Grouping is the owner's alone** — the person the studio rows name as `ownerUserId`. Only
  studios that person owns can be put together; an Admin of one studio cannot bring another into
  its group. A group is a platform-level record (`g:studioGroups`: id, name, owner); each member
  studio names its group on its own row (`groupId`), so leaving is an edit to one studio.
- **Reading the consolidation needs `finance.reports.view` in every member**, and each member is
  opened through `studioContext` as the reader — the same door every request passes, so access is
  still resolved once per studio. A reader who cannot read one member is refused the whole
  consolidation **without being told which member**, because its name is part of what they were
  not let into. The member list is shown to the owner.

## How the books are added up

1. Each member's P&L and balance sheet in its own currency, by the same functions its own Reports
   screen uses.
2. **Translated into this studio's currency at one rate per member** — today's market rate — so
   every member's statement still balances after translation. A member whose currency has no
   rate is left out and named.
3. **Added up by account code** (the default chart gives every studio the same codes).
4. **What the companies owe each other is removed**: two new default accounts, **1170 Due from
   Group Companies** and **2070 Due to Group Companies**. When they agree, the consolidated sheet
   balances; when they do not, the difference is named on the screen rather than left to unbalance
   the sheet silently.
5. Each member's own profit is listed beside the total. The From/To window is the Reports one.

## Verified

Model test green (two currencies, elimination, a disagreement, a missing rate). In the sandbox a
group was started and its consolidation equals the studio's own statements exactly; **a second
member was not exercised there** — the sandbox account owns one studio.

## Not built yet

- **Proper translation (IAS 21)**: the P&L at average rates, equity at historical rates and a
  translation reserve — today everything is at one current rate.
- **Intercompany revenue, cost and profit-in-stock eliminations** — only the balances on 1170/2070
  are removed; a sale from one member to another still counts in both P&Ls.
- **Minority interests and part-owned members**; every member is 100% the group's.
- **Intercompany postings** — booking both sides from one screen; each company posts its own.
- **A studio deleted while in a group** leaves the group record behind with one member fewer.
