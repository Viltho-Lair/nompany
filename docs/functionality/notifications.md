# Notifications — what they say, and in whose language

The bell in the studio header, and a tab on Master data
(`/<slug>/administration-master`) that changes the wording. Overrides are stored
on the studio record beside `currency`, `units` and `taxonomies`. **No new
permission key** — the wording rides on `administration.settings.*` the way
numbering and units do; reading the bell needs nothing but membership, because a
notification is addressed to one collaborator and scoped to their own row.

## What it is

**Every notification in this product was written in English at the producer and
stored as a finished sentence.** `notifyCollaborators` took a `title` and a
`body`, and nine call sites handed it a literal: "A leave request is waiting",
"Someone requested 3 days off." So an Arabic studio's bell was entirely
English — the whole surface, not a stray fragment — and no studio could change a
word of it.

**The fix is the one the statuses and the sales funnel already took:** a stored
notification is a TOKEN plus its facts, and the words are chosen on DISPLAY. The
producer says `leave.requested` with `{ who, days }`; the bell renders it in the
reader's own language. `docs/functionality/language.md` states that rule for
statuses; this is the one surface that had escaped it.

## The rules

**A studio may override the wording, per type and per language.** Overrides
only — the shipped template is what a studio has not touched, so a later
correction to the product's wording still reaches everybody who never edited.
Saving the shipped wording back unchanged stores nothing, for exactly that
reason: it would freeze that studio on today's sentence.

**An override is a complete pair.** Typing a title while the body stays untouched
would otherwise store a title and an empty body, blanking a sentence nobody
looked at. The screen seeds the other half from the shipped wording.

**A placeholder the producer never sends is refused at the door.** `{salary}` in
a leave notification renders as nothing, every time, on every reader's bell,
silently — so `fields` is declared per template rather than derived from the
strings, and a translation cannot quietly introduce one.

**A placeholder with no value renders as nothing, not raw.** "{who} requested 3
days off" on a bell reads as a broken product; "requested 3 days off" reads as a
missing name, which is what it is. The filler also closes the double space and
the space before a full stop that leaves behind.

**A blank title is refused.** A body may be empty — several notices are a
headline and nothing else — but a row with no title is a blank line in the bell.
`renderNotice` falls back to the stored sentence if one gets through anyway.

**Params are pre-formatted strings, never numbers or dates.** Only the producer
knows that "3 days" is three days rather than the 3rd, and a template cannot
format what it is handed.

**Absent params and empty params mean different things.** No params at all means
"this row was not written for a template", and the stored sentence is kept. `{}`
means "this notice carries no facts" — `join.requested` is one — and it renders
the template. `build()` keeps the empty object for that reason; testing the key
count would collapse the two and send an Arabic reader the English literal.

**Every row written before this still reads.** They hold a literal and no
params, so `renderNotice` returns what was stored. No migration: rewriting two
hundred rows per studio to gain a translation would be a migration nobody asked
for over records nobody can re-derive.

**`system` has no template, deliberately.** It is whatever the producer needed to
say — Quality writes `` `${document.code} needs you` `` — so there is no fixed
sentence to translate and no placeholder set to declare. Those rows keep their
literal forever, which is what makes the fallback a contract rather than a
safety net.

**The words are chosen in the bell, not on the server.** Which language a person
reads is their own (`docs/functionality/language.md`), and the server does not
know it; the route serves the studio's overrides alongside the rows, and every
shipped template is already in the client bundle because the module is pure.

## Who is told they were given work

**`modules/people/holders` `notifyNewlyAssigned`** is the one door (28/09/2026).
It tells the people newly on a list, never the person who made the change,
and never someone who does not hold the right to open the record. Nobody is
told they were taken off.

- **A field-service job** (`job.assigned`): its crew, when the job is
  dispatched, raised by a PM plan, or re-crewed. A migrated job is not
  announced. Right: `fieldService.schedule.view`.
- **Planner tasks** (`task.assigned`): one notice per person per save, naming
  up to three of their new tasks. Right: `projects.planner.view`, so a project
  member who reaches the plan only through the project is not told.
- **A register's person field** (`record.assigned`): whoever a `collaborator`
  field newly names — an NCR's Owner, an incident's Investigator, or any person
  field a studio's own register declares. Right: `engine.<type>.view`.
- **A record raised in a register that announces** (`record.raised`): everyone
  holding `engine.<type>.edit`, except whoever raised it. NCRs and HSE
  incidents announce, including the NCR a failed test's rule raises.

## Who is told a signature is waiting

**`approval.requested`** ("Waiting for your signature", the document's reference as the one
fact) goes to whoever can answer the next step, resolved from the right that step names:

- a **requisition** when it is submitted and after every signature that is not the last;
- a **bid** after every signature that is not the last;
- every **approval**, to the people named on each step as it opens (Approval settings), and
  to the requester when it is approved or rejected;

Never the raiser, who knows, and never anybody who signed an earlier step — invariant 7
refuses them the next one. Until 11/09/2026 none of these rang anybody: only the raiser was
told when a decision landed, and a waiting approval was found by somebody happening to open
the screen.

**One question, one home.** `modules/people/holders.ts` (`collaboratorsHolding`,
`notifyHolders`, `notifyCollaboratorIds`) answers "who holds this right" through
`effectivePermissions`; join requests, leave and the RFQ-raised notice used to each list the
people and filter by hand, and now call it.

