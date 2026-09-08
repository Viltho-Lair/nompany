# Production planning

What the work orders need, what the studio already holds, and whether the shop can take
the work. The Manufacturing root (`/<slug>/manufacturing`), one collection — `bomLines` —
and one new permission key, `manufacturing.planning.view`.

## What it is

**Manufacturing shipped as four engine registers and nothing joined them.** Work orders,
bills of materials, work stations and production batches each held their own rows and no
two of them met: a BOM's components were ONE LONG TEXT FIELD, so nothing could explode a
demand out of it, and a work order's `station` was a string nothing compared against a
station's own `capacityPerDay`. The section rendered and answered no question a factory
asks — which is what "an engine register is not a feature" means in practice.

**Two joins, and they are the whole of it.** A work order for 40 pumps against a BOM whose
lines name real Registered Items becomes demand in the stock ledger's own units, netted
against what is on hand and what is on order. And a station's day has a size, so the orders
pointed at it either fit or do not.

### The permission split

`manufacturing.planning.view` is the section's **first declared right** — every other right
over it is structural (`engine.workorder.*` and its siblings), minted from a row. Planning
spans registers: it reads work orders, BOMs, the stock ledger and the purchase orders at
once, and somebody who may run a work station has no business reading what the company is
short of. **View alone** — raising the requisition it suggests is Procurement's act and
answers to Procurement's right.

**A BOM line mints nothing.** A line IS the bill of materials' content, so it answers to
`engine.bom.edit` — the argument a BOQ line already makes about a tender, and a second
right over one act would be free to disagree with the first about who works on a BOM.

### The limitation, stated rather than hidden

**The join key is the product NAME.** A work order names its product as text and so does a
BOM, because both are engine records whose fields are studio-defined; there is no id
between them. Matched case-insensitively and trimmed.

**An order whose product matches no BOM is REPORTED** (`noBom`), and so is one with no
quantity (`noQuantity`). A requirement nobody can see is worse than a requirement nobody
has, because the buyer believes the list is complete.

**A second BOM for one product is not blended in.** Two BOMs for one product name is a
revision the studio has not retired; adding both would double every requirement, which is
the one arithmetic error a buyer cannot spot by looking at the answer. The first wins.

### The arithmetic, and what it refuses to say

**A surplus is not a negative shortfall.** "We are 40 short" and "we have 40 spare" are
different facts, and a signed number makes a buyer read one as the other at a glance;
`shortfall` is floored at nought and the surplus is readable from `onHand` against `gross`.

**On-order counts**, which is what stops this ordering the same thing twice: a purchase
order placed yesterday for exactly this shortage would otherwise be invisible, and MRP run
daily would raise a fresh requisition every morning until the goods turned up. Only the
outstanding part of a line counts — a line already received IS the stock, and netting it in
both places would cover every requirement twice.

**An unrated station says null, not zero.** A station nobody has rated is not one with
infinite capacity and not one with none; "we do not know how long this takes" is a third
answer, and dividing by nought to avoid saying it would print Infinity on a shop-floor
screen. `over` is false there for the same reason.

**An order sent to a station that does not exist is reported; an order with NO station is
not.** The second has not been planned yet, which is a different problem from being pointed
somewhere that is not there. Only the second is a mistake somebody made.

**Inventory is optional.** A studio that has not opened it can still plan its shop floor —
it simply has no stock to net against, which makes every requirement a shortfall. True, and
better than pretending to net.

## What building it found

**The type key is `workorder`, not `workOrder`.** `rowsOf` answers an unknown type with an
empty list by design, so the first draft rendered a planning screen reporting a factory
with nothing to buy — no error anywhere. That is the numbering catalogue's near miss in a
second place ("RFQ" written for a product that mints "SRQ"), so `tests/mrp-model.mjs` now
reads the keys out of `planning.ts` and asserts each one is declared in
`platform/engine/builtins`.

## Not built yet

- **No multi-level explosion.** A BOM line names a Registered Item, not another BOM, so a
  sub-assembly does not explode into its own components.
- **Nothing raises the requisition.** The shortfall is a list to read; converting it into a
  purchase requisition is a hand copy, and it is the obvious next slice.
- **No dates.** Demand is a total, not a schedule: nothing asks whether the shortfall is
  needed next week or next quarter, and `dueOn` on a work order is not read here.
- **No lead times.** `deliveryWeeks` is on a Registered Item and this does not consult it,
  so "order by when" has no answer.
- **Capacity is measured in UNITS, not hours.** A station's `capacityPerDay` is compared
  against the sum of order quantities, which is only meaningful when a station makes one
  kind of thing. A routing with per-operation times would fix it and does not exist.
- **No scrap, no yield, no safety stock.**
- **The BOM's old `components` longtext is still there** and still editable in the engine
  register. Nothing reads it, and nothing migrates it into lines.
