# Billing milestones and retention — the revenue side of a project

**Where:** `/<slug>/projects-list/<id>/billing`, behind `projects.billing`.
**The records:** `ProjectMilestoneSchema` (`src/modules/projects/schema.ts`), and
`retentionPercent` / `retentionReleaseDate` on the project itself.
**The arithmetic:** `src/modules/projects/billing.ts` — pure, no imports.
**The service:** `src/modules/projects/milestones.ts`. **The route:**
`/api/studios/<slug>/projects/billing`.

## What it is

A **payment schedule**: what a project may bill, and when each part of it is earned.
Beside it, **retention** — the percentage a client withholds from every claim, and the date
the last of it falls due.

## The gap it closes

Four slices built the **cost** side of a project in full: an allowance per code, what has
been ordered, what has been invoiced, and earned value over the top of all three. The
**revenue** side stayed a single number — `value`, set at handover or when the project
opened — with nothing saying when any of it might be claimed.

So a project could report that it was twelve per cent over on Plant and could not say what
had been billed, which is the half that decides whether there is any money to be over
*with*. And **retention existed nowhere at all**: a studio reading its invoiced total as its
expected cash was wrong by exactly the amount its clients were holding.

## Who may do what

**Its own area — `projects.billing`**, view/create/edit/delete. Catalogue 149 → 153.

The axis is deliberately **not** the cost breakdown's. `projects.costs` was split out because
"may run this job" and "may see what it is allowed to cost" are different powers. Billing
splits the same project the other way: a commercial manager raising applications for payment
needs none of the supplier costs, and a project manager watching spend needs none of the
client's payment schedule. Folding the two together would hand each of them the other's
screen. Gate A pins it from the side that matters — somebody holding `projects.costs.view`
on a project they can open is refused the schedule by name.

**No starter role holds it**, which matches `projects.costs`: neither money view is seeded,
so on a new studio both are the owner's until somebody grants them. That is a deliberate
match rather than an oversight, but see "Not built yet".

## What it does

**The amount is absolute, never a percentage of the project's value.** A stored percentage
would silently re-price every milestone the moment `value` moved and give one number two
sources. `unscheduled` — value less the sum of the lines — is surfaced instead, the exact
counterpart of `unallocated` on the cost side. The dialog offers "% of value" as an **entry
convenience** that resolves to an amount before it is stored and is then forgotten.

**There is no `Invoiced` status.** A milestone is `Pending` or `Ready` and nothing else.
Whether it has been billed is **derived** from the invoices naming it, because a stored flag
and a real invoice are two answers that part company the first time one is cancelled.
`Ready` is the studio saying the work behind the line is done; the route refuses any other
value by name.

**Born Pending, always.** The create path takes no status and the screen sends none —
marking work done is its own act, and a status accepted from a create body would be the side
entrance around it.

**A draft invoice is not a claim.** `Draft` has been shown to nobody and `Cancelled` was
withdrawn, so neither moves a number — the same two-member rule, with the same two members,
that the cost side applies to a bill. `Sent` and `Paid` are claims; only `Paid` is cash,
which is why `invoiced`, `paid` and `outstanding` are three figures and not one.

**A pending milestone is not claimable however overdue it is.** Overdue and claimable are
shown apart because they are acted on differently: one is an invoice to raise, the other a
date to explain.

**Money nobody filed is still the project's money.** An invoice naming no milestone — or
naming one somebody has since deleted — is counted in full as `unattributed` and shown in
its own right. Deleting a milestone **cascades nothing**: the invoices keep their
`milestoneId` and their money rejoins the total where it stays visible. A figure that fell
when somebody tidied a list would be a report that punishes housekeeping. The cost side
takes exactly this line about a cost code.

**The invoice link is not validated at the write, deliberately.** `milestoneId` is stored by
Finance without reading Projects, because `projectBilling` attributes only ids that are in
*this* project's own milestone set. An id naming another project's line lands in
`unattributed` and is counted rather than believed. The containment lives in the reader,
where it also covers deletion — which no write-time check could.

**Filing a claim against a line is allowed on an issued invoice**, where editing its lines or
its project is not. The client is owed the same money either way; what changes is which
milestone the studio reckons it against. Refusing it would mean an invoice raised before the
schedule existed could never be filed at all.

### Retention

**Taken on what has been billed, not on what has been scheduled.** A percentage of the
schedule would report money as withheld before anybody had been asked for it — the same
error as counting an unplaced order as committed.

