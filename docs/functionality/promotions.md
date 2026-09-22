# Promotions — what takes money off a sale at the till (22/09/2026)

**Where:** Point of Sale → Promotions (`pos-promotions`), behind `pos.promotions`.
`modules/sales/posPromotions.ts` (service), `components/studio2/StudioPosPromotions.js` (screen),
`/api/studios/<slug>/pos/promotions` (route), `shared/studio/posPromotions.ts` (words).
Numbered `PRM` (`administration/numbering`).

## What it is

An offer the till prices a basket with — by itself, or because a cashier chose it. It is the
shop's own decision to charge less, kept apart from the **cashier's** discount
(`pos.md`: a typed price, a line discount and a basket discount, all behind
`crmSales.pos.discount`), which stays exactly as it was.

**It owns its rows** (`pos-promotions`): `posPromotions`, `posCoupons`,
`posRedemptions`, `posPromotionLog`. What an offer took off a SALE is frozen onto the
receipt when the sale is made, beside the till's own discount figures — a return reads the
receipt and never this register, so editing or ending an offer moves nothing already sold.

## Rights

`view` sees which offers are running; `create` and `edit` write them; there is **no delete** —
an offer that has priced a sale is archived, or every receipt naming it would name something
the product no longer admits. Two extras are the CASHIER's acts at the counter:
**`applyManual`** (choose an offer the till does not apply by itself) and **`removeAuto`**
(take off one it did). Both go with `crmSales.pos.discount`, because all three decide what the
customer pays. Existing roles reach the screen by catch-up (`modules/people/catchUps.ts`,
22/09/2026): whoever could see the till sees the offers, whoever manages it writes them, and
whoever may change a price may choose or remove one.

## Decisions taken with the owner (22/09/2026)

- **Scope is a TILL, not a branch.** The product has no branch: a till is the smallest place a
  sale happens, and multi-site is separate studios (`docs/progress.md`).
- **Schedules read the STUDIO's timezone**, a Studio setting rather than a POS one — the
  owner's rule: something several sections can use is not a section's setting.
- **Conditions name items, `itemType` and the vendor** until items have a real category axis
  (a future plan in `docs/progress.md`); the promotions module holds no industry knowledge.
- **Customer tags are a register**, not a fixed list: rows with ids the studio renames, so a
  rename re-tags nobody (`master-data.md`).
- **Consent is not re-modelled.** Marketing's append-only consent ledger is the one record of
  it (`audiences.md`).
- **Gating is sold in `/super`**, not judged in a section screen.

## How an offer is written

Three tabs on one screen: **Offers**, **Coupons**, **Report**.

An offer opens on five **presets** — Buy X get Y, percentage off a type or a supplier, spend
and save, a fixed price for a bundle, coupon only — and **Advanced** shows everything the
engine reads. A preset is a starting draft and nothing more: `promotionProblems` judges the
result, not the preset it came from, so no preset can produce an offer the engine would
otherwise refuse.

**The editor edits ONE object with the engine's own shape.** There is no mapping layer between
what is drawn and what is stored, deliberately: a mapping layer is a second description of an
offer, free to drift from the engine's.

