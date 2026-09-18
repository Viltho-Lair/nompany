# Leases on the balance sheet — IFRS 16

**Where:** Finance → Fixed assets → Leases · `modules/finance/leases.ts` (pure),
`modules/finance/leaseService.ts`, `/api/studios/<slug>/finance/leases`, postings `postLease` /
`postLeaseMonth` in `modules/finance/ledger.ts`, `tests/leases-model.mjs`. Built 18/09/2026
(Finance plan, step 6).

## What it is

The lessee's side of IFRS 16. A lease longer than a year is not rent: it is the **right to use**
something and a **debt** to pay for it. Before this, a five-year office lease was a monthly line in
the P&L and nothing on the balance sheet, so a studio committed to years of payments showed no
liability at all.

## What it does

- **Registering a lease** — what is leased, the lessor, the start date, the term in months, the
  monthly payment, whether it is paid at the start or the end of each month, the discount rate (%
  a year: the rate implicit in the lease, or the studio's borrowing rate) and the money account it
  is paid from — **recognises it on its start date**: Dr **1600 Right-of-Use Assets**, Cr **2500
  Lease Liabilities**, at the present value of the payments (paid in advance, the first payment is
  not discounted).
- **Twelve months or less is refused** with the reason: that is IFRS 16's short-term exemption,
  and such a lease stays an ordinary expense.
- **Each month**, one entry on the month's last day (`<leaseId>:<YYYY-MM>`): the right is
  depreciated straight line over the term (Dr 5410, Cr 1610), the liability accrues interest at the
  monthly rate (Dr 5810, Cr 2500), and the payment reduces it (Dr 2500, Cr the money account).
  **Worked in the currency's minor units, with the last month taking the rounding**, so the
  liability ends at exactly nought and the right is exactly fully depreciated.
- **The monthly run** — previewed, then posted — catches up every lease's months due by the end of
  a month, oldest first, each once; a lease whose recognition never reached the books posts that
  first; a closed month refuses by name.
- The register shows each lease's recognised value, what is still owed (the balance sheet's figure
  for it, from the last month posted), months done and months due.
- A lease no month has been posted for can be removed; its recognition is reversed.
- **Rights are the fixed-asset rights:** `finance.assets.view` reads, `.create` registers, `.edit`
  runs the month and removes.
- Five new default accounts: 1600, 1610, 2500, 5410, 5810 — **2500 on purpose**, because the cash
  flow statement reads 25xx–29xx as financing, which is where lease repayments belong; 16xx rather
  than 15xx so recognising a lease does not read as buying an asset.

## Not built yet

- **Modifications and reassessments** — a changed term, payment or rate, an extension option taken
  up — and **early termination**: nothing re-measures a lease after it starts.
- **Initial direct costs, lease incentives, restoration provisions and residual value guarantees**
  are not part of the right-of-use asset.
- **Variable and index-linked payments**; payments other than equal and monthly.
- **The low-value exemption** (the asset, not the term) is the studio's to apply by not registering.
- **The lessor's side** (finance and operating leases granted) is not built.
- **Payments made through a supplier bill** would pay the lessor twice — the run records the
  payment itself.
