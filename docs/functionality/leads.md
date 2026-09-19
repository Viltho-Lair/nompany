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

- Assignment by rotation or by rules; only by hand, as decided.
- A deadline for leads Sales raises itself; only campaign leads have one.
- The daily notice runs once a day, so a lead a few hours late is shown on the screens at once but
  is only notified the next morning's run.
- Rejecting a lead back to Marketing with a reason (decided against).
- Marketing cannot see which executive has a lead, or its stage, beyond the counts on the campaign.
