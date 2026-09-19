# Approvals

Two things share this file while one replaces the other. **The Approvals page** (below, 2026-09-19)
is where every approval in the product is going. **The amount chains**
(the rest of the file) are how bids and requisitions are signed today;
each moves onto the page as its Request approval button is built.

## The Approvals page (2026-09-19)

The owner's design; the decision ledger in `docs/progress.md` holds it and the build order.

**An approval exists only because a record asked for one.** A record's Request approval button
files it, naming the record (`source`: its section, id, reference, title, and the `path` its
"Open the record" link lands on) and who asked. Nothing is typed in by hand, and there is no
"new" button on the page.

**The record reads its status from the approval**, never a copy of it — through
`modules/approvals/reads.ts`, the one place every module asks "is this approved".

**The records that ask (2026-09-19):**

| Button | Where | Files | When approved |
|---|---|---|---|
| Send for Approval | a Sales ticket, for its latest finished quotation; Technical, for an internal quotation | **Quotation approval** | the quotation reads Approved everywhere, can be locked, opens a project, and ends the RFQ asking |
| Submit PO | a Sales ticket, once its quotation is approved | **Client PO approval**, carrying what the client sent (a description, a file, or both) | the **project number is issued** (`effects.ts` → `issueProjectNumber`), as Finance's signature on the old board did |
| Request approval | Point of Sale → Returns: asking for a return is asking for its approval | **Till return**, carrying the refund as its amount | the units go back into stock and the refund is paid (`returnApproval` in `modules/sales/posReturns`); rejected, the return is closed with the reason |
| Request approval | Finance → Payables, on a received bill (or one whose last request was turned down) | **Supplier bill**, carrying its total in its own currency | the bill becomes Approved, which payment waits on (`billApproval` in `modules/finance/payables`); a no changes nothing on the bill — it is corrected and asked about again, disputed or cancelled |
| Record adjustment | Inventory → Stock: an adjustment worth more than the lowest limit asks; under it the stock moves at once | **Stock adjustment**, valued at units × unit cost (absolute) | the movement is written (`adjustmentApproval` in `modules/inventory/adjustmentApproval`); rejected, it is closed with the reason and nothing moves |

**MOVING EVERY APPROVAL HERE, one type at a time** (the owner, 19/09/2026): the request stays
where it is made today and the answer moves to this page. The till return, the stock
adjustment and the bill have moved; bids, requisitions, payroll, expense claims, change orders, timesheets,
document revisions, held-payment releases and leave follow. Each move drops the type's
`approve` right — a right to do what the settings decide would be a second answer (invariant
16) — and the steps it had come with it:

- **Until a studio saves a type, its old signers answer it.** `defaultSetting` (`model.ts`)
  names whoever holds the old right today, read off the roles' stored strings because the
  catalogue no longer knows it, plus the owner and Admins, with the old limits. Worked out on
  every read and never stored; the settings screen says "not saved yet". Nothing stops the day a
  type moves.
