# Deal flows — the steps a studio's deals walk, and each step's target

## What it is

A **flow** is the shape of a studio's work: which stages a deal walks, in what order, and how
long each step should take. A contractor's deal walks ticket → quotation → contract → project →
deliveries → invoice → payment; a trading company's walks ticket → quotation → order → shipment
→ invoice.

**The studio owns its flows outright** — the owner, 05/10/2026: *"I should run nompany, not the
flow … let the users feel free to improve their own flow based on their requirements with less
steps and less code, less complexity and more interaction."* Until that day a flow was run from
three places by two people: an industry table (nompany's, then a Studio settings panel) chose
which flow a deal started on, a Studio settings editor carried seven lists per flow (four of
which nothing read), and a deal's KPIs were measures declared in /super and numbered on a third
screen. All three are gone; one page replaces them.

## Where it is

**Deals → Flows** (`/<slug>/engagements`, the Flows tab beside Deals). One card per flow:

- its **steps in order**, each with the open deals AT it now, how many are **late** against
  the step's target, and how many reached it under a target and how many **in time**;
- each step's **target**: "within [N] days of [the deal opening | an earlier step]", blank =
  not measured;
- the **suggestion** beside the box: "Your last 12 deals took 6.2 days on average — set 7?",
  one click to take;
- move a step up or down, remove it, add one from the stage registry, rename the flow, make it
  the one new deals start on, **add a second flow** (a copy of one of the studio's or of a
  starter, without targets), remove one.

A step the reader may not see (rights, or a department switched off) shows no figures.

## What it stores

```
s:<sid>:flowTemplates   FlowTemplate[]   the studio's own flows
```

`FlowTemplate` is `{ id, name, stages, statusChain, cardinalityOverrides, targets?, isDefault? }`
(`platform/engagement/templates.ts`). `targets` is step → dated versions
`{ at, by, days, from }`, oldest first.

- **A studio starts with one flow, copied from its trade's starter** the first time its flows
  are read (`plantStarterFlow`, `platform/db/flows.ts`) — inside `editArr`, only into an EMPTY
  list, so two first readers plant one flow and a studio with any flow is never re-seeded. The
  starter is its trade's (`defaultTemplateForTrade`: a row the studio wrote before 05/10/2026,
  else its specialism's flow from /super → Industries, else the trade map).
- **The copy keeps the starter's id**, so every deal already walking "A" is on the studio's own A
  the moment it exists. Nothing is re-pointed.
- **The seven built-ins stay in code** as starters and as what an older deal naming one the
  studio never adopted still resolves to (`listFlowTemplates` merges them under the studio's).

## What it does

### The studio edits steps and nothing else

`statusChain` and `cardinalityOverrides` follow from the steps (`deriveFlowShape`): kept from
the flow's previous version where they still apply; otherwise the built-ins' order of authority
(project, contract, job, shipment, quotation, ticket) reports the deal's status, then the first
step. `cardinalityOverrides` stays because attaching a second shipment to a logistics file reads
it (`membership.ts`). **`heads`, `billingTrigger` and `costDrivers` were deleted on 05/10/2026**
— nothing in the product read any of them.

### Validated on write, never on read

A flow naming a stage the registry does not have renders as nothing, silently. `templateProblems`
refuses a stage that is not a registry type, a `statusChain` or `cardinalityOverride` naming a
stage the flow does not use, an empty `statusChain`, and a nameless flow. `saveDealFlow` also
refuses a repeated step, no steps, and a target the step cannot keep (`stepTargetProblem`): days
outside 1–3650, or a clock starting at the step itself, at a LATER step, or at one the flow lacks.
A refusal is a 400 that names the step.

### A target is dated, and a deal keeps the one it opened under

A change is **appended** as a new version (`nextStepTargets`), never an edit; saving the same
number writes nothing. A deal is judged by the version in force when it **opened**
(`stepTargetIn`), so changing a number never re-judges work already measured, and a deal opened
before any target was set is not measured. Judging is `judgeItem` asked a reach question
(`judgeStep`, `modules/main/flowSteps.ts`) — the same judge field jobs and work orders use:
**met**, **missed**, **under way**, **waiting** (the start step has not happened), **unknown**.

### The suggestion is the studio's own history

How long its deals actually took to reach the step, measured from the start the step's target
counts from today, averaged and **rounded up** (`suggestDays`) — a target the studio already
meets about half the time. Offered from **three** deals or more; fewer is an anecdote.

### Which flow a deal walks

- **A new deal starts on the studio's default flow** (`studioDefaultFlowId`: the one marked
  default, else its first, else its trade's starter, else A), written once at the one place a
  deal is minted (`freezeTemplate`) and never over an answer the deal already has.
- **A deal that names no flow** — written before flows were stored — walks the default too
  (`dealTemplate`, `pickTemplate`). It used to ask the deal's client industry and an industry
  table first, which matched almost nothing (a client's segment is not a trade).
- **A deal can be moved** to another of the studio's flows (`action: "move"`); what it holds is
  kept, and a stage the new flow does not list is shown on the deal, never lost.
- **One default.** Marking a flow the default unmarks the rest in the same write. Removing the
  default makes the next flow the default. A flow is removed only when no scanned deal walks it,
  and never the studio's last.

### The board's figures

Read from the deals' **completion snapshots** (the newest 500, `platform/engagement/completion`),
the same snapshot every deal list reads — never by opening records. A deal is AT the furthest
step it holds (`readDeal`); a deal whose first stage was called off is counted as called off. A
deal with no snapshot yet is counted as `unread` and said so; opening it, or the nightly refresh,
fills it.

### Where a step's result shows

On the **deal page**, under "KPIs", one line per measured step: "Quotation within 3 days — under
way · 2 days left". Absent where the deal's running steps do not include the step (a department
switched off) or where the reader may not see the step or its start.

### The route and the rights

`/api/studios/<slug>/main/flows` (`modules/main/dealFlows.ts`). `GET` is the board, behind
`engagements.view`. `POST` with `action` `save`, `add`, `remove` or `move` needs
`administration.settings.edit`. **No new permission key.** The first-run checklist's KPI item
ticks when any step has a target.

## Not built yet — do not assume otherwise

- **Not opened in the sandbox yet** (05/10/2026): the database proxy was stopped. The model,
  the route, the screen and the removals are checked by `tsc`, ESLint, `tests/flow-steps-model`,
  `work-kpis-model`, `first-run-model`, `flow-progress`, `engagement-model` and `restructure`;
  `deal-store` and the suite's flow block were rewritten and not run.
- **No flow picker on the deal page**, and none when a deal is opened. `action: "move"` exists;
  the screen does not call it yet. Moving needs `administration.settings.edit` for now — whether
  a salesperson picks a deal's flow is to be decided with that screen.
- **The board reads the newest 500 deals.** An older deal is not counted, and a flow is refused
  removal while the scan is capped rather than guessed safe.
- **A removed step keeps its target history**, so adding it back continues it — deliberate, but
  nothing shows that history.
- **No audit entries** for a changed flow or target beyond the `by` and `at` on each target
  version.
- **The starter list in /super → Industries still picks a specialism's flow.** It decides only
  which starter a NEW studio's first flow is copied from; it re-routes nothing.
- **Stored fields from before 05/10/2026** (`heads`, `billingTrigger`, `costDrivers` on a saved
  flow; `byFlow` on a KPI target; a studio's own industry rows) are left in place and read by
  nothing, except an industry row for the studio's own trade, which still chooses its starter.
