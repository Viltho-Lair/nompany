# Events & webinars

Marketing's seventh subsection of the owner's plan, live 2026-09-22. Section key
`marketing-events`, which owns the `marketingEvents` collection. Right
`marketing.events` view/create/edit/delete. Code: `src/modules/marketing/events.ts`
(the rules, pure and shared with the screen) and `eventsService.ts` (the service).

## An event

A name, a description, a **kind** (in person, or online — the difference is where
people go), a **start** and an optional **end**, a **place** (an address, or a
joining link: it is the same question), a **capacity**, an **owner**, and links to
a **campaign** and a **registration form**.

Times are stamps rather than dates, unlike a campaign: an event starts at six.
The end is optional because plenty of events run "from 6pm" and nobody decides
when the room empties; an event with no end is a moment, and is finished once its
start has gone.

**Upcoming, on now, finished** is derived from the start and end against the
**server's** clock, handed to the screen. A screen asking its own browser would
call one row finished for somebody in Riyadh and running for somebody in London.

## It does not store its registrations

**A registration is a form answer.** The form tool has done registration since it
shipped — a public page, the consent tick, the lead it raises, the CSV — so an
event NAMES a registration form and its sign-ups are that form's replies, counted
where Forms keeps them. A second list of the same people would be free to
disagree with the first the moment somebody answered the form again. It is the
rule that keeps spend in Finance and the calendar's bars on the campaigns.

**An event without a form has nothing to count**, and the card says exactly that
rather than showing a nought.

## What it does own is attendance

Registering and turning up are different facts, and nothing else in the product
knows the second one. The gap between them is the only number an event exists to
produce: **who came, the turnout, and who did not**.

**Stored as response ids, never as names.** The names are sealed form answers
(invariant 18) and belong to Forms; an event holding a copy would put a
stranger's details in a second, unsealed place.

**The stored list is allowed to go stale and the count never is.** An id for a
reply somebody has since deleted is dropped when it is READ, not prevented at the
write — the containment is in the reader for the reason `projectBilling` gives,
because a write-time check cannot cover a deletion that happens afterwards and
elsewhere. What the write DOES refuse is an id that was never a registration of
this event's own form, which would otherwise be a tick that appeared to work.

**The whole list is saved at once**, not a tick at a time: a door is worked by
several people, and a flip-this-one patch loses whichever tick landed second.

## Capacity, and what it does not do

**Blank is no limit, which is not a limit of nought.** A screen rendering both as
"0 left" would tell a studio its open webinar was full. A capacity of nought is
refused outright — a room nobody may enter is not a capacity.

**Oversubscription is shown, not clamped.** Fifty seats against fifty-eight
sign-ups is "8 over capacity", because clamping to nought hides exactly the
number somebody has to act on.

**Nothing is ever refused at the door by this figure.** The registration form
does not know about the event, and a public page that started turning people away
because a number moved in Marketing would be a silent outage. Capacity is
information for the studio.

## Who may see what

`marketing.events.*` opens the register, the counts and the turnout. Marking who
attended is an **edit** of the event, not a verb of its own: attendance is the
event's own content, and a second right over it would be free to disagree with
the first about who works the door.

**It does not open the registrants.** Their names, emails and telephone numbers
are sealed form ANSWERS and answer to `marketing.forms.view`, so the list of who
signed up is read only for somebody who could open that form anyway — the
customer-360 rule, where a block the reader may not see is never read at all. The
screen **says so** rather than showing an empty list, which would read as nobody
having registered.

Whoever works the campaigns catches up to this right verb for verb (an event is a
campaign's work made of a date and a room), and the winner-of-work shape holds it
at full.

## Deleting

An event that has **already run** is kept, and so is one anybody has been marked
as attending: it is the record of what happened, and its turnout is the only
place that number exists. An upcoming event nobody has marked deletes.

## Not built yet

- **Nothing is sent.** No invitation, no reminder, no "you are registered" beyond
  the form's own confirmation message, and no calendar invitation — nompany sends
  no email (the owner, 2026-09-19).
- **A waiting list**, and anything that happens when capacity is reached. The
  form keeps accepting replies.
- **Events are not on the marketing calendar.** It draws campaigns only, which
  its own file has always said.
- **No check-in from a phone**, no QR on a registration, and no walk-in that is
  not already a form reply — somebody who turns up unregistered cannot be marked,
  because attendance is keyed to registrations.
- **No cost.** An event's spend is a Finance bill naming its campaign, as with
  everything else in Marketing; there is no per-event budget.
- **No recurrence**, no sessions within an event, no speakers and no agenda.
- Nothing reads the turnout but this screen: it is not on the campaign register,
  the dashboard or Budget & spend.
