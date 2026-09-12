# Roles

A role is a job: a name, a department, and the access an administrator has
granted it. A studio's roles are the jobs its trade actually has, not five
generic rungs.

## What changed, and why the old answer was right when it was written

A studio used to start with five roles — Admin, Manager, Team Lead, Member,
Viewer — and got the same five whatever it did. That existed for a good reason,
and the reason has not gone away: **an empty permission grid is where
over-granting begins.** Faced with 159 unchecked boxes, people tick everything to
make the product work and never come back.

What changed is who answers it. Departments are real records now, seeded per
field of work, and each brings the roles its trade uses. So a new studio still
never meets a blank editor — it meets Site Engineer under Site Execution and
Estimator under Estimation, which is what "Member" could never say.

`roles.ts` used to state the split as *a role is NOT a department*. That
sentence was arguing that **seniority** is not a department — two people in one
department need different access — and it is still true. What it also implied,
because there were no departments to have, is that a role has no department at
all. It has one now.

## The record

`Role` carries, beyond its name and permissions:

| Field | Meaning |
|---|---|
| `departmentId` | `""` for studio-wide. Admin is the only seeded one. |
| `source` | `library` — copied from the catalogue, arrived with access. `custom` — typed, started empty. |

**A role's department decides where it is LISTED, what it is FOR, and what a
pre-built role STARTS with. It does not decide what the role may reach**, and it
does not decide who may hold it: the Access screen can give any role any key.
That separation is what lets a department's `sectionKeys` go on granting nothing
to anybody — it shapes a default that is copied once, never a limit.

**One role, one department.** The same name in two departments is two rows, and
that is the point: a Manager in Finance and a Manager in Site Execution can hold
different access. Names are unique *within* a department, never across the
studio — a studio-wide check refused the second "Manager", which is precisely
the row this design exists to allow.

## Admin

Studio-wide, wildcard, and the only role a new studio is seeded with. A
per-department wildcard is a contradiction: "everything, within one department"
is not everything. It is also the role that has to keep meaning everything as
the product grows, which is why it holds no explicit list.

## The library, and the eleven archetypes

~3,000 job titles across the 25 fields of work, generated from
`docs/research/industry-roles.md` by `scripts/generate/role-library.mjs`. The
universal spine — the back office identical in every trade — is stored **once**
and reaches all twenty-five.

**It is server-only and never reaches a browser.** A few hundred kilobytes
against a 1634 KB client budget, for a list a picker needs twenty rows of. Gate
A asserts no client component imports it; a client import would fail nothing and
quietly spend a sixth of the budget.

A library entry carries an **archetype** — one of eleven access shapes the
research found covers every role in every field: principal, department-head,
winner-of-work, bidder, deliverer, front-line, doer, custodian, buyer, money,
checker.

**Eleven sets rather than 2,900**, because the catalogue has changed at least
twelve times in this repo's life (102 → 159 keys) and each change would have
staled 2,900 hand-written lists silently, surfacing only as somebody quietly
holding the wrong access. Eleven are eleven places to fix, and a test checks all
of them against the live catalogue on every run.

**The archetype is never shown.** A role is called "Managing Director"; that it
resolves to `principal` is metadata, like a template id.

**`principal` is not a wildcard.** The role model allows exactly one and it is
Admin. So principal is an explicit list of every area at full, deliberately
without `administration.access`: running the company and deciding who may do
what are different acts, and the second is the one that can hand somebody else
everything.

**It holds every EXTRA too, and for a while it held none.** `keysForLevel`
walks an area's `verbs`, and those are exactly view/create/edit/delete;
everything else — approve, approveHigh, pay, salary, lock, publish, award —
lives in `area.extra`, which no level can reach. So a shape built from
`[key, "full"]` held **0 of 21**, and the comment justifying the
`administration.access` exclusion said nothing about extras, which is what
marked it as an oversight rather than a decision.

**That left the approval chains unwalkable.** A bill over the studio's limit
needs `finance.payables.approveHigh`; no archetype held it, so no library role
could be the second signature and only the account holder — who short-circuits
`effectivePermissions` on `role === "owner"` — could sign at all. The same for a
bid over 500000 and a requisition over 10000. Invariant 7 is not an argument
against fixing it: reviewer — approver is enforced AT THE TRANSITION, and
holding both rights is legitimate while using both on one record is not, so
withholding the key bought none of that separation and only broke the role.