## Where notices are kept, and for how long

**One row per recipient** in the `notifications` collection, filed under
`administration-members` (28/09/2026). Before that, a whole studio's notices
were one array under `s:<id>:notifications`, capped at **200 for all its members
together**, and every read and "mark read" rewrote the whole list.

- **Kept 90 days** (the owner). `store-upkeep` purges older rows each night,
  studio by studio, by an explicit id list.
- **The words are sealed**: `title`, `body` and `params`, because a notice
  repeats a deal's reference and title, which are sealed on the deal. What
  finds a row stays clear: recipient, type, time, `readAt`, `state`, the link.
- **Postgres pages, counts and marks them.** The bell reads the newest thirty
  (`readColPage`), the badge is a `count(*)` (`countWhere`), and "mark all read"
  is one UPDATE (`setFieldWhere`), not one compare-and-set per row. The index
  `collection_rows_notifications` serves the read.
- **Writes are never announced on the studio stream.** The recipient's own
  doorbell is the signal. An event under the members section would reload
  every board filed there, for everybody.
- **The old array is still READ, never written.** Every row in it is older
  than every row in the collection, so a page reads the collection and runs on
  into the array. Its rows fall out of the 90-day window by themselves.
- **Removing a person removes their rows** (`cascadeDeleteCollaborator`), from
  both stores.

## The notification centre

`/<slug>/notifications`, reached from the bell's "See all". It has **no right of
its own**: a person's notices are addressed to them, so membership is the gate,
and the route reads by the caller's own collaborator id.

- **Views:** Inbox, Unread, Archived. Archiving also marks the notice read.
- **Categories:** Approvals, Assigned to me, Sales, Money, Deadlines, People,
  System. Each type declares its category and icon in
  `shared/notificationKinds`, and the test holds that table against `NOTIFY` in
  both directions.
- **Repeats collapse.** Neighbouring notices with the same type, link, words
  and facts, within a day, show as one row with a count. Opening it reads all
  of them.
- **One inbox per tab** (`components/notifications/InboxProvider`). The bell,
  the page, the tab title and Nova's dot read the same first page and the same
  count. Nova used to poll the whole list every two minutes to count it itself.

## How a notice reaches an open tab

A producer writes the row and rings the recipient's personal channel with its
id. **It rings only when the caller passes `userIdOf`**, because rows are
addressed to CollaboratorIDs and channels are keyed by UserID.
`tests/notification-inbox-model.mjs` refuses any `notifyCollaborators` call
without it. The stream route subscribes to that channel **before** it sends
`ready`, holds what it hears until then, and forwards the row.

**The bell re-reads its list on every `ready`**, and LiveProvider counts them.
The personal channel has no replay, so the re-read covers anything sent while
a connection did not exist. That includes the server's own recycle every four
minutes, which goes live → live with no status change to react to. Until
28/09/2026 the bell keyed on status, and a notice sent in that gap waited for a
manual refresh.

**The unread count sits in the tab's title** ("(3) …"), on the studio and the
console alike, so somebody in another tab can see it. The merge and the count
are `shared/notificationInbox`, one rule for both bells.

## Not built yet

- **A formatted quantity carries the producer's language.** "3 days" is
  assembled by the producer, so an Arabic bell reads "Sara طلب إجازة 3 days."
  Two of the fifteen templates are affected: `leave.requested`'s `{days}` and
  the four time-driven ones' `{detail}`. Everything else a param carries is a
  name or a reference, which is data and correctly untranslated. Fixing it means
  pluralising two languages inside a template, which is a grammar engine.
- **The cron's four notices lose their count from the title.** The English title
  switches between "Overdue invoice" and "3 overdue invoices"; the template is
  the fixed plural. The count is still on screen — the body says "(+2 more)".
- **No email.** These are bell-only. `platform/notify/emailTemplates.ts` is a
  separate, English-only set for platform events (sign-in, verification, invite)
  that no studio can edit.
- **No print formats.** A quotation or an invoice prints through the browser's
  own print stylesheet; there is no per-studio header, footer, terms block or
  paper size.
- **No per-person preferences.** A collaborator cannot mute a type, choose a
  digest, or opt out. Every holder of the right gets every notice.
- **The index is in `pgSchema.sql` but must be applied to the live database
  by hand.** It is one `CREATE INDEX CONCURRENTLY` statement; the file's comment
  says why not to re-run the whole file. Until then the bell's read walks the
  studio's notices newest-first, which is correct but slower.
- **The console's own list (`/super`) is unchanged**: one array of 200 for
  whoever is on duty, with no page, category or archive.
- **Grouping joins identical notices only.** Five different items falling low
  are five rows, not "5 items low": that needs a plural sentence per type.
- **Most of the product notifies nobody.** Assigned jobs and planner tasks,
  NCRs and incidents, paid claims and payroll, tender and deal moves, invoice
  payments, POS variances and several expiry dates are all silent. Phase 3 in
  `docs/progress.md` lists the order.
- **No browser or phone push, and a hidden tab lets go of the stream** after a
  minute. It catches up when shown again, and the title count only moves while
  the tab stays connected.
- **Nothing previews an override.** The screen shows the placeholders it may use
  and not what a filled sentence looks like.
- **`people.changed` and `mention` have templates and no producer sending
  params yet**, so they still render their stored literal.