- **A step may start at an amount** (`from`, in the studio's currency, at or above) on a type
  that carries one: "a bill has step 1 for everyone and step 2 from 50,000". The amount is
  converted with the day's rate only when some step has a limit, and the amount and the rate are
  frozen onto the approval. Under every limit nothing is asked and the record goes through.
- **Every yes asks the signer's PIN**, on every type, where before only the amount chains did.
- **The record moves when its approval is decided** (`effects.ts`), with the studio's authority
  and the approver named — the person answering may hold no right over the record. The yes that
  would finish an approval is asked of the record first, so a return that can no longer be paid
  out is refused while the answer is still the approver's. If the record's write still fails
  afterwards, the approval says so (`finish`) and offers **Try again**.
- **What is being approved cannot move under the approvers.** A bill waiting on its approval
  refuses a change to its lines, tax or currency (`approval-pending`); turned down, it edits
  again and is asked about afresh.
- **Signatures already given are carried.** A record waiting under the old engine when its type
  moves gets its approval the first time its list is read, in its requester's name, with the
  signatures it had placed on the first steps in order — nobody signs twice (`carried` on
  `requestApproval`). Nothing is deleted: the old fields stay on the record as history.
- **Reviewer ≠ approver stays where the steps are two acts** (`distinctSigners`, for document
  revisions): nobody answers two steps of one such request, the owner included.

**A quotation is approved by its approval and by nothing else.** Editing a quotation's status to
Approved is refused (`needs-approval`) — it was how anybody who could edit one skipped the people
who approve it. A quotation stored Approved before this, by that edit, stays approved.

**A rejection is answered by asking again.** The ticket offers "Rejected — send again" (and
"PO rejected — submit again"); the rejected approval stays on the Approvals page as the record
of it. While one is pending, a second is refused (`already-pending`).

**Nobody named, nothing filed.** A type with no steps set up refuses the request with a sentence
(`not-configured`) rather than filing an approval that would wait for ever — the old board
filed those and reported them as "unrouted".

**"Awaiting you" on Main** lists and counts the approvals waiting on the reader, through the
same `waitingOn` the Approvals page uses.

**Each type is answered in ordered steps** (Approvals → Approval settings). A step names
specific studio members and says whether ALL of them must approve or ANY ONE is enough. The
steps are frozen onto an approval when it is requested, so changing the settings never changes
who was asked on one already running.

**Nothing is self-approved.** The requester is taken off any step others share, and a request
where they would be the only approver on a step is refused (`no-approver`). **The owner and
Admins are the exception**: they stay on their steps and may answer their own request.

**A no from anybody at the open step rejects the whole approval**, under "any one" as well as
"all", and must give a reason. Answers are final. Asking again is a new approval; the rejected
one stays as the record of it.

**Who sees what.** Everybody opens the page (`EVERY_MEMBER_SECTION_KEYS`) and sees two lists:
what is waiting on them — only the open step, never a later one — and what they asked for, with
every step and every person's answer. **Answering needs no right**: being named on the open step
is the authority. Two rights exist, held by the owner and Admins and given to others in Access:
`approvals.overview.view` (a third list, every approval in the studio) and `approvals.settings`
(view and edit the steps). No library role is born with either (`ADMIN_ONLY_AREAS`).

**Who is told.** The people on a step when it opens; the requester when it is decided either way.

**The code:** `modules/approvals/` — `model.ts` (the rules, pure, `tests/approvals-model.mjs`),
`registry.ts` (the types — a new one is a row there plus its button), `approvals.ts` (the store).
Screen: `components/studio2/StudioApprovals.js`.

**The old board's items were converted on 19/09/2026** and the board's stored rows removed from
every studio. What it had left became approvals of their own types, and the hand-written ones
became `carried` approvals, which can be answered but never requested. The conversion code went
once it had run. What it deleted is in the export the owner holds.

**Not built yet on the page:** only the three records above ask — Material PO, Delivery,
Delivery return, ID update and Permit request have no record to ask from yet, and bids,
requisitions, payroll, expense claims, change orders, timesheets, document
revisions, held-payment releases and leave still answer where they are, through the amount
chains below and their own rights; requests already waiting on those are converted when each
type moves (export first, two confirmations); Nova reads a person's approvals but cannot answer
one; no reminders, no delegation, and no withdrawing a request. **A step whose only approver leaves the studio cannot be answered by anybody**, and
an approval waiting on it waits for ever — there is no reassigning yet.

## The amount chains — who signs a bid or a requisition, and above what amount

**BILLS LEFT THIS ENGINE ON 19/09/2026** for the Approvals page (the table at the top), and
stock adjustments before them. What follows still describes bids and requisitions; where it
says "bill", it is how bills were signed until then. `finance.payables.approve` and
`.approveHigh` are gone from the catalogue, and the bill chain is no longer offered in Studio
settings — a limit a studio had moved there is read as the bill type's default steps.

**Spec:** `docs/superpowers/specs/2026-09-03-approval-workflow-engine-design.md`.
**Bills and bids.** Bids came second — see `bid-review.md`, which is where the chain store
moved out of Finance. Every other approval in the product is unchanged — see "Not built yet".

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

**The chains live on the STUDIO record now**, beside `currency`, read through
`platform/approval/store` — see `bid-review.md` for why they left Finance. What Finance stored
before that move is still READ, layered underneath the studio's own, so a studio that
configured a bill chain keeps it with nobody running a backfill. No new key builder and no new
collection.

**All four are edited in one place: Studio settings → Approvals** (11/09/2026), behind
`administration.settings.edit`. This file used to say Finance's settings screen edited the bill
chain; **no screen had ever edited any chain** — the only bill-chain writer was
`saveFinanceSettings`'s API, which accepted every type, replaced the whole stored set on each
save, and was the only door for stock adjustments. It refuses chains now, with a sentence
naming where they are edited, and `bill` and `adjustment` joined `STUDIO_EDITABLE_CHAINS` in
the same commit — one writer per type, as this file always said the move would need.

The section shows **what is in force**, Finance's old layer included (the settings route
used to show a Finance-stored bill chain as the seed while payables enforced the stored one).
A step offers its own chain's rights by name — *Approve bills*, *Approve bills above the
limit* — rather than the whole catalogue, and the screen validates with the server's own
`chainProblems` before saving. **Setting a chain back to its seed over a Finance-stored one is
kept**, not dropped, or the old chain underneath would go on winning.

