# The tender pack, and the clarifications

**Where:** beneath the bill on `/<slug>/tendering-register/<tenderId>`, behind
`tendering.tenders.view`.
**The rules:** `src/modules/tendering/documents.ts`, pure and shared with the screen.
**The service:** `src/modules/tendering/tenderDocs.ts`. **Two routes:**
`/api/studios/<slug>/tendering/documents` (both registers arrive on its GET) and
`.../clarifications` (writes only).

## What it is

A bid is priced against **a specific set of documents at a specific revision, plus the answers
you were given**. Before this, a tender had a bill and nothing saying what the bill was for:
the invitation, the drawings, the addendum that changed a quantity and the answer that changed
a requirement all lived in somebody's inbox.

Two registers, on the same screen because they are one story:

- **Documents** — what the issuer gave us, what they changed afterwards, and what we sent back.
- **Clarifications** — what we asked them, and what came back.

## What it stores

Two collections, both owned by `tendering-register` — they live with the tender they belong to,
so deleting the section takes them with it (invariant 11).

| Collection | Holds |
|---|---|
| `tenderDocuments` | the pack, including every superseded revision |
| `tenderClarifications` | one question and its answer |

**No new permission area. The catalogue stays at 143.** The pack answers to
`tendering.tenders`, the same decision the bill made and for the same reason: the pack *is* the
tender. Whoever may read a tender may read what they are bidding on; whoever may edit one may
file the addendum that changed it. A separate right would be a second answer to *"who works on
this tender"*, free to disagree with the first.

**The file is not in the record.** Uploads go to `/api/media?kind=private` with the studio's
slug — which verifies membership before it writes anything — and the record keeps the URL. The
read path checks membership again before it streams the bytes, so the access decision stays in
code rather than being delegated to a store that cannot express "private". **A document with no
file is legitimate**: a pack listed before it arrives, or a transmittal recorded from an email.

## What it does

**A reissued document does not overwrite the one before it.** Rev A is *marked* as replaced and
stays, because "what did we price against" has to be answerable after the fact. The screen
draws the chain — *Invitation to tender B, replaces Invitation to tender A*.

Three rules make a chain a chain, and all three live in the pure module so the screen refuses
exactly what the server refuses:

- **The replacement must itself be current.** This is the one that matters: allowing an
  already-superseded document to be the replacement is what lets A←B←C←A close into a loop
  nobody can read. Refusing it means no cycle is ever *written*, rather than detected afterwards
  by a walk that has to guess.
- **A document already replaced is not replaced twice**, and nothing replaces itself.
- **A document in a chain cannot be deleted, at either end.** Deleting the superseded one
  destroys the history; deleting its replacement leaves the older one reading as replaced by
  nothing. A document nothing links to is an upload somebody got wrong, and that one goes.

**A document must belong to a tender that exists** — the same guard the bill takes, or a
crafted request files paperwork where no screen shows it and no cascade reaps it.

**Answering stamps the time on the server, and clearing the answer clears the stamp.** The
timestamp is what staleness is measured against, so a client free to choose it could clear a
warning by backdating the answer that caused it. An answer withdrawn leaves the question
outstanding, which is the truth — keeping the stamp would report it as settled while showing
no answer.

**`affectsPrice` is the estimator's judgement, and the screen says so.** Whether an answer moves
the bid is a reading of the answer; nothing here can compute it, and pretending otherwise would
be worse than asking.

**A bid submitted with questions outstanding priced assumptions**, and the screen says so after
the fact. Read from `submittedAt` — the stamp the stage transition writes — never from the
status, because a lost or withdrawn tender was still submitted and testing the status would
mean this screen keeping its own copy of which stages count. **Not a refusal:** issuers
routinely never answer, and refusing to record a submission over it would make the register lie
about what the studio actually did.

### The warning this exists for

**`changesSincePricing` answers the one question the bill cannot ask itself: did anything arrive
after the last line was priced?** A BOQ line has no idea a document was reissued, so nothing in
the bill can notice an addendum landing on Tuesday against a bill priced on Monday. The pack is
the only thing that can say so, and it names *which* documents, because "something changed" is
not actionable.

Three decisions in it, each of which would be a bug the other way:

- **Measured from `createdAt`, not from the issuer's date.** The question is not when the
  addendum was dated; it is whether the estimator had it in front of them. A document dated the
  1st and uploaded on the 10th was not available to a bill priced on the 5th, and measuring from
  the issuer's date would report that bill as current when it never saw the change.
- **Priced lines only set the clock.** A line typed in with no rate is scope being captured, not
  a price being decided. Letting it move `pricedAt` forward would clear the warning by doing the
  one kind of work that does not answer it.
- **A bill with nothing priced is not behind anything.** It has not begun, which is what
  `boqTotals().complete` already says. A second warning there would be one warning too many.

Our own submissions are never behind — what we sent out cannot change what we are pricing — and
a superseded document is not counted beside its replacement, or one change would be reported
twice.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **Nothing is notified.** An addendum filed today tells the estimator nothing; the warning is
  seen by whoever next opens the tender. No notification, no email, no entry in the audit feed
  beyond the route's own.
- **No transmittal, and no outward record.** Documents the studio *sends* are recorded by kind
  and nothing more: no covering letter, no list of what went with what, no acknowledgement.
- **No versioned file.** A revision is a new record with its own upload; there is no
  file-level diff, no page count and no preview — the screen offers a link and the browser
  decides what to do with it.
- **The blob is never reclaimed.** Deleting a document leaves its file in Blob storage
  deliberately — media is platform-scoped and the same upload can be referenced more than once —
  and nothing sweeps the orphans yet. This is the same outstanding `--reclaim` the media port
  left behind.
- **`documentId` on a clarification is stored and never set.** The field exists to point at the
  addendum that carried an answer, and no screen offers it.
- **No numbering that survives deletion.** `seq` is a display number recomputed from the count,
  so deleting question 2 renumbers the ones after it. That is deliberate — nothing stores a
  reference to it — but it means a clarification number cannot be quoted to an issuer.
- **No due date on a question, and no chasing.** A question asked three weeks ago and one asked
  yesterday read identically apart from the date.
- **No link to the bill.** An answer marked as changing the price does not point at the lines it
  changes, and marking it does nothing beyond drawing a badge.
- **No approval.** Anybody who may edit the tender may file a document or answer a question;
  there is no review of what goes out, which is the bid-review slice and is not built.
