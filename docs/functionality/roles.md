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

**A role's department decides where it is LISTED and what it is FOR. It does not
decide what the role may reach**, and it does not decide who may hold it. That
separation is what lets a department's `sectionKeys` go on granting nothing.

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

## Not built yet

- **Access is not constrained by department**, deliberately. A department's
  `sectionKeys` still grants nothing.
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
