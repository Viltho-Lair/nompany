# What each thing does — the index

**Read the one file you need. Do not read this whole folder, and do not re-derive
any of it from the code.** One file per system functionality, each answering the same
four questions: what it is, what it stores, what it does, and what is NOT built yet.

When you change behaviour, **update that one file in the same commit**. Rewrite the
section, or append the new fact — never leave the file describing an intention as if it
were behaviour. That mistake has already cost this project real time: `backend-db.md`
carried the clause "Deletion is the reverse", which read as a description of how the
system worked, while `detachRecord` had zero production callers for five increments.

Three rules that keep this folder worth reading:

1. **State what is NOT built, in words.** A silent gap is worse than a written one. Every
   file ends with "Not built yet"; if that section is empty, say "nothing" — never leave it
   blank, because a blank section and a complete feature look identical.
2. **The code wins.** Where a file and the code disagree, the code is right and the file is
   a bug — fix it in the same commit that finds it.
3. **A create path and its delete path are one feature.** Never describe one without the
   other. If only half is built, the other half belongs under "Not built yet".

| File | Covers |
|---|---|
| [engagements.md](engagements.md) | The deal: one engagement, its stages, its client, lock and delete |

*(Files are written as each area is next touched, not all at once — an unwritten file is
better than a stale one. Add the row when you add the file.)*

Deeper background, for when a summary is genuinely not enough: `docs/` holds the
architecture and audit notes, `docs/superpowers/specs/` the designs, and
`docs/superpowers/plans/` the task-by-task plans. `CLAUDE.md` holds the invariants and
outranks everything here.