They are **overrides merged over the seed**, the way flow templates are: a studio stores only
what it changed, so a later correction to the built-in still reaches every studio that never
touched it.

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
deriving from status — the aging flag, the edit lock — keeps working unchanged.

**A bill is paid only once it is Approved** (the owner's decision, 11/09/2026).
`recordBillPayment` used to refuse only a Draft, so the claim above — "the refusal to pay an
unapproved bill" — was not true: a Received bill nobody had signed could be paid, and the
chain authorised nothing. It refuses `not-approved` now, and the screen offers Record payment
on an Approved bill only.

**The Admin may sign a bill they raised**, and a later step after an earlier one — the same
exception payroll carries (invariant 7 in CLAUDE.md). Without it the payment gate would leave
a one-person studio unable to pay a supplier at all. `approveBill` and `availableApproval`
ask `isAdministrator` identically, so the button appears exactly where the signature is
accepted. Everybody else still needs a second person on both counts.

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

### Stock adjustments

**Moved to the Approvals page on 19/09/2026** — see the table at the top. The chain editor in
Studio settings no longer offers it; a limit a studio had moved there is read as the type's
default steps until the studio saves it in Approvals settings. `inventory.stock.approve` and
`.approveHigh` are gone from the catalogue.

## The signer's PIN (18/09/2026)

**Approving asks the signer's personal PIN** — a bid and a requisition in their own routes,
and every approval on the Approvals page (`signingPinProblem`,
`platform/auth/lock.ts`). Rejecting is not asked: it commits nobody to anything. It is asked
of a person who has set a PIN, and of **everybody** when the studio switches on **PIN on every
signature** (Studio settings, beside the chains; `signingPin` on the studio), in which case a
signer with no PIN is refused `pin-not-set` (409) and told to set one.

A request without the PIN answers `pin-required` (**428**). No screen was changed for it: the
page's response observer (`components/security/SessionLock.js`) asks for the PIN and sends
**the same request** again with it, so the screen that asked to sign gets the signature's answer.
A wrong PIN asks again with the tries left; five wrong in a row stop the PIN working on
signatures and at tills for fifteen minutes (`pin-locked`, 429). The reason is sharing: a login
handed round a team signs as one person, and the PIN typed at the moment of signing is the one
thing the named person has and the others do not.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **Bills and bids only.** Invoices, expenses, change orders, timesheets, vacations and
  controlled documents keep the approval they already had. The controlled-document ladder
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
- **Finance's old stored chains are read forever, never cleaned up.** A studio that configured
  one through Finance's API keeps it beneath its own layer until it saves Approvals; nothing
  deletes the old blob, deliberately — a migration nobody runs is worse than a layer that reads.
