# Language — which words, which direction

## What it is

Two languages, **English and Arabic**, and three different things decide which one you get.
They are ranked, and the ranking is the whole feature:

1. **The URL wins where there is one.** `/en/…` and `/ar/…` are the public site, the auth
   screens, the account hub and the questionnaire. The proxy lifts the segment onto
   `x-locale` and the root layout puts `lang`/`dir` on `<html>`. A shared link must open in
   the language it was shared in, so nothing overrides this.
2. **The person's own choice, where the URL has no room for one.** A studio's address IS
   its slug — `nompany.com/<slug>/…` — so there is nowhere to put a locale without giving
   every tenant two addresses. The choice is a cookie, and the studio shell reads it.
3. **The studio's setting, as the default.** A field on the studio record, admin-only,
   under `studio.settings.edit`. It is what a colleague reads the studio in until they
   choose otherwise.

`preferredLocale(preference, fallback)` in `src/shared/locale.ts` is the resolver for 2-over-3.
Anything it does not recognise — including an edited cookie — falls back to the studio's
setting, never to English.

**Direction follows the resolved language, not the tenant's.** `dirFor` gives `rtl` for `ar`.
Hand-written CSS mirrors from the attribute alone (`ps-`/`pe-`/`ms-`/`me-`/`border-s-`); MUI
does not, so an Arabic studio nests `MuiRtlProvider`, loaded through `dynamic()` so an
English tenant never fetches it.

## What it stores

```
cookie  lang=en|ar        path=/, one year, samesite=lax   the person's choice
g:studios <id>.language   "en" | "ar" | absent             the studio's default
```

The cookie is **not** a record. It is not on the user, not on the collaborator, and not in
Redis: it is readable on the server so `lang`/`dir` ship in the first byte of HTML, it
belongs to the person rather than to one membership so it carries across every studio they
are in, and it costs no hop on a path that counts them. `UI_LANG_COOKIE` names it in one
place; the client writer and the server reader both import that.

Nothing about a person's language is written to the settings route, so its goldens are
unchanged — the tenant's `language` field still is the whole of what the tenant decided.

## What it does

**Where the button is.** Every surface now has one, and they are all the same `LangMenu`
except the auth pill, which is a two-option toggle by design:

| Surface | Control | Effect |
|---|---|---|
| Public site (`Nav`) | `LangMenu` | Navigates to the other locale |
| Auth screens (`AuthShell`) | Pill toggle | Navigates, keeping the sub-path |
| Account hub (`AccountHome`) | `LangMenu` | Navigates to `/<code>/account` |
| Questionnaire | `LangMenu` | Navigates to `/<code>/questionnaire` |
| Studio header (`StudioFrame`) | `LangMenu` | Writes the cookie, `router.refresh()` |
| Marketing site (`TopNav`) | `LangMenu` | Navigates to the other locale |
| `/super` | none | English-only, deliberately — it is nompany's own console |

**Every selection is remembered**, wherever it is made: `LangMenu` writes the cookie itself
(`rememberLocale` in `src/lib/langCookie.js`), so picking Arabic on the marketing site is
still Arabic on the far side of the login, where the URL can no longer say so.

**What is translated: every screen a person touches.** The marketing site, the account and
auth pages, all twelve departments and their dialogs, empty states, error messages and
chart labels, the planner, the task board, the quality document editor and the access
grid — both languages, roughly 1,900 strings. What is not is listed at the bottom, and
each entry says why.

`src/shared/i18n.ts` holds the public site's copy in one object, because that side is
server-rendered and the dictionary is handed down as a prop. `src/shared/studio/` holds the
studio's, **one module per surface** — `shell`, `settings`, and one per department —
because studio screens are client components and a single object would land in every chunk.
Nothing may enumerate those modules: a barrel or a registry makes all of them reachable
from every screen and the split stops paying. Three of them are shared rather than owned by
a department: `common` (the forty words every screen says), `chrome` (the toolbar, filter
panel, column picker and chart empty-states) and `statuses`.

**Several vocabularies translate on DISPLAY only**, each keyed by a token that does not
move: `statuses.ts` (`Draft`, `Approved`, `In Progress`), `stages.ts` (the engagement
registry), `sections.ts` (the twelve department names, from `SECTION_DEFS`) and `access.ts`
(the 102-key permission catalogue — its groups, its rows and its extra powers). Every one
of them is defined by the CODE: nobody typed them, the transitions and the resolver compare
against them and the goldens pin them, so what is stored, compared and returned by the API
is unchanged and only the word on screen differs.

The same shape covers the keyed tables inside a screen — task status, priority, zoom level,
project health, accent colour, and the finance, planner and live-view column lists. Each
entry keeps its colours and swaps `label` for a `labelKey`, and one resolver per dictionary
(`plannerWord`, `boardWord`, `liveColumnLabel`, `areaLabel`) turns the key into words. Two
consequences are the point: a saved column choice is a list of keys, so it survives a
language switch; and a React key stops being a label, which would have remounted every card
on the switch.

