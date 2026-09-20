# Forms (Marketing)

Built 2026-09-19, the shape the owner approved: a Google-Forms-like tool inside Marketing for
forms the public fills in: enquiries that become Sales leads, event registrations, customer
surveys. Section `marketing-forms`, which owns `marketingForms` and `marketingFormResponses`.
Code: `src/modules/marketing/formsModel.ts` (the rules, pure, shared with both screens),
`modules/marketing/formsFlow.ts` (where an answer leads, pure, read by the page and the server
alike), `modules/marketing/forms.ts` (the service), `components/forms/PublicForm.js` (the page the
public answers, and the editor's preview: one component for both).

**The builder was rebuilt on 20/09/2026** to the owner's design — a full-page canvas of cards.
Nothing was missing from the first one and that was the problem: its types were behind an "Add a
question" button and could never be changed afterwards, its cards were collapsed to one line until
clicked, and what the form DID with an answer was in another tab. A builder has to show its
handles.

It reuses the questionnaire system's pure parts: the page-and-question shape, branching
(`lib/questionnaireLogic`), answer cleaning (`cleanAnswers`), and the per-question summary and CSV
(`lib/questionnaireSummary`). The questionnaire builder in `/super` is not reused: it is
console-styled, English only and nompany's own.

## The screens

**Forms** (`/<slug>/marketing-forms`): four templates along the top (Blank, Enquiry, Event
registration, Customer feedback) and the studio's forms below with their status, response count and
language. Choosing a template asks for a name and the form's language (English or Arabic); the
template's questions arrive in that language.

**A form** (`/<slug>/marketing-forms/<id>`) — **full-screen**, like the till and the planner
(`shared/studioRoute` decides the chrome). Three tabs and a Preview that shows the real public page
beside the canvas:

- **Questions**: a centred column of cards, one per question, all open. Each card carries the
  question, an optional picture, a **type dropdown** (so a question's type is a thing you change),
  the type's own controls, and a footer of duplicate · delete · Required · More. Cards are dragged
  to reorder, within a section and between them. A floating toolbar adds a question or a section —
  a bar along the bottom on a phone, where a floating column would cover the card.
  **Twenty types**: short answer, paragraph, email, phone, number, date, time, date and time,
  website, multiple choice, dropdown, yes/no, consent, rating (star, heart or thumb), scale,
  recommend score (0–10), multiple-choice grid, tick box grid, file upload, text only.
- **Responses**: a block per question (counts for choices, the replies for text — a grid is counted
  row by row), every response with a link to the Sales lead it became and a link to open each
  uploaded file, and a CSV download of all of them.
- **Settings**: who can answer (Draft, Open, Closed); sharing; **what an answer sets off**; the
  language; the campaign; which answers are the name, company, phone and email; the thank-you
  message; an optional closing date; how many megabytes of files the form may hold; delete.

## Where an answer leads

Two kinds of branch, answering different questions, and neither replaces the other
(`modules/marketing/formsFlow.ts`, pure, walked by the public page AND by the server at submit —
one walker, so a form cannot refuse an answer to a question it never showed):

- **A reveal** shows or hides a question ON the page somebody is looking at: "if you said Other,
  tell us what". Stored as the questionnaire's own `reveals`.
- **A jump** moves between sections: a section's own "After section 1 → continue / go to section
  N / submit the form", and a per-answer override on a single-answer choice question ("when they
  choose Existing customer, go to section 3"). A multi-select cannot jump — two answers would
  satisfy two destinations and nothing could say which wins.

A destination that stops existing is dropped at the write, never carried: a jump to a deleted
section would silently carry on to the next one instead, with nothing on screen to say the branch
the author drew is gone. **The walk stops when a section comes round again** — an author may
legitimately send somebody back, and by submit the answers are fixed, so the same section would
resolve the same jump for ever.

**An answer to a section nobody walked through is not an answer**: it is dropped at submit, so it
reaches neither the summary, nor the CSV, nor the notes of a lead somebody then rings about.

## What an answer sets off

A form is a front door, and what arrives through it is rarely all one thing: the same enquiry form
takes a request for a quote (Sales should have it today) and a note about an invoice (Sales should
not). So Settings holds a list of **rules** — *when `<question>` is `<answer>` → raise a Sales lead,
and hand it to `<person>`*. The first rule whose condition holds wins and the rest are left alone:
an enquiry is one enquiry, and three tickets for it is three people ringing the same person back.
An answer matching no rule is simply kept.

**The old single switch is read as a rule, not migrated by a script.** A form built before this
carries `createLead: true` and no rules, and it means exactly "every answer raises a lead" — which
is one rule with the `every answer` operator. `cleanSettings` layers it on READ, so every existing
form behaves identically and nothing has to be run against a live studio.

**Naming somebody needs `crmSales.tickets.assign`** — asked of whoever SAVES the rule, because by
the time it fires there is nobody to ask and it runs with the studio's authority. Invariant 5 at
the door where a person chooses. The picker offers nobody to somebody who may not assign.

## Files

A file question declares what it takes: the kinds (document, spreadsheet, presentation, PDF, image,
video, audio — none means any), how many files per answer, and how big each may be. **1, 2 or 4 MB**,
and the ceiling is the platform's rather than a product choice: `lib/media` reads the whole upload
into memory before Blob sees it and Vercel caps a request body at roughly 4.5 MB, so a "10 MB"
option would be a promise the route cannot keep.

Uploads go to `/api/f/<slug>/<code>/upload` — **the only path in the product where somebody with no
account writes bytes**, so every refusal is load-bearing: the form must be open, it must ASK the
question named, the type must be one that question accepts, the file must be under its limit, and
the form must not already hold its whole allowance (100, 500 or 2000 MB, counted on the form under
compare-and-set and shown in Settings). Over it, the form stops taking files and says so — an
upload that silently vanished would be an application nobody could finish. Rate limited separately
from answers (`RL.formUploadIp`), because an answer is a row and an upload is a bill.

The file is stored **private against the studio**, so reading it back is the ordinary membership
check `/api/media/<id>` already makes. The answer stores media ids and nothing else; the Responses
tab resolves their names. **A file uploaded into a branch somebody then left is deleted at submit**
and its space returned. An upload never submitted keeps its space until the cap stops the form —
which is what the cap is for.

**Preview** shows the real public page beside the editor, with nothing saved.

## Opening a form

A form is a **draft** until opened: its address shows nothing to the public. Opening is refused
while anything would stop it working (`openProblems`):

- no question to answer;
- it makes Sales leads and no answer is mapped to a phone or an email, or none to a name or company;
- **it collects contact details (makes leads, or asks for an email or phone) and has no required
  Consent question**, the owner's rule.

An **open** form's edits are held to the same rules, so a save cannot publish a broken form. A form
takes answers while Open and until the end of its closing date, if it has one.

## The public side

Address: **`/f/<studio-slug>/<code>`**, where the code is 16 random characters. The studio's slug is
already a public address (invariant 2); the code keeps a form nobody was given from being found.
Every miss (no studio, no code, a draft, Marketing or Forms switched off) is the same 404. The page
shows the studio's name and logo, the form in its own language and direction, and nothing of
nompany's site around it. It is not indexed by search engines.

Answers go to `/api/f/<slug>/<code>`:

- refused from another site's script, and rate limited to 20 answers per 10 minutes per address
  (across every studio's forms, `RL.formIp`);
- a hidden field only bots fill in: they are thanked and nothing is kept;
- judged only on the questions this person's answers led them to; an answer to a hidden question is
  dropped. Required, email format, numbers, offered choices and consent are checked on the page and
  again on the server by the same function.

**Answers are encrypted at rest** (`marketingFormResponses.answers`, `platform/db/sealCipher.ts`);
the studio reads them normally.

## Answers that become leads

With "Each answer becomes a Sales lead" on, every answer raises a Sales ticket at Lead through the
same door a campaign card uses (`raiseLead`, `docs/functionality/leads.md`): unassigned, waiting for
a Sales manager, named after the company (or the person when no company was asked), with the phone,
email and every answer in its notes. If the form names a campaign, the lead carries it as its source
and the campaign's deadline, and counts toward the campaign's results. The lead is recorded as
raised by the person who built the form. The answer is stored first, so a lead that fails to raise
never loses it. Sales switched off: no lead, and the switch is disabled in Settings.

## Sharing

- **Link**, with a Copy button.
- **QR code**, drawn by the server as an SVG, to show or download (for flyers and stands).
- **Embed code**: one `<iframe>` for any website (WordPress, Wix, Shopify, hand-written HTML); the
  only difference between sites is where it is pasted, which the screen says. Form pages, and only
  form pages, may be framed by any site (`next.config.mjs`: `frame-ancestors *` on `/f/*`).

## Who may do what

`marketing.forms` view/create/edit/delete. View reads forms and answers; edit changes a form and
opens or closes it. **A form with responses cannot be deleted**: close it instead. The winner-of-work
shape holds it at full, and existing roles that work campaigns catch up to it verb for verb.

## Not built yet

- Signature, picture choice and ranking questions (the questionnaire has them; the public page does
  not draw them).
- **Uploaded files are not encrypted at rest.** Answers are (invariant 18); the bytes behind a
  media id sit in Blob like every other file this product stores, reachable only through the
  membership check on `/api/media/<id>`.
- The studio's own colour on the form; only its name and logo are shown.
- Notifying somebody of each answer on a form that does not make leads.
- A form's answers are kept for ever; no retention period or erasure request yet
  (Audiences & Consent in the Marketing plan).
- Duplicating a FORM (a question duplicates; a form does not), and saving a form as the studio's
  own template.
- Choosing where "Other" appears on a multi-select, and branching on scales and numbers.
- A rule that does anything but raise a Sales lead — notifying somebody, raising a service request
  or a maintenance job. The shape is the record engine's trigger-and-action and is meant to grow.
- Adding a picture to a CHOICE (a question takes one; an option does not), and a video.
- A progress bar and shuffled questions.
- Checking that a submission came from a person beyond the hidden field and the rate limit
  (no CAPTCHA, on purpose).
- The editor is not live between two people editing one form: the second save wins.
