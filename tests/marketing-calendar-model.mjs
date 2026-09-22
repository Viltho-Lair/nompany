// THE MARKETING CALENDAR'S ARITHMETIC — modules/marketing/calendar.
//
// THE DEFECTS THESE GUARD: a campaign with no start date vanishing instead of
// being named, so a studio cannot see it has nine unscheduled campaigns; a
// one-day campaign drawing a bar of zero width; a campaign that began before
// the window opened being dropped rather than cut; an open-ended campaign
// getting an invented end date; a cancelled campaign still occupying the
// calendar; and a week's channel load counting a campaign once per start
// rather than once per week it actually runs in.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const C = await import("@/modules/marketing/calendar");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== the window is whole weeks");
const w = C.window("2026-09-23", 4); // a Wednesday
ok("it starts on the Monday before", w.from === "2026-09-21", w.from);
ok("four weeks is twenty-eight days", w.days === 28 && w.weeks.length === 4);
ok("every column is a Monday", w.weeks.every((d) => new Date(Date.parse(`${d}T00:00:00Z`)).getUTCDay() === 1));
ok("a Monday stays put", C.window("2026-09-21", 1).from === "2026-09-21");
ok("a Sunday steps back six", C.window("2026-09-27", 1).from === "2026-09-21");
ok("the span is bounded", C.window("2026-09-21", 500).weeks.length === 52 && C.window("2026-09-21", 0).weeks.length === 1);

console.log("\n== bars, and what cannot be one");
const campaigns = [
  { id: "a", name: "Autumn email", status: "Active", startOn: "2026-09-21", endOn: "2026-09-27", channels: ["email"] },
  { id: "b", name: "Always on", status: "Active", startOn: "2026-08-01", endOn: "", channels: ["social"] },
  { id: "c", name: "One day", status: "Planned", startOn: "2026-09-24", endOn: "2026-09-24", channels: ["email"] },
  { id: "d", name: "Next year", status: "Planned", startOn: "2027-03-01", endOn: "2027-03-08", channels: ["print"] },
  { id: "e", name: "No dates", status: "Draft", channels: ["email"] },
  { id: "f", name: "Called off", status: "Cancelled", startOn: "2026-09-22", endOn: "2026-09-29", channels: ["email"] },
  { id: "g", name: "Runs past", status: "Active", startOn: "2026-10-12", endOn: "2026-12-01", channels: ["events"] },
];
const { bars, unscheduled } = C.bars(campaigns, w.from, w.to);
const bar = (id) => bars.find((b) => b.id === id);
ok("a campaign with no start is named, not dropped", unscheduled.length === 1 && unscheduled[0].id === "e");
ok("a cancelled campaign is not on the calendar", !bar("f"));
ok("one outside the window is not either", !bar("d"));
ok("one that began earlier is cut, not dropped", bar("b").cutStart === true && bar("b").offset === 0);
ok("one with no end runs to the window's edge and says so", bar("b").openEnded === true && bar("b").endOn === "");
ok("one that runs past the end is cut there", bar("g").cutEnd === true);
ok("a one-day campaign still has width", bar("c").length > 0, String(bar("c").length));
ok("a week-long bar is a quarter of a four-week window", Math.abs(bar("a").length - 0.25) < 0.01, String(bar("a").length));
ok("bars come in date order", bars.map((b) => b.id).join() === "b,a,c,g", bars.map((b) => b.id).join());

console.log("\n== how busy each week is");
const weeks = C.load(bars, w.weeks);
ok("a campaign counts in every week it touches", weeks[0].byChannel.social === 1 && weeks[1].byChannel.social === 1);
ok("two email campaigns in one week are two", weeks[0].byChannel.email === 2, JSON.stringify(weeks[0].byChannel));
ok("the busiest channel is named", weeks[0].busiest[0] === "email" && weeks[0].busiest[1] === 2);
ok("a quiet week says so", weeks[2].running === 1 && !weeks[2].byChannel.email);

console.log("\n== what to look at this week");
const week = C.thisWeek(bars, "2026-09-21");
ok("what starts this week", week.starting.map((b) => b.id).sort().join() === "a,c");
// A ONE-DAY CAMPAIGN BOTH STARTS AND ENDS IN THE SAME WEEK, and appears in both
// lists. This assertion first expected only "a" and the code was right.
ok("what ends this week", week.ending.map((b) => b.id).sort().join() === "a,c", week.ending.map((b) => b.id).join());
ok("a crowded channel is flagged", week.crowded.some((x) => x.channel === "email" && x.n === 2));
ok("...and one campaign is not crowded", !week.crowded.some((x) => x.channel === "social"));

console.log("\n== survivable inputs");
ok("no campaigns, no bars", C.bars([], w.from, w.to).bars.length === 0);
ok("a non-array is empty", C.bars(null, w.from, w.to).unscheduled.length === 0);
ok("a nonsense date is treated as no date", C.bars([{ id: "x", startOn: "soon" }], w.from, w.to).unscheduled.length === 1);

// EVENTS ON THE CALENDAR (22/09/2026). The defects these guard: an event drawn
// in the wrong COLUMN because the marker and the ruler worked out "which week"
// by different arithmetic; one outside the window still drawn; and an event with
// no start silently placed on whatever day the parser fell back to.
console.log("\n== events, as markers rather than bars");
const ew = C.window("2026-10-07", 4);          // Monday 05/10 → four weeks
const evts = [
  { id: "e1", name: "Open day", kind: "event", startsAt: "2026-10-15T18:00" },
  { id: "e2", name: "Webinar", kind: "webinar", startsAt: "2026-10-05T09:00" },
  { id: "e3", name: "Long past", kind: "event", startsAt: "2026-01-01T09:00" },
  { id: "e4", name: "Far future", kind: "event", startsAt: "2027-01-01T09:00" },
  { id: "e5", name: "No date", kind: "event", startsAt: "" },
];
const marks = C.markers(evts, ew.from, ew.to);
ok("only the events inside the window", marks.map((m) => m.id).join() === "e2,e1", marks.map((m) => m.id).join());
ok("...sorted by when", marks[0].on === "2026-10-05" && marks[1].on === "2026-10-15");
// THE MARKER AND THE RULER MUST AGREE ABOUT WHICH WEEK A DAY IS IN, or an event
// is drawn under the wrong column — the whole point of this join.
ok("a marker's week is one of the ruler's own columns",
  marks.every((m) => ew.weeks.includes(m.week)), JSON.stringify(marks.map((m) => m.week)));
ok("Thursday the 15th belongs to the Monday the 12th column",
  marks.find((m) => m.id === "e1").week === "2026-10-12");
ok("a Monday belongs to its own column", marks.find((m) => m.id === "e2").week === "2026-10-05");
ok("an event with no start is not placed at all", !marks.some((m) => m.id === "e5"));
ok("nonsense is an empty list", C.markers(null, ew.from, ew.to).length === 0);

console.log("\n== and this week's box");
const thisWeekWithEvents = C.thisWeek([], "2026-10-12", 2, marks);
ok("an event this week is listed", thisWeekWithEvents.events.map((e) => e.id).join() === "e1");
ok("one in another week is not", !thisWeekWithEvents.events.some((e) => e.id === "e2"));
// AN EVENT COMPETES WITH NO CAMPAIGN FOR A CHANNEL'S ATTENTION.
ok("events do not enter the crowding warning", thisWeekWithEvents.crowded.length === 0);
ok("handing no events in still works", C.thisWeek([], "2026-10-12", 2).events.length === 0);

console.log(`\n${fails ? `${fails} FAILED` : "all passed"}`);
process.exit(fails ? 1 : 0);