**Answering is a department head's job, and it sits away from whoever raised the
thing.** `tendering.tenders.approve` is not the bidder's, because pricing a bid
and committing the company to it are different powers;
`procurement.requisitions.approve` is not the buyer's, because approving
authorises somebody else's spend; `engineeringDocs.register.approve` is not the
checker's, because the checker holds `review`. A variation is answered by the
project manager whose work it changes.

**Five extras stay principal's alone, deliberately:** the three `approveHigh`
keys, `hr.employees.salary` and `crmSales.quotations.unlock`. Signing above a
studio's own limit, reading pay, and reopening something already committed are
decisions a studio makes about a **person**, which is the argument `money`
already makes for declining `approveHigh` itself.

**Coverage is asserted in both directions now.** `archetypeProblems` only ever
checked that every key an archetype NAMES exists; nothing checked that every key
the catalogue OFFERS is named by somebody, which is how both holes survived.
`tests/roles-model.mjs` now carries two **shrink-only** counts — at most 9 areas
and at most 5 extras reachable by no archetype but principal — on the lint
budget's reasoning: an exemption list has to be maintained and argued with, a
number only has to go down. The nine areas are every `*.settings` plus the three
`administration.*` ones, which are administrative acts rather than jobs a trade
has a title for.

## Adding a role

| Act | Where | Right |
|---|---|---|
| Name a job from scratch | HR → Roles | `hr.employees.create` |
| Add pre-built jobs from the catalogue | HR → Roles → Add pre-built | `hr.employees.create` |
| Decide what a job may do | Access | `administration.members.edit` |

**A custom role starts with no permissions**, whatever the payload says. That is
what keeps HR naming a job from being an escalation: the worst somebody with HR
rights and nothing else can do is invent a title that grants nothing.

**A library role arrives with its archetype's permissions, COPIED.** Editing an
archetype later — or shipping a corrected one — reprices nothing already
created. The same rule a BOQ rate follows, and for the same reason.

**And only inside its own department's sections** (`permissionsInDepartment`
in `modules/people/archetypes.ts`) — the owner's rule, 11/09/2026. An archetype
is a shape across the whole product, and copied whole it put CRM tickets, the
project list and the inventory items on an Estimator filed under Estimation.
Anything wider is granted afterwards on the Access screen. What a library role
gets is two halves, both confined to the sections its department lists:

- **What its shape names that falls inside those sections**, plus three kinds of
  right that are nobody's section: what belongs to no section at all (the
  engagements view), Tasks, and the scoped HR areas — `hr.employees`,
  `hr.vacations`, `hr.attendance`. A scoped area only ever reaches the holder's
  own records or their department's, and `hr.vacations.create` is how anybody
  books their own leave.
- **Its shape's home level on every area and register in those sections** —
  `full` for a department head, `view` for a checker, `edit` for the rest. This
  is what makes the shape and the department meet: `doer` names no Tendering
  right, so without it an Estimator arrived able to open nothing in Estimation.
  The home level never grants a `*.settings` area and never grants anything in
  Administration (Access, People, Master data, Studio settings), which decide
  who may do what rather than being a job.

A section's root is read from `SECTION_DEFS`, never from the key's prefix:
`engineering-docs-rfq` sits under CRM & Sales.

**`principal` is exempt** — Managing Director, CEO — because it runs the whole
company; it keeps every area, still without `administration.access`.

**No library role arrives with nothing — every row in every chart that holds
its department (5,206 placements), not only the 2,245 the starter charts seed;
measured 11/09/2026, and `tests/roles-model.mjs` now holds it.** Twenty-two
titles did (26 of the seeded roles, because the CFO is one row seeded in
twenty-three trades), every one filed under Administration, where neither
`money` nor `checker` names anything:

- **the Chief Financial Officer** — the universal spine's one copy, reaching all
  twenty-five fields — because the governance group's shortlist was `ADM` alone
  and the Finance hint had nowhere to go. `FIN` is on that shortlist now.
- **three oversight titles the tier fallback filed there**: Board Audit
  Committee Chair (Financial Services → Finance), Auditor General (Public
  Administration → Inspection & Enforcement) and the Chief Compliance Officer
  of Administrative & Support Services (→ Contract Operations, since that chart
  has no quality or compliance department).
