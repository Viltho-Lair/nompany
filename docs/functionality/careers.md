# Careers

nompany's own job openings and the applications to them. Written and read in the console at
`/super/careers` (27/09/2026); shown at `/<locale>/careers` and `/<locale>/careers/<id>`.

Until this screen existed nothing wrote the openings: the careers pages read a collection no
screen could fill, and every visitor saw "no open roles".

## Openings

- **Bilingual**, because the pages always read `<field>_en` / `<field>_ar` through
  `field(record, base, locale)`, falling back to English: position, department, location,
  description. English is required to open a position; an empty Arabic field shows the
  English.
- **Type** is one of full-time, part-time, contract, internship; it fills `type_en`/`type_ar`,
  which the pages show as a tag and `jobPostingLd` reads for `PART_TIME`.
- **The description is written as text** (`descText_*`): a blank line starts a paragraph,
  lines starting `- ` become a list, `**bold**` is bold. It is escaped and turned into the
  HTML the page renders (`desc_*`) by `textToHtml`, using only tags `RichText`'s sanitiser
  already allows — so typed markup can never reach the page.
- **Open or closed.** Only open positions show; a closed one leaves the list and its own
  address answers 404, so no apply form stays live for it. A row with no status (written
  before it existed) counts as open.
- JSON-LD `datePosted` is the opening's own `createdAt`, no longer "today" on every request.
- Deleting an opening keeps its applications; each keeps the title it was sent for.

`src/shared/careers.ts` (pure: `cleanJob`, `jobProblem`, `textToHtml`, `isOpen`),
`src/lib/data/careers.ts`, stored in `SITE.collection("careers")` with `ID.job()` ids.

The apply form (`site/pages/careers/ApplyForm.jsx`) is in the site's design; its fields,
checks and post are unchanged.

## Applications

Sent by the public apply form (`/api/applications`), which stores the application, keeps the
CV as private media and emails both to the support address. The console lists them newest
first, filterable by opening, with contact details, the message, a status (new, reviewing,
shortlisted, declined, hired) and delete. An application whose email failed is flagged
**Email not sent** — the one case in which nobody would otherwise hear of it. The sender's IP
is stored for abuse and never shown.

- **The CV has one door**: `/api/super/careers/applications/<id>/cv`, SuperAdmin only, only
  for the file that application names, served as a download and never cached. The public
  media route hands a stranger's CV to nobody.
- **Deleting an application deletes its CV** too: it is personal data kept only for that
  application.

Routes: `/api/super/careers` (GET, POST), `/api/super/careers/<id>` (PUT, DELETE),
`/api/super/careers/applications` (GET), `/api/super/careers/applications/<id>` (PATCH
status, DELETE), `…/<id>/cv` (GET). All `auth: "super"`. Tests: `tests/careers-model.mjs`.

## Not built yet

- No email to the candidate when their status changes; statuses are for the team.
- No notes or ratings on an application, and no export.
