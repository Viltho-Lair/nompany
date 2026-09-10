# Broadcast

One strip across the top of every studio, on every screen. It carries a short greeting and a
quotation, it changes at midnight server time, and a reader can close it for the rest of the
day. Several messages share the one strip: it shows one at a time, moves on every five
seconds, and draws a dot for each.

It is platform-wide. Every studio reads the same words on the same day — this is a message
from the product, not a per-tenant setting — so nothing here touches `collection_rows` and
the answer is identical for every caller.

**It is edited at `/super/pulse/broadcast`**, the last item in the console's bottom bar. It
began as `/super/application/greeting`, one row down a menu of eleven; then it became a pane
that slid in beside the Pulse wall; since 10/09/2026 it is an ordinary route under the Pulse
shell, beside every other console screen. The slide went when the whole console joined the
bar: eight of the nine screens moving in read the store as Server Components that cannot
slide, and one special case among ten screens is not worth a pane mechanism of its own.

**THE CODE STILL SAYS "GREETING" EVERYWHERE, and that is deliberate.** The storage keys
(`g:greetingConfig`, `g:greetingToday`), the API paths and the component names were not
renamed with the label. Renaming a stored key strands every studio's configuration behind a
name nothing reads any more, for no gain a person can see — the feature is called Broadcast
where anybody reads it and `greeting` where only the code does.

## The console

`/super/pulse/broadcast`, from the bottom bar. A register: the message list on the left, one
message open on the right, and the page itself never scrolls — the Pulse chrome is exactly one
screen tall with the header and bar fixed, so the list scrolls inside its own column.

**A message is listed by a TITLE its author types**, never by its words, and no studio ever
reads that title. An automated message has no words of its own — they are generated three
times a day — so a register listing by text would rewrite itself at noon.

**Settings** in the top bar holds the AI key. **Save Drafts** saves without sending.
**New Message** adds a draft and opens it.

For an automated message the editor shows **what the key wrote for each of the three
dayparts**, or "Not generated" against the ones that failed — which is the only way to notice
that one of the three is missing when you can only ever see your own hour.

## Where it lives

| File | Holds |
|---|---|
| `src/shared/greeting.ts` | Pure: the types, the dayparts, the colour arithmetic (`bandCss`), the validation, `resolveBand` |
| `src/lib/data/greeting.ts` | The stored half: the config, the day's generations, the model call |
| `src/app/api/studios/[slug]/greeting/route.ts` | What a studio reads (GET, studio auth) |
| `src/app/api/super/greeting/route.ts` | The console: GET, PUT to save, POST to regenerate today |
| `src/app/super/(full)/pulse/broadcast/page.js` | The route — renders the editor inside the Pulse chrome |
| `src/app/super/(full)/pulse/PulseChrome.jsx` | The header and the bottom bar every console screen shares |
| `src/components/super/NovaCredentials.jsx` | The AI key form — shared with the Nova switchboard, not copied |
| `src/components/studio2/DailyGreeting.jsx` | The band — rotation, dots, dismissal |
| `src/components/super/GreetingEditor.jsx` | The register: a row per message, opening into its editor |
| `.greeting-band` in `src/app/globals.css` | The two gradient layers and the shadow |

Two keys: `g:greetingConfig` is what a person typed, `g:greetingToday` is what the model
wrote today. They are separate because one changes when somebody says so and the other turns
over on its own — writing them together would make every generation race every edit.

## Sending is an act

A message is **Draft** until somebody broadcasts it, and **Sent** afterwards. Sending stamps
`sentAt`; **saving text does not send**, so editing a live message is not re-announcing it on
every keystroke. **Send again** re-stamps, **Withdraw** returns it to Draft and stops it being
served — it unsays nothing, because anybody who has already read it has read it.

This replaced an `active: true|false` checkbox, and the checkbox was the defect. Showing a
message was a PROPERTY somebody edited rather than an ACT with a moment, so there was nothing
for a reader's browser to notice and nothing for a dismissal to be keyed against.

## How a studio finds out

**It asks again, every minute, and whenever the tab is looked at.** A band that only read on
mount would reach nobody already sitting in a studio — the common case, since this is a screen
people leave open. One small platform document per poll, no tenant data.

**It is not instant, deliberately.** Pushing would mean writing an event into every studio's
stream on every send: a fan-out across the whole platform for a message that is not urgent.
`emitPlatform` publishes to the console's channel, not to tenants, so there is no existing
path that would carry it. A minute is the cadence the Pulse wall already uses for its own
platform figures.