**The preview runs the real `evaluate`** on a basket that is not a sale, so the editor and the
counter cannot promise two different prices. It runs with the offer's status IGNORED — the
point is to see what the rules do, and a draft would otherwise always answer "not running" —
and it stands in for every door the offer might need (a cashier's choice, a coupon), or a rule
that waits for one would show nothing and read as broken. When the basket earns nothing it
says **why**, in the engine's own words.

**An ACTIVE offer is not edited.** Pause it, change it, put it back — three deliberate acts,
each writing a `posPromotionLog` row. A rate typed onto a live offer would change what the
next customer through the door is charged with nobody having decided that it should, and
"who made it 50%" has to be answerable from something other than the offer's current state.

`draft → active | archived`, `active → paused | ended`, `paused → active | ended | archived`,
`ended → archived`. An ended offer never goes back to draft: it would re-run under a code its
receipts already name.

**"Ending soon" and "past its end" are not statuses.** They are computed from the dates every
time they are asked for — a stored flag and a date part company the moment the date is
changed. How soon "soon" is, is Point of Sale's own setting
(`promotionExpiryWarningDays`, default seven), because nothing outside the department reads
it.

## How a basket is priced

`modules/sales/posPromotionsModel.ts` is pure and does no I/O. `evaluate(basket, context)` is
the ONE door, and the till screen, `createSale` and the editor's preview all call it.

Line-level offers run first in ascending `priority` (ties by code, so the answer never changes
between runs), then receipt-level ones on what is left. An **exclusive** offer closes its own
level. Arithmetic is in whole **minor units** inside the engine and converts back at the
boundary; a receipt-level discount is allocated across the lines by **largest remainder**, so
the parts add up to the whole exactly. Nothing goes below nought.

**The till runs the same function the server runs.** `posView` sends the live offers whole —
the rules are what the screen must evaluate, and a summary would be a second, poorer copy of
them. The server re-prices at the sale with the **usage counters a till is not given**, and a
basket that earns something else comes back as `promotions-changed` with both figures: the
cashier sees what moved and sells again knowingly, rather than the sale being rung up at a
total nobody has seen.

**The shop's offers come off before the cashier's discount.** `priceBasket` takes
`promotionDiscount` per line and the cashier's percentage is of what is LEFT, never of the
shelf price — so an automatic offer never spends the cashier's allowance and the cap is
measured against the same figure the server measures it against.

## Coupons

A coupon is its own record, not a field on an offer: one offer can be unlocked by a code on a
poster, by a code sent to one customer, and by ten thousand in a batch, and each has its own
life. The alphabet excludes `0/O/1/I`.

**Counted on the coupon's own row.** This store gives a module exactly one atomic primitive —
compare-and-set on a single row — and no transaction, no row lock and no unique index. So the
count that decides whether a single-use code has been spent lives ON the coupon, is read and
raised inside one patch, and the patch REFUSES rather than overwriting when somebody else got
there first.

**Claimed before the sale is written, released if the write never lands.** There is no
transaction spanning the two, so the order is chosen: a claim nobody used is a number somebody
can see and put back, while a sale that redeemed a single-use coupon twice is money given away
twice.

**Every coupon needs a customer, public ones included** — without one a per-customer limit is
unenforceable and a personal code is unverifiable. The till says so before the cashier types.

**A code is cancelled, never deleted:** a redemption names the coupon it spent.

## Usage and caps

One `posRedemptions` row per offer **per sale** — not per line: an offer that touched four
lines was used once, and counting it four times would exhaust a cap in a quarter of the sales.
Written after the sale lands, so a sale that failed leaves nothing behind, and a RETURN does
not give a use back: what was sold was sold.

Counted from those rows rather than from a counter on the offer. A counter beside the rows it
counts is a second source of one fact, and the two part company the first time a sale is
written and its bump is not. `maxUsesPerDay` counts the **studio's own day** (`shared/timezone`).

## Going live needs a signature

Activation is the act that spends money — a draft prices no basket — so the signature goes
there and nowhere else, and editing a live offer is already impossible, which stops anybody
activating something harmless and rewriting it afterwards.

**What an offer is worth is the most it could cost:** its per-sale cap times the times it may
be used. Cap neither and it could cost any amount whatever, which is **null** — and null walks
every step, because an amount nobody knows cannot be under a limit (the rule a requisition
with an unestimated line already follows). The threshold is not a new setting: it is the
`from` on each step of the `promotion` type in Approvals settings.

A refused activation leaves the offer exactly where it was. There is no "rejected" state,
deliberately: a refused offer is a draft somebody may rewrite and ask about again.

## What the receipt says

Each offer that touched a line is printed **on the line, by name, before the cashier's
discount**, because that is the order they were taken in. An offer on the whole sale is named
once, where the basket discount is printed. "You saved" is everything saved — the shop's
offers and the cashier's discount together.

A **return** refunds the net the sale froze onto the line: half a discounted line refunds half
of what was PAID, and an item an offer made free refunds nothing (and still goes back to
stock).

## What the package sells

Two switches in `/super` → Packages, on the owner's instruction (22/09/2026): **Promotions**,
and separately **coupons, tiers and schedules**. Both ABSENT mean on, so a package saved before
they existed loses nothing.

**Gated at the WRITE, never at the read.** A studio that moves to a package without the
advanced parts keeps every offer it has and keeps charging them correctly; what it loses is
the ability to write new ones. A gate that stopped an existing offer applying would change
what somebody at a counter is charged because of a billing change.

## Not built yet

- **Online is a channel an offer may name and nothing serves it.** `channels` accepts `online`
  and `both`; there is no online checkout in this product, so only `pos` ever reaches
  `evaluate` today.
- **`points_multiplier` is stored and spends nothing.** There is no loyalty ledger, so the
  benefit is carried through the model and takes no money off.
- **`free_shipping` does not exist** — Logistics prices a delivery, and nothing joins the two.
- **Item CATEGORY and BRAND are `itemType` and `vendorId`.** Items carry no category axis of
  their own yet; it is a future plan in `docs/progress.md`, and when it lands the two
  conditions read it instead.
- **No usage counters reach the till screen.** A cap already spent shows the offer on screen
  and the server refuses it at the sale; the cashier is asked to confirm the new total. Sending
  the counters with every `posView` would be a read of every redemption row on every open of
  the till.
- **Nothing flips an offer to `ended` by itself.** Validity is computed, so an offer past its
  end prices nothing whatever its status says; the nightly sweep that would tidy the status
  **for reporting** is not built.
- **No supplier names on a brand condition when Procurement is absent** — the editor then has
  no list to offer.
- **Offline**: the till is online only (`pos.md`), so an offer is evaluated server-side and on
  the screen by the same pure function, never from a cached copy.
- **Emitting a promotion's discount as an e-invoice allowance** waits for the country packages
  — see `einvoicing.md`, which carries it beside ZATCA's own not-built list.
