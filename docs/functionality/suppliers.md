# Suppliers — who the studio may buy from, and how they performed

**Where:** `/<slug>/procurement-suppliers`, behind `procurement.suppliers`.
**The records:** `VendorSchema` (`src/modules/inventory/schema.ts`) and
`SupplierScorecardSchema` (`src/modules/procurement/supplierSchema.ts`).
**The arithmetic:** `src/modules/procurement/supplierModel.ts`.
**The service:** `suppliers.ts`. **The route:**
`/api/studios/<slug>/procurement/suppliers`.

## What it is

Two things on one screen, deliberately kept apart:

- **Qualification** — whether the studio may place an order with this supplier at all.
- **Rating** — how they have actually performed, in two columns that are never blended.

## Qualification is derived, never stored

What a **person** decides is stored: approved, suspended or rejected, with a reason and a
stamp. What that decision **amounts to today** is computed at `asOf`, every time it is
asked.

A trade licence expires on its own and **no business event fires when it does**. A stored
`Qualified` flag would need a nightly job to stay honest, and the day that job failed the
studio would go on buying from a supplier whose insurance lapsed in March. There is no such
job and there does not need to be.

### The five states

| State | Orders | Means |
|---|---|---|
| `qualified` | allowed | Approved, every document in date |
| `expiring` | **allowed** | Approved, something lapses within 30 days |
| `unassessed` | **allowed** | Nobody has looked |
| `lapsed` | refused | Approved, but a document has expired |
| `blocked` | refused | Somebody suspended or rejected them |

**`unassessed` is usable, and that is the whole rollout decision.** Every supplier in every
existing register is unassessed. A version that refused would stop three live studios buying
anything on the morning it shipped — and would pass every other test in the suite.
Qualification only bites once somebody has actually used it.

**`expiring` warns and does not stop.** Refusing over a certificate that is still valid today
is the fastest way to have the whole feature switched off by a studio that needs to buy
something.

**A person's decision beats the paperwork in one direction only.** Suspending blocks however
good the documents are — that is a judgement about the supplier, not their filing. Approving
does **not** override a lapsed document the other way: a studio that approved a supplier in
January did so on the strength of an insurance certificate, and the approval cannot outlive
the thing it was based on.

**A blank expiry does not expire.** Treating an absent date as lapsed would disqualify every
supplier in the register on day one, which is not a safety feature — it is a screen nobody can
act on. `undated` is its own state so the difference is visible.

**A suspension or rejection must say why**, the same rule a losing deal carries. A supplier
blocked for reasons nobody wrote down is one nobody can argue with once that person has left.

## What makes it more than a badge

**Placing a purchase order is refused on a `blocked` or `lapsed` supplier.** A status nothing
can act on is invariant 16 at the record level, so the register gates the one act that commits
money.

It **costs no round trip**: `createOrder` already fetched the vendor row to check the id
exists, and qualification is a pure function of that row plus today.

**An item is not gated, only an order.** Pointing a catalogue entry at a supplier commits
nothing, and refusing that would make the register unusable for exactly the housekeeping that
fixes it.

## On time is measured against the *original* promise

`expediting.ts` refused to let a re-promise overwrite `expectedAt` and said why: *"that fact is
the entire input to supplier rating"*. This is the file that spends it.

Measuring against `promisedAt` would mean a supplier who re-promised four times scores a
hundred per cent, and **re-promising would become the way to look reliable** rather than the
way to be seen slipping. So the comparison is always against what was promised when the order
was placed, and `rePromised` is reported **beside** the percentage rather than folded into it —
"arrived on the day they first said" and "moved the date three times and then arrived" are
different facts and one number cannot hold both.

**Null rather than nought, everywhere.** Nothing delivered yet and every order late read
identically as a 0% bar and mean opposite things. An order with no original date is **not**
counted as late: nobody promised anything, so there is nothing to have missed, and counting it
would punish the studio's own record-keeping rather than the supplier.

## Rating is two columns and never one number

Scorecards carry three axes, 1–5, each optionally blank. **An axis nobody scored is left out
of the average rather than dragging it down.**

