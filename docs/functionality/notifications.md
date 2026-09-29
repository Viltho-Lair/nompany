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

## Tenders and deals

- **`tender.assigned`**: a tender's owner when it is registered for them or
  handed to them. Right: `tendering.tenders.view`.
- **`tender.won` / `tender.lost`**: the owner and whoever registered it, only
  when the write made the outcome, never to whoever pressed the button. Two
  types rather than one with an outcome word, so the Arabic sentence has no
  English in it.
- **`tender.closing`**: an Identified or Preparing tender at 14, 7, 3, 1 and 0
  days before its deadline (the daily cron). It goes to its owner; with no
  owner who may still read it, to whoever may edit tenders.
- **`deal.won` / `deal.lost`**: a deal's owner, when somebody else closes it.
  Only closes: every stage move would be noise, and a stage name cannot be
  translated inside a stored sentence.

## Money at the edges

- **`invoice.paid`**: the manager of the invoice's project, when a payment
  settles it in full. Right: `projects.billing.view`. An invoice on no project
  tells nobody: Finance recorded the payment and knows.
- **`payment.bounced`**: the same manager, when a cheque payment is marked
  bounced.
- **`shift.variance`**: everyone holding `pos.shifts.view`, when a drawer is
  closed short or over, except the cashier who counted it. A balanced drawer
  is silent.
- **Not built:** a payment run executing (Finance runs it and nobody else waits
  on it), and a budget going over.

## Procurement

- **`rfq.quoted`**: whoever raised the RFQ, when a supplier's first quote is
  recorded. A corrected quote replaces a price they already saw, and is silent.
- **`rfq.awarded`**: the same person, when a quote is chosen.
- **`certificate.certified`**: whoever wrote a subcontract valuation, when it is
  certified. Invariant 7 means they could not certify it themselves, so they
  were always the one waiting.

## The daily notices

`/api/cron/daily-notices` runs once a day. **Each studio is swept on its own
day** (Studio settings' time zone, `shared/timezone`); a studio with no zone
keeps the UTC day. Studios are swept **four at a time**, not one after another,
so the run fits its 300-second ceiling as the tenant count grows. The same day
drives the preventive-maintenance raises that ride this run.

Besides overdue invoices and bills, expiring IDs and permits, due work orders,
calibrations and overdue leads, it now tells:

- **`record.expiring`**: whoever may edit the register, as a certificate's
  expiry, a vehicle's insurance or inspection, or an installed unit's warranty
  reaches 30, 14, 7, 3, 1 or 0 days. A withdrawn certificate and a sold vehicle
  are skipped. The dates are a table (`ENGINE_EXPIRIES` in
  `modules/main/timeNotices`), so the next dated register is one line.
- **`supplier.document.expiring`**: whoever may edit suppliers, as a supplier's
  licence, insurance or other document reaches the same milestones.
- **`tender.closing`**: see Tenders and deals.

Every link is a studio address: `finance-receivables`, not `finance/receivables`,
which three of these notices used until 28/09/2026.

## Who is told about their own money and time

Addressed to the person the record is about, through `notifyEach` (one read of
the people, a different sentence each). No right is asked, because it is their
own record, and whoever made the change is never told.

- **`claim.paid`**: the claimant, when Finance pays the claim. The amount is
  the cash part, after any advance took its share.
- **`advance.given`**: the person handed an advance, with its reference.
- **`pay.paid`**: every person on a payroll run marked Paid, each with their own
  net in the run's currency. No link, because no screen shows a person their
  own payslip yet.
- **`leave.booked`**: the person whose leave a manager filed directly, which is
  approved on the spot and so never rang an approval.

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

## Beyond the bell: email and push

**Each person chooses on `/account` → Notifications** (29/09/2026). The
settings are the person's (`u:<id>:notifyPrefs`), apply in every studio they
belong to, and can only narrow what they receive. The bell always shows
everything. The rules are `shared/notificationPrefs`.

- **Email: Off, Every notification, or Daily summary.** Off by default for
  everybody (the owner, 29/09/2026), so nobody gets email until they choose it.
- **Per category**, whether email and push carry it.
- **Quiet hours** hold push on the person's own clock (the browser's time
  zone, saved with the settings). Email is not held.
