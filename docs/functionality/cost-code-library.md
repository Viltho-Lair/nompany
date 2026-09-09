# The cost code library — the studio's standard breakdown

A tab on Master data (`/<slug>/administration-master`), one collection —
`costCodeLibrary` — and **no new permission key**. It answers to
`administration.master.*`, which already carries full CRUD for locations and
departments.

## What it is

**A project had a cost breakdown and the studio had no standard.**
`docs/functionality/cost-codes.md` gave each job its own codes; every job
invented them. One called it "Earthworks", the next "Earth Works", a third
"EW". Nothing was wrong with any single project — each read correctly on its own
screen — and the studio still could not ask what it spends on earthworks,
because that question compares codes ACROSS projects and no two projects agreed
on what a code was called.

The library is the shared vocabulary. A project's breakdown can start from it,
and the drift report says where the projects have gone their own way.

## The rules

**A library code is COPIED, never referenced.** A project's cost row holds the
code STRING, not the library row's id — the BOQ rate rule, for the BOQ rate's
reason. Editing the library must not silently re-price a budget somebody
approved, and deleting a row must not break a job that has been running for a
year. What the library buys is agreement on the vocabulary, not ownership of it.

**Which is why the format is strict.** Letters, digits, dot, hyphen, slash and
underscore, 1–24 characters, **no spaces**. Matching is a string comparison, so
a trailing space does not produce an error — it produces two codes that look
identical in every list and never add up. Refusing the space is the only point
at which anybody can see the problem. Uniqueness is case-insensitive for the
same reason.

**A code needs a name.** "05.10" is recognisable to whoever wrote it and to
nobody else, and the whole point of a library is that the person budgeting a job
recognises the line.

**Groups are the studio's own words, and they are derived rather than stored.**
A contractor's "Preliminaries" and a manufacturer's "Overhead recovery" are the
same slot and share no word, so the picker offers the groups already in use
rather than a list this product invented. Rename every row in a group and the
group is renamed. The field is free text with the existing groups beside it — a
select could not create the first row in a new group.

**Retire, don't delete.** A code a project has taken cannot be deleted; the
refusal names how many projects would be affected. Deleting one would not break
the project — the code is a copied string, so the budget keeps working — and
that is precisely the danger: nothing would fail, the code would silently become
drift on every job holding it, and the studio would lose the only record of what
it once meant. Retiring takes it out of the picker and leaves it readable
everywhere it was used.

**Ungrouped codes sort last**, because they are the ones nobody has filed yet.

## Starting a project from it

`projects.costs.create` gets a third way to open a breakdown, beside typing one
and seeding from a tender's bill of quantities. All three are **offered, never
imposed**, and all three refuse once anything exists: this proposes a starting
point rather than merging, and running it over a breakdown somebody has since
edited would either duplicate every code or quietly overwrite their numbers.

**The library seeds a vocabulary at nought, the bill seeds a budget.** That is
the one way the two differ and why they are two flags rather than one `source`
string. A bill's groups arrive carrying what each was SOLD for; the library
knows nothing about this job, and a guessed budget would be a number nobody
chose that reads exactly like one somebody did.

**A retired code is not offered.** The picker and the seed both read
`offerable`, so they cannot disagree about what the standard currently is.

**Both may be offered at once** on a handed-over project, and that choice is
real: the bill is how the work was sold, the library is how the studio buys.

## The drift report

**This is what the library is for, and it is deliberately not a refusal.**
Nothing stops a project inventing a code — a job genuinely meets costs nobody
anticipated, and a budget that could not name one would be falsified rather than
standardised. What the studio needs is to SEE it, so a code six projects reached
for can be adopted and a typo on one can be fixed.

**Counted by project, not by row.** The same private code on forty lines of one
job is one project's decision; ranking by rows would put it above a code three
projects independently chose, which inverts the only question the report
answers.

**An archived code still counts as known.** A project running since before the
code was retired has not drifted from anything.

**It is gated separately and never read without the right.** The drift is
assembled from project cost rows, which answer to `projects.costs.view` — so a
reader holding Master data alone gets the library and no drift, and the projects
are not read at all rather than read and hidden. The block is absent, not empty.

**An empty library reports every code as off-standard**, which is the truthful
answer on day one: the studio has no standard, so nothing conforms to it.

## Where it is stored

A **collection** under `administration-master`, not a field of the studio
record — which is where units and the numbering series went. Those are short and
closed (eight units, seventeen series); this is a register a studio grows to a
couple of hundred rows, and the studio record is read on every request in the
product. A library living on it would be carried into all of them to serve one
screen.

## Not built yet

- **No cross-project roll-up.** The library gives the codes a shared name and
  nothing yet sums actual spend by code across the portfolio — the report that
  shared vocabulary makes possible. It belongs in Reports & BI.
- **No seeded starter library.** A new studio's library is empty; it is not
  seeded per trade the way departments are, so the first studio to open the tab
  meets a blank register.
- **Nothing re-codes an existing project.** Adopting an off-standard code means
  editing each project's breakdown by hand; the drift report names them and
  offers no action.
- **No hierarchy.** Codes are flat with a free-text group. "05" containing
  "05.10" is a convention in the code string, not a structure the product knows
  about, so nothing rolls a child into its parent.
- **Finance does not use it.** A bill's cost code is still whatever the project's
  own breakdown offers; nothing checks a bill against the studio standard.
- **No import or export.** A studio with a breakdown in a spreadsheet types it in.
