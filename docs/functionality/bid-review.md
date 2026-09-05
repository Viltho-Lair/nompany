# Bid review — who signs a bid, and above what value

**Where:** the review block on `/<slug>/tendering-register/<tenderId>`, beneath the bill.
**The engine:** `src/platform/approval/*` — P2's, reused whole.
**The service:** `src/modules/tendering/bid.ts`. **The chain store:**
`src/platform/approval/store.ts`.
**Bills and bids.** Every other approval in the product is unchanged — see "Not built yet"
in `approvals.md`.

## What it is

Until this, a tender could be moved to **Submitted** by anybody holding
`tendering.tenders.edit` — the same right that types a rate into the bill. So the person who
priced the work was also the person who committed the company to it, and `tendering.md` has
named that gap since the register shipped: *"a bid going out at a price nobody senior signed"*.

A bid now walks an **approval chain**, exactly as a bill does: an ordered list of steps, each
naming a permission and the value at or above which it applies, in the studio's own currency.

```
tender: [ { permission: "tendering.tenders.approve",     from: 0,      label: "Estimating" },
          { permission: "tendering.tenders.approveHigh", from: 500000, label: "Above the limit" } ]
```

**It reuses the engine rather than growing a second one.** `platform/approval` already knows
what a chain is, what a foreign-currency amount is worth against a limit, and which step is
outstanding. A second implementation of *"at or above, in the studio's currency, in order, and
never the same signer twice"* would be a second set of answers free to disagree with Finance's.

## What it stores

**Two new rights**, extras on `tendering.tenders` rather than an area of their own: `approve`
and `approveHigh`. Catalogue 143 → 145.

That is the bill of quantities' argument again — signing a bid is an act *on* a tender, so it
answers to the tender register. What makes them separate **rights** is that "may price a bid"
and "may commit the company to it" are genuinely different powers, which is the test
`tendering.rates` passed and the bill of quantities failed.

**A tender carries `approvals` and `approvalPlan`**, the same shape a bill carries. Both
optional, because every tender already in the database predates them.

**`status` is not extended.** `TENDER_STAGES` gains no value: a signed bid is still *Preparing*
until somebody submits it — approval is a **precondition** of that move rather than a stage of
its own — so every reader deriving from status keeps reading what it reads today.

### The chain store moved

`approvals.md` named the move point exactly: *"a chain governing a record outside Finance does
not belong in Finance's settings, and that is the commit where this becomes a store of its
own."* A tender is that record. Leaving it would have meant giving whoever sets "bids over a
million need the MD" the right to edit Finance's settings.

**The chains now live on the studio record, beside `currency`.** Three reasons, and the third
decided it:

- Approval policy is the company's, not a department's — the same kind of statement as "what
  currency are we", which approval already depends on.
- `studio` is on every module context already, so a department asking for its own chain costs
  no section lookup and no round trip.
- It is **one right**, `administration.settings.edit`, so a studio cannot end up with two
  people each controlling half of its approval policy and neither able to see the other half.

**Reading is layered: seeds → what Finance stored → the studio's own.** Finance's old blob is
*read rather than migrated*, because a manual backfill gets forgotten — `administration-access`
shipped and was still missing from two of three live studios two days later with nothing
complaining. The studio's own sits on top, so the first edit in Studio settings becomes the
answer and stays it.

**Writing has one door per type**, and `bill` is deliberately not one of the studio's.
Finance's settings screen is still the bill chain's editor; the day it moves, `bill` joins
`STUDIO_EDITABLE_CHAINS` and `saveFinanceSettings` stops accepting chains — **in that one
commit**, so there is never a moment with two writers. A type outside the list is *refused*
rather than dropped: silently ignoring a chain somebody typed would show them a saved screen
governing nothing.

## What it does

**The bid's value comes from the bill when there is one.** This is where `valueFromBoq`
finally gets called — it had been written, tested and reached by nothing since the BOQ slice,
which left a tender's typed `estimatedValue` and its bill's total as two numbers for one
tender with nothing choosing between them. The estimate is what somebody guessed the day they
heard about the tender; the bill is what the work was costed at. **`basis` travels with the
number**, because on screen the two are the same digits and mean completely different things.

