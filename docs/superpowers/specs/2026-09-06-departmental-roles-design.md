# Departmental roles — design

*Approved in conversation 06/09/2026. Supersedes nothing; extends the role model
that has been flat since the grants-to-roles change.*

---

## 1 · What is wrong today

A studio's roles are one flat list — Admin, Manager, Team Lead, Member, Viewer —
and they are the same five whatever the studio does. Now that departments are
real records seeded per industry, that list is the last part of the org model
still pretending every company is the same shape.

`roles.ts` says, deliberately:

> A role is NOT a department and not a position. Those are org-chart facts: two
> people in Sales can be an engineer and a manager and must not have the same
> access. Access shape is its own axis, so it gets its own concept.

**That sentence was right and is now half-wrong, and the half matters.** Its
argument is that *seniority* is not a department — two people in one department
need different access, so access cannot be a property of the department. True,
and still true. What it also asserted, implicitly, was that a role has no
department at all, and that only held because there were no departments to
have. A Site Engineer and an Estimator are different roles in different
departments; making them both "Member" loses the only thing anybody wanted to
say.

So: a role gains a department. It does **not** gain the department's access —
that distinction is the whole of §4.

## 2 · The model

`Role` gains two fields:

| Field | Meaning |
|---|---|
| `departmentId` | `""` for studio-wide. Otherwise the department this role belongs to. |
| `source` | `"library"` when added from the catalogue, `"custom"` when typed. |

**Admin stays studio-wide.** It is the one wildcard, and a per-department
wildcard is a contradiction — "everything, within one department" is not
everything, and the resolver short-circuits on it.

**Manager, Team Lead, Member and Viewer go.** Approved deliberately: every
department defines its own roles, and keeping four studio-wide roles beside them
would leave two ways to say the same thing. Two different situations, and they
must not be conflated:

- **A new studio never gets them.** `STARTER_ROLES` seeds Admin and nothing
  else; the departmental roles are what a studio starts with.
- **An existing studio has them deleted by migration**, which is destructive for
  anyone holding one — see §8.

**One role, one department.** The same name in two departments is two rows, and
that is the point: it is what lets a Manager in Finance and a Manager in Site
Execution carry different access.

**Nothing else in access resolution changes.** `effectivePermissions` still
unions the roles a person holds; `escalates()` still refuses handing out what
you do not hold; a person's own `departmentId` is still what places them and
still what the `department` scope walks. A role's department decides where it is
LISTED and what it is FOR, never who may hold it or what it reaches.

## 3 · The library

~2,900 role names across 25 fields of work, from `docs/research/industry-roles.md`.

Each entry: `{ name, industry, department, archetype, tier }`.

**It is server-only and must never reach the browser.** At roughly 250 KB it
would consume a sixth of the entire client budget on its own, and the
largest-chunk gate is the one that matters. Search is a route that returns
matches; the client never holds the catalogue. A Gate A assertion pins this,
because the failure mode is a bundle regression nobody notices until the ceiling
moves.

**The department on each entry is the accuracy-critical field**, at roughly 95%.
The research lists roles by SENIORITY TIER per industry, not by department, so
this mapping does not exist yet and is the expensive part of the work. Getting
`archetype` wrong costs an admin one correction on delivery; getting
`department` wrong hides a role where nobody will look for it.

## 4 · Archetypes, and why eleven rather than 2,900

The research found that eleven access shapes cover every role in all 25 fields:
Principal, Department head, Winner of work, Bidder, Deliverer, Front-line
assigner, Doer, Custodian of things, Buyer, Money, Checker. Each was mapped to
permission areas that already exist.

A library entry carries an archetype; the archetype carries the permission set.
**Eleven sets, written once, using `keysForLevel(AREAS, level)`** — the same
helper `STARTER_ROLES` uses, so there is no second hand-written list of keys to
drift from the catalogue.

**THE ARCHETYPE IS NEVER SHOWN.** The role is called "Managing Director"; that
it resolves to `principal` is metadata, like a template id. Nobody sees the word.

**Why not a permission set per library role**, which was seriously considered:
the catalogue has changed at least twelve times in this repo's life — 102, 123,
124, 126, 130, 134, 135, 139, 143, 145, 149, 153, 159 keys — and every one of
those renames or adds. It moved 153 to 159 WHILE THIS SPEC WAS BEING WRITTEN,
when Procurement's requisitions area landed, which is the argument making itself. Eleven sets means eleven places to update and a test that can
check them all. Twenty-nine hundred means a body of data nobody can review,
staling silently on every catalogue change, surfacing only as somebody quietly
holding the wrong access.

