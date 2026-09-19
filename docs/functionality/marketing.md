# Marketing

The eighteenth department (2026-09-19), from the owner's *Marketing Section — ERP Requirements
& Implementation Plan*: seventeen subsections behind one dashboard, in six phases. **One of the
seventeen is built: Campaigns**, because the plan makes the campaign the parent of everything
else. A sub-section appears in the sidebar only when its screen exists (invariant 16), so the
other sixteen are not declared yet; they are listed at the end of this file.

Section keys: `marketing` (the dashboard) and `marketing-campaigns` (the register, which owns
the `marketingCampaigns` collection). Code: `src/modules/marketing/` (`model.ts` holds the rules,
pure and shared with the screen; `campaigns.ts` the service). `pricing.ts` in the same folder is
the public site's price list and is not part of the department.

## Who may do what

| Right | Opens |
|---|---|
| `marketing.dashboard.view` | The dashboard. |
| `marketing.campaigns.view/create/edit/delete` | The register. Moving a campaign along its ladder is **edit**; running it again (cloning) is **create**. |

The **winner-of-work** shape (Sales Manager, Marketing Manager, Digital Marketing Specialist and
every other marketing title in the role library) holds both, the campaigns at full. A **department
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

**Needs attention**, judged by the server's date: a Planned campaign whose start date has passed,
a running or paused one past its end date, and a Draft or Planned one starting within seven days.

## The dashboard

The section's landing page. Six figures: running now, starting this week, needing attention,
budget in open campaigns (counted once), expected revenue and expected leads. Then what needs
somebody (late starts and overruns first), campaigns by status, what is running now with its end
date, and open campaigns by channel. It says in words that these are **plans**: spend, leads and
revenue arrive with the subsections below. Nothing on it is gated by the analytics tier.

## Not built yet

The other sixteen subsections of the plan, and everything the dashboard's plan needs from them:

- **Planning & Calendar** (plans by period, briefs, a view-only calendar across channels).
- **Budget & Spend**: actual and committed spend from Finance (purchase orders, bills, ad spend),
  variance alerts. Until then a campaign's budget is a plan with nothing measured against it, and
  a bill cannot name a campaign.
- **Audiences & Consent**: lists, segments, per-channel consent ledger, suppression, preference
  centre, data-subject requests. Nothing records marketing consent yet.
- **Email**, **Messaging** (SMS, WhatsApp, push), **Social Media**, **Paid Ads**: nothing is sent,
  posted or imported. The owner's open decisions on providers (build or buy, the studio's own
  accounts or resold credits) are not answered.
- **Web, Forms & Landing Pages**: no forms, no hosted pages, no visitor tracking. The tracked
  link is built, but nothing reads the tags back when a visitor arrives.
- **Leads & Scoring**: the owner decided leads stay Sales tickets at the Lead stage and Marketing
  reads them (2026-09-19). **A ticket cannot name a campaign yet**, so a campaign's actual leads,
  customers and won value are not shown anywhere; only its targets are.
- **Journeys**, **Content & Brand Assets**, **Events & Webinars**, **Promotions & Loyalty**,
  **Research & Feedback**, **Partners, PR & Influencers**, **Reports & Attribution**.
- On the dashboard: marketing-sourced revenue, ROI, cost per lead, CAC, the funnel, the budget
  line, geography and lead quality. The global filters, role presets and saved views.
- The **country package's nine marketing rule groups** (consent model, sender rules, quiet hours,
  tax on ad spend and the rest). No marketing rule is read from any country file yet.
- A studio's own names for channels; campaign templates other than *Run again*.
- Campaigns are not in Reports & BI's datasets, and Nova does not know about them.
