# Flow templates and industries — the flow editor

## What it is

A **flow template** is the shape of the work: which stages a deal walks, in what order,
which of them may start one, whose status speaks for the deal, what counts as cost, and
when it bills. An **industry** is the row that picks a template — the trade a deal belongs
to, and the flow a new deal in that trade starts on.

Seven templates and twenty-five industries ship as **seeds**. Law 2 is that they are
**data a studio owns**, not a release: a studio clones a template, reorders its stages,
inserts a checkpoint, or adds the industry its trade needs. Adding an industry has to be a
row rather than a deploy, and that only means something if a studio can write the row.

The editor is a panel inside **Studio settings** (`/<slug>/administration-settings`).

## What it stores

Two arrays per studio, both **overrides, never full copies**:

```
s:<sid>:flowTemplates   FlowTemplate[]   only what this studio changed
s:<sid>:industries      IndustryEntry[]  only what this studio changed
```

An override with a seed's id **replaces** it; one with a new id is **appended**. Seed order
is preserved. Two consequences, both wanted: a later correction to a built-in still reaches
every studio that never touched it, and a studio's stored data is exactly what it changed
rather than a snapshot of everything that existed the day it first opened the editor.

**Deleting an override and reverting a built-in are the same operation**, and which one
happened depends only on whether a seed exists underneath. There is deliberately no
separate "revert" — that is what storing overrides buys.

## What it does

`platform/db/flows.ts` merges seeds with overrides and **refuses a template that could not
work**. `modules/studioFlows.ts` is the authorised door: it checks the right, then turns a
refusal into an answer. The route is `settings/flows` (GET / PUT / DELETE).

### Validated on write, never on read

A template naming a stage the registry does not have renders as **nothing** — silently,
forever, on a screen nobody thinks to doubt. Refusing it at the door means the studio hears
about it while it is still their edit, in words about the edit. `templateProblems` refuses:

- a stage that is not a registry type;
- a head that is not one of the template's own stages;
- a `statusChain` naming a stage the template does not use;
- a `cardinalityOverride` for a stage it does not carry;
- no heads at all — nothing could ever start a deal;
- an empty `statusChain` — no deal could report a status;
- **no name** — nothing could pick it from the list an industry must choose from;
- **a `billingTrigger` outside the seven** — it matches nothing, and surfaces later as
  revenue that never triggered.

The last two were unchecked while the only templates were the seven written in the repo.
They became reachable the moment somebody could type one.

An industry is checked against **this studio's** templates, not the built-ins, because that
is the list a deal will actually resolve against.

### The refusal reaches the studio

`flows.ts` throws, deliberately — a store returning `{ error }` for a structurally
impossible template lets a careless caller persist one by ignoring the result. But a thrown
Error is a 500 over HTTP, and a 500 tells a studio nothing about the edit they just made.
`studioFlows.ts` catches **only** the known refusal prefixes and returns
`{ error: "refused", detail }` as a **400**; a genuine fault still throws and is still a
500. The reasons are the whole value of validating on write, so they are carried through
verbatim rather than reduced to a code.

### The screen

`StudioFlowEditor.js`. Ordered lists (stages, status chain) get up/down controls rather
than drag-and-drop — order means two different things here and a keyboard user should not
need a pointer gesture to express a precedence. Heads and cost drivers are chips, because
they are memberships and not sequences.

**Removing a stage prunes every list that named it.** Leaving them would produce three
refusals at the door for one edit the studio thinks they made once, and working out that
the fix is "also remove it from heads" is not the studio's job.

It validates as they type, with **the same `templateProblems` the server refuses with** —
importable because nothing in `platform/engagement` touches a database. Not a replacement
for the door, which still refuses; the difference is hearing "statusChain names a stage you
removed" while the stage list is still on screen.

**Built-in / Edited / Yours** is worked out on the client by comparing against the seed,
field by field. The server merges the two and returns one list, which is the right answer
for every other reader; this screen needs the distinction because "Revert to built-in" and
"Delete" are the same button doing two very different things.

### The warning before an edit

Editing a template is not like editing a setting: it changes what every deal on that flow
shows, which stages it still invites, and what may attach to it from now on. `flowUsage`
counts how many deals walk each flow; the editor puts that count on the row, repeats it
above the fields, and asks before saving a change to a flow that already has work on it.
A flow nothing is on saves without a dialog — asking about an empty flow is how people
learn to click through the one that matters.

