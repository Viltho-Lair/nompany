// ATTENDANCE, asserted without a database.
//
// One row per person per day, and the interesting assertions are the two things
// this refuses to conflate: a day nobody marked is not an absence, and a day
// nobody worked cannot carry hours.
import {
  attendanceProblems, cleanAttendance, inPeriod, monthSummary, daySheet,
  ATTENDANCE_STATUSES, WORKED,
} from "../src/modules/hr/attendance.ts";

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

// ---- what a row must have ---------------------------------------------------
ok("the five statuses are the whole ladder",
  ATTENDANCE_STATUSES.join("|") === "present|remote|absent|leave|holiday");
// A PRODUCT THAT ONLY STORED IN/OUT could not record a public holiday, an
// approved absence or a day worked from home — most of what a sheet says.
ok("working covers being there and being remote", WORKED.join("|") === "present|remote");

ok("a row belongs to somebody",
  attendanceProblems({ day: "2026-09-09", status: "present" }).length === 1);
ok("a row needs a day",
  attendanceProblems({ collaboratorId: "c1", status: "present" }).length === 1);
ok("a row needs a status",
  attendanceProblems({ collaboratorId: "c1", day: "2026-09-09" }).length === 1);
ok("a good row passes",
  attendanceProblems({ collaboratorId: "c1", day: "2026-09-09", status: "present", hours: 8 }).length === 0);
ok("negative hours are refused",
  attendanceProblems({ collaboratorId: "c1", day: "2026-09-09", status: "present", hours: -1 }).length === 1);
// A TYPO OF 80 FOR 8 sails through every downstream sum and turns up as a month
// of overtime nobody worked; a real double shift is under 24.
ok("MORE THAN TWENTY-FOUR HOURS IN A DAY IS REFUSED",
  attendanceProblems({ collaboratorId: "c1", day: "2026-09-09", status: "present", hours: 80 }).length === 1);
// A SHEET SAYING SOMEBODY WAS ABSENT FOR EIGHT HOURS cannot be read either way.
ok("A DAY NOBODY WORKED CANNOT CARRY HOURS",
  attendanceProblems({ collaboratorId: "c1", day: "2026-09-09", status: "absent", hours: 8 })
    .some((p) => /hours cannot be recorded/.test(p)));
ok("a leave day with no hours is fine",
  attendanceProblems({ collaboratorId: "c1", day: "2026-09-09", status: "leave" }).length === 0);

ok("cleaning zeroes the hours on a non-working day",
  cleanAttendance({ collaboratorId: "c1", day: "2026-09-09", status: "holiday", hours: 5 }).hours === 0);
ok("...and keeps them on a working one",
  cleanAttendance({ collaboratorId: "c1", day: "2026-09-09", status: "remote", hours: 7.5 }).hours === 7.5);

// ---- the period -------------------------------------------------------------
ok("a day inside the month is in the period", inPeriod("2026-09-09", "2026-09"));
ok("a day outside it is not", inPeriod("2026-10-01", "2026-09") === false);
ok("rubbish is in no period", inPeriod("soon", "2026-09") === false);

// ---- a month ----------------------------------------------------------------
const ROWS = [
  { id: "1", collaboratorId: "c1", day: "2026-09-01", status: "present", hours: 8, notes: "" },
  { id: "2", collaboratorId: "c1", day: "2026-09-02", status: "remote", hours: 7, notes: "" },
  { id: "3", collaboratorId: "c1", day: "2026-09-03", status: "absent", hours: 0, notes: "" },
  { id: "4", collaboratorId: "c1", day: "2026-09-04", status: "leave", hours: 0, notes: "" },
  { id: "5", collaboratorId: "c1", day: "2026-09-05", status: "holiday", hours: 0, notes: "" },
  { id: "6", collaboratorId: "c2", day: "2026-09-01", status: "present", hours: 9, notes: "" },
  { id: "7", collaboratorId: "c1", day: "2026-08-31", status: "present", hours: 8, notes: "" },
];
const sep = monthSummary(ROWS, "c1", "2026-09", 30);
ok("worked counts present and remote", sep.worked === 2);
ok("...and their hours", sep.hours === 15, String(sep.hours));
ok("absence, leave and holiday are counted apart",
  sep.absent === 1 && sep.leave === 1 && sep.holiday === 1);
ok("another month's row is not counted", sep.hours === 15);
ok("somebody else's row is not counted", monthSummary(ROWS, "c2", "2026-09", 30).worked === 1);

// A DAY NOBODY MARKED IS A DAY NOBODY MARKED — the sheet was not taken, and
// treating it as an absence would dock pay for a supervisor's paperwork.
ok("UNRECORDED DAYS ARE COUNTED AND ARE NOT ABSENCES", sep.unrecorded === 25,
  String(sep.unrecorded));
ok("...and absence stays what was actually marked", sep.absent === 1);
ok("a month with nothing recorded is all unrecorded",
  monthSummary([], "c9", "2026-09", 30).unrecorded === 30);

// ---- a day's sheet ----------------------------------------------------------
const PEOPLE = [{ id: "c1", alias: "Sami" }, { id: "c2", alias: "Rana" }, { id: "c3", alias: "" }];
const sheet = daySheet(PEOPLE, ROWS, "2026-09-01");
// AN ATTENDANCE SCREEN THAT LISTED ONLY THE ROWS ALREADY WRITTEN would hide
// exactly the people a supervisor opened it to mark.
ok("EVERYBODY IS ON THE SHEET, INCLUDING THE UNMARKED", sheet.length === 3);
ok("somebody marked carries their status", sheet[0].status === "present" && sheet[0].hours === 8);
// NULL, NOT `absent`: nothing has been said about this person today.
ok("SOMEBODY UNMARKED IS NULL, NOT ABSENT", sheet[2].status === null);
ok("an unnamed person is not a blank row", sheet[2].alias === "Unnamed");

console.log(fails ? `\nattendance model: ${fails} FAILURES\n` : "\nattendance model: all passed\n");
process.exit(fails ? 1 : 0);
