# Customer insights (CRM & Sales)

Built 2026-09-19 from the owner's own Excel system. A sales department's invoices were exported at
the end of each month and stacked January to December. Two pivots showed how many invoices each
customer had per month, and how much. Each customer's last seven months were read as three blocks:
the first three, the next three, and the current month (the "stepper"). Each block was judged
zero, low, medium or high, and every shape had a name (bought, then nothing, then bought again read
`-_-`), so the team knew who to call and why. A scatter showed sales by team member, team and
channel. Here it is live, not rebuilt each month.

Section `crm-sales-insights`, under CRM & Sales. It owns no collection. Code:
`src/modules/sales/insightsModel.ts` (the arithmetic, pure, `tests/insights-model.mjs`),
`modules/sales/insights.ts` (what counts as a sale, the send to Sales, the CSV),
`components/studio2/CustomerInsightsDashboard.jsx` (the screen), `shared/studio/customerInsights.ts`
(the words, English and Arabic).

## The owner's decisions (2026-09-19)

1. In CRM & Sales for now.
2. Levels are **relative to the studio**, and the amounts behind them are shown.
3. The default pattern names below.
4. More than months: a period may be a **month, a quarter, a half-year or a year**, always seven of
   them in the same 3 + 3 + 1 shape.
5. Its own right, mainly for Sales, grantable to anybody.

## What counts as a sale

- **An issued invoice** (Sent or Paid), less the credit notes issued against it, by its issue date.
  Drafts and cancelled invoices are left out. Matched to a Sales customer by name (as Sales spells
  it, ignoring case and spacing); an invoice naming nobody Sales knows is still a customer, by the
  name on the invoice.
- **A till receipt that names a customer.** A walk-in sale counts only on the scatter.
- **Won deals** count on the scatter only. A won deal is invoiced later, and counting both would
  count the money twice.

Each source is read only when its part is switched on (Receivables, Point of Sale, Sales tickets),
and the screen says which it used. Money is in the studio's currency. A document in another currency
converts at today's rates. One the rates cannot convert is left out, and the screen says how many.

## The analysis

**Seven periods** end in the last complete one by default. The owner's routine read the month that
had just closed, and a month three days old reads everybody as slipping. *This period so far* is a
choice. **Judge by** value or by number of sales.

**Levels, per block:** among the customers who bought anything in that block, the bottom third is
low, the middle third medium and the top third high. Nobody buying is zero. Each block has its own
boundaries, shown as amounts ("Low under 2,400 · Medium 2,400 to 2,800 · High from 2,800 · 4
buying"). Three months of buying and one month are not on the same scale.

**Patterns** from the three levels [first, next, now], with the signature beside them (`H·0·L`):

| Pattern | When |
|---|---|
| Loyal | Bought in all three, now level with the start, every block medium or high |
| Growing | Bought in all three, now above the start |
| Steady | Bought in all three, now level with the start, some block low |
| Fading | Bought in all three, now below the start |
| Slipping | First two blocks, nothing now |
| Returning | First and now, nothing in the middle (the owner's `-_-`); or only recently, having bought before the window |
| Lapsed | First block only |
| New | First purchases fall inside the window, after its first block |
| Stopped | Middle block only, having bought before |
| Dormant | Bought before the window, nothing in it |

**Movement:** the same analysis one period earlier. Each customer shows what they *were*, and a
filter keeps only customers whose pattern changed ("loyal → fading" is the call to make today).

## The screen

Two widgets, both **advanced tier** (`sales.customer-patterns`, `sales.team-scatter`), through the
tier gate like every dashboard. On a lower tier they show the locked teaser.

- **Customers by pattern:** a tile per pattern (customers and value; a click filters), the three
  blocks' boundaries, then every customer with their contact, a seven-period strip, pattern,
  signature, what they were, each block's level and amount, value in the window and last sale.
  Search, pattern filter, "changed since the period before", fifty rows at a time.
- **Who is selling:** sales against value, by person (the assignee of a won deal, the cashier of a
  receipt), by team (their department) or by channel (the campaign a won deal came from, "Direct
  sales", or the till). Won deals and till sales.

## Acting on it

- **Send to Sales** (`crmSales.insights.act`): choose customers (up to 100), optionally a campaign
  and a note, and each becomes a **Sales lead** through the same door a campaign uses
  (`raiseLead`, `leads.md`): at Lead, assigned to nobody, waiting for a Sales manager. The lead is
  titled with the customer and pattern. Its notes carry the note, the pattern and signature, and
  the sales, value and last-sale date, in the sender's language. **A customer with a deal already
  open is skipped** and counted, and the screen marks them. The assigners get **one** notice for the
  batch (`leads.waiting`), not one per lead.
- **Download CSV** (`crmSales.insights.export`): the rows shown by the pattern filter, with every
  period's figure, in the reader's language, with the byte-order mark Excel needs for Arabic.

## Who may do what

`crmSales.insights`: **view** opens the analysis; extras **export** (the CSV) and **act** (send to
Sales). **Holding view is seeing what each customer was invoiced**, a window onto that much of
Finance. That is the owner's decision: the analysis is its own grant.

- The winner-of-work shape (Sales Manager and the rest) holds view, export and act; a department
  head holds view.
- **Existing roles catch up:** whoever reads the Sales dashboard gains view; whoever assigns leads
  gains view, export and act (`catchUps.ts`).

**Rollout:** the section is planted in every studio on the next read. The widgets follow the tier
the way every widget does. A tier with no explicit widget selection falls back to its rung, so an
advanced tier shows them at once. **A tier whose widgets were picked by hand in `/super` does not
include the two new keys until somebody ticks them**, exactly as the widgets added on 2026-09-10.

## Not built yet

- Refunds at the till (`posReturns`) are not subtracted; credit notes on invoices are.
- An invoice raised in Finance with no deal behind it is on nobody's point of the scatter, which
  credits won deals and till sales only; an invoice names no salesperson.
- A customer is matched to an invoice by name only; an invoice renamed or misspelled is a second
  customer. A client id on the invoice would fix that, and Finance has none.
- Saved views, a chosen date to analyse as of (always today), a custom period length, and choosing
  where the level boundaries sit (thirds only).
- Sending customers to Marketing as a campaign audience, or creating a new campaign from the
  selection; only an existing open campaign can be named.
- No live refresh: the screen reads the analysis when it opens and when a choice changes.
- Invoices and receipts are all read on each request; a studio with years of invoices will want
  the reads narrowed to the window.
- Reports & BI and Nova do not know about it.
