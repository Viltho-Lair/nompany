# Industries

What a company says it does, in two levels, the owner's decision on 29/09/2026 ("organized
like this way", pointing at Salesforce's industries). Sixteen industries, each with the
specialisms a company names itself by: 68 in all. A studio picks a **specialism** ("MEP &
specialist contractors"), never an industry alone. The list replaced a flat list of 25
statistical categories that had no place for general trading, facility management, MEP
contractors, clinics, pharmacies, restaurants or manpower supply.

`src/shared/industryCatalogue.ts` is the list, pure, in both languages. It is read by the
create-studio screen, Studio settings, the studio-wide alert and the public site.
`tests/industry-catalogue-model.mjs` holds it.

## The 25 fields of work are the templates

Everything that sets a studio up for its trade is keyed by a field-of-work name
(`FIELD_ACTION_MATRIX`): the service-action pool, the starter org chart, the role library,
the deal flow and the sections a trade starts with. About 25 places read it from
`studio.fieldOfWork`. **None of them changed.** Each specialism names the one field whose
setup fits it (`field`), and saving a specialism writes both:

- `industry`: the specialism's key, which is what the studio chose.
- `fieldOfWork`: that specialism's template, derived and never typed.

`createStudio` and the Studio settings route (`settings/service-actions`) are the two doors
that write it. Both derive the field from the specialism, so the two cannot disagree. Every
field is reachable through at least one specialism (asserted), so no setup went dead. Giving
a specialism its own setup later is a matter of pointing its `field` somewhere new.

**Keys are published and never renamed.** A studio stores the key, not the English name (the
old field stored its display string, which is how two copies of the list came to spell four
trades differently). The website's industry pages are addressed by the industry key.

"Something else" (`other`) stays, with the company's own words, and seeds nothing.

## Existing studios: the alert

The owner's rule: "current studios will need to update their fields". Nothing is migrated.
A studio that has an old field and no specialism (`needsIndustry`) keeps working exactly as
before and sees, above every screen, *"Choose your industry from the new list"*, linking to
Studio settings → Service actions (`#industry`). That section opens itself and offers the
specialism with the **same setup** as the studio's current field (`suggestedIndustry`).

- **Same setup: one click, nothing else moves.** The pool is not re-seeded, so a studio's own
  edits to its service actions survive the answer.
- **A different setup** goes through the confirm dialog that already existed. It lists what the
  pool gains and loses before anything is written.
- **Only people holding `administration.settings.edit` see the alert.** A member who cannot act
  on it would only be nagged about somebody else's decision.
- **A studio that chose nothing** ("I'll set this up later") is not asked. It skipped the
  question on purpose, and Settings still offers it.

The alert disappears on the save (the layout is refreshed).

## The picker

`SelectMenu` gained **group headings**: an option may carry a `group`, and a heading is
drawn where the group changes, beside the rows rather than as one, so the keyboard and ids
still count options only. A search matches a row's group too, so typing "health" lists all
four healthcare specialisms under their heading. A grouped list keeps its order while
filtering. Every existing dropdown carries no group and is unchanged.

## On the website

`/{en,ar}/industries` lists the sixteen with their specialisms. `/{en,ar}/industries/<key>` is one
industry: its sentence, who it is for, the departments at the heart of it, and a way in. An
unknown key is a 404. They are in the top menu, the footer and the sitemap (one entry per
industry, dated with the index), and `industries` is a reserved studio address.

The words are `shared/marketing/industries.ts`. **The departments on each page are chosen
(`FOCUS`), not computed, and computing them was tried first.** Unioning the create-studio
suggestion across an industry's specialisms listed 10 to 18 of the 18 departments everywhere.
A bank "started with" Point of Sale and a restaurant with Tendering, because trade gating
switches very little off. `FOCUS` names the few a company of that kind leans on first, by
section key. The names come from the product (`liveDepartments`), and the test refuses a key
that is not a live department.

## Not built yet

- **Trade gating barely narrows anything.** The create-studio suggestion switches on 12 to 18
  of 18 departments for every specialism (see above). That is a product question about
  `tradeSections`, not about this list.
- **Specialisms share their field's setup.** "Pharmacies" gets the retail org chart and
  "Clinics" the healthcare one. Nothing is tailored per specialism yet.
- **The registration questionnaire and the company profile still ask their own industry**
  from `src/lib/industries.ts`, a third list with its own wording. It should be folded into
  this one so a company is not asked the same thing two ways.
- **`/super` cannot see which studios have answered.** There is no count of studios still
  on the old list.
- **No page per specialism.** The website stops at the industry.
