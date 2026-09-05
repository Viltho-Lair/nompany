# The handover — a won tender becomes a project

**Where:** the Handover block on `/<slug>/tendering-register/<tenderId>`.
**The head:** `tenderSource` in `src/modules/projects/projects.ts`.
**What the tender screen reads:** `src/modules/tendering/handover.ts`.
**The route:** `POST /api/studios/<slug>/projects` with a `tenderId`.

## What it is

Tendering's fifth and last subsection. Until this, `tendering.md` said it plainly: *a won
tender does not become a deal, a project or a budget baseline; today somebody re-enters it in
CRM & Sales by hand, and nothing links the two records.*

A won tender now opens a project — at the figure the work was **costed** at, with the issuer
resolved into a client, and with the tender's reference on the project so the two records point
at each other.

## Why it is a head of `openProject`

**There are three ways a project begins now**, and they share everything below the split:

| Head | Decided by | Commercial gate |
|---|---|---|
| From a quotation | `quotationId` in the body | the `po` approval task is decided |
| **From a tender** | **`tenderId` in the body** | **the tender is Won** |
| Directly | neither | none |

`openProject`'s own comment is the reason this is a head rather than a function in Tendering:
everything below the split — the row, the two sheets, the engagement attach, the manager
notification — cannot tell which head ran, and *"a second create path is a second place the
engagement dual-write could be forgotten, which is exactly how a record ends up on no deal at
all."* A handover written in `modules/tendering` would have been that second path.

**A body carrying both ids opens from the quotation**, by the order they are read — the
stricter of the two gates wins.

## What it does

**The project opens at the bill's total, not the typed estimate.** This is what the handover is
*for*. `valueFromBoq` returns null only when there is no bill at all, and only then does
`estimatedValue` stand — the same precedence `modules/tendering/bid` uses to route the approval,
so **the number a project opens at is the number that was signed**. A source-level assertion in
`tests/bid-review.mjs` guards it, because the wrong version still passes every runtime test on a
tender whose two numbers happen to agree.

**Only a won tender is handed over**, and that is the whole commercial gate — the counterpart of
the quotation head's `quotationApproved`. A lost or withdrawn tender has nothing to deliver, and
one still being priced has not been awarded to anybody. Asked of the **status** rather than of a
task, because unlike a quotation a tender's outcome *is* written onto it, by a stage transition
that already refuses to record a win on a bid that never went in.

**The issuer becomes a client.** A tender's issuer is free text and its `clientId` optional —
bidding is frequently *how* a company becomes a client — so both are handed to
`resolveClientFor`, which finds by id, else by normalised name, else creates the record. Exactly
what the direct head does.

**One project per tender, derived rather than stored.** Nothing is written back onto the tender:
the project's `tenderId` is the single record of the link. A flag on the tender would be a second
answer free to disagree with the projects it describes — and deriving it means deleting the
project genuinely frees the tender rather than stranding it. The quotation head derives its own
the same way.

**The project roots its own engagement**, like the direct head and unlike the quotation head: a
tender has no engagement to join, because a tender is not in the stage registry. So `engId` is
blank and `openProject` takes the mint branch.

**`tenderRef` is copied and the rest of the tender is not** — the one exception this lineage
makes to reading live. The ref is the number a client and a bid bond quote, it never changes once
issued (invariant 10), and it has to read correctly on the project even in a studio where the
reader cannot open the Tendering section. The project's lineage row shows it, linked only where
the reader has the register in their nav.

**The project number stays blank**, on this head exactly as on the other two. Issuing it is
Finance's act, taken when the client's PO is authorised; nothing about being handed over issues
one early.

**Handing over answers to `projects.list.create`**, not to any Tendering right — the act creates
a project, and the handover is Projects' to accept. Somebody who runs the register and cannot
open projects is shown the state and offered no button.

### On screen

The Handover block sits under the bid review, because the sequence is the studio's: price it,
sign it, send it, win it, deliver it — and all four of those blocks are on that page in that
order. Before the handover it says what the project will open at; after it, it names the project
and links to it, and says the number is not issued yet when Finance has not issued one. The
refusals travel as tokens and are translated on display.

## The sheets fill from the bill

**A sheet stores no lines: it composes a document's tables with what Inventory added to them,
keyed by row id.** That document could only ever be a quotation, so a handed-over project used
to have its pair of sheets and nothing in them. The bill is offered in the same `{ tables }`
shape now — `boqAsTables`, pure, in `modules/tendering/boq` — so `composeSheet` reads ONE
shape and there is no second composition path to disagree with the first.

**The bill's groups become the tables, in the document's order.** That order is the thing a
bill is never allowed to lose: an estimator checks it against the client's document line by
line, and so now does whoever is buying the work.

**Nothing is copied.** The rows come off the bill on every read, so a line corrected in
Tendering shows through on the sheet immediately — the same property the quotation path has,
and the reason a sheet holds no lines of its own.

**No rate crosses.** `composeSheet` carries only the fields it names and `boqAsTables` returns
only the fields it names, so what the studio priced the bid at stays in Tendering. A sheet is
read by whoever is buying and delivering the work, and the bid price is not theirs — the same
rule that drops a quotation's prices at the point of reading. Asserted from both ends.

**`itemId` is blank, and that is the truth rather than a gap.** A quotation row names a
Registered Item, which is what makes serial allocation and vendor grouping work; a bill line is
a description, a unit and a quantity priced against nothing anybody has bought yet. So **Main
reads exactly as it should and Bulk degrades honestly** — every line stands alone under "No
vendor yet", which `composeSheet` already does for any row with no item.

**The bills are read once for the whole screen, and only when something needs one.** A studio
whose projects all came from quotations never touches the tender register: hop counts are part
of this repo's contract, and a read nobody needs is a round trip nobody asked for.

**There are three kinds of empty sheet now**, and the viewer says which: a quotation with no
priced lines (waiting on somebody to price it), a bill with no lines (waiting on somebody to
write one, in Tendering), and a project raised directly with no document at all, which can
never fill from that screen.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **The bill is not frozen.** Editing a BOQ line after the handover changes the tender's total
  and does *not* change the project's `value`, which was copied at handover — the SHEET follows
  the bill live, so the sheet and the project's headline figure can disagree. Freezing the bill
  once a project exists is the obvious fix and would cost a Projects read on every BOQ write.
- **No handover to Sales.** A won tender does not become a ticket, an RFQ or a quotation, so a
  studio whose delivery runs through the Sales chain still re-enters it.
- **Nothing is notified.** The project's manager is notified by `openProject` as on any other
  head; nobody in Tendering is told the handover happened.
- **No manager, dates or location at handover.** The dialog is a single button — the project
  opens with the tender's title, client and value and nothing else, and the rest is filled in on
  the project. The other two heads ask for a manager and dates on the spot.
- **A tender is still not an engagement.** The project mints its own root, so the engagements
  view shows the project rather than the bid that won it, and nothing cascades from the tender.
- **No reverse view.** Projects has no "opened from tenders" filter; the link is one project at
  a time, from either end.
- **A bill line cannot be pointed at a Registered Item.** That is what would make Bulk group by
  vendor and serials allocatable on a handed-over project's sheet, and it is a change to the BOQ
  grid rather than to the handover — the bill would have to offer an item picker the way a
  quotation line does.
- **The bill has no cost behind it**, so a sheet composed from one still cannot show what the
  work will cost to buy against what it was sold for. `boq.md` records the same gap from the
  other end.