**A tender with no bill is valued from the typed estimate**, and that is not a fallback so much
as a real case: plenty of tenders are priced outside this product, and refusing them would make
the feature unusable for those studios.

**A part-priced bill cannot be signed off.** This is the rule that joins this slice to the BOQ's.
`boqTotals` returns `complete` precisely because the total of a bill with unpriced lines is a
number and **not the bid**; a signature given against it authorises a figure that is going to
change. The bill's own screen already refuses to call that total the bid — the approval refuses
to sign it.

**Invariant 7 is enforced twice, and they are two different rules.** The person who raised the
tender never signs it. And somebody who signed an earlier step may not sign a later one — the
invariant is about the *record* rather than the pair of rights, so holding both stays
legitimate and a second step the first signer can clear is not a second step.

**Identity is checked before the plan is resolved**, which is both cheaper and more fundamental
— and it is why Gate A asks the currency refusal *as the reviewer*: asked as the raiser it
would pin `same-signer` while claiming to be about currency.

**Submitting is refused until the chain is satisfied** (`not-approved`), and only on the move to
Submitted. Won and Lost are behind it by construction — both already require having been
submitted — and putting it on every closed stage would refuse a **No Bid**, which is the one
exit that commits the company to nothing.

**The plan is frozen onto the tender.** The rate that routed a bid is recorded with it, so a
rate moving overnight cannot re-route one already mid-chain.

**Resolving a plan costs nothing where it is not needed.** The stage move asks only when the
target stage is Submitted; the review block rides along with the bill's own route and is handed
the lines it already fetched; a tender in the studio's own currency triggers no FX read at all.

### On screen

The review block draws the button only where pressing it would succeed — `availableBidApproval`
asks every question `approveBid` asks, from the same file the walk enforces with. Every step is
shown, signed or not, in the order it must be walked, so somebody looking at a half-signed bid
sees what it is still waiting for rather than only how far it has come. The step's **label is
tenant-authored and never translated**; the refusals travel as tokens and are translated on
display, through `components/studio2/tenderRefusals` — which moved out of `StudioTenders` when
a second screen started receiving the same tokens.

### The one thing that will surprise you

**Approving a bid requires the studio to have set its own currency**, and `createStudio` has
never set one — the same rollout consequence bills already carry. An amount cannot be judged
against a limit without one. The refusal names the fix rather than merely refusing, and the
screen says it in place of the button.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **No editor for the tender chain.** The storage, the validation and the write door all exist
  and are enforced; there is no screen in Studio settings that sets the steps, so a studio
  changing the 500,000 threshold has to do it through the API. This is the largest gap here.
- **The bill chain still lives in Finance's settings screen.** Reading is unified; editing is
  not, and moving that editor is a commit of its own.
- **No parallel steps, no delegation, no reminders, no approval inbox** — inherited verbatim
  from the bill implementation, and the same sentence applies.
- **No condition other than value.** A chain cannot say "anything for this issuer" or "any bid
  below our target margin"; margin is not modelled at all, because the bill holds what the
  studio would charge and not what the work would cost.
- **Nothing is notified.** A bid waiting for a signature tells nobody; the reviewer has to open
  the tender.
- **A signature is not withdrawn.** There is no un-sign, no rejection with a reason, and no
  record of a bid that was reviewed and sent back — the only outcomes are signed and not yet
  signed.
- **Re-pricing after a signature does not clear it.** Editing the bill under a signed bid
  leaves the signature standing, and only the stored plan records what was actually signed
  against. A bill edited across a threshold re-plans on the next attempt, which is what makes
  the extra step appear, but the earlier signature is not invalidated.
- **No approval on a No Bid or a Withdrawal.** Deciding not to bid needs no signature, which is
  right, but so does withdrawing one already submitted — and that is a decision somebody senior
  might reasonably want to make.
