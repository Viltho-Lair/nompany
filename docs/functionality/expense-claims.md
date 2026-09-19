# Expense claims and staff advances

**Where:** Finance → Payables & Expenses → Claims · `modules/finance/claims.ts` (pure),
`modules/finance/claimsService.ts`, `/api/studios/<slug>/finance/claims`, postings in
`modules/finance/ledger.ts` (`postClaim`, `postClaimPayment`, `postAdvance`, `postAdvanceReturn`),
`tests/expense-claims-model.mjs`. Built 18/09/2026 (Finance plan, step 5).

## What it is

**A claim is a person asking to be paid back** for money they spent for the studio. It is not an
expense: an expense is the studio's own spend, keyed by whoever keeps the books; a claim is owed
only once somebody else has agreed it. **An advance** is money handed to a person before they
spend it, which their claims then account for.

## Rights — `finance.claims`, a new area (three rights; the catalogue measured 252 over 80 areas after it)

- `finance.claims.create` — raise, edit, submit, withdraw and delete your OWN claims; see your own
  claims and advances.
- `finance.claims.view` — see everybody's.
- `finance.claims.approve` (extra) — agree or reject somebody ELSE's claim.
- Paying a claim, handing over an advance and taking one back answer to **`finance.payables.pay`**,
  the right that pays suppliers.

**Nobody approves their own claim and nobody hands themselves an advance**, whatever they hold —
refused as `own-claim` / `own-advance`, and the screen does not draw the button. There is no Admin
exception (unlike bills, payroll and stock adjustments): a one-person studio has nobody to claim
from.

**Catch-ups** (`catchUps.ts`): a role holding `finance.expenses` gains `finance.claims` view/create
verb for verb; a role holding `finance.payables.approve` gains `finance.claims.approve` (bills moved to the Approvals page on 19/09/2026 and that right left the catalogue; roles asked before then kept what they gained). The
`money` archetype holds the area in full and approves. **A person with no Finance right cannot
claim until somebody grants `finance.claims.create`** — a catch-up can only widen a role that
already holds something (see "Not built yet").

## The ladder

Draft → Submitted → Approved or Rejected → Paid. The claimant edits and deletes only a draft,
withdraws a submitted or rejected claim to draft; a rejection needs a reason. Approving re-checks
the status inside a function patch (invariant 8), so two approvers pressing at once post once.

## The books — two new default accounts

`1250 Staff Advances` (asset) and `2210 Staff Claims Payable` (liability), seeded into every
studio's chart on its next read.

- **Advance handed over:** Dr 1250, Cr the money account (`advance`).
- **Claim approved** (dated the approval day): Dr each line's expense account — by category, the
  same map an expense uses (Materials and Subcontractor to 5000, Salaries 5100, Rent 5200,
  Utilities 5300, anything else 5900) — with the claim's project on the lines; Cr **1250** for what
  the claimant still holds of their advances (frozen on the claim as `fromAdvance`), Cr **2210** for
  the rest (`claim`). A claim an advance covers entirely is **Paid** on approval — nothing is left
  to pay.
- **Claim paid:** Dr 2210, Cr the money account, for the cash part (`claim-payment`).
- **Advance handed back:** Dr the money account, Cr 1250 (`advance-return`), never more than the
  advance has left unreturned or the person still holds after their claims.

What a person "still holds" is every advance paid to them, less what was handed back, less what
their approved claims took.

## Verified

Model test green; in the sandbox a claim was raised, submitted, refused self-approval, withdrawn,
and the screen drawn. **Approval, payment and advances were not exercised in the sandbox**: it has
one member, and approval needs a second person.

## Not built yet

- **Receipts**: no attachment on a claim line yet (media upload exists and is not wired here).
- **Every employee claiming by default** — `finance.claims.create` is granted per role; there is
  no "own claims" self-service right that library roles start with, the way own leave is.
- **VAT on a claim line** is not separated: the whole amount goes to the expense account.
- **Mileage and per-diem rates**, card-statement matching, and claims in a foreign currency.
- **Paying claims in a payment run** — the run pays supplier bills only.
