# Sales orders — what the customer actually asked for

**Where:** `/<slug>/crm-sales-orders`, behind `crmSales.orders`.

## What it is

A sales order is the customer's own commitment: these lines, this quantity, this
price, on this date. It sits between the offer and the work.

**The product ran without one, and the gap was not where it looked.** An order raised
from an accepted quotation genuinely was covered — the quotation holds the lines, the
contract holds the value, the project holds the delivery. **A call-off against a
framework contract is not.** There is no new quotation, the contract's value does not
move, and the only place to put one was a new project — which is a job, not an order.
A studio doing repeat business under one agreement had nowhere to record what was
asked for this time.

That is the case the record exists for. The quotation case is served too, and is the
easier of the two.

## What it stores

One collection, `salesOrders`, **under the `crm-sales-quotations` section** — where
the contracts live, and for the same reason: an order is read beside the offer it came
from, and giving it a collection section of its own would mean a section to plant on
every existing studio before a single order could be written. `crm-sales-orders` is a
DESTINATION: a place to go and a right that says who may, owning no rows.

**A line is the quotation's line** — `description`, `qty`, `unitPrice` — deliberately
the same three fields, so an order raised from a quotation copies them across with no
conversion that could lose or invent one. `computeTotals` is what both records total
with, so the two cannot disagree about arithmetic.

**Where it came from is two optional fields and never one derived from the other.**
`quotationId` for an accepted offer, `contractId` for a call-off. A call-off under a
contract that was itself won from a quotation must not claim that quotation as its
origin — it would attribute one order's lines to an offer about something else.

**The totals are stored, not derived on read**, the same choice a quotation makes.
What a customer was told the order came to is a fact about the day they were told it;
recomputing on every read would silently re-price a confirmed order the day a VAT rate
changed.

## What it does

**Four statuses and a table of moves**, in `modules/sales/orderStatus`, which is pure
and imported by both the screen and the service — so a button that appears is a button
the route accepts.

    Draft ──▶ Confirmed ──▶ Fulfilled
      │            │
      └──▶ Cancelled ◀┘

- **Confirmed does not go back to Draft.** Confirming is telling a customer their order
  is accepted; un-telling them is a cancellation, not an edit, and a record that can
  quietly return to Draft is one nobody can audit.
- **An order with no lines cannot be confirmed.** A confirmed order is a promise to
  supply something; nought lines is a promise to supply nothing, and the total agrees —
  it would read as a real order worth 0.00 rather than as an empty one. It may still be
  cancelled, which is the common case: somebody opened one and thought better of it.
- **A draft cannot skip to Fulfilled.** Delivering something nobody accepted is not
  fulfilment.
- **The lines close on confirmation.** What was agreed is what was agreed; changing it
  afterwards is an amendment or a new order, not an edit, and the total a customer was
  told would move under them silently.

**A move is its own act.** `updateOrder` refuses to write `status` at all, so the
transition table is the only door. Routing an answer through a generic edit is the
shape that let `{ action: "reject" }` approve the variation it was rejecting.

**Delete exists here and not on contracts**, and the difference is the point. A
contract is a value baseline that invoices and variations claim against, so it is never
removed. A draft order is a mistake somebody may take back before a customer has been
told anything. Once confirmed, deletion is refused by name and the honest exit is
Cancelled — which keeps the reference spent (invariant 10) and the trail readable.

**It attaches to the deal** as the `sales_order` stage — a `commitment`, many per deal,
because a framework contract is one agreement and many call-offs. It is **not** the
registry's `order`, which is the PURCHASE order: the two are opposite ends of the same
word.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **It does not open a project.** `openProject` has three heads (quotation, direct,
  tender) and this is deliberately not a fourth — a create path is a place the
  engagement attach can be forgotten, and adding one to close a convenience is how a
  record ends up on no deal at all. A project is opened the ways it always was.
- **It does not invoice.** Nothing reads a sales order when raising an invoice, and
  `InvoiceSchema` has no `orderId`. Billing a confirmed order is manual.
- **There is no partial fulfilment.** `Fulfilled` is all-or-nothing: no delivered
  quantity per line, no back-order, no link to a delivery or a shipment.
- **Nothing copies a quotation's lines in.** `quotationId` is a field somebody types;
  the screen has no "raise from quotation" action, so the lines are entered by hand.
- **Nothing is copied from the quotation.** The deal, customer, quotation and contract are
  picked from lists (since 11/09/2026 — before that all four were internal ids typed into
  text boxes, and the required deal id was shown on no screen): choosing a deal fills its
  customer, and the quotation and contract lists narrow to that deal and customer. They are
  set when the order is raised and shown read-only after. But picking a quotation does not
  bring its lines across; they are typed again.
- **No approval chain.** Confirming needs `crmSales.orders.edit` and nothing more — no
  value threshold, no second signature, unlike a bill, a bid or a requisition.
- **Cancelling asks for no reason**, unlike a lost deal, which must say why.
