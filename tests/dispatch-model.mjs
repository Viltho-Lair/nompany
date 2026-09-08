// THE DISPATCH BOARD, asserted without a database.
//
// The board is a view of jobs the schedule already stores, so what is asserted
// here is the three things the schedule cannot show: who is unstaffed, who is
// double-booked, and who has room.
import {
  dispatchBoard, strandedJobs, overlaps, onDay, hoursOf, freeFor, dayOf,
} from "../src/modules/operations/dispatch.ts";

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

const PEOPLE = [{ id: "c1", alias: "Sami" }, { id: "c2", alias: "Rana" }, { id: "c3", alias: "" }];
const job = (over) => ({
  id: "j", status: "scheduled", assignedToCollaboratorIds: [],
  scheduledStart: "2026-09-09T08:00:00.000Z", scheduledEnd: "2026-09-09T10:00:00.000Z", ...over,
});

// ---- the primitives --------------------------------------------------------
ok("a day is read off an instant", dayOf("2026-09-09T23:30:00.000Z") === "2026-09-09");
ok("rubbish is no day at all", dayOf("later") === "");

// A JOB THAT RUNS OVERNIGHT IS ON BOTH DAYS, because the crew is unavailable on
// both — asking only about the start would show an empty morning already spoken
// for.
const overnight = job({ scheduledStart: "2026-09-09T22:00:00.000Z", scheduledEnd: "2026-09-10T06:00:00.000Z" });
ok("an overnight job is on the day it starts", onDay(overnight, "2026-09-09"));
ok("...AND ON THE DAY IT ENDS", onDay(overnight, "2026-09-10"));
ok("...and on neither of the days around them", onDay(overnight, "2026-09-11") === false);
ok("a job with no start is on no day", onDay(job({ scheduledStart: "" }), "2026-09-09") === false);

ok("two jobs sharing an hour overlap",
  overlaps(job({ id: "a" }), job({ id: "b", scheduledStart: "2026-09-09T09:00:00.000Z", scheduledEnd: "2026-09-09T11:00:00.000Z" })));
// TOUCHING ENDS DO NOT CLASH: a nine-o'clock job following an eight-to-nine one
// is a full morning, not a double booking.
ok("touching ends do not overlap",
  overlaps(job({ id: "a" }), job({ id: "b", scheduledStart: "2026-09-09T10:00:00.000Z", scheduledEnd: "2026-09-09T12:00:00.000Z" })) === false);
// A JOB WITH NO END CANNOT CLASH: treating an unknown duration as "the rest of
// the day" would report a clash nobody can act on or clear, and every
// open-ended job would clash with everything after it.
ok("a job with no end clashes with nothing",
  overlaps(job({ id: "a", scheduledEnd: "" }), job({ id: "b" })) === false);

ok("hours are the gap between the ends", hoursOf(job({})) === 2);
ok("an unfinished job books no hours", hoursOf(job({ scheduledEnd: "" })) === 0);
ok("a backwards job books no hours",
  hoursOf(job({ scheduledStart: "2026-09-09T10:00:00.000Z", scheduledEnd: "2026-09-09T08:00:00.000Z" })) === 0);

// ---- the board -------------------------------------------------------------
const JOBS = [
  job({ id: "morning", assignedToCollaboratorIds: ["c1"] }),
  job({ id: "clashing", assignedToCollaboratorIds: ["c1"],
    scheduledStart: "2026-09-09T09:00:00.000Z", scheduledEnd: "2026-09-09T11:00:00.000Z" }),
  job({ id: "rana", assignedToCollaboratorIds: ["c2"],
    scheduledStart: "2026-09-09T13:00:00.000Z", scheduledEnd: "2026-09-09T14:00:00.000Z" }),
  job({ id: "nobody" }),
  job({ id: "cancelled", status: "cancelled", assignedToCollaboratorIds: ["c2"] }),
  job({ id: "tomorrow", assignedToCollaboratorIds: ["c1"],
    scheduledStart: "2026-09-10T08:00:00.000Z", scheduledEnd: "2026-09-10T09:00:00.000Z" }),
];

