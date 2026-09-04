# Pricing — what a line is quoted at, and where that number came from

**The rules:** `src/shared/pricing.ts`, pure and imported by both the server and the screens.
**The fields:** an item's `sellPrice` (Registered Items) and a client's `rates` (Customers).

## What it is

A quotation line's price comes from **three places, most specific first**:

| Basis | Source | Meaning |
|---|---|---|
| `customer` | the client's `rates` | what this customer was promised |
| `sell` | the item's `sellPrice` | the studio's own list price |
| `cost` | landed unit cost | **nobody has priced this item** |
| `none` | — | nobody has costed it either |

Before this, there were no three places. `catalogueItems` copied **landed cost** onto every
line, and said so in a comment: *"unitCost is the only price Registered Items holds — if the
studio needs to quote above cost, that margin belongs on the item."* It did not belong on the
item because it **was not on the item**. A studio that did not hand-edit every line quoted its
work at what it had paid for it.

**The basis travels with the number**, because on a line they look identical. A price of 100
that came from a considered list price and a price of 100 that is the cost fallback are the
same digits; only the basis distinguishes them, and only one of them is a decision.

**Zero is never a price.** An item nobody has costed or priced reports `none`, not a price of
nothing — the difference between "this is free" and "nobody has said". A `sellPrice` of zero
falls through to cost rather than swallowing it.

## What it stores

**No new collection.** Two fields on records that already exist:

- **`sellPrice`** on the registered item, in the studio's own money. Cost may be in any
  currency and is converted (`landedUnitCost`); a sell price in a second currency would be one
  more thing to keep true.
- **`rates`** on the client — `{ itemId, unitPrice, note }` — beside `contacts` and
  `locations`, for the same reason those live there: a rate is a fact about this relationship,
  it is read whenever the client is, and it dies with them. Capped at `MAX_RATES` (500),
  because a row is a document.

`ItemSchema` also gained **`unitCost`, `notes` and `image`**, which it stored all along and
never declared — so `Item` did not have them and every reader wrote its own inline shape to
reach them. The same class of bug as `closedAt`/`lostReason`, seen from the other end: written
but undeclared, rather than declared but unwritten.

## What it does

**A rate is written through the client's own door**, `PUT /sales/clients`, because a rate is a
field on the client. There is no pricing endpoint. `cleanRates` is the one place that decides
what a stored rate may be:

- a rate naming an item that does not exist is **dropped** — it prices nothing and would sit
  in the record looking like a promise the studio had made;
- **a rate of zero is a deletion**, which is how the editor removes one without a second verb;
- one row per item, **last one wins**, so an editor that appends a correction need not find
  and remove the old row first.

The catalogue is read **only** on a request that actually carries rates — renaming a client or
adding a contact pays nothing for the check. A studio with no Inventory section has no
catalogue to check against and is refused with `no-catalogue`, rather than storing rates that
could never match anything.

**The rate table never leaves the server.** `catalogueItems` resolves the price and returns the
number plus a basis token. Technical builds the quotation and is reached on Technical's grant,
not Sales' — seeing what *this* line costs is inherent to quoting it; the rest of the
relationship's pricing is not.

**A customer's prices are asked for only when there is a customer.** The Technical screen lists
the catalogue once with nobody in mind, at list prices. Opening a builder on a real quotation
asks again with that quotation's client, and the priced catalogue **carries whose prices they
are**: the screen uses it only when that matches the customer on screen. Clearing it on change
would leave a window in which the previous customer's rates were on offer for the new one, and
silently quoting one client at another's agreed prices is the worst thing this feature could
do — so it is made structurally impossible rather than timed away.

**Where the money is shown:**
- The item form shows the **margin the typed price implies**, as it is typed, and marks a price
  below cost. Two numbers in two boxes do not compare themselves.
- The items grid shows sell price and margin beside cost.
- The quotation builder marks a line **"Customer's agreed rate"** or **"At cost — not priced"**
  under the price, beside the existing currency-conversion note. The ordinary sell price says
  nothing, because it is the ordinary case.
- The customer page lists agreed rates with the list price each one overrides, so somebody can
  see what was given away without opening Inventory and comparing by hand.

**Margin is `(price − cost) / price`** — margin on price, not markup on cost. Bought at 100 and
sold at 150 is 33.3% margin and 50% markup; both readings are common and they are different
numbers, so one is chosen, written down and asserted. Null rather than zero when there is no
cost: an unknown margin is not a margin of 100%.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **No price list per customer, only per item.** A studio wanting "Acme gets 10% off
  everything" has to enter a rate per item. A percentage or a whole-catalogue list is a
  different shape and is why `rates` is capped rather than unbounded.
- **No price breaks by quantity**, no validity dates on a rate, and no currency on a rate — it
  is in the studio's money like the sell price.
- **No approval on a rate.** Anyone with `crmSales.clients.edit` can promise any price; there
  is no floor, no margin threshold and no second signature, even for a rate below cost.
- **Nothing warns when a quotation goes out below cost.** The builder marks the *basis*, not
  the margin, and the margin per line is not shown or totalled there.
- **A rate is not history.** Changing one overwrites it: there is no record of what this
  customer used to pay or when it changed. Existing quotations are unaffected — a line stores
  what was quoted — but the rate itself has no trail.
- **Cost is still the fallback.** An item with no sell price quotes at cost rather than
  refusing, which is deliberate (a builder needs a number to start from) but means a studio can
  still send out a document priced at cost if it ignores the marker.
- **No bulk pricing tools**: no import, no percentage uplift across the catalogue, no copying
  one customer's rates to another.
- **`sellPrice` is not used outside quoting.** Stock value still uses cost, and no report
  compares list price to what was actually quoted or invoiced.