**Adding a library role COPIES the archetype's permissions.** It does not
reference them. Editing the library later reprices nothing already created —
the same rule a BOQ rate follows, for the same reason, and asserted the same
three ways.

**A custom role starts with no permissions at all.** Unchanged, and it is what
keeps HR naming a job from being an escalation: the worst somebody with HR
rights and nothing else can do is invent a job title that grants nothing.

## 5 · HR · `/hr-employees?tab=roles`

An accordion, one section per department, plus a studio-wide group holding Admin.

Each department shows its roles with holder counts and two actions:

- **Add role** — searches the library, filtered to that department first, then
  the rest of the industry, then everything. Multi-select. Adds copies.
- **Create custom** — an empty role, for a department the library does not
  cover. This is the escape hatch that lets HR invent a department and staff it
  without waiting for anybody.

Deleting names the holder count first, as it does today.

**HR still cannot grant anything.** Naming and organising is HR's; deciding what
a name may do is Access's. That split is what makes this screen safe to hand to
somebody who is not an administrator.

## 6 · Access · `/administration-access`

The same accordion, each role expanding to the permission grid it already has.

**Grouping only. Every key stays grantable.** A department's `sectionKeys` does
not constrain what its roles may hold, and this is deliberate: `sectionKeys` was
shipped with an explicit promise that it grants nothing, because roles decide
access and a second mechanism deciding the same thing is free to disagree with
the first. Organising a screen by department is presentation. Constraining what
a role may hold would be a second access mechanism.

## 7 · Seeding

A studio picks a field of work → departments seed (already shipped) → roles seed
**at most ten per department**, drawn from that industry's library entries,
highest tier first.

Ten is a display decision, not a data one: an industry's full list is ~110 roles
and a studio does not want them all on day one. The rest stay searchable.

Both seeds refuse over a studio that is still waiting to be migrated, through
the guard that already exists.

## 8 · Deleting the four starter roles

Approved, and destructive for anyone holding them: `deleteRole` cascades the
reference off every collaborator, and whatever those roles granted goes with it.

**Guarded per studio.** The migration counts holders first and refuses any studio
where the count is not zero, naming it and the roles, rather than proceeding and
reporting the damage afterwards. On the three live studios today every role shows
zero held, so this is expected to be a no-op there — but "expected" is not
"checked", and the check is per studio at run time, not once by hand now.

**A refused studio keeps all four and is left working.** That is the intended
resting state, not a failure: it has people doing their jobs under roles that
still grant what they granted yesterday. The exit is a person deciding — re-role
those people onto departmental roles, then re-run — and it is deliberately not
automatic, because the only way a script could clear the refusal by itself is by
guessing which departmental role each person should hold instead. That guess is
somebody's access.

So the four roles are not "removed in this release". They are **not seeded for
new studios, and removable for existing ones once nobody depends on them.**

## 9 · Tests

One assertion per defect that can actually happen:

- every archetype's permission set names only keys the catalogue holds
- every library entry has a known archetype and a department that exists in its
  industry's seeded chart
- adding the same library role twice does not duplicate it
- a library add COPIES: editing the archetype afterwards does not change a role
  already created
- a custom role starts with zero permissions
- deleting a role reports its holder count
- the library does not reach the client bundle (Gate A)
- roles of the same name in two departments can hold different permissions

## 10 · Slices

1. **Structure** — `departmentId` and `source` on `Role`, both screens as
   accordions, the four starters deleted with the guard, archetypes and their
   eleven permission sets.
2. **The library** — the ~2,900 entries, the department mapping, the search
   route, seeding ≤10 per department.

Approved as one piece of work; landing it as two commits keeps a data change of
this size out of the commit that reshapes the access model.

## 11 · Not built yet

- No per-department permission constraint, deliberately (§6).
- No role hierarchy — a role does not report to another role.
- No approval routing by role.
- The library is English-only; role names are not translated, on the same rule
  that a tenant's typed data is never translated.
- A person still has one department. Roles held across several departments do
  not widen the `department` scope.
