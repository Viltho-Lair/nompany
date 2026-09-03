# Approvals — who signs a bill, and above what amount

**Spec:** `docs/superpowers/specs/2026-09-03-approval-workflow-engine-design.md`.
**Bills only.** Every other approval in the product is unchanged — see "Not built yet".

## What it is

An **approval chain** is an ordered list of steps. Each step names a **permission** and the
amount **at or above which it applies**, in the studio's own currency:

```
bill: [ { permission: "finance.payables.approve",     from: 0,     label: "Finance" },
        { permission: "finance.payables.approveHigh", from: 50000, label: "Above the limit" } ]
```

`from: 0` means "always". A 10,000 bill walks step one alone; a 200,000 bill walks both, in
order, and needs two different people.

**A step names a right, not a person and not a role.** That reuses the whole existing access
model — `escalates()` applies unchanged, `requirePermission` is the check — and nothing new
can leave the company and block a chain that named them.

**The boundary is at-or-above, not above.** "Bills over 50,000 need the FD" and "bills at
50,000 need the FD" are two readings of one sentence; the code takes the safer, and both
sides of the line are asserted.

Before this existed, `finance.payables.approve` approved any amount. A 200-unit stationery
bill and a 2,000,000 subcontractor bill took the same path, so the only way a studio could
say "the FD sees the big ones" was to withhold approval from everybody who handles the small
ones — a bottleneck, not a control.

## What it stores

**The chains** live on the `finance-settings` sub-section's own `settings` object, as
`approvalChains`, keyed by document type. No new key builder and no new collection.

They are **overrides merged over the seed**, the way flow templates are: a studio stores only
what it changed, so a later correction to the built-in still reaches every studio that never
touched it. Edited in Finance & Accounting settings, behind `finance.settings.edit`.

**A chain is refused on write**, never on read, and the refusal is a sentence the studio is
shown. Five things are refused, each invisible at runtime and none of which throws: a step
naming a permission that does not exist (it would block every bill reaching it, silently and
forever), thresholds that descend, no always-on step (a hole rather than a policy), the same
right twice (nobody may sign two steps, so the chain would be unwalkable), and an empty chain.

**A bill stores two things**: `approvals`, one entry per signature, and `approvalPlan` — the
steps it was routed under, the converted amount, and **the rate that decided it**. Both are
optional, because every bill raised before this feature has neither.

**`status` is not extended.** `BILL_STATUSES` gained no value. `Approved` is written only
when the last required step is signed, so a part-signed bill reads `Received` and everything
deriving from status — the aging flag, the edit lock, the refusal to pay an unapproved bill —
keeps working unchanged.

## What it does

**Approving is a walk.** Each call clears the first step still outstanding: resolve the plan,
find that step, require *its* permission, record the signature. The permission is chosen at
runtime; access is still resolved once, this only asks a different question of the set that
was already resolved.

**Invariant 7 is enforced twice, and they are two different rules.** The person who raised
the bill never signs it. And somebody who signed an earlier step may not sign a later one —
invariant 7 is about the record rather than the pair of rights, and a second step the first
signer can clear is not a second step. Holding both rights stays legitimate.

**Amounts convert to the studio's currency** through the daily FX snapshot, so a foreign
supplier invoice is judged by what it is really worth: 20,000 EUR is over a 50,000 SAR limit
even though the raw number is under it. A threshold comparing unconverted amounts would
under-route every foreign bill in a weaker currency, silently.

The rate is fetched **only when something needs it** — a bill already in the studio's currency
adds no round trip, and a list takes one fetch for the whole set rather than one per row.

**The plan is frozen onto the bill.** The rate that routed a bill is recorded with it, so a
rate moving overnight cannot re-route a bill already mid-chain. The plan is re-derived when
the bill's amount or currency is edited, which is the one way this could otherwise be wrong
without anything looking wrong.

**Four things stop a plan resolving,** and they are distinct because they send people to
different places:

| Reason | Means | Fixed by |
|---|---|---|
| `no-studio-currency` | The studio never set its own currency | An owner or admin, in Studio settings |
| `unquoted` | Today's rates do not quote this pair | Waiting, or billing in a quoted currency |
| `no-chain` | Nothing configured for this type | Cannot arise for bills |
| — | A stale snapshot with a real rate **still routes**, flagged | Nothing; yesterday's rate beats blocking |

**A bill is still raised when its plan cannot be resolved**, and stores none. Recording an
obligation that already exists must not wait on an exchange rate — only authorising payment
refuses.

### The one thing that will surprise you

**`createStudio` has never set a currency**, and approval refuses without one. So **every
studio that has not set a currency cannot approve a bill** until an owner or admin sets it in
Studio settings. That is deliberate: an amount cannot be judged against a limit without one.
The Payables screen says so in place of the button, in both languages, naming the setting.

### On screen

Payables draws the button only where pressing it would succeed — the server answers "which
step could *this* person sign", from the same function the walk enforces with, so the two
cannot disagree. A part-signed bill shows how far it has got ("1 of 2 signed"), who signed,
and what it still needs. A blocked bill explains itself instead of offering nothing.

The **step's label is tenant-authored and never translated** — a studio names its own steps,
and a name somebody typed is data. The refusals travel as tokens and are translated on
display, so an Arabic studio does not get an English apology.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **Bills only.** Invoices, expenses, change orders, timesheets, vacations and controlled
  documents keep the approval they already had. The controlled-document ladder
  (`moveSignable`) and the submit/answer pairs are untouched.
- **No parallel steps, no delegation, no out-of-office reassignment, and no reminder** on a
  step that has waited. Each is a real requirement of a mature approval system; none is
  needed to express a value limit.
- **No approval inbox.** "What is waiting for me" is a screen nobody has built. The data for
  it exists.
- **No condition other than amount.** Supplier, cost code and deal are not expressible; that
  is a predicate language, and the spec asked for value limits.
- **The studio's currency is not mandatory product-wide** — only for approving a bill.
- **AP reporting is not revalued.** A bill carries a currency now, but the aging report still
  sums raw totals. That is P3's job.
- **No second document type.** The storage is keyed by type so a second is a key rather than
  a rewrite, but a chain governing a record outside Finance does not belong in Finance's
  settings, and that is the commit where this becomes a store of its own.