- **A language** for email and push, English or Arabic.

**Delivery runs after the response** (`platform/notify/deliver`, via Next's
`after()`): the bell is written, the doorbell rung, and only then are email and
push sent, so no request waits on Resend or a push service. Email uses the
bell's own words through `renderNotice`, including the studio's wording, and its
footer links to the settings.

**The daily summary** is `/api/cron/notice-digest`, at 07:00 UTC, an hour after
`daily-notices`. It sends one email per person across all their studios,
listing unread notices since the last summary (at most 20 lines, then "and N
more"). Nothing unread means no email. The window moves only when the email
actually went.

**Web Push** (`platform/notify/push`, `public/sw.js`):

- **The key is derived** from `NOMPANY_DATA_KEY` ("web-push/vapid"), so there
  is nothing new to store. A device subscribed under another key is re-subscribed
  quietly the next time the settings page opens.
- **The push is empty.** It passes through Apple's, Google's or Mozilla's
  servers, so it carries no words. The worker wakes and asks
  `/api/account/push/latest` on the person's own session what to show, in the
  device's language, and sets the app-icon count where the platform allows.
- **Only vendors' push services are accepted** as endpoints (HTTPS, a fixed host
  list). The server fetches whatever a browser registered, and anything else
  would be a request-forgery hole.
- **A dead device is pruned** when its service answers 404 or 410. At most ten
  devices per person, listed on /account without their endpoints, and removable.
- **iPhone and iPad** receive push only from a Home Screen app; the page says how
  to add it instead of offering a button that cannot work.
- **The worker has no `fetch` handler.** It never caches or intercepts a page.

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
- **Email is sent only where `EMAILS_ENABLED` is "true"**, the product's
  kill switch. Instant email and the digest were built and run against the
  sandbox with sending suppressed; no notification email has been delivered to
  a real inbox yet.
- **The daily digest goes at 07:00 UTC for everybody**, not at each person's
  own morning. The window is right (since the last digest); the hour is not
  personal.
- **No print formats.** A quotation or an invoice prints through the browser's
  own print stylesheet; there is no per-studio header, footer, terms block or
  paper size.
- **Preferences choose channels, not whether a notice exists.** Every notice
  still lands in the bell; nobody can mute a type there.
- **The index is in `pgSchema.sql` but must be applied to the live database
  by hand.** It is one `CREATE INDEX CONCURRENTLY` statement; the file's comment
  says why not to re-run the whole file. Until then the bell's read walks the
  studio's notices newest-first, which is correct but slower.
- **The console's own list (`/super`) is unchanged**: one array of 200 for
  whoever is on duty, with no page, category or archive.
- **Grouping joins identical notices only.** Five different items falling low
  are five rows, not "5 items low": that needs a plural sentence per type.
- **Still silent after Phase 3 (28/09/2026):** a payment run executing, a
  budget going over, an asset allocated to a person, a permit to work issued, a
  site report or inspection submitted, a project milestone or closure, a sales
  order moving, a marketing form submission that raises no lead, and a change to
  somebody's own roles. Contracts carry no end date, so a contract expiring
  cannot be announced. Audits and RFIs have no person field.
- **The time-driven notices' `{detail}` is English**, whatever the reader's
  language ("closes in 7 days"). A formatted count inside a sentence needs a
  pluralising template per language.
- **Push has not been received on a real device yet.** The key, the signed
  token, the device list, the endpoint allow-list and the worker's "what to
  show" endpoint were checked in the sandbox; the browser pane blocks
  notification permission, so subscribing and receiving were not exercised.
- **A hidden tab lets go of the stream** after a minute. It catches up when
  shown again, and the tab-title count only moves while the tab stays
  connected. Push is what reaches a person with the tab closed.
- **Nothing previews an override.** The screen shows the placeholders it may use
  and not what a filled sentence looks like.
- **`people.changed` and `mention` have templates and no producer sending
  params yet**, so they still render their stored literal.