## Automated and written messages

A message is one or the other, and the console says which every time it draws one.

**Automated** is written by the model, once per server day, for the whole platform. It runs on
the AI key at the top of the Broadcast pane — **the same stored credential Nova's chat uses**,
and the same form, drawn from one component in both places. Setting it here switches Nova on
too, which the card says out loud. The first reader of the day pays for the generation and
everybody after them reads it back.

**Written** is the words in the boxes, every day, until somebody changes them.

An automated message that has nothing generated falls back to a built-in rotation of seven
greetings against eight quotations, offset by the message's position so two automated messages
never fall back to the same line on the same day. That is what shows when no key is set, when
the provider is down, and before the day's first generation lands — the header cannot be
empty and cannot break on somebody else's outage.

**A failure keeps its reason.** The provider's own message is stored beside the failed
`<id>:<daypart>` and shown in the console, because "no key is set, or the call didn't go
through" names two situations with two different fixes — and "model not found", "invalid
api key" and "[] is too short" are the only things that say which. The screen distinguishes
the no-key case from a real failure on its own, since it knows whether a key is stored.

**THE FIRST CALLER WITH NO TOOLS FOUND A BUG IN TWO ADAPTERS.** Nova's chat always passes at
least one tool, so nobody had sent `tools: []` before the greeting did. OpenAI rejects that
outright (`[] is too short`), and Gemini's adapter had guarded against the same class of thing
in its own way since it was written. Both `openai.ts` and `anthropic.ts` now omit the field
when there is nothing in it.

**Failures are remembered for the day.** A key that was wrong when the day's first reader
arrived would otherwise cost one model call per page view. An ABSENT key is not a failure and
records nothing, so adding one works on the next page load rather than tomorrow.
"Regenerate today's" in the console clears the record, which is the way out of both a fixed
key and a line nobody wants under the company's name.

**The attributions are not verified.** The model is told to choose a different quotation rather
than guess an author, which is the cheap half of the problem and not the whole of it — models
misattribute confidently, and this prints under nompany's name in somebody else's workplace.
The console shows what was generated for each daypart so a wrong one can be caught, and a
written message is the way to say something you have checked.

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

## Dismissal is per message, per send

The browser's, not the database's — and keyed on `broadcast-dismissed:<message id>:<sentAt>`.
Three things follow, and all three were broken before:

- **Closing one message never hides another**, then or later.
- **A message sent AFTER a reader closed something else still arrives.**
- **Sending again reaches the people who closed the first version**, because a fresh stamp is a
  key nobody has dismissed.

**IT WAS KEYED ON THE DAY AND CLOSED THE WHOLE BAND.** Close it once and nothing sent
afterwards reached that reader until midnight, which is the opposite of broadcasting. The
owner found it by sending a second message and seeing nothing.

Storing it server-side would be a row per member per message in a shared table to remember
something true for one person on one device. Nothing expires and nothing is swept; a stale key
costs one string in one browser.

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

- **No scheduling.** A message is Draft or Sent. There are no start and end dates, so an
  announcement for one week is sent and withdrawn by hand.
- **Three dayparts, not a clock.** The split is coarse on purpose; there is no way to say "after
  14:00" or to define the boundaries per studio.
- **No key, no automated message.** This is deliberate and it is also the whole failure mode:
  a platform that has not set a key shows nothing where automated messages would be, and only
  the console says why.
- **No instant delivery.** A send reaches open studios within a minute, not immediately. Sub-second
  would need one event written into every studio's stream per send.
- **No send history.** Re-sending overwrites `sentAt`; there is no record of the previous sends
  or of how many studios were open at the time.
- **No read receipts.** Nothing records who saw or closed a message — dismissal never leaves the
  browser.
- **No targeting.** Every studio reads every active message. There is no way to send one to a
  single studio, a plan, or a language.
- **One language.** The words are stored as typed and are not translated — an Arabic studio
  reads whatever was written in the console. The band's own furniture (the close button) is
  bilingual; its contents are not.
- **The model is not asked for Arabic**, for the same reason: there is one set of words per
  message and no field to hold a second.
- **No history.** Yesterday's generated words are overwritten, so there is no record of what a
  studio was shown last week.
- **No separate key.** Automated messages share Nova's credential. Setting a key to make
  Broadcast write itself also makes Nova's chat live, and there is no way to have one without
  the other.
- **Order is the list's order**, and there is no way to reorder except by removing and
  re-adding a message.