**It lives on the project, not on each line**, because retention is a term of the contract
rather than of a claim: one percentage governs the job, and a copy per milestone would be
free to disagree with itself. It answers to `projects.billing.edit` rather than
`projects.list.edit` — somebody who may rename a project has not thereby been told what its
client withholds.

**`releasable` is null, not zero, when nobody has set a release date.** "Nothing is due yet"
and "we do not know when anything is due" are different answers, and a 0 shown for both would
state the first while meaning the second. A date in the *future* is a real 0 — that is
knowable, and it is exactly what distinguishes it from the null.

**Releasing it is Finance's act.** Retention becomes money when somebody raises an invoice
for it, and Finance already owns that door. Growing a second invoicing path out of a project
screen would be two ways to bill one client, so this screen reports the position and names
who has to act on it.

**Refused rather than clamped at the door.** `retentionOn` clamps too, because a stored row
is not to be trusted — but a person typing 150 has made a mistake worth telling them about
rather than silently correcting to 100.

## Progress claims (tier 6, 11/09/2026)

**The other way a project is billed**, on the same Billing tab: an interim payment application
measured line by line against the tender's bill (or the quotation's lines when the project
opened from one), certified by the client, then invoiced. `progressClaims` in
`projects-list`; pure model `modules/projects/progressClaims.ts`, service `claims.ts`, route
`/projects/claims`, all behind `projects.billing`.

- **Cumulative, like a subcontract certificate.** Each claim states the quantity of every line
  done TO DATE; this period is the difference from the last CERTIFIED claim, never a sum of
  periods. A quantity cannot go below what was already certified — a downward correction is a
  credit note. Measuring past the bill quantity is flagged, not refused: remeasurement is real.
- **The lines are copied when the claim opens** (code, description, unit, bill quantity,
  rate), so a later change to the source cannot move what was applied for. A new claim starts
  every line at what is already certified.
- **Draft → Submitted → Certified.** Only a draft's quantities change; a submitted claim can go
  back to draft when the client returns it; recording the certificate takes what the client
  accepted per line (a line left alone is certified as applied for). **A certificate is
  final.** One claim open at a time — the next cannot know its previous figures until this one
  is certified. Numbers run IPC-01, IPC-02… per project and are never reused; only a draft can
  be deleted.
- **Retention** is shown on each period from the project's percentage.
- **The invoice is raised through Finance** (`POST /finance/invoices` with `claimId`, which
  needs `finance.cash.create`) for the gross certified this period — retention is reckoned on
  what is invoiced, as everywhere on this page. Whether a claim is invoiced is **derived** from
  the invoices naming it, never stored; `projectBilling` counts them as `claims`, not as
  `unattributed`.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **Nothing raises a milestone's invoice.** Progress claims do (above); a schedule line is
  still invoiced by hand in Finance.
- **Claims carry no advance recovery, materials on site, variations or dayworks**, and there is
  no printable application or certificate document.
- **No starter role holds `projects.billing`**, so on every existing studio the schedule is
  the owner's until somebody grants it — and `STARTER_ROLES` seeds only when a studio has
  zero roles, so a right added to Manager never reaches an existing studio anyway. There is
  no backfill script for this or for `projects.costs`; `grant-administration.mjs` is the
  pattern if one is wanted.
- **Nothing is notified.** A milestone falling due, or going overdue, tells nobody.
- **No schedule is ever proposed.** The cost breakdown can be seeded from a tender's bill
  (`codesFromBill`); there is no equivalent that proposes a payment schedule from the
  contract or the bill, so every schedule is typed by hand.
- **Retention is one percentage with one date.** Real contracts commonly hold two halves
  released at different events (practical completion, then the defects-liability end), and
  frequently cap retention at a percentage of the contract sum. Neither is expressible.
- **Variations do not move the schedule.** An approved variation moves the *contract's*
  value and touches neither the project's `value` nor its milestones, so a job whose scope
  grew keeps the schedule it opened with. `variations.md` is the other end of this, and
  `cost-codes.md` records the identical gap on the cost side.
- **A milestone has no certificate.** Progress claims record application and certification
  (above); a schedule line is still only its invoice.
- **The project's value is still a single number.** It is copied at handover and does not
  follow the contract afterwards, which is why `unscheduled` can be wrong in a way nobody is
  told about.
