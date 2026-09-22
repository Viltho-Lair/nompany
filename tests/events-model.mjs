// AN EVENT, AND WHO ACTUALLY CAME.
//
// THE DEFECTS THESE GUARD, each of which reads as a real answer:
//   * "no capacity" rendered as 0 seats left, which tells a studio its open
//     webinar is full;
//   * an oversubscribed room clamped to 0 left, hiding the eight people who
//     need a bigger one;
//   * a turnout rate of 0 where nobody registered, which reads as a disaster
//     rather than as an empty list;
//   * an attendance id for a reply somebody has since deleted, still counted,
//     so attendance quietly exceeds registrations;
//   * and an event judged past or running by the reader's own clock rather
//     than the server's, so one row reads two ways in two time zones.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const E = await import("@/modules/marketing/events");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const good = { name: "Spring open day", kind: "event", startsAt: "2026-10-01T18:00", endsAt: "2026-10-01T20:00", capacity: 50 };

console.log("\n== what refuses an event");
ok("a good one is accepted", E.eventProblem(good) === "");
ok("it needs a name", E.eventProblem({ ...good, name: "  " }) === "name");
ok("...and a kind it recognises", E.eventProblem({ ...good, kind: "party" }) === "kind");
ok("...and a start", E.eventProblem({ ...good, startsAt: "" }) === "starts");
ok("...which must be a stamp, not a date", E.eventProblem({ ...good, startsAt: "2026-10-01" }) === "starts");
ok("an end before the start is refused", E.eventProblem({ ...good, endsAt: "2026-10-01T17:00" }) === "ends");
ok("no end at all is fine — plenty run 'from 6pm'", E.eventProblem({ ...good, endsAt: "" }) === "");
ok("no capacity is fine", E.eventProblem({ ...good, capacity: null }) === "");
// A ROOM NOBODY MAY ENTER IS NOT A CAPACITY.
ok("a capacity of nought is refused", E.eventProblem({ ...good, capacity: 0 }) === "capacity");
ok("...and a negative one", E.eventProblem({ ...good, capacity: -5 }) === "capacity");
ok("a webinar is a kind", E.eventProblem({ ...good, kind: "webinar" }) === "");

console.log("\n== where it is in time, by the clock handed in");
ok("before it starts", E.eventState(good, "2026-09-30T12:00") === "upcoming");
ok("between its ends", E.eventState(good, "2026-10-01T19:00") === "running");
ok("after it ends", E.eventState(good, "2026-10-02T09:00") === "past");
ok("exactly at the start is running, not upcoming", E.eventState(good, "2026-10-01T18:00") === "running");
ok("exactly at the end is running, not past", E.eventState(good, "2026-10-01T20:00") === "running");
// AN EVENT WITH NO END IS A MOMENT, not an open-ended run.
ok("no end date: past once the start has gone", E.eventState({ startsAt: "2026-10-01T18:00", endsAt: "" }, "2026-10-01T18:01") === "past");
ok("an undated event is upcoming rather than past", E.eventState({ startsAt: "", endsAt: "" }, "2026-10-01T18:00") === "upcoming");

console.log("\n== seats");
ok("a capacity less the sign-ups", E.seatsLeft(50, 20) === 30);
// THE TRAP: no limit and no seats are opposite facts.
ok("NO capacity is null, never nought", E.seatsLeft(null, 20) === null);
ok("...and undefined is too", E.seatsLeft(undefined, 0) === null);
ok("a full room is a real 0", E.seatsLeft(50, 50) === 0);
// CLAMPING WOULD HIDE THE NUMBER SOMEBODY HAS TO ACT ON.
ok("oversubscribed goes negative rather than to nought", E.seatsLeft(50, 58) === -8);

console.log("\n== turnout");
const t = E.turnout(40, 30);
ok("registered and attended are both kept", t.registered === 40 && t.attended === 30);
ok("the rate is attended over registered", Math.round(t.rate * 100) === 75);
ok("no-shows are the difference", t.noShows === 10);
// NOBODY REGISTERED IS NOT A TURNOUT OF NOUGHT.
ok("no registrations means a NULL rate, not 0", E.turnout(0, 0).rate === null);
ok("...and no no-shows", E.turnout(0, 0).noShows === 0);
ok("nobody came out of forty is a real 0", E.turnout(40, 0).rate === 0);
// WALK-INS ARE REAL: more attended than registered.
ok("a walk-in pushes the rate over 100%", E.turnout(10, 12).rate === 1.2);
ok("...and never produces negative no-shows", E.turnout(10, 12).noShows === 0);

console.log("\n== what deletes");
ok("an upcoming event with nobody marked deletes", E.eventDeletable("upcoming", 0) === "");
ok("one that ran is kept as the record of what happened", E.eventDeletable("past", 0) === "event-ran");
ok("...and so is one somebody has been marked at", E.eventDeletable("upcoming", 3) === "event-attended");
ok("a running one with nobody marked still deletes", E.eventDeletable("running", 0) === "");

console.log("\n== attendance against the registrations that exist");
const regs = [{ id: "r1" }, { id: "r2" }, { id: "r3" }];
ok("ids that are registrations are kept", E.attendedAmong(["r1", "r3"], regs).join() === "r1,r3");
// THE CONTAINMENT IS IN THE READER, because deletion happens afterwards.
ok("an id for a deleted reply is dropped", E.attendedAmong(["r1", "gone"], regs).join() === "r1");
ok("a foreign id is dropped", E.attendedAmong(["another-form-reply"], regs).length === 0);
ok("the same person twice is counted once", E.attendedAmong(["r1", "r1"], regs).length === 1);
ok("nothing marked is an empty list", E.attendedAmong(null, regs).length === 0 && E.attendedAmong(undefined, regs).length === 0);
ok("no registrations means nobody attended", E.attendedAmong(["r1"], []).length === 0);

console.log(`\n${fails ? `${fails} FAILED` : "all passed"}`);
process.exit(fails ? 1 : 0);
