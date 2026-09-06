# Departments

A studio's own org chart: who reports to whom, and which part of the product
each part of the company works in. Stored records under **Master data**, not the
product's section list.

## Why it is not the section list

It was, for a fortnight, and the screenshot that ended it showed sixteen
"departments": the fifteen sections plus **Tasks**, which is a cross-cutting
control and not a section at all — and four of the fifteen (Manufacturing &
Production, Assets & Equipment, Quality & HSE, Reports & BI) render nothing,
because they are in `NO_SCREEN_YET`. A construction company was being offered
Manufacturing & Production as part of its org chart.

Before that, HR owned a `departments` collection, and it was deleted for a good
reason: every studio wrote its structure down twice, once as the nav and once as
an HR list, and the two agreed only on the day somebody typed them. **That
diagnosis was right and the fix over-corrected** — it deleted the org unit
instead of giving each list its own job.

- A **section** is a product surface and an access boundary. It decides what a
  screen is and who may open it.
- A **department** is an org unit. It decides who reports to whom, whose
  headcount, and — through `parentId` — whose records a manager may read.

Identity between them cannot express any of the three shapes a real company has:
two departments inside one section (Structural Design and MEP both live in
Engineering & Documents), one department across several (Operations spans
Projects, Field Ops and Logistics), and a department with no section at all
(Legal, Estimation, a branch office).

What stops the two lists drifting apart this time is `sectionKeys`, stored **on
the department** and chosen from the sections that exist. Many departments may
name one section; a department may name none.

## The record

`departments`, under `administration-master`:

| Field | Meaning |
|---|---|
| `name` | What the studio calls it |
| `code` | Short handle for reports. Unique within the studio when set; may be blank |
| `parentId` | `""` for a top-level department. Cycles are refused at the door |
| `managerCollaboratorId` | CollaboratorID, never UserID (invariant 6) |
| `sectionKeys` | Which sections this department's work lives in. May be empty |

There is no `enabled` flag: a department is deleted, and the delete is refused
while anything stands in it.

## Who may do what

Three acts, deliberately kept apart:

| Act | Where | Right |
|---|---|---|
| Create, rename, re-parent, code, delete a department | Master data → Departments | `administration.master.*` |
| Put a **person** in a department | HR → employee | `hr.employees.edit` |
| Say which sections a department works in | Master data, on the row | `administration.master.edit` |

**No new permission key — the catalogue is unchanged.** `administration.master`
already carried full CRUD for locations, and master data is exactly what this
is: reference data that HR, Projects and Quality all read and none of them owns.

**Why the register is not HR's**, which is where somebody is assigned to one.
`parentId` drives the `department` access scope, so **re-parenting widens what a
manager can see**. If this CRUD sat on `hr.employees.*`, an HR clerk could
enlarge a manager's reach over employee records and leave without holding
`administration.access` and without `escalates()` ever being asked — invariant 5
through a side door. A studio that wants its HR lead to own the register grants
them `administration.master.edit`; that is a decision, not a default.

## What the section link does, and does not

It answers *where does this department's work live* — for navigation, and for
resolving a `departmentId` stamped on a Quality document or a Projects
assignment back to a screen.

**It grants nothing.** Roles decide access. A second mechanism deciding the same
thing would be free to disagree with the first.

The picker offers **top-level sections that have a screen**: not `main`, not
`tasks`, and not the four in `NO_SCREEN_YET`. It reads that list rather than
restating it, so the day Manufacturing gets a screen it becomes assignable with
nobody remembering this file.

## The scope, which is what makes the hierarchy worth storing

`scope === "department"` on `hr.employees` and `hr.vacations` used to mean *the
same `departmentId` string* — which, while departments were sections, meant *the
same section*. An Operations Manager with three teams under them saw none of the
three.

It now resolves to **the department and its descendants**, via `subtreeIds` in
`src/shared/departments/tree.ts` — the same pure function the screen draws the
chart with, so the two cannot disagree about anybody's reach.

**Rollout consequence:** on a flat register this is identical to before. The
moment a studio nests departments, a manager scoped to `department` sees more
people and more leave than they did. That is the feature, and it is stated here
because it is live behaviour rather than a quiet default.

Depth is capped at four. A cycle is refused when the move is made, not detected
afterwards by a walk that has to guess which link to break — and every walk
carries a visited set anyway, because a hang inside a permission check is worse
than a wrong answer.

## Where a studio's departments come from

1. **At creation.** A new studio gets the universal back office — Finance &
   Accounting, Human Resources, Administration — because nothing sets a field of
   work at creation and an empty register means an empty dropdown and nobody
   placeable at all. Those three are not a guess: they were identical in all
   twenty-five fields of work, which is why they are factored out.
2. **From the field of work.** Setting it on Studio settings and opening the
   register seeds that trade's chart — Construction gets Estimation & Tendering,
   Site Execution, Engineering, QA/QC & HSE, Plant & Equipment and the rest.
   `Other` and an unrecognised trade seed nothing beyond the back office, the
   same way `actionsForField` returns nothing.
3. **By hand**, at any time.

**Changing the field of work later overwrites nothing.** The screen says what
the standard chart for the new trade would add and offers a button that adds
only what is missing, by code. Nothing is renamed and nothing is deleted — the
same courtesy `nextPool` extends to service actions, and the reason a studio
cannot lose an org chart it has edited.

Seeding is idempotent and lands in **one write**: ids are minted before the
rows, so a child's `parentId` is resolved from its parent's code and the whole
chart is a single compare-and-set round.

## Deleting

Refused, with counts, while either is true:

- **people** stand in it
- **sub-departments** hang off it

A Projects assignment or a Quality document stamped with it does **not** block
the delete. Both are historical records of where work sat at the time, and
blocking a reorganisation until every past assignment is re-filed would punish
the studio doing its housekeeping — the same argument the cost breakdown makes
about a deleted cost code. They keep the id and read as unplaced.

Nothing is cascaded. A delete that quietly rewrites a person's placement or a
document's owner is the kind nobody can undo.

## The migration

`scripts/migrate/departments.mjs` — dry-run by default, `--allow-live` to touch
the live namespace, idempotent.

Existing people carry `departmentId = "<section key>"`. The script creates one
department per distinct legacy value, named after that section and carrying its
key, then re-points each person. **It does not map anybody onto the starter
chart**: noticing that a construction studio's "projects" people probably belong
in Site Execution would be a guess the studio cannot see happening and cannot
undo. It is a faithful rename, and the standard chart is offered afterwards as
an addition.

A migrated studio's register is not empty, so the lazy seed never fires for it.

Run it **before** anybody edits the register on a live studio — the ordering
lesson `plant-sections.mjs` paid for.

## Not built yet

- **Approval routing by department.** The manager is stored and nothing reads
  it: leave still answers to `hr.vacations.approve`, and the bill chain still
  routes by amount and permission rather than up the org chart. That was the
  second slice of the agreed design and is not in this one.
- **No roles per department.** The industry role research
  (`docs/research/industry-roles.md`) lists what each trade's departments are
  usually staffed with; nothing seeds or suggests a role from a department.
- **No cost centres and no budgets.** A department has a code, and nothing
  posts against it.
- **No soft delete.** The product has no tombstones, so a deleted department is
  gone, and records stamped with it read as unplaced.
- **The `department` scope is the only reader of `parentId`.** Dashboards,
  Projects and Quality all still filter by a single department rather than a
  subtree.
- **Nothing reconciles `sectionKeys` with what a person may actually open.** A
  department may name Projects while nobody in it holds `projects.list.view`;
  the link is navigational, and saying otherwise would make it an access
  mechanism.