- **eighteen more that only Add pre-built reached**, none seeded — among them
  Head of Internal Audit (→ Credit & Risk), Night Auditor (→ Finance), a
  Director of Sales & Marketing in Hospitality (→ Front Office), three bid
  writers (→ the trade's sales or tenders department), four stock controllers
  (→ Stores), and the spine's Chief Risk & Compliance Officer (→ Finance: a
  spine row is stored once and reaches every field only through a code every
  chart holds, and a quality department would have dropped it from every trade
  without one).

All but the CFO — twenty-one — sit in `PLACED` in `scripts/generate/role-library.mjs` — field
and title to a department code, decided by hand, so exactly those rows move:
"Document Controller" is in a dozen fields and a name rule would have moved all
of them. Where a trade has no quality or compliance department, the oversight
title went to the operations it oversees. The generator throws on a placement
naming a code the chart lacks, or matching no row. A correction is a `PLACED`
entry (or a hint) and a regenerate, never an edit to a generated row.

That door may hand out access when the other refuses to, because **HR chooses
which pre-built job to add, not what it may do.** The shape was decided by the
catalogue before the studio existed, and an administrator adjusts the row
afterwards.

**The picker requires both a field of work and a department code.** Without
them, `searchLibrary` has nothing to narrow by and would offer the first twenty
rows of the whole catalogue — Farm Operations Manager, for a sales department.
It refuses instead, and names the screen that fixes it. The **write** refuses on
the same terms, or a stale screen could add what the picker would not offer.

## Seeding

A department arrives with up to **ten** roles from its trade, most senior first.
Ten is a display decision: a field's full list runs to about 110, and the rest
stay searchable.

**Admin is read before any library role is written**, and that ordering is
load-bearing: `listRoles` seeds the starter role only into an *empty* list, so
creating a department's roles first left a studio with a hundred roles and no
Admin at all.

**A seeded role grants nothing until somebody is put in it.** The chart contains
powerful roles by design — a Managing Director holds nearly the whole catalogue
— and that is safe precisely because existing is not being held. Assignment is
deliberate, and `escalates()` still refuses handing out what the actor does not
hold themselves.

## Both screens

**HR → Roles** groups by department: studio-wide first, then one section per
department, then anything left over. **Access** groups the same way, with the
permission grid inside each role.

**Grouping only — every permission key stays grantable in every group.**
Constraining the grid by a department's sections would be a second mechanism
deciding access, free to disagree with the roles that already decide it.

A role whose department was deleted keeps its id and appears under **"not in a
department"** on both screens. Hiding it would leave access granted to a row
nobody can find.

Access serves the org chart from its **own** route rather than fetching the
departments route, which answers to `administration.master` — somebody granted
the access screen and nothing else would otherwise see the grouping collapse.

## Retiring the four

`scripts/migrate/departmental-roles.mjs` removes Manager, Team Lead, Member and
Viewer from studios that still have them. Dry-run by default, `--allow-live` for
the live namespace, idempotent, and **by role id rather than by name** — a studio
can rename a starter role, and a rename must not decide whether it is deleted.

**It refuses a studio where anybody still holds one**, names it, and leaves the
studio working. Refused means **nothing** is removed, not "the ones nobody
holds": a studio left holding Manager alone is halfway between two role models.
The exit is a person re-roling those people, deliberately — the only way a
script could clear the refusal itself is by guessing which departmental role
each person should hold, and that guess is somebody's access.

**It has not been run against live.**

**A library role arrives with its archetype's scopes**, copied like its permissions
(`scopesFor` / `scopesForLibraryRole`). Department head: `department` on hr.employees,
hr.vacations and hr.attendance; front-line: `department` on hr.vacations and hr.attendance,
which it now holds at edit so a supervisor can mark their crew in. Until 11/09/2026 every
library role was written with `scopes: {}`, and an unscoped area falls back to `own` — so a
department head holding `hr.vacations.approve` was told a request was waiting and shown only
their own leave. Existing studios keep what they have until
`scripts/migrate/role-scopes.mjs` runs: dry-run by default, additive, it scopes only roles
holding `hr.vacations.approve` and never an area a studio already scoped. **It has not been
run, against live or in the sandbox.**

