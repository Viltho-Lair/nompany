# Partners, PR & influencers

Marketing's ninth subsection of the owner's plan, live 2026-09-22. Section key
`marketing-partners`, which owns the `marketingPartners` collection. Right
`marketing.partners` view/create/edit/delete. Code:
`src/modules/marketing/partners.ts` (the rules and the arithmetic, pure) and
`partnersService.ts`.

## Why this is a register and not an address book

A partner owns the **`utm_source` on the links they publish**. Every campaign
has published tagged links since Marketing shipped, and since 2026-09-22 a form
READS the tag back when somebody arrives (`forms.md`), while the reply carries
the Sales ticket it became. So the chain runs end to end:

> their newsletter → an arrival carrying `utm_source=newsletter` → a lead →
> a won deal, and what it was worth

**The figures are counted, never typed in.** There is deliberately no field for
"leads they sent us" and no action for recording it: a number a person maintains
beside one the system can count is a second number free to disagree with it.

## A partner

A name, a **kind** (partner, agency, influencer, affiliate, other), their tag, a
contact (name, email, phone, website), **what was agreed** in words, notes, an
owner, and whether the arrangement is still running.

**Everything but the name and kind is optional**, because a studio records who
it is talking to long before the arrangement has a tag, a fee or an email
address.

**The fee is a note, not an amount.** What a partner COSTS is a Finance bill
naming the campaign, like every other cost in Marketing; a number here would be
a second place the same money is recorded, free to disagree with the ledger.

## The tag

**Two partners may not hold one tag**, and it is refused at the write rather
than resolved at the read: every arrival under it would count for both, and the
studio would see its own numbers doubled with nothing saying why. There is no
honest way to split a submission between two claimants afterwards.

**Matched case-insensitively**, because a URL is typed by hand and frequently by
somebody who does not work here. A partner writing `utm_source=HotelWeekly` into
their own newsletter must not read as a different partner from the one the
studio recorded as `hotelweekly`.

**A partner with no tag shows no figures at all**, and the screen says why.
A row of noughts would read as a partner whose links nobody clicked, when the
truth is that nobody has given them a link — and only one of those is the
partner's doing.

**A win rate is NULL when no lead arrived**, the same trap one level down: 0%
reads as a partner whose leads all failed rather than as one nobody has clicked.

## The tags nobody claims

Every arriving `utm_source` that no partner holds is listed, commonest first.
It is the counterpart of the unmatched campaign tag on a form's replies, and it
is frequently the most interesting row on the screen — **the partner nobody
realised they had**. A studio whose biggest referrer is a source nobody recorded
cannot see that anywhere else in the product.

## Who may do what

`marketing.partners.*`. The figures are derived from form replies, so this right
opens numbers that come from them — but **never a reply, a name or an address**.
Those are sealed and belong to `marketing.forms.view`; what leaves this section
is counts and money, the partner's own facts, the way an event's turnout is the
event's. Whoever works the campaigns catches up verb for verb, and the
winner-of-work shape holds it at full.

## Deleting

**A partner that brought anybody is kept.** The arrivals carrying their tag are
the record of what the arrangement was worth, and deleting the row is how a
studio loses the ability to say why those leads arrived. Ending the arrangement
is what the *ended* state is for. One that brought nobody deletes.

## Not built yet

- **Nothing is sent to a partner** — no brief, no link pack, no report. They
  cannot see their own figures; somebody has to tell them.
- **No commission or payout.** The terms are words, and what is actually paid is
  a Finance bill like any other cost.
- **A partner is not linked to campaigns.** The tag does the joining, so a
  partner working on three campaigns is one set of figures rather than three —
  splitting by campaign needs the arrival's campaign tag read alongside its
  source, which it is not.
- **Only FORM arrivals are counted.** A partner who sends people to a landing
  page that is not a form, or who brings business by telephone, shows nothing.
- **No agreement dates, renewal or reminders.**
- **Nothing reads the partners but this screen** — not the campaign register,
  not Budget & spend, and not Customer insights.
