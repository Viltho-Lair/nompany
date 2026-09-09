# Manpower planning

How many people the work needs, against how many there are. A tab on Employees
(`/<slug>/hr-employees`), one collection — `manpowerPlans` — and **no new permission key**.

## What it is

**The product knows who it employs and what they do** — `roleIds` on every collaborator —
**and it has never known what the work REQUIRES.** So "can we take this job" was answered by
somebody counting names on a whiteboard, and the answer arrived after the bid had gone in.

**A plan is a DEMAND, not an assignment.** It says a project wants four site engineers
between March and June; it does not say WHICH four, and it deliberately cannot. Naming
people would make this a roster — which the dispatch board already is, per day, for work
that exists — and a plan is for work that does not exist yet, where the whole point is that
nobody is on it.

**Supply is counted from ROLES**, not from a second list. A person holding the Site Engineer
role IS a site engineer; a separate "resource pool" would be a second answer to what
somebody does, free to disagree with the one that decides their access. Somebody holding two
roles counts in both, because they are qualified for both — which they actually do is the
planner's decision.

**No permission key.** A plan is a statement about the studio's own headcount, which
`hr.employees` already opens — and reading it needs the ROLES too, so a right that let
somebody plan without seeing who holds what would show a gap and hide its cause.

### Short and spare are two fields

"We are three site engineers short" and "we have three spare" are different facts a planner
acts on differently — one is a hiring decision, the other a reassignment — and a single
signed figure makes a reader parse a minus sign to tell which. The same rule MRP's
shortfall follows.

**Supply is not reduced by other projects.** A person holding a role is counted once against
the TOTAL demand for it, not allocated to the first project that asks. Which of two
overlapping jobs gets them is a decision a planner makes, and a model that quietly assigned
them would be answering it in silence.

### When the gap starts

**A gap on one day is not a planning problem; one that lasts six weeks is.** `shortDays`
walks the horizon day by day, which is what turns "we are short today" into "we are short
from the 3rd of March" — the sentence somebody can act on. It is also why `manpowerGaps`
takes a DAY rather than a range: one honest answer per day, walked, rather than a range
collapsed into an average nobody can schedule against.

The default horizon is ninety days — long enough that a shortfall is found before somebody
has to hire for it, short enough that the walk is a plan rather than a spreadsheet — and the
walk is capped for the same reason.

### What is refused, and what is only reported

**Refused at the write:** a line with no role (it would ask for "four people", which nothing
can answer), fewer than one person, half a person, a missing date, a line ending before it
starts, and a role or project that does not exist.

**The project and the role are checked at the WRITE**, unlike a cost code on a bill — and
the difference is what the reader can do about it. A deleted cost code is reported as
`uncoded` and the money is still real; a plan line against a project that never existed is a
typo with no reading at all.

**A role deleted AFTERWARDS is named, not dropped**: `(removed role)`, with its demand still
counted. Somebody planned for it, and the plan is now pointing at nothing — which is worth
seeing.

**Removing a line cascades nothing.** It is an input to arithmetic, and the demand it
produced simply stops being produced.

## Not built yet

- **Nothing feeds the plan.** A line is typed; a project's own dates, its work packages and
  its tender are not read, so the plan is a parallel document rather than a consequence of
  the work.
- **No cost.** A gap is a headcount, not a wage bill — nothing multiplies a shortfall by
  what the role is paid.
- **No leave awareness.** Somebody on holiday still counts as supply, so a plan can look
  covered on a week nobody is there.
- **No skills beyond the role.** A role is the only axis; certifications exist in HR and are
  not consulted, so "we need four with a confined-space ticket" cannot be asked.
- **No scenario.** There is one plan, and no way to ask what a bid would do to it without
  writing the lines in.