## Rights catch up by themselves (12/09/2026)

**The owner's rule:** *"if ANY update takes place it is for the whole ERP, we do not update
single studios or one by one studios."* `STARTER_ROLES` seeds only into an empty list, so a
right added to the product reached no role that already existed, and the answer each time was a
script — `grant-administration.mjs`, `grant-permits.mjs`, `grant-maintenance.mjs` — run per
studio by hand if anybody remembered. Sections stopped needing that on 11/09/2026; rights
stopped needing it here.

`modules/people/catchUps.ts` is a dated table, and `listRoles` applies it on read: one
compare-and-set for a studio with something pending, nothing at all for one without.

**A catch-up may say exactly one thing: a role that ALREADY HOLDS right X gains right Y, verb
for verb.** It cannot invent access for a role that held none — whoever kept the old register
keeps the new one, and nobody else is widened. That is the rule the three scripts applied,
written where the product can run it.

Four properties, each a way it would otherwise go wrong:

- **Once per role.** A role is marked when it is ASKED, whether or not it gained anything, so
  every later read is free.
- **A removal sticks.** Marked means asked, so a right an administrator takes off a role is not
  handed back on the next read. Without it this would be a permission change nobody could undo.
- **A new role is born marked.** Somebody creating a role ticks what they mean; adding to it
  tomorrow because of an entry dated yesterday would overrule them. `updateRole` carries the
  marks off the ROW, never the request body.
- **The wildcard is skipped.** Admin holds everything by construction.

**One entry today**: `engine.maintenance.V` → `maintenance.requests`, `maintenance.orders` and
`maintenance.plans` at the same verb (the Assets register became the Maintenance section).
`tests/roles-model.mjs` asserts the rule, that every area named is real, and that ids are unique.
**Never edit an entry that has shipped** — its id is stored on every role already asked, so a
changed entry reaches nobody; a new id is how a second thought travels.

## Not built yet

- **A person's individual overrides do not catch up.** The catch-up reaches ROLES; somebody
  granted a right on their own row is still a person's job, which is what the scripts reported.
- **A right with no predecessor cannot catch up, and that is now the rule rather than a gap.**
  The owner, 12/09/2026: *"it will have specific roles."* A brand-new right — `tendering.tenders`
  was one, with nothing to key off — is granted to the roles a person names, never inferred and
  never handed to everybody. A catch-up entry may only follow a right a role already holds; where
  there is none, the answer is a decision, so it is asked rather than guessed.
- **Access is not constrained by department**, deliberately. A department's
  `sectionKeys` shapes what a pre-built role is copied with and nothing else —
  the grid still offers every key.
- **Roles that already exist keep their old, unconfined shape.** The copy rule
  holds: the department filter reaches only roles created from now on (new
  departments, and HR → Roles → Add pre-built). No script narrows the roles
  existing studios already hold, and one would be removing access from live
  roles, which is a decision for a person.
- **Changing a department's sections re-shapes nothing.** Adding Finance to a
  department later does not give its existing roles Finance.
- **The re-filings reach new roles only.** A studio already seeded keeps its
  CFO (and any other re-filed role it holds) under Administration, with
  whatever each was copied with.
- **Some re-filed titles still carry an odd shape.** The archetype comes from
  the name, so a Document Controller is `money` (it matched "controller") and
  arrives with Engineering & Documents at edit rather than a document
  controller's rights. Filed right, shaped roughly; the admin adjusts it.
- **No role hierarchy.** A role does not report to another role; only
  departments have a parent.
- **No approval routing by role or by department manager.** The manager is
  stored and nothing reads it.
- **Role names are not translated.** The library is English-only, on the rule
  that anything a tenant owns and renames is data. Only Admin's seeded name and
  description take the studio's language.
- **The department on a library entry is ~95% accurate, not certified.** The
  generator's `--report` prints the per-department spread and how many
  assignments were made by default rather than by a rule; a correction is a hint
  added to the generator and a regenerate, never an edit to a generated row.
- **Nothing re-syncs a library role.** If the catalogue's archetype for a job
  changes, roles already created keep what they were given — by design, but there
  is no way to opt into the new shape short of deleting and re-adding.
- **A person still has one department**, and holding roles across several does
  not widen the `department` scope.