**Where a screen reads the language from**: one context per surface, and they are three
separate modules on purpose — `StudioLocaleProvider` (`components/studio2/locale`), set
once by the shell and by `FullScreen` for the six screens that render outside it;
`LandingLocaleProvider` (`components/landing/locale`); and `AccountLocaleProvider`
(`components/public/locale`), on the `[locale]` layout. Not a prop: a hundred-odd
components need it, most of them several levels below a component whose only prop is
`slug`. Not one shared context either: a context module is imported by everything that
reads it, so one provider would put the studio's module in the marketing bundle and the
marketing site's in the studio's.

**What is never translated, and this is not an omission.** Record contents, documents,
questionnaire questions, service actions, and every other word a tenant or an admin has
typed are **data**. They are stored once in whichever language they were written and no
dictionary touches them. Two colleagues on opposite settings read the same tickets and the
same names; they just reach them through their own menus.

**Between those two there is a third case: STORED, but written by us.** A studio is seeded
with five roles and four task-board columns. Nobody typed them — we did — but they are
stored the moment the studio first reads them, and the studio renames them afterwards.
Translating those on display would overwrite a rename, so they take the **studio's**
language once, at seed time, and are data from then on. `starterRoles.ts` holds those
words; the board's four are in `board.ts`. The studio's language and not the reader's,
deliberately: a per-person override must not let whoever opens the screen first decide
what everyone else sees. (A third set lived here — six built-in planner templates, in
`plannerTemplates.ts` — until the presets themselves were removed as demo data.)

**Counts are functions, not templates.** English needs two forms and Arabic needs four in
the ranges these screens reach (1, 2, 3–10, 11+). `${n} item(s)` is only correct in the
language it was written in, so every counted phrase is a function in the dictionary.

## Not built yet

- **`/super` has no `lang`/`dir` and no dictionary.** Deliberate: it is nompany's own
  console, not a tenant surface.
- **A dictionary can drift from its screen and nothing will say so — except in one
  direction.** Gate A's assertion 11 now walks all 27 dictionary modules and fails on a key
  that is missing from `ar`, or present and still holding the English string. That is the
  quiet failure: it reads as English to an Arabic reader and looks finished to everyone
  else. All 2,675 keys, three of them listed as deliberately identical (`google`,
  `microsoft`, `nompanyCom`).

  **The direction it does NOT cover is the larger one: screen → dictionary.** Nothing
  checks that a key a screen reads exists, or that a key nobody reads is removed. That is
  the failure that breaks a page rather than mistranslating it — an unbound `tr` read
  throws on the FIRST REQUEST, and neither `tsc` nor `next build` sees it, so a screen can
  ship green and dead. `check_tr.py` finds it and lives in `.i18n-scratch/`, uncommitted.

  The assertion shipped with a hole worth remembering, because it is the mistake the next
  version will make too: it matched whole LINES — `key: "…"` — which admits a quoted
  string and nothing else, so all 80 function-valued keys and 12 whose value the formatter
  wrapped were exempt from both halves. 93 of 2,675, and precisely the wrong 93: every
  counted phrase is a multi-line function, because Arabic needs four forms, so the entries
  hardest to check by eye were the ones the gate could not see. It walks each value to its
  matching comma now. Match where a value ENDS, never what it looks like.
- **There is no "follow the studio" option.** Once the cookie is set it stays set; a person
  cannot return to inheriting the tenant default except by picking the language that
  happens to match it.
- **The preference does not follow the person across devices.** It is a cookie, so a new
  browser starts on the studio's default again.
- **Nothing tells an admin that the studio setting is only a default.** The Settings hint
  says so in words; there is no indication of how many members have overridden it.
- **No test renders a studio in Arabic.** The resolver and the direction are asserted as
  pure values in `tests/suite.mjs`. That the screens actually render was checked by hand,
  in a sandbox studio, across nine departments — which is how four crashes were found that
  neither `tsc` nor `next build` reported: a Server Component calling a client hook, and
  `.jsx` files reading a name that did not exist. Nothing automated covers that today.
- **Emails, in-app notifications and PDF documents are English-only.** The producers write
  their sentence at WRITE time — `notifyCollaborators(…, { title: "A leave request is
  waiting" })` — so a stored notification already has one language for everybody, whatever
  the reader chose. Fixing it properly means storing a code and its parameters and
  rendering the sentence on read, which changes the notification's stored shape; seeding
  in the studio's language, the way roles and board columns are, would be a smaller change
  and half-right. Neither has been decided.
- **The public site's `<meta>` description, the manifest and `lib/seo.ts` are
  English-only.** They are rendered per-locale, so the Arabic site is served with English
  metadata — a discoverability bug rather than a reading one, and `seo-improver`'s to take.
- **Reference lists are English-only**: `lib/cities.ts`, `lib/industries.ts`,
  `lib/legalTerms.ts`, the questionnaire's own elements, and the pricing labels. Some of
  those are catalogue data a studio picks from rather than copy, and at least two of them
  (industries, cities) should arguably be driven from Studio settings instead of shipped —
  which is a product question, not a translation one.
- **Dates are a separate axis and stay that way.** `fmtDate`/`fmtDateTime` read
  `dateLocale` from the tenant's company settings (default `en-GB` → dd/mm/yyyy), which the
  studio shell configures once client-side. Nothing connects it to the reader's language, so
  a person on the Arabic override still gets the company's date format. That is probably
  right — a date on a shared record should read the same for everyone — but it has never
  been decided, only inherited.
