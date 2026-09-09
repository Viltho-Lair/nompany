# Attendance

Who was there. A tab on Employees (`/<slug>/hr-employees`), one collection —
`attendance` — and one permission area, `hr.attendance`.

## What it is

**Deliberately not an engine register**, and `progress.md` said so before it was built: it
is a daily, high-volume record — one row per person per day, so a studio of forty people
writes eight hundred rows a month — and the engine's shape (a form per record, a status
ladder, a screen listing them) is wrong for something taken in one sweep at the start of a
shift.

**One row per person per day**, and that uniqueness is the whole integrity story. Two rows
for one person on one day is two answers to "were they in", and every figure downstream —
days worked, hours, a payslip's unpaid deduction — picks whichever it reads first. An
existing row is UPDATED, so marking the same sheet twice corrects it instead of doubling it.

**A status, not a clock.** `present`, `remote`, `absent`, `leave`, `holiday`, with hours
BESIDE the status rather than derived from a pair of timestamps. A product that only stored
in/out could not record a public holiday, an approved absence or a day somebody worked from
home — which is most of what an attendance sheet is actually used to say.

### Marking is a sweep

The write takes a LIST: one round trip for forty people rather than forty. A per-row
endpoint would be the same feature at forty times the cost, and the cost lands on the person
standing in a yard on a phone.

**Partial is reported, not rolled back.** A sheet of forty where one person's hours were
mistyped records the thirty-nine and says which one it could not — refusing the sweep would
make the supervisor retype it all.

**Nobody outside the caller's reach**, checked against the same list the sheet was drawn
from, so a scoped supervisor cannot mark somebody they cannot see by naming them in the
body.

### Scoped, where payroll is not

`hr.attendance` is scoped and `hr.payroll` is not, and the difference is the shape of the
two jobs: a supervisor marks their own team every morning, which is exactly what
`department` scope is for; a payroll run is the studio's, and a departmental slice of one is
a partial total nobody could reconcile against the ledger.

**`scope === "department"` resolves to the department AND ITS DESCENDANTS** — `subtreeIds`,
shared with `listEmployees` rather than copied, so the two cannot disagree about anybody's
reach. An Operations Manager over three sites would otherwise see none of the three.

**No delete.** A sheet is corrected by marking the day again; deleting the row would leave
the day `unrecorded`, which means something different and is not what the supervisor meant.

### What it refuses to conflate

**A day nobody marked is NOT an absence.** The sheet was not taken; the person may well have
been there, and treating it as an absence would dock pay for a supervisor's paperwork.
`unrecorded` is counted in its own right — the number a studio watches fall as the habit
takes hold, and the one a payroll clerk checks before running a month. On the day's sheet an
unmarked person is `null`, not `absent`.

**A day nobody worked cannot carry hours.** A sheet saying somebody was absent for eight
hours cannot be read either way, so it is refused rather than rounded off, and `cleanAttendance`
zeroes the hours on any non-working status.

**Twenty-four hours is the cap and it is not pedantry.** A typo of 80 for 8 sails through
every downstream sum and turns up as a month of overtime nobody worked; a real double shift
is under 24, so the cap costs nothing true.

**Everybody appears on the day's sheet, including the unmarked** — a screen listing only the
rows already written would hide exactly the people a supervisor opened it to mark, which is
every one of them at the start of a shift.

**The day is read on the SERVER.** The records are dated in UTC and a browser's idea of
today is not, so a sheet defaulting to the viewer's clock would be a different day either
side of midnight.

## Not built yet

- **Payroll does not read it.** A payslip's unpaid deduction still comes from the vacation
  register, not from attendance, so an hourly employee cannot be paid from these hours. That
  is the join this exists to make possible and it is not made.
- **No shifts or expected hours.** Nothing knows what a normal day is for a given person, so
  overtime cannot be derived and `worked` is a count of days rather than a comparison.
- **No clock-in.** There is no device, no geofence and no self-service: a supervisor marks
  the sheet, and nobody marks themselves.
- **No approval.** A sheet is written by whoever holds the right; nothing reviews it, and a
  correction leaves no trace of what it corrected.
- **No import.** The sweep is capped at 500 marks, because past that it is an import — a
  different feature with a different shape — and there is none.