**The average and the latest are both shown.** An average over three years cannot tell a studio
that a supplier fixed itself in June; the latest alone forgets a decade of trouble because the
last job went well.

**There is no blended score, deliberately.** "How often they turned up" is a fact derived from
orders; "what the site thought of the work" is somebody's opinion. Averaging the two gives a
figure whose meaning depends on which half moved — the same objection this codebase already
records against showing `costing.forecast` and `earned.eac` under one label.

**The stored token for the first axis is `workmanship`, not the obvious word**, because that
word is a retired section key and `testNoRetiredSectionKeySurvivesInSource` greps every source
file for it. The grep cannot tell a scorecard axis from a section lookup and should not try.
The English label is chosen freely on display, the way every status in this product is.

## Who may do what

**`procurement.suppliers`**, view/create/edit/delete, with **`qualify` as an extra**.
Catalogue 171 → 172. Editing a supplier corrects their phone number; **approving** one says the
company may commit money to them.

**Rating adds no right at all** and is guarded by `edit`. The person who can say a delivery was
poor is whoever received it, and putting that behind a governance permission would mean the
only people able to write a scorecard are the ones who never see the goods.

**On the archetypes `qualify` sits with `buyer`**, and it is *not* the separation problem
`certify` was. Certifying a subcontract valuation creates a debt, which is why it went to
whoever runs the job. Approving a supplier creates nothing — it says who the company is
*allowed* to buy from, which is procurement's own remit, and it authorises no spend on its own:
a qualified supplier still needs a requisition somebody else approved, which is precisely the
right `buyer` deliberately does not hold.

## Where the record lives

**The supplier is Inventory's `inventoryVendors` row, unmoved**, and is the same row a purchase
order names. This slice added fields to it (`approvalStatus`, `approvalReason`, `approvedAt`,
`approvedByCollaboratorId`, `documents`) rather than shadowing it with a second supplier shape
that would immediately be free to disagree about who a supplier is.

So the screen talks to **two endpoints**: name, contact and item types still post to Inventory's
`vendors` route, and the assessment and scorecards to this one.

**The register moved out of `StudioInventory`.** It was rendered there because vendors were
Inventory's; it is `StudioSuppliers` now, and `VendorRegister.js` holds the create/edit and CSV
import dialogs it was **extracted** into rather than copied — a second copy would be two
registers over one collection.

**Documents live on the record; scorecards are their own collection.** Licences are a handful
per supplier and stop arriving, the way an order carries its chases. A scorecard lands every
period for as long as the studio buys from them, which is precisely the "array that grows
without bound" the migration design refuses to nest.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **No document is required to approve.** A supplier approved with an empty document list
  reads as `qualified`, because requiring paperwork would be a policy this does not hold and
  no studio has been asked for one. Clearing the list on a lapsed supplier therefore
  *un-lapses* them — which is correct as a replace-the-list edit and is worth knowing.
- **Nothing warns before a document expires.** `expiring` is computed and shown on the screen,
  and no notification is produced — somebody has to open the register to find out.
- ~~**`mediaId` is stored and nothing uploads to it.**~~ **Fixed 08/09/2026.** The file
  attaches now, through the same `/api/media?kind=private` route the tender pack uses, so the
  bytes are streamed after a membership check rather than the Blob address being handed out —
  a supplier's insurance certificate is not public. What remains: **one file per document**,
  replaced rather than versioned, and removing it clears the reference without deleting the
  blob.
- **The 30-day window is not configurable.** It is a parameter rather than a constant, so the
  screen could widen it, and no setting exposes that.
- **Only purchase orders are gated.** A subcontract can still be raised with a blocked supplier,
  and an RFQ can still be awarded to one. Both should ask, and neither does.
- **No qualification categories.** A supplier is qualified or not, in general — not "qualified
  for electrical works up to £50k", which is what a real approved-vendor list holds.
- **No scorecard reminders and no period enforcement.** Nothing asks for a quarterly score, and
  two scorecards may cover the same period.
- **On-time counts orders, not lines.** An order 90% delivered on time and 10% late is judged by
  its `receivedAt` alone.
