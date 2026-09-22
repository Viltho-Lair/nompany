# Leads: from a campaign to a sales executive

Built 2026-09-19, on the owner's decisions of the same day. The rules are
`src/modules/sales/leads.ts` (pure, shared with the screens); the writes are in
`modules/sales/sales.ts` (`raiseLead`, `assignTicket`, `editTicket`) and
`modules/marketing/campaigns.ts` (`sendLead`).

## The flow

1. **Marketing sends a lead from a campaign.** On a campaign card, *Send a lead to Sales* asks
   for the person or company, a contact name, a phone or an email (at least one), what they
   want, and notes. Right: `marketing.campaigns.edit`. Sales must be switched on.
2. **It arrives in Sales as a ticket at Lead, assigned to nobody.** It is raised by the marketer,
   names the campaign as its source, and carries the campaign's deadline. Industry, deadline and
   services are left blank for the executive to fill in. Everybody holding
   `crmSales.tickets.assign` is notified that a lead is waiting.
3. **A Sales manager assigns it by hand.** The Tickets screen shows the manager a queue of
   unassigned leads (late ones first) with an Assign control; a ticket's own page has the same
   control to move it to someone else. The executive is notified.
4. **The executive works it.** They cannot reject it or clear themselves off it; only a manager
   can move it.

Two other doors raise leads the same way: an answer to a **Marketing form** set to make leads
(`forms.md`), and **Customer insights**, which sends chosen existing customers to Sales with
why each was sent, and tells the assigners once for the batch (`customer-insights.md`).

A ticket Sales raises itself is unchanged: it is assigned to the person who raised it, as every
existing ticket already is.

## Scoring: which to work first

Built 2026-09-22 (`modules/sales/scoring.ts`, pure). The queue used to be ordered by how **late**
a lead was, which answers "what have I neglected" rather than "what is worth doing first" — so a
lead with a company, a budget and a telephone number sat behind one with an address and nothing
else, because the second arrived an hour earlier.

**A score out of 100, from eight declared factors**, each weighted and each carrying the reason it
did or did not fire: can be reached (20, half for one route rather than two), a company rather
than only a person (12), said what they can spend (15), has bought before (15, half where a deal
is merely open), **has come back (15)**, said what they want (8, half for an industry without
services), told us about the job (8), came from a campaign (7). **Hot from 70, warm from 40, cold
below.**

**Coming back is what engagement means** (2026-09-22). One form answer IS the lead, so it earns
nothing; twice earns half and three times or more the whole of it. Counted from the **consent
ledger** (`audiences.md`), which already holds one row per form answer per address — so the count
costs one read of a small collection and no new field anywhere. Only rows the PUBLIC created
count: a consent a studio records by hand is the studio's own act, and counting it would let a
studio raise a lead's score by filing paperwork about it. An address's email and telephone rows
are taken at the higher of the two rather than summed, or a single answer would read as two
visits.

**A factor the studio cannot answer leaves the total rather than scoring nought.** A studio with
Audiences switched off has no ledger, so engagement is unanswerable there — and marking every lead
zero for a question nobody could ask would drag every score down and move the bands with it.
Instead the score is the percentage of what CAN be asked (85 rather than 100 in that studio), the
chip does not list the factor as missing, and the same lead reads slightly higher rather than
lower. This is why the score is "out of what we can know" rather than "out of a hundred".

**It shows its working.** The chip on each lead opens to list what earned points and — as usefully
— what is **Not known**, so "cold" is a thing somebody can act on rather than a verdict. A manager
who disagrees can see exactly which rule they disagree with.

**It measures quality, not urgency.** Lateness is judged separately and still sorts first: a
deadline the studio set for itself outranks how good a lead looks, or the promise is worthless.
**A lead is scored only while it is at the Lead stage**; past that, the salesperson's own
`probability` is the better number and two figures disagreeing on one row help nobody.

**It predicts nothing.** There is no model and no training: these are facts the studio already
holds, weighted by rules a person can read. Learning from closed history is a different feature
with a different name.

**A company's history counts once.** Deals won and deals open are read from the ticket list the
screen has already loaded, so scoring costs no extra read — and a waiting lead is not treated as
"a deal already open" with itself.

## Two fields

- **Raised by** (`createdByCollaboratorId`): who created the ticket. Never changes.
- **Assigned to** (`assignedToCollaboratorId`): who is working it. `""` on a lead nobody has
  been given; changed only by `assignTicket`. An edit that carries it is ignored. Every change is
  appended to `assignmentHistory` (to, by, at).

## The source campaign

`campaignId` on the ticket. Set when a campaign sends the lead, or picked on Sales' own ticket
form ("Which campaign brought them?", open campaigns only). **Once set it never changes**: it is
the original source. The campaign register and the Marketing dashboard count each campaign's
leads, deals won and won value from the tickets that name it (a campaign's own tickets only,
never its sub-campaigns').

## The deadline

Set **per campaign** (`leadDeadlineHours`, 1 to 168 hours, blank for none) and copied onto each
lead when it is sent, so changing it later re-times nothing already in Sales.

- Unassigned: late when the hours have passed since the lead was raised.
- Assigned: late when the hours have passed since it was assigned and the assignee has not acted.
  Acting is a comment, an edit or a stage move **by the assignee**. A new assignee starts a new
  clock.
- A ticket that has left the Lead stage is never late.

The screens show *Waiting to be assigned*, *Past its deadline — not assigned* and *Past its
deadline — nobody has acted*. The daily notices tell the assign-right holders about late leads
on the day the deadline passes, then 1, 7, 14, 30, 60 and 90 days on.

## Who sees what

| Right | Gives |
|---|---|
| `crmSales.tickets.assign` | Sees unassigned leads (queue, list, pipeline, ticket page), assigns and reassigns. |
| `crmSales.tickets.view` without it | Does not see a lead until somebody is assigned to it. |
| `marketing.campaigns.assign` | Chooses who owns a campaign. Without it the owner is whoever raised the campaign. |

Both are extras. The winner-of-work shape (Sales Manager, Marketing Manager…) holds both.
**Existing roles catch up**: a role that can edit Sales' settings gains `crmSales.tickets.assign`,
and a role that can delete campaigns gains `marketing.campaigns.assign` (`catchUps.ts`).

## Not built yet

- Assignment by rotation or by rules; only by hand, as decided. Scoring orders the queue; it does
  not choose who gets the lead.
- The studio cannot change the scoring weights, add a factor or turn one off — they are declared
  in code. Nor is a score stored or its history kept, so "was this lead hot when it arrived" has
  no answer. **The weights moved when engagement arrived and every score moved with them**, which
  cost nothing precisely because none is stored.
- **Engagement counts form answers only.** A reply to an email, a telephone call returned, a visit
  to a page — none of it is recorded anywhere yet, so none of it can count.
- Nothing decays a score as a lead ages: a lead that was hot three months ago still looks hot.
  That is the next scoring step (`marketing.md`).
- A deadline for leads Sales raises itself; only campaign leads have one.
- The daily notice runs once a day, so a lead a few hours late is shown on the screens at once but
  is only notified the next morning's run.
- Rejecting a lead back to Marketing with a reason (decided against).
- Marketing cannot see which executive has a lead, or its stage, beyond the counts on the campaign.
