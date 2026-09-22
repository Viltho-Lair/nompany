# Marketing

The eighteenth department (2026-09-19), from the owner's *Marketing Section — ERP Requirements
& Implementation Plan*: seventeen subsections behind one dashboard, in six phases. **Five of the
seventeen are built: Campaigns**, because the plan makes the campaign the parent of everything
else, **Forms** (2026-09-19, `docs/functionality/forms.md`), **Budget & spend** (2026-09-21,
`docs/functionality/marketing-budget.md`) **and Audiences & consent** (2026-09-22,
`docs/functionality/audiences.md`), **and Planning & calendar** (2026-09-22,
`docs/functionality/marketing-calendar.md`). A sub-section appears in the sidebar only when its
screen exists (invariant 16), so the other twelve are not declared yet; they are listed at the end
of this file.

Section keys: `marketing` (the dashboard), `marketing-campaigns` (the register, which owns
the `marketingCampaigns` collection), `marketing-forms`, `marketing-budget` (which owns
nothing — its costs are Finance's bills and expenses) and `marketing-audiences` (the consent
ledger, `marketingConsents`). Code: `src/modules/marketing/` (`model.ts` holds the rules,
pure and shared with the screen; `campaigns.ts` the service). `pricing.ts` in the same folder is
the public site's price list and is not part of the department.

## Who may do what

| Right | Opens |
|---|---|
| `marketing.dashboard.view` | The dashboard. |
| `marketing.campaigns.view/create/edit/delete` | The register. Moving a campaign along its ladder is **edit**; running it again (cloning) is **create**; sending a lead to Sales is **edit**. |
| `marketing.campaigns.assign` | Choosing who owns a campaign (2026-09-19). Without it the owner is whoever raised the campaign. |
| `marketing.budget.view` | Budget & spend (2026-09-21). View alone: setting a budget is editing the campaign, and filing a cost is editing the bill. |
| `marketing.audiences.view/edit` | The consent ledger (2026-09-22). Edit adds an entry; nothing can be changed or removed, because the ledger is append-only. |
| `marketing.planning.view` | The calendar (2026-09-22). View alone: moving a campaign in time is editing that campaign. |

The **winner-of-work** shape (Sales Manager, Marketing Manager, Digital Marketing Specialist and
every other marketing title in the role library) holds both, the campaigns at full, and the assign
extra. A role that can delete campaigns catches up to the assign extra by itself. A **department
head** sees the dashboard. Admin holds everything. **Existing roles gain nothing**: no right that
already exists means "runs marketing", so there is nothing for a catch-up to key off. An Admin
grants it on the Access screen.

Starter departments where the role library files marketing titles (every Sales department, and
the Customer Service, Front Office, Client Services and Admissions departments that carry them)
list `marketing` among their sections, so a library role added there reaches it. That affects
new studios only; seeding never rewrites an existing register.

## A campaign

Reference `CMP-0001` (numbering series `campaign`, renameable in Studio settings). Name,
description, **objective** (awareness, leads, sales, product launch, retention, event, other),
**channels** (fifteen fixed tokens: email, SMS, WhatsApp, social, paid search, paid social,
display, website, events, print, outdoor, TV & radio, referral, partners, other), start and end
dates, an **owner** (a person in the studio, told by notification when named), a **budget** and
three **targets** (leads, customers, revenue). Money is in the studio's currency. A budget or
target left blank is stored as *not set*, not as nought, and is not added up.

**Sub-campaigns**: a campaign may be part of a top-level campaign, one level deep. A parent shows
what it has handed to its sub-campaigns and what is left. A cancelled sub-campaign hands nothing.
Totals count a sub-campaign's money inside its parent's, never twice; a sub-campaign whose parent
has no budget counts on its own.

**Tracked link**: a landing page address (http or https only) and the five UTM tags. The register
shows the link with the tags added, replacing any `utm_*` the address already had, with a Copy
button. `utm_campaign` left blank uses the campaign's name as a slug (the reference when the name
has no Latin letters).

**The ladder**: Draft ⇄ Planned → Running (Active) ⇄ Paused → Completed, and Cancelled from any
of the four. Running cannot go back to Planned. **Completed and Cancelled are final**: the campaign
is no longer edited and does not move. *Run again* makes a Draft copy with no dates, no status
history, no sub-campaigns and a blank `utm_campaign`, so two runs do not report as one.

**Deleting**: only a Draft, Planned or Cancelled campaign, and never one with sub-campaigns.
One that ran is kept as the record of what ran.

**Leads** (2026-09-19, `docs/functionality/leads.md`): each campaign sets a **lead deadline** in
hours, and *Send a lead to Sales* raises a Sales ticket at Lead, assigned to nobody, naming the
campaign as its source. The card shows what the campaign brought in: its leads, deals won and
won value, read from the Sales tickets that name it.

**The brief** (2026-09-22): four questions on the campaign — who is it for, what are we saying to
them, what are we offering, and what would make it a success. Four questions rather than one box,
because a box gets a paragraph and a question gets an answer; the fourth is the one nobody writes
unprompted, which is how a campaign ends up judged afterwards on whichever figure is to hand. It
is written by whoever edits the campaign (`marketing.campaigns.edit`) and mints no right of its
own — the brief IS the campaign's content. It records who last wrote it and when.

