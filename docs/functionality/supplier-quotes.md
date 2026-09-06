# Supplier RFQs and quote comparison — what the market says it costs

**Where:** `/<slug>/procurement-rfq`, behind `procurement.rfq`.
**The records:** `RfqSchema` and `SupplierQuoteSchema` (`src/modules/procurement/rfqSchema.ts`).
**The comparison:** `src/modules/procurement/rfqModel.ts` — pure, no imports.
**The service:** `rfq.ts`. **The route:** `/api/studios/<slug>/procurement/rfq`.

## What it is

A **supplier RFQ** asks several suppliers to price the same list of lines. Their answers are
**quotes**, recorded one row each. The screen compares them and one is **awarded**.

## The gap it closes

`requisitions.md` names it: a requisition's `vendorId` records who the requester *expects* to
buy from and binds nobody. **Nothing in this product ever asked a supplier for a price.** So
purchasing was one person's estimate followed by one person's order, with no step where a
second supplier could be cheaper — and no record, six months later, of who else was asked.

## It is not the other RFQ

`engineeringDocs.rfq` is a request coming **in** from Sales to Technical. This goes **out** to
people the studio buys from. They share three letters and nothing else, which is why the
reference prefix here is **SRQ** — two records both reading `RFQ-0001` in one product is a
confusion nobody would forgive.

## Who may do what

**Its own area, `procurement.rfq`**, with `award` as an extra verb. Assembling a request and
typing in what came back is one job; naming the supplier the money goes to is another. It is
not folded into `procurement.requisitions` by the test `tendering.rates` passed: a requisition
is what somebody needs, an RFQ is what the market says it costs, and "may ask for something"
and "may choose who we buy it from" are different jobs in any studio large enough to separate
them. Catalogue 159 → 164.

**No starter grant, and that is the intended resting state.** `STARTER_ROLES` seeds Admin
alone, and Admin is a wildcard, so `procurement.rfq` is reachable and grantable the moment it
ships. The failure this product has hit three times — a section unreachable by its own
department's Manager — cannot occur where no Manager is seeded.

**It is on the `buyer` archetype**, `edit` plus the `award` extra, beside
`procurement.suppliers` and `procurement.requisitions`. `principal` derives from `AREAS` and
takes it for free; **every other archetype is an explicit list**, so without that line a
Procurement Manager built from the role library would get suppliers and requisitions and no
RFQs at all.

**Why `award` is there when `procurement.requisitions.approve` deliberately is not.** They look
like the same kind of power and are not: approving a requisition authorises somebody else's
spend, which is exactly why it sits away from the person doing the buying; awarding chooses
between quotes for a spend already authorised, which *is* the buying. A buyer who may ask three
suppliers for a price and may not pick one has been given half a job.

**This paragraph said the opposite for about an hour.** It recorded a grant seeded to the
Manager starter role — correct against the tree it was written on, where `STARTER_ROLES` still
seeded four roles and `archetypes.ts` existed only on a branch. That branch merged first, the
role it named stopped existing, and the rebase deleted the grant along with it. Recorded rather
than quietly replaced, because "correct when written, invalidated by a merge" is a different
thing from "wrong", and the difference is worth being able to see.

## What it does

**Two collections, not quotes nested on the request.** The migration design already names
nested line arrays "the arrays that grow without bound", and a quote is worse than a line: it
is another party's document, it arrives on its own schedule, and it is written by whoever opens
the envelope. A quote that is its own row can be recorded and corrected without touching the
row every other supplier is quoting against.

**Line ids are minted, never positional.** Every quote references a line by id, so an index
would mean inserting a line in the middle silently re-points every price already recorded
against the ones after it. An id sent by a caller is honoured **only if it is already ours** —
otherwise a crafted body could point a new line at an id some quote has priced and inherit that
price by collision.

**The line list freezes when the request goes out.** A supplier quoting three lines must not
find a fourth appearing afterwards; their quote would silently become an answer to a question
nobody asked them. **Who it went to stays editable** — a studio that thinks of a fourth
supplier on Tuesday should add them, and that changes nothing anybody has already quoted.

**A quote is accepted only against a request that has been sent.** A draft has been sent to
nobody, so a quote against it came from nowhere; an awarded one has been decided, and a price
arriving afterwards cannot change a decision without erasing what it was made on.

**One quote per supplier per request.** A second submission **replaces** the first rather than
sitting beside it, because a comparison listing one vendor twice is a comparison nobody can
read.

### The comparison, which is the point of the screen

**A blank is a silence and nought is a price.** `unitPrice` is a union of number and `""` for
exactly this: a supplier who did not price a line has not offered it free. `compareQuotes`
ranks on that distinction, and the screen shows a dash rather than `0.00`.

**Only complete, unexpired quotes are ranked.** A supplier who priced one line of five has the
smallest total on the page and has not offered what was asked for; a supplier whose price
lapsed last week is not holding it. Ranking either first recommends the wrong company for a
reason nobody would endorse if it were stated aloud — and it would be stated nowhere, because
a total is a number and looks like every other number.

**They are shown anyway, marked.** A quote that cannot be ranked is still information about a
supplier, so it appears with its partial total, `n of m lines priced`, and the sentence saying
why that total is not a bid.

**Cheapest and fastest are computed separately and are frequently different suppliers.** That
is the point rather than a limitation — a screen offering one number would hide the trade.
**A supplier who stated no lead time is not the fastest**: ranking a silence first would
recommend whoever answered least.

**Per line, the cheapest is taken across every quote that priced it, including incomplete
ones.** A supplier who priced one line keenly is worth seeing even though their quote cannot be
ranked as a whole — that is what a split award is made of.

**Expiry is judged against a clock passed in, never read here.** The screen and the server must
agree about which quotes are live, and two clocks are two answers. A quote with no validity
never expires, which is the honest reading of a supplier who did not say.

### The award

**Its own verb and its own right.** It names a quote, so a status edit reaching `Awarded` would
record a decision with nothing decided; `rfqProblem` refuses that move by name.

**A part-priced quote cannot be awarded**, and neither can a lapsed one — the same rule a
part-priced bill of quantities refuses a signature on.

**The reason is required only where the choice needs one.** Awarding the cheapest comparable
quote explains itself. Awarding anything else is the decision somebody will ask about, so it
must say why at the moment it is made rather than being reconstructed later. That reason is the
whole audit value of this record.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **The award creates no purchase order.** It records who won and why; somebody still raises the
  PO separately. Wiring it into `createOrder` — which already takes a `requisitionId` — is the
  obvious next step and is not done.
- **No split award.** `cheapestByLine` is computed and shown, and awarding is whole-quote only,
  so a studio that wants two suppliers for one request cannot record that.
- **Nothing is sent to anybody.** "Mark as sent" is a status a person sets; no email leaves the
  product, and `vendorIds` is a list of ids typed by hand rather than picked from Suppliers.
- **`vendorIds` is not validated** against the supplier register, so a deleted vendor leaves an
  id that resolves to nothing. The comparison shows the id rather than a name for the same
  reason.
- **No currency.** Quotes are assumed to be in the studio's own, like requisition estimates.
- **No link back to the requisition's estimate.** The RFQ can be raised *from* a requisition and
  copies its lines, but nothing compares what was estimated against what came back — which is
  the question that would tell a studio whether its requesters estimate well.
- **No starter grant**, as above.
