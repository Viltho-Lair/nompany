# Official values — a country's registration, tax and address details

**What it is.** When the Owner picks the Studio's country in Studio settings, a section
called **Official values** lists what that country's government requires a company to
carry: registration numbers, tax numbers, the national address, social-insurance and
labour-ministry ids, fleet licences. The Studio fills in its own values. Every document
reads them through one resolver, which returns a value only when it is **selected, filled
and applicable**, and an empty string otherwise.

Researched for seven countries on 18/09/2026: Saudi Arabia, the UAE, Jordan, Egypt, the
United States (federal only), the United Kingdom and Germany. The research, with a source
and a check date for every field, is the artifact published in Phase 1; each field's
`source` in its country file repeats it.

## What it stores

- **The rules are ours, not the Studio's.** One JSON file per country in
  `src/shared/compliance/countries/<CODE>.json` (`CountryDefinition`, typed in
  `shared/compliance/definition.ts`): each field's key, department, EN/AR label and hint,
  `required` (mandatory / conditional / optional), `appliesWhen`, `normalize`,
  `patterns`, `checksum`, `maxLength`, `showOn` (which kinds of document print it) and
  `source` (label, URL, date, and whether it was checked or is uncertain).
- **The values are the Studio's**: `studio.officialValues`, a flat map of key → string on
  the studio record. **Keys are shared across countries on purpose**
  (`vat_registration_number`, `legal_name_ar`, `commercial_registration_number`), so
  switching Saudi Arabia → Jordan keeps what both define.
- **Who changed what**: an append-only list at `S.officialHistory(studioId)` —
  `{ id, at, byCollaboratorId, byAlias, country, key, from, to }`, one entry per changed field, plus a
  `key: "country"` entry whenever the country changes, since that decides which values
  print at all. The last 50 are shown on the screen.

`legalInfo` (Studio settings → Legal information, free-form rows) is untouched and stays
beside it for anything a country file does not name.

## What it does

- **The Owner alone chooses the country.** The settings PUT refuses a country change from
  anybody else (`owner-only`, 403), and the country row is read-only with a sentence
  saying why. Filling the values is `administration.settings.edit`, the same right as the
  rest of Studio settings; reading is `administration.settings.view`.
- **Only the selected country's fields are shown.** The GET builds the form from that
  country's file alone. A Studio with no country, or a country with no file, sees a
  sentence and no fields.
- **The Owner fills everything from scratch.** Nothing is pre-filled or copied from
  `legalInfo`.
- **Validation is one pure function, run twice.** `valueProblem` normalises the value
  (digits only, spaces removed, or trimmed), then checks the length, the country's
  patterns and its checksum. The panel runs it as the user types and the server runs it
  again on save. Checksums are a closed set named by algorithm
  (`shared/compliance/checksums.ts`: `mod97-9755` for UK VAT, `iso7064-mod11-10` for
  German VAT, `luhn`), so a definition file cannot bring code of its own.
- **A save is all or nothing.** One bad field refuses the whole save (422) and names every
  field it refused. A key the country does not define is refused (`unknown-field`). A
  blank value clears the field. The diff and the write happen inside one function patch
  on the studio row (invariant 8), and each change is appended to the history.
- **"Applicable" is decided per field.** `appliesWhen: { vatRegistered: true }` needs a
  VAT rate on the Studio. `appliesWhen: { sectionOn: "logistics" }` needs that department
  switched on (the dashboards' `switchboard`); a caller that does not say which sections
  are on gets "not applicable", never a guess. A field that does not apply is shown faded
  with the reason, and it does not print.
- **The resolver** (`shared/compliance/resolve.ts`) returns `""` unless the country is
  selected, the field is defined for it, it applies, a value is filled and that value is
  valid under the **current** country's rule. `official(studio, key)` gets one value,
  `officialForDocument(studio, kind)` gets the fields a document kind prints, in file
  order, and `officialValuesFor(studio)` gets every value that would print. So a value kept
  from a previous country that does not fit the new country's format never prints. The
  panel marks it in amber so the Owner can correct it.
- **Shared code names no country.** Everything a country decides is in its file.
  `tests/official-values-model.mjs` asserts that no country-code literal appears in the
  shared compliance code.

## What prints them

- **Quotations and invoices** print through the studio's published layout
  (`customer-documents.md`). `mergeValuesFor` adds every `official.<key>` any country
  defines — empty unless this Studio's country defines it and it resolves — and
  `company.official`, the lines the country's file marks for that kind (`quote` or
  `invoice`; any other document prints what a `letter` would), labelled in the language
  the document prints in. Section switches are the Studio's own, so a fleet licence prints
  only while Logistics & Fleet is on.
