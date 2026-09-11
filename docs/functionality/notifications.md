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

## Who is told a signature is waiting

**`approval.requested`** ("Waiting for your signature", the document's reference as the one
fact) goes to whoever can answer the next step, resolved from the right that step names:

- a **bill** when it is received (created Received, or a draft marked Received) and after
  every signature that is not the last;
- a **requisition** when it is submitted and after every signature that is not the last;
- a **bid** after every signature that is not the last;
- a **stock adjustment** when it is parked for approval and after every non-final signature;
- the **quotation-approval** and **client-PO** tasks, to the people appointed to their
  authorities in Task settings;
- a **payroll run** when it is prepared, to holders of `hr.payroll.approve`.

Never the raiser, who knows, and never anybody who signed an earlier step — invariant 7
refuses them the next one. Until 11/09/2026 none of these rang anybody: only the raiser was
told when a decision landed, and a waiting approval was found by somebody happening to open
the screen.

**One question, one home.** `modules/people/holders.ts` (`collaboratorsHolding`,
`notifyHolders`, `notifyCollaboratorIds`) answers "who holds this right" through
`effectivePermissions`; join requests, leave and the RFQ-raised notice used to each list the
people and filter by hand, and now call it.

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
- **Nothing previews an override.** The screen shows the placeholders it may use
  and not what a filled sentence looks like.
- **`people.changed` and `mention` have templates and no producer sending
  params yet**, so they still render their stored literal.
