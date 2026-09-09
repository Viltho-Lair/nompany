# The daily band

One strip across the top of every studio, on every screen. It carries a short greeting and a
quotation, it changes at midnight server time, and a reader can close it for the rest of the
day. Several messages share the one strip: it shows one at a time, moves on every five
seconds, and draws a dot for each.

It is platform-wide. Every studio reads the same words on the same day — this is a message
from the product, not a per-tenant setting — so nothing here touches `collection_rows` and
the answer is identical for every caller.

## Where it lives

| File | Holds |
|---|---|
| `src/shared/greeting.ts` | Pure: the types, the colour arithmetic (`bandCss`), the validation, the fallback rotation, and `resolveBand` |
| `src/lib/data/greeting.ts` | The stored half: the config, the day's generations, the model call |
| `src/app/api/studios/[slug]/greeting/route.ts` | What a studio reads (GET, studio auth) |
| `src/app/api/super/greeting/route.ts` | The console: GET, PUT to save, POST to regenerate today |
| `src/components/studio2/DailyGreeting.jsx` | The band — rotation, dots, dismissal |
| `src/components/super/GreetingEditor.jsx` | /super → Application → Greeting |
| `.greeting-band` in `src/app/globals.css` | The two gradient layers and the shadow |

Two keys: `g:greetingConfig` is what a person typed, `g:greetingToday` is what the model
wrote today. They are separate because one changes when somebody says so and the other turns
over on its own — writing them together would make every generation race every edit.

## Automated and written messages

A message is one or the other, and the console says which every time it draws one.

**Automated** is written by the model, once per server day, for the whole platform. It runs on
the AI key set in **/super → Application → Nova** — the same credential Nova's chat uses, not
a second one. The first reader of the day pays for the generation and everybody after them
reads it back.

**Written** is the words in the boxes, every day, until somebody changes them.

An automated message that has nothing generated falls back to a built-in rotation of seven
greetings against eight quotations, offset by the message's position so two automated messages
never fall back to the same line on the same day. That is what shows when no key is set, when
the provider is down, and before the day's first generation lands — the header cannot be
empty and cannot break on somebody else's outage.

**Failures are remembered for the day.** A key that was wrong when the day's first reader
arrived would otherwise cost one model call per page view. An ABSENT key is not a failure and
records nothing, so adding one works on the next page load rather than tomorrow.
"Regenerate today's" in the console clears the record, which is the way out of both a fixed
key and a line nobody wants under the company's name.

**The attributions are not verified.** The fallback quotations were written down from memory
and at least one is contested. The model is told to choose a different quotation rather than
guess an author, which is the cheap half of the problem and not the whole of it.

## Colour

Each message paints itself through three custom properties — `--band-bg`, `--band-border`,
`--band-glow` — that `.greeting-band` reads, with the house colours as its `var()` fallbacks.
So a band with nothing set renders exactly as it did before messages could be coloured.

**House colours** are the logo ramp, cyan → amber → red: full strength on the 1px border,
mixed into `--geex-page` at 14% for the fill. The fill layer must stay OPAQUE — a see-through
padding-box layer lets the border ramp show through the whole box, which is a comment in
`globals.css` that was paid for once already.

**Custom** takes the picked colours literally, one to six stops on each layer, and does not
tint them: somebody who chose a background chose a background. One colour is a solid — and it
is doubled on the way out, because `linear-gradient(90deg, #fff)` is invalid CSS that drops
the declaration and takes the fill with it.

**A colour is a hex literal and nothing else.** These strings are substituted into a
`linear-gradient()` that renders in every studio in the product, so `#rgb`, `#rgba`, `#rrggbb`
and `#rrggbbaa` are accepted and everything else falls back to the house ramp. The console's
picker is `<input type="color">`, which can only produce the accepted shape; the validation is
on the server, where it counts. Only a super admin can write these, which lowers the odds and
not the cost.

## Dismissal

The browser's, not the database's. Closing the band hides it for the rest of the day under
`greeting-dismissed:<the server's date>`, so tomorrow's band has a key nobody has written yet
and appears on its own. Nothing expires and nothing is swept.

It closes the BAND, not a message — "not now" is about the strip, not about whichever sentence
happened to be showing. Storing it server-side would be a row per member per day in a shared
table to remember something true for one person on one device until midnight.

`localStorage` can throw — a private window, blocked site data — and a failure means "not
dismissed", which shows the band. A message nobody can dismiss is a smaller fault than a
message nobody can see.

## Why there is no cron

"Every day at 00:00" describes when the message CHANGES, not when work has to happen. The date
decides which generation is current, so the turnover is a comparison rather than a job: it
happens for every reader at once the instant the clock rolls over, with nothing scheduled and
nothing that can fail to run.

A cron would have bought a job that fails silently, a document that is stale until it runs,
and a sixth entry in `vercel.json` — on a plan where a schedule the host will not accept
rejects the whole deployment rather than just the job. That has already cost this project
eight pushes.

## The rotation stops for two people

Anyone hovering or tabbing into the band, and anyone whose system asks for reduced motion. The
second is not decoration: a strip of text that rewrites itself every five seconds is what that
setting exists to stop, and the dots still work, so turning the timer off removes nothing but
the surprise.

## Not built yet

- **No scheduling.** A message is showing or it is not. There are no start and end dates, so
  an announcement for one week is turned on and off by hand.
- **No targeting.** Every studio reads every active message. There is no way to send one to a
  single studio, a plan, or a language.
- **One language.** The words are stored as typed and are not translated — an Arabic studio
  reads whatever was written in the console. The band's own furniture (the close button) is
  bilingual; its contents are not.
- **The model is not asked for Arabic**, for the same reason: there is one set of words per
  message and no field to hold a second.
- **No history.** Yesterday's generated words are overwritten, so there is no record of what a
  studio was shown last week.
- **No separate key.** Automated messages share Nova's credential. Setting a key to make the
  greeting write itself also makes Nova's chat live, and there is no way to have one without
  the other.
- **Order is the list's order**, and there is no way to reorder except by removing and
  re-adding a message.
