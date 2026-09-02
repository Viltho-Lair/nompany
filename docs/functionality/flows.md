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

### Permission

`administration.settings.view` to read, `administration.settings.edit` to write — the same
right as the rest of Studio settings, and the same one that already governs Service
Actions, which decide what a ticket may be raised for. **No new permission key**, so the
123-key matrix is unmoved. This route is hand-rolled rather than built on `route()`,
because `route()` needs a root section and `administration-settings` is in `NO_SCREEN_YET`
— declared for ordering only, never planted as a row. The sibling settings routes are
hand-rolled for the same reason.

## Not built yet — do not assume otherwise

- **Nothing warns that deals are already walking a template being edited.** Removing a
  stage changes what every open deal on that flow shows and what may attach to it, with no
  count of affected deals and no confirmation step. Service Actions does exactly this
  (`serviceActionUsage`, "N items use this action"); flows does not.
- **A template id is never reused or renamed, and nothing enforces that.** `freeId` picks
  the first free letter H–Z for a duplicate, and a studio with more than nineteen clones
  gets a timestamp id. Deleting a clone frees its letter for the next duplicate, so a deal
  that stored the old id would resolve to a different flow.
- **Deleting a template an industry points at is not refused.** `saveIndustry` checks the
  template exists when the INDUSTRY is written; nothing re-checks when a template is
  dropped, so an industry can be left pointing at nothing. `defaultTemplateForStudio`
  returns `""` in that case and the deal screen falls back to Template A.
- **An industry's key cannot be changed** — it is derived from the name on create and shown
  read-only after. That is deliberate (a deal stores it), but there is no rename-and-migrate
  path either.
- **No audit entries.** Editing a flow changes how every deal in the studio is read, and
  nothing records who changed it or when. The deal context has an audit trail; this does not.
- **`cardinalityOverrides` cannot be set for a stage not in the template**, which is correct,
  but the editor also offers no way to see what the registry default it is overriding
  actually is — the option reads "As the stage says" without saying what that is.
- **No import or export.** A studio that has built a flow cannot hand it to another studio.
