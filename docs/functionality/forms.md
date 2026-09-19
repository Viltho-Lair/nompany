# Forms (Marketing)

Built 2026-09-19, the shape the owner approved: a Google-Forms-like tool inside Marketing for
forms the public fills in: enquiries that become Sales leads, event registrations, customer
surveys. Section `marketing-forms`, which owns `marketingForms` and `marketingFormResponses`.
Code: `src/modules/marketing/formsModel.ts` (the rules, pure, shared with both screens),
`modules/marketing/forms.ts` (the service), `components/forms/PublicForm.js` (the page the public
answers, and the editor's preview: one component for both).

It reuses the questionnaire system's pure parts: the page-and-question shape, branching
(`lib/questionnaireLogic`), answer cleaning (`cleanAnswers`), and the per-question summary and CSV
(`lib/questionnaireSummary`). The questionnaire builder in `/super` is not reused: it is
console-styled, English only and nompany's own.

## The screens

**Forms** (`/<slug>/marketing-forms`): four templates along the top (Blank, Enquiry, Event
registration, Customer feedback) and the studio's forms below with their status, response count and
language. Choosing a template asks for a name and the form's language (English or Arabic); the
template's questions arrive in that language.

**A form** (`/<slug>/marketing-forms/<id>`), three tabs and a Preview button:

- **Questions**: pages on the left; each question opens to edit its text, help text, required, and
  what its type needs (choices, "allow more than one", an "Other" answer, a scale's range and end
  labels, a placeholder). Choice questions can show other questions depending on the answer
  ("when the answer is X, show these"), stored as the questionnaire's own `reveals`. Fifteen types:
  short answer, paragraph, email, phone, number, date, website, multiple choice, dropdown, yes/no,
  consent, rating, scale, recommend score (0–10), text only.
- **Responses**: a block per question (counts for choices, the replies for text), every response
  with a link to the Sales lead it became, and a CSV download of all of them.
- **Settings**: who can answer (Draft, Open, Closed); sharing; the language; the campaign; whether
  each answer becomes a Sales lead and which answers are the name, company, phone and email; the
  thank-you message; an optional closing date; delete.

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

- File upload, signature, picture choice, ranking and matrix questions (the questionnaire has them;
  the public page does not draw them, and an anonymous upload is a storage bill anybody can run up).
- The studio's own colour on the form; only its name and logo are shown.
- Notifying somebody of each answer on a form that does not make leads.
- A form's answers are kept for ever; no retention period or erasure request yet
  (Audiences & Consent in the Marketing plan).
- Duplicating a form, and saving a form as the studio's own template.
- Choosing where "Other" appears on a multi-select, and branching on scales and numbers.
- Checking that a submission came from a person beyond the hidden field and the rate limit
  (no CAPTCHA, on purpose).
- The editor is not live between two people editing one form: the second save wins.