**An unstarted brief is not a brief with four gaps.** A campaign nobody has briefed says *No brief
yet*; one that has been started says how many questions are left. Nagging about a document nobody
has begun would make every register read as behind on its first day. A brief is *written* when any
one question is answered, and whitespace is not an answer. A long answer is cut to its limit
rather than refused, so a pasted page loses its tail instead of the whole edit failing.

**Needs attention**, judged by the server's date: a Planned campaign whose start date has passed,
a running or paused one past its end date, and a Draft or Planned one starting within seven days.

## The dashboard

The section's landing page. Six figures: running now, starting this week, needing attention,
budget in open campaigns (counted once), leads from campaigns (with the target beneath) and won
value from campaigns (with the expected revenue beneath). Then what needs
somebody (late starts and overruns first), campaigns by status, what is running now with its end
date, and open campaigns by channel. **Spend is not on the dashboard**: it is its own screen
(`marketing-budget.md`), and the dashboard's own budget figure is still what was planned rather
than what went out. Nothing on it is gated by the analytics tier.

**THE DASHBOARD IS DELIBERATELY LEFT UNTIL LAST — the owner, 2026-09-22.** Marketing-sourced
revenue, ROI and cost per lead became computable the day Budget & spend shipped, and rebuilding
the dashboard on them NOW would design it around the four subsections that happen to exist rather
than the seventeen the department will have. The owner's instruction is to wait until the rest is
in hand and the figures have been used in anger, then build one dashboard from what the system
actually knows. Until then it keeps saying, in words, that its figures are a plan.

## Not built yet

The other twelve subsections of the plan, and everything the dashboard's plan needs from them:

- **Planning & Calendar** is part-built (`marketing-calendar.md`): the calendar across channels,
  with what starts, what ends and what collides, and the brief per campaign (four questions, in
  this file). Not built there: plans by period — a plan with its own objectives and budget, above
  the campaigns that spend it.
- **Budget & Spend** is built (`marketing-budget.md`): a bill and an expense name their campaign,
  and the screen reads them against the budget. Not built there: **committed** spend (a purchase
  order cannot name a campaign), spend over time, and alerts to anybody.
- **Audiences & Consent** is part-built (`audiences.md`): the consent ledger records what the
  public ticked on a form, and what a studio records by hand, append-only and sealed at rest. Not
  built there: lists and segments, per-channel consent (one tick cannot mean four channels), a
  public preference centre, data-subject requests, and anything that CHECKS the ledger — nothing
  sends, so nothing asks it yet.
- **Email**, **Messaging** (SMS, WhatsApp, push), **Social Media**, **Paid Ads**: nothing is sent,
  posted or imported. The owner, 2026-09-19: companies use their own email and SMS
  tools for now, and nompany does not resell messaging or ad credits (both ledger rows, for later).
- **Web, Forms & Landing Pages**: forms are built (`forms.md`). Not built: landing pages, visitor
  tracking with a consent banner, reading the UTM tags back when a visitor arrives.
- **Leads & Scoring**: leads are Sales tickets (the owner, 2026-09-19), campaigns send them, and
  **scoring is built** (2026-09-22, `leads.md`): seven declared factors, a band, and the reasons
  on the chip. **The order the owner agreed for the rest, 2026-09-22** — worth more at the top
  than at the bottom, and each is a reason rather than a wish:

  - [x] **Score a lead on arrival** (2026-09-22). Seven factors, hot/warm/cold, reasons shown.
  - [x] **Engagement — what happened AFTER it arrived** (2026-09-22). Repeat form answers, counted
        from the consent ledger: once earns nothing, twice half, three times the whole of it. A
        studio that cannot answer it (no ledger) has the factor dropped from the total instead of
        scored nought.
  - [x] **Decay with age** (2026-09-22). A fortnight's grace, then a straight line to half by
        ninety days and no further; the clock resets when they come back or somebody works it.
  - [ ] **Studio-set weights** — **the next one, when a studio asks.** Deliberately NOT yet: fixed weights are what make a score
        comparable between leads and arguable by a manager, and editable ones invite tuning until
        the number agrees with whoever is tuning. The honest trigger is a studio naming a factor
        that is wrong for its trade — a contractor and a clinic will not value "said what they can
        spend" alike.
  - [ ] **Score history.** Only when the scoring should LEARN from closed deals. Until then a
        stored score is a figure free to part company with the truth, which this codebase has been
        caught by before.

  Also not built: lifecycle stages beyond the pipeline's, lead enrichment, and duplicate merging.
- **Journeys**, **Content & Brand Assets**, **Events & Webinars**, **Promotions & Loyalty**,
  **Research & Feedback**, **Partners, PR & Influencers**, **Reports & Attribution**.
- On the dashboard: marketing-sourced revenue, ROI, cost per lead, CAC, the funnel, the budget
  line, geography and lead quality. The global filters, role presets and saved views.
- The **country package's nine marketing rule groups** (consent model, sender rules, quiet hours,
  tax on ad spend and the rest). No marketing rule is read from any country file yet.
- A studio's own names for channels; campaign templates other than *Run again*.
- Campaigns are not in Reports & BI's datasets, and Nova does not know about them.
