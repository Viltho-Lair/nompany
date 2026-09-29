# Industries

What a company says it does, in two levels, and what that starts its studio with. The owner
decided on 29/09/2026 to have it "organized like this way", pointing at Salesforce's industries,
and added the same day: *"i need to control these industries, set in-active industries, and
each industry will have its own profile, what sections and departments does it offer ...
locking ... so no changes done on it unintentionally."*

Sixteen built-in industries hold 68 specialisms between them. A studio picks a **specialism**
("MEP & specialist contractors"), never an industry alone. The list replaced a flat list of 25
statistical categories that had no place for general trading, facility management, MEP
contractors, clinics, pharmacies, restaurants or manpower supply.

## Where it lives

| File | Holds |
|---|---|
| `src/shared/industryCatalogue.ts` | The built-in list and its rules: types, profiles, validation (`industryProblems`), the merge (`mergeIndustries`). **Server-side only** |
| `src/shared/industryPick.ts` | Choosing: options, labels, the alert, the suggestion. Pure; takes the list as an argument, so the browser never carries the built-ins |
| `src/lib/data/industries.ts` | The READ: built-ins with the console's rows laid over them, and `startersForStudio` |
| `src/lib/data/industryAdmin.ts` | The console's WRITES: save, add, lock, revert |
| `/super → Industries` (`components/super/IndustriesConsole.js`, `/api/super/industries`) | The screen |

Storage is one document, `REG.industryCatalogue`, holding the console's rows only. A row
replaces the built-in of the same key or adds a new industry. **Taking a row away returns the
code's version**, the same shape the ERP settings' trades already had.

## What an industry is

- **Names**, English and Arabic, and **a sentence** for its website page.
- **Active.** When off, the industry is not offered to new studios and not shown on the
  website: it leaves the list and the sitemap, and its page is a 404. **A studio that already
  chose it keeps working**, and may save its own answer again.
- **Specialisms**, each with a name in both languages, its own active switch, and the
  **setup template**: the field of work its service actions, role library and deal flow start
  from. A saved specialism is switched off, never removed, because studios hold its key.
- **The profile**:
  - **sections**: the departments a new studio starts with. They are **pre-filled** on the
    create screen, and the owner can still say yes to any other there or switch more on later
    in Studio settings (the owner, 29/09/2026: "but still user can select more if he wants").
  - **departments**: the org chart seeded into a new studio's empty department register.
- **Locked.** Every change is refused (`locked`, 409) until somebody unlocks it with its own
  call and its own confirmation. The lock is checked inside the compare-and-set, so a lock set
  a second earlier in another tab wins. Locking a built-in the console never changed stores the
  code's version, locked, so it also holds still against a later release.

**A PROFILE IS A SEED.** Editing one changes the next studio created, never one that exists.
Its switches and org chart are its own from the first minute.

**Keys are published and never renamed.** A key is minted from the English name when the
industry or specialism is added, and cannot be edited afterwards. The website addresses an
industry by its key, and a studio stores its specialism's key. There is **no delete**: an
added industry is switched off, and a built-in may be reverted.

## Who reads it

- **Creating a studio** (`createStudio`) refuses a specialism that is switched off. It writes
  `industry` and the specialism's template to `fieldOfWork`. Its sections come from the
  owner's answers on the create screen, which the profile pre-filled (`suggestedByIndustry`),
  or from the profile itself when a caller sends none. Only a studio with no industry falls
  back to the old field-of-work gating.
- **The department register** seeds from `startersForStudio`: the industry's profile when the
  studio has one, its field of work's chart otherwise. Master data's "add what is missing"
  offers the same. Roles per department still follow the field of work (the role library is
  keyed by it).
- **Studio settings** offers the console's list and refuses a switched-off specialism, except
  the studio's own current answer.
- **The website** (`lib/industryPages`, through the public minute cache) shows the active
  industries. **The departments on an industry's page ARE its profile's sections**, so the page
  and a new studio cannot disagree. Computing them from the old trade gating was tried first;
  it listed 10 to 18 of the 18 departments everywhere, so a bank "started with" Point of Sale.

## Existing studios: the alert
The owner's rule: "current studios will need to update their fields". Nothing is migrated.
A studio that has an old field and no specialism (`needsIndustry`, which counts any stored key as an answer so the layout never reads the catalogue) keeps working exactly as
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

## Not built yet

- **Studios created before the profiles keep the old gating's sections.** Nothing re-applies a
  profile to an existing studio, by design; the Sections panel is where one switches off what it
  does not use.
- **The profile is per industry, not per specialism.** A pharma company under Healthcare gets
  Healthcare's sections and org chart. Service actions, roles and the deal flow do follow the
  specialism's template.
- **No before-and-after.** Every console write is in the audit log (who, and which call), but
  not what the industry looked like before it, so a mistaken save cannot be undone from the log;
  the lock is the guard against one.
- **The registration questionnaire and the company profile still ask their own industry**
  from `src/lib/industries.ts`, a third list with its own wording. It should be folded into
  this one so a company is not asked the same thing two ways.
- **`/super` cannot see which studios have answered.** There is no count of studios still
  on the old list.
- **No page per specialism.** The website stops at the industry.
