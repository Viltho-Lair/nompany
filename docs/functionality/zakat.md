# Zakat

**Where:** Finance → Tax, the Zakat panel · `/api/studios/<slug>/finance/zakat` ·
`modules/finance/zakat.ts` (pure), `modules/finance/zakatService.ts`, `tests/zakat-model.mjs`.

## What it is

A worksheet for one fiscal year's zakat, for a studio whose **country levies zakat** — which
today means Saudi Arabia, because its definition (`shared/compliance/countries/SA.json`) is the
only one carrying `rules.zakat`. Everywhere else the route answers `enabled: false` and the
panel draws nothing. The owner's rule (18/09/2026): there is no home market; the studio's
country decides.

**A worksheet, not a declaration.** The 2024 Implementing Regulations (MR 1007) build the base
from classifications a small chart does not carry — which liabilities are non-current, which
investments qualify. So the ledger supplies what it can say for certain and the accountant adds
the rest as named lines.

## What it computes

- **From the ledger:** equity at year end with the result no account holds yet; net fixed
  assets (1500 less 1510); the year's profit. A zakat provision is left out of that profit — it
  is this worksheet's own output.
- **The accountant's adjustments:** lines that *add to the base* (qualifying non-current
  liabilities), are *deducted from it* (qualifying investments), or *adjust the profit*.
- **base** = additions − deductions; **floor** — a base below the adjusted net profit is lifted
  to it (no adjusted profit and no positive base means no base); **ceiling** — capped at
  year-end equity plus the profit adjustments.
- **zakat** = base × zakatable share × (2.5% × days ÷ 354): the country's Hijri rate, prorated
  to the fiscal year's actual days, so a Gregorian year pays about 2.5777%.

## What it does

Save a year (adjustments and share; one worksheet per year, years may not overlap) → **Provision**
freezes the figures and posts Dr Zakat (5950) / Cr Zakat Payable (2170) on the year's last day →
**Pay** posts Dr 2170 / Cr a money account. Reading is `finance.tax.view`; saving, provisioning
and paying are `finance.tax.file`, the right that files the VAT return.

## The chart race it exposed

Opening the Tax screen fired parallel reads that each seeded the two new accounts, and the
sandbox chart ended up holding 5950 and 2170 twice — the provision on one copy, the report on
the other. `ledgerAccounts` now seeds a default account under a fixed id per code
(`acc_std_<code>`), so the table's primary key refuses a second copy, and a chart that already
holds a code twice always resolves it to the oldest. Accounts seeded before keep their random
ids; duplicates already made stay visible and are not merged.

## Not built yet

- **The rates are the regulation's as researched on 18/09/2026** (2.5% for 354 days) and are
  marked "earlier" in the definition's source, not re-checked against ZATCA's own page.
- **No classification of liabilities or assets** in the chart, so long-term liabilities and
  deductible investments are always typed as adjustments.
- **No filing in ZATCA's format**, no amendment of a provisioned year (reverse the entry by
  hand and save again), and no split between zakat and income tax for a studio with foreign
  shareholders beyond the zakatable share.
