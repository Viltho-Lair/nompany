# Customer 360 — one company, and how much of it each reader may see

**The page:** `/<slug>/crm-sales-clients/<id>`, behind `crmSales.clients.view`.
**No new record and no new permission key.** See "What it stores".

## What it is

One client's page: who they are, who to call, where their sites are, and the commercial
history — deals open and decided, quotations, contracts with their movement, and projects.

Before it existed, a client was a **row in a list**. `linkToClient` did not open anything: it
appended `?client=<id>` and scrolled you to the row you were already looking at. "What is our
relationship with this company worth" was a question you answered by opening four screens and
filtering each one by hand.

## What it stores

**Nothing.** There is no new collection, no new key builder and no new permission. The page
is a read over records that already exist, joined on the `clientId` each of them already
carries:

| Block | Records | Joined by |
|---|---|---|
| Identity, contacts, sites | `salesClients` | the id in the URL |
| Deals | `salesTickets` | `clientId` |
| Quotations | `quotations` | `clientId` |
| Contracts | `contracts` | `clientId` |
| Variations | `changeOrders` | `contractId` — a change order names its contract, never a client |
| Projects | `projects` | `clientId` |

Contacts and sites are read through `clientContacts` / `clientLocations`, which handle the
pre-`contacts` records that carry a flat `contactEmail` / `contactPhone` pair — so no screen
has to know which era a client is from.

## What it does

**Every block is gated by the right that governs its own records, and a block the reader may
not see is never read at all** — it costs no round trip either. This is the engagement view's
rule (§2.8: a record whose existence somebody may not know of stays invisible to them),
applied to a party instead of a deal.

| Block | Right |
|---|---|
| the page itself | `crmSales.clients.view` |
| deals | `crmSales.tickets.view` |
| quotations | `crmSales.quotations.view` |
| contracts and variations | `crmSales.contracts.view` |
| projects | `projects.list.view` |

**`crmSales.clients.view` opens the page; it does not open the contents.** A member with that
right and nothing else sees the company and its people, and is told so in words rather than
being left with a page that looks broken.

**A missing right draws nothing — never an empty state.** "No quotations" and "no sight of
quotations" are different sentences and only one of them is true, so the route sends a `may`
flag per block and the screen omits the section entirely.

**The totals move with the reader, and that is correct rather than a bug.** Won value, open
value, weighted value, contract value and win rate are each computed from the blocks that
reader can see. Two people legitimately read the same customer differently — each is told the
truth about the part of the company they are entitled to. A single figure derived from
records somebody cannot open would leak exactly what the gate exists to hide.

**Won value is the figure the page exists for**: what this company has actually bought,
summed over deals in `Closed Won`. No screen could answer it before. Win rate is over
**decided deals only** — a customer with three live deals and no history gets "—", not "0%",
which would be a verdict on a relationship that has concluded nothing.

**Contracts carry their movement, not just what was signed**: signed value plus approved
variations equals current value, through `approvedValueDelta` — the same function the
contracts register uses server-side, so a submitted variation is not money on either screen.

**A losing deal shows why it was lost**, read straight off `lostReason`. That is the payoff of
making a losing close say why: a reason written once and never read back would be the dead
field it used to be.

**The read is guarded against its own race.** A record page is pointed at a *different* record
whenever somebody clicks another customer, so the effect owns the await and drops any answer
that arrives after teardown. Without it, clicking quickly from company A to company B can
leave A's deals on screen under B's name and URL, with nothing saying which you are reading.
Every other studio screen is pointed at one thing for its whole life and has no such race.

**Read only, and that is the design.** Every record on the page already has a door that writes
it — a deal through `/sales/tickets`, a contract through `/sales/contracts`, a variation
through `/sales/change-orders`, the client's own fields through `/sales/clients`. A write here
would be a second door onto records that already have one, and two doors are two sets of rules
free to disagree. The pipeline board makes the same call for the same reason.

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **No receivables.** What a customer *owes* is the most obvious missing block, and it is
  missing for a real reason: an invoice carries `clientName` as a **snapshot, not a pointer**
  (`modules/finance/schema.ts` says so deliberately, so an invoice still reads correctly after
  the project it came from is edited). Joining on that name would silently miss every invoice
  raised before a customer was renamed, and silently claim someone else's if two customers
  ever shared a name. The honest join is invoice → `projectId` → project → `clientId`, which
  covers project invoices and not direct ones. Neither half is built, and `salesContext` has
  no Finance section to read through.
- **No activity timeline.** Comments, stage moves and document events all exist as data and
  none is shown here — there is no single ordered "what happened with this company, when".
- **Nothing is editable from this page**, including the client's own fields. Editing still
  means going back to the list.
- **No cross-customer view.** There is no "top customers by won value" list, no ranking and no
  comparison; this answers one company at a time.
- **No engagement grouping.** The deals are listed flat rather than grouped by the engagement
  they belong to, so a customer with one deal that produced four records reads as four rows.
  The engagement layer knows the grouping; there is no client → engagement index to read it by.
- **`may` is all-or-nothing per block.** A reader with scoped rights (HR-style department
  scoping) is not modelled here — none of the five areas the page reads is scoped today.
- **No logo.** The client record can carry one and this page does not draw it.