- **An empty official value prints nothing** — no dash, no bracketed name — and a paragraph
  holding only empty official values is dropped with them (`fill.ts`). Every other field
  still prints a dash when blank; this rule is the owner's for official values alone.
- **A layout written in one country keeps working in another.** Its `official.*`
  placeholders are accepted by shape and resolve to nothing when the new country does not
  define them.
- **The starter letterhead** places `company.official` and, when the studio has legal rows,
  `company.legal` — not a line per legal row.
- **Nothing prints twice.** The `company.legal` composite and the receipt's legal rows drop
  any row whose value is the same number (letters and digits compared) as an official value
  printing on the same document. A row placed on its own (`legal.<label>`) is untouched —
  an author who placed it asked for it.
- **The POS receipt** (`pos.md`) prints the official values marked `receipt`, then the
  remaining legal rows, on the till's slip and on every reprint.
- `tests/official-values-model.mjs` prints the starter invoice for a Saudi studio and a US
  one through the real fill and asserts the text: the Saudi one carries its VAT, CR and
  Arabic name, the US one only its company name.

## How to add a country

1. Write `src/shared/compliance/countries/<ISO-3166 alpha-2>.json` with the shape of an
   existing file. Reuse an existing key wherever the concept is the same, so a Studio
   switching countries keeps the value. Give every field a `source` with a URL and a
   `checked` date. Mark anything unconfirmed `"status": "uncertain"`.
2. Import it and add it to `COUNTRY_DEFINITIONS` in `countries/index.ts`.
3. Run `node tests/official-values-model.mjs`. It refuses a file on disk that is not
   registered, a malformed definition (unknown department, document kind or checksum, an
   invalid pattern, a duplicate key), and checks the published test vectors.
4. If the country needs a checksum that is not in `checksums.ts`, add it there by
   algorithm name with a published vector in the test, never by country.

No screen, route or migration changes. The next time the Studio settings page loads, the
fields are there.

## Not built yet

- **Payslips and HR letters do not print them yet** (slice C). Neither has a layout of its
  own yet.
- **Sales orders are not printed at all** — there is no print view for one — so there is
  nothing for the official values to appear on.
- **An existing layout does not gain them by itself.** A studio's published quotation or
  invoice layout prints official values only once somebody places
  *Official registration details* on it; only a new starter carries it already. Its legal
  rows placed one by one keep printing as they did, duplicates included.
- **The picker labels individual official fields in English**, in both languages; the
  composite line prints in the document's language.
- **No ZATCA QR or e-invoice XML.** The values are ready for them; the QR waits on the
  open decision in `progress.md`.
- **Department rules still live in code.** `taxProfile.ts`, the employment pack,
  `COUNTRY_PRESETS` and the WPS employer id have not moved onto the definitions yet
  (slice D). So the UAE's MoHRE/WPS employer id is deliberately absent from `AE.json`
  until then.
- **Per-employee official fields** (national ids, IBAN for WPS, GOSI numbers per person)
  are not here. This covers the Studio's own values only.
- **The US has no state layer.** Federal fields only, plus the state of formation and the
  state's entity number as free text. State tax and registration rules are to come later,
  on the owner's decision.
- **No expiry reminders.** The UAE trade-licence expiry is stored as a date and nothing
  reads it yet.
- **A printed quotation or invoice has not been opened in the sandbox.** The panel was
  (18/09/2026: Saudi fields, live refusal of a bad VAT number, a save normalising
  spaces, the history naming the Owner, the VAT note once the rate was cleared), and so was
  the till's receipt heading through its API, dedupe included. A layout printed end to
  end is asserted by the model test only.