const board = dispatchBoard(JOBS, PEOPLE, "2026-09-09");
const lane = (id) => board.lanes.find((l) => l.collaboratorId === id);

ok("a lane holds that person's jobs for the day", lane("c1").jobs.length === 2);
ok("...and not another day's", lane("c1").jobs.every((j) => j.id !== "tomorrow"));
// A CANCELLED JOB BOOKS NOBODY: leaving it in would inflate every load and
// manufacture clashes against work that is not happening.
ok("A CANCELLED JOB IS NOT ON THE BOARD", lane("c2").jobs.length === 1);
ok("...and books no hours", lane("c2").hours === 1);
ok("hours are the day's booked total per person", lane("c1").hours === 4);

// A PERSON WITH NOTHING ON IS THE ANSWER TO "who can take this", so an empty
// lane is a row rather than an omission.
ok("SOMEBODY WITH NOTHING ON IS STILL A LANE", Boolean(lane("c3")));
ok("...with no hours", lane("c3").hours === 0);
ok("an unnamed person is not a blank row", lane("c3").alias === "Unnamed");

// CLASHES ARE SHOWN, NEVER REFUSED: a dispatcher deliberately overlaps a
// handover, so this is something to see rather than something to block.
ok("the same person on two overlapping jobs is a clash", lane("c1").clashes.length === 1);
ok("...naming both jobs",
  lane("c1").clashes[0].a === "morning" && lane("c1").clashes[0].b === "clashing");
ok("a person with one job has no clash", lane("c2").clashes.length === 0);

// THE UNASSIGNED PEN: on a calendar a job with nobody on it looks exactly like
// a job with a full crew.
ok("a job with nobody on it is unassigned", board.unassigned.length === 1);
ok("...and it is the right one", board.unassigned[0].id === "nobody");

ok("busiest lane first", board.lanes[0].collaboratorId === "c1");
ok("the day's total is every lane's hours", board.totalHours === 5);

// ---- who is free ------------------------------------------------------------
const slot = job({ id: "new", scheduledStart: "2026-09-09T08:30:00.000Z", scheduledEnd: "2026-09-09T09:30:00.000Z" });
const free = freeFor(board, slot).map((l) => l.collaboratorId);
ok("somebody already on that hour is not free", !free.includes("c1"));
ok("somebody free that hour is offered", free.includes("c2") && free.includes("c3"), free.join(","));
// IT ANSWERS WITH PEOPLE, NOT A BOOLEAN: "who" is the question a dispatcher
// actually asks.
ok("the answer is lanes rather than a yes", Array.isArray(freeFor(board, slot)));

// ---- what a day view can never show ----------------------------------------
// A JOB SCHEDULED FOR LAST TUESDAY THAT NOBODY WAS PUT ON is invisible on every
// day view, because the day it sits on is one nobody opens any more.
const OLD = [
  job({ id: "stranded", scheduledStart: "2026-09-01T08:00:00.000Z", scheduledEnd: "2026-09-01T09:00:00.000Z" }),
  job({ id: "staffed-old", assignedToCollaboratorIds: ["c1"],
    scheduledStart: "2026-09-01T08:00:00.000Z", scheduledEnd: "2026-09-01T09:00:00.000Z" }),
  job({ id: "done-old", status: "completed",
    scheduledStart: "2026-09-01T08:00:00.000Z", scheduledEnd: "2026-09-01T09:00:00.000Z" }),
  job({ id: "future" }),
];
const stranded = strandedJobs(OLD, "2026-09-09");
ok("a past job nobody was put on is stranded", stranded.length === 1 && stranded[0].id === "stranded",
  stranded.map((j) => j.id).join(","));
ok("a past job somebody was on is not", !stranded.some((j) => j.id === "staffed-old"));
// A COMPLETED JOB IS NOT STRANDED even with nobody named on it: the work
// happened, and chasing it would be chasing a record rather than a job.
ok("a completed job is not stranded", !stranded.some((j) => j.id === "done-old"));
ok("today's unstaffed job is not stranded yet", !stranded.some((j) => j.id === "future"));

console.log(fails ? `\ndispatch model: ${fails} FAILURES\n` : "\ndispatch model: all passed\n");
process.exit(fails ? 1 : 0);
