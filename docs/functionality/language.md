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
| `/super` | none | English-only, deliberately — it is nompany's own console |

**Every selection is remembered**, wherever it is made: `LangMenu` writes the cookie itself
(`rememberLocale` in `src/lib/langCookie.js`), so picking Arabic on the marketing site is
still Arabic on the far side of the login, where the URL can no longer say so.

**What is translated: all of it.** Every studio screen, dialog, empty state, error message
and chart label, in both languages — roughly 1,400 strings.

`src/shared/i18n.ts` holds the public site's copy in one object, because that side is
server-rendered and the dictionary is handed down as a prop. `src/shared/studio/` holds the
studio's, **one module per surface** — `shell`, `settings`, and one per department —
because studio screens are client components and a single object would land in every chunk.
Nothing may enumerate those modules: a barrel or a registry makes all of them reachable
from every screen and the split stops paying. Three of them are shared rather than owned by
a department: `common` (the forty words every screen says), `chrome` (the toolbar, filter
panel, column picker and chart empty-states) and `statuses`.

**Two vocabularies translate on DISPLAY only**, keyed by a token that does not move:
`statuses.ts` for every status word (`Draft`, `Approved`, `In Progress`) and `stages.ts`
for the engagement registry's stage names. Both are defined by the CODE — nobody typed
them, the transitions compare against them and the goldens pin them — so what is stored,
compared and returned by the API is unchanged, and only the word on screen differs.

**Where a screen reads the language from**: `StudioLocaleProvider` in
`components/studio2/locale`, set once by the shell (and by `FullScreen` in the studio page
for the six screens that render outside it). Not a prop: eighty-odd components need it,
most of them several levels below a component whose only prop is `slug`.

**What is never translated, and this is not an omission.** Section names, role names,
record contents, documents, questionnaire questions, service actions, and every other word a
tenant or an admin has typed are **data**. They are stored once in whichever language they
were written and no dictionary touches them. Two colleagues on opposite settings read the
same tickets and the same names; they just reach them through their own menus.

**Counts are functions, not templates.** English needs two forms and Arabic needs four in
the ranges these screens reach (1, 2, 3–10, 11+). `${n} item(s)` is only correct in the
language it was written in, so every counted phrase is a function in the dictionary.

## Not built yet

- **`/super` has no `lang`/`dir` and no dictionary.** Deliberate: it is nompany's own
  console, not a tenant surface.
- **The public marketing site's own pages are only partly translated.** The header, footer,
  auth screens, account hub, careers, terms and the questionnaire are; the landing page's
  section copy is not.
- **A dictionary can drift from its screen and nothing will say so.** The extraction tool
  (`.i18n-scratch/`, not committed) found the strings once; there is no check that a key
  added to a screen later gets an Arabic value, and no check that an unused key is removed.
  `check_tr.py` catches an unbound read, which is the failure that breaks a page, but not a
  missing translation, which just reads as English.
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
- **Emails, notifications and PDF documents are English-only.** The notification producers
  write their text at write time, so a stored notification has one language for everybody
  regardless of who reads it.
- **Dates are a separate axis and stay that way.** `fmtDate`/`fmtDateTime` read
  `dateLocale` from the tenant's company settings (default `en-GB` → dd/mm/yyyy), which the
  studio shell configures once client-side. Nothing connects it to the reader's language, so
  a person on the Arabic override still gets the company's date format. That is probably
  right — a date on a shared record should read the same for everyone — but it has never
  been decided, only inherited.