The dialog says plainly that **no record is deleted**. That is true because of the
off-template rule: a stage a flow no longer lists is still shown on the deals that have
one, marked as outside the flow. What is at risk is meaning, not data — the same deal read
through a different flow shows different stages and reports a different status.

Deleting a flow also names **the industries that would be left pointing at nothing**,
computed on the client because it already holds every industry. `saveIndustry` checks the
template exists when the INDUSTRY is written, and nothing re-checks when a template is
dropped, so this dialog is the only place a studio hears about it.

**Which flow a deal walks is `pickTemplate`, shared.** The deal screen resolves one deal
and pays for the industry lookup only when it must; the usage scan resolves hundreds and
reads every industry once. They agree only because the precedence lives in one pure
function — two copies would mean the screen showing one flow while the warning counted
deals against another.

**Counted from the engagement roots, not from `ENG.hasStage`.** That index looks like
exactly what this wants — a set of deal ids per stage type — but it is written only by
`attachRecord` and `promote`, never by `applyDescriptor`, which is the path every
ticket-minted deal takes. Counting from it would report most of a studio's deals as not
existing.

**Capped at 500 deals, newest first.** The warning's job is "this edit reaches work that
already exists", not a census; a saturated studio reports `500+` rather than a round number
pretending to be a total. Three round trips whatever the cap: the index, one batched
`getJSONMany` of the roots, the industries.

**Usage is manager-only**, for the same two reasons the sibling settings route withholds
its own: somebody who cannot change a flow is offered no warning to act on, and producing
one would cost them the whole scan on every GET — as well as handing a person with no deal
rights a count of how much work the studio is carrying.

### Permission

`administration.settings.view` to read, `administration.settings.edit` to write — the same
right as the rest of Studio settings, and the same one that already governs Service
Actions, which decide what a ticket may be raised for. **No new permission key**, so the
123-key matrix is unmoved. This route is hand-rolled rather than built on `route()`,
because `route()` needs a root section and `administration-settings` is in `NO_SCREEN_YET`
— declared for ordering only, never planted as a row. The sibling settings routes are
hand-rolled for the same reason.

## Not built yet — do not assume otherwise

- **A template id is never reused or renamed, and nothing enforces that.** `freeId` picks
  the first free letter H–Z for a duplicate, and a studio with more than nineteen clones
  gets a timestamp id. Deleting a clone frees its letter for the next duplicate, so a deal
  that stored the old id would resolve to a different flow.
- **Deleting a template an industry points at is still not REFUSED** — the confirm dialog
  now names the industries that would be orphaned, but a studio that goes ahead leaves them
  pointing at nothing. `defaultTemplateForStudio` returns `""` in that case and the deal
  screen falls back to Template A, so nothing breaks; the industry just stops meaning what
  it says. Re-pointing those industries in the same write would be the fix.
- **The count is per FLOW, not per stage.** It says "14 deals walk this flow", not "9 of
  them have a quotation you are about to drop from it". The per-stage number is the one
  that would actually tell somebody whether a particular removal matters, and it needs an
  index that does not exist yet — see `ENG.hasStage` below.
- **`ENG.hasStage` is written, never read, and incompletely maintained.** `attachRecord`
  and `promote` add to it and `detachRecord` removes from it, but `applyDescriptor` — the
  path every ticket-minted deal takes — does not, and no code anywhere reads it. It is a
  dead index with a live cost: every attach pays a write nobody spends. Either make it
  complete (and use it for the per-stage count above) or delete it.
- **An industry's key cannot be changed** — it is derived from the name on create and shown
  read-only after. That is deliberate (a deal stores it), but there is no rename-and-migrate
  path either.
- **No audit entries.** Editing a flow changes how every deal in the studio is read, and
  nothing records who changed it or when. The deal context has an audit trail; this does
  not. The confirm dialog means somebody agreed to the change, and nothing anywhere records
  that they did.
- **`cardinalityOverrides` cannot be set for a stage not in the template**, which is correct,
  but the editor also offers no way to see what the registry default it is overriding
  actually is — the option reads "As the stage says" without saying what that is.
- **No import or export.** A studio that has built a flow cannot hand it to another studio.
