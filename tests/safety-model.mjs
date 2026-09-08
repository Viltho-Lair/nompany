// LTIFR AND TRIFR — the arithmetic, and the four states where there is no rate.
//
// Pure, so it needs no database. `daysLost` sat on every incident since the
// register shipped and nothing divided it by anything; this is what makes the
// register answer a question rather than file one.

import {
  safetySummary, RATE_BASE, LOST_TIME, RECORDABLE_KINDS,
} from "../src/modules/quality/safety.ts";

let fails = 0;
const ok = (msg, cond, detail = "") => {
  if (!cond) { fails += 1; console.log(` FAIL  ${msg}${detail ? `  — ${detail}` : ""}`); }
  else console.log(`  ok   ${msg}`);
};

const Q3 = { from: "2026-07-01", to: "2026-09-30" };
const inc = (id, kind, happenedOn, daysLost) =>
  ({ id, reference: id.toUpperCase(), values: { kind, happenedOn, ...(daysLost === undefined ? {} : { daysLost }) } });
const hrs = (date, hours) => ({ date, hours });

console.log("\n== the classification is the standard's, not a filter written per call");

// A LOST-TIME INJURY IS RECORDABLE TOO. If it were not, TRIFR could come out
// SMALLER than LTIFR — impossible, and a reader would spot it before any test.
ok("a lost-time injury is one of the recordable kinds",
  RECORDABLE_KINDS.includes(LOST_TIME));
ok("a near miss is not recordable", !RECORDABLE_KINDS.includes("Near miss"));
ok("the rate base is per million hours", RATE_BASE === 1_000_000);

console.log("\n== the rates");

// 2 lost-time and 1 medical over 500,000 hours:
//   LTIFR = 2 * 1e6 / 5e5 = 4.0     TRIFR = 3 * 1e6 / 5e5 = 6.0
const s = safetySummary([
  inc("i1", "Lost time", "2026-07-10", 5),
  inc("i2", "Lost time", "2026-08-02", 12),
  inc("i3", "Medical treatment", "2026-08-20"),
  inc("i4", "Near miss", "2026-09-01"),
], [hrs("2026-07-15", 200_000), hrs("2026-08-15", 300_000)], Q3);

ok("every incident in the window is counted", s.incidents === 4, String(s.incidents));
ok("lost time is the subset it says it is", s.lostTime === 2, String(s.lostTime));
ok("recordable includes medical treatment and lost time, and not the near miss",
  s.recordable === 3, String(s.recordable));
ok("days lost sum", s.daysLost === 17, String(s.daysLost));
ok("hours sum", s.hours === 500_000, String(s.hours));
ok("LTIFR is lost-time per million hours", s.ltifr === 4, String(s.ltifr));
ok("TRIFR is recordable per million hours", s.trifr === 6, String(s.trifr));
// TRIFR CANNOT BE BELOW LTIFR. The one relationship between the two figures
// that a reader checks by eye, so it is checked here.
ok("...and TRIFR is never below LTIFR", s.trifr >= s.ltifr);
ok("nothing is unexplained when both rates exist", s.reason === "", s.reason);

ok("kinds are reported commonest first",
  s.byKind[0].kind === "Lost time" && s.byKind[0].count === 2,
  JSON.stringify(s.byKind));

console.log("\n== the window is inclusive and it excludes");

const win = safetySummary([
  inc("a", "Lost time", "2026-07-01"),   // the first day, included
  inc("b", "Lost time", "2026-09-30"),   // the last day, included
  inc("c", "Lost time", "2026-06-30"),   // the day before
  inc("d", "Lost time", "2026-10-01"),   // the day after
  inc("e", "Lost time", ""),             // never dated
], [hrs("2026-08-01", 1_000_000)], Q3);
ok("both ends of the window are inside it", win.lostTime === 2, String(win.lostTime));
// AN UNDATED INCIDENT IS IN NO PERIOD. Counting it would move whichever
// quarter happened to be on screen, and a rate that changes with the view is
// not a rate.
ok("an incident with no date is in no window", win.incidents === 2, String(win.incidents));
ok("hours outside the window do not count either",
  safetySummary([], [hrs("2026-01-01", 999)], Q3).hours === 0);

console.log("\n== null rather than zero, three ways");

// (1) THE READER MAY NOT SEE HOURS. Timesheets are Projects'. Somebody holding
// only Quality rights gets the incident counts and NO rate, rather than a rate
// computed over nothing — the customer-360 rule.
const noAccess = safetySummary([inc("x", "Lost time", "2026-08-01", 3)], null, Q3);
ok("no access to hours means no hours and no rates",
  noAccess.hours === null && noAccess.ltifr === null && noAccess.trifr === null);
ok("...and it says which of the three it is", noAccess.reason === "no-hours-access", noAccess.reason);
// THE COUNTS STILL COME BACK. A safety officer who cannot see hours can still
// be told there was a lost-time injury.
ok("...while the incident counts still answer",
  noAccess.incidents === 1 && noAccess.lostTime === 1 && noAccess.daysLost === 3);

// (2) NOBODY BOOKED ANY HOURS. Not the same as (1): we looked, and the answer
// was none. A "0.0 LTIFR" over a period nobody worked is a safety claim the
// data does not support.
const noHours = safetySummary([inc("y", "Lost time", "2026-08-01")], [], Q3);
ok("no hours booked is still no rate", noHours.ltifr === null && noHours.trifr === null);
ok("...but the hours are a real nought, not an unknown", noHours.hours === 0);
ok("...and it is a different reason", noHours.reason === "no-hours", noHours.reason);

// (3) HOURS BUT NO INCIDENTS. A genuine zero — the good case, and the one a
// studio most wants to be able to state.
const clean = safetySummary([], [hrs("2026-08-01", 250_000)], Q3);
ok("a clean period is a real zero rate, not a null",
  clean.ltifr === 0 && clean.trifr === 0, JSON.stringify({ l: clean.ltifr, t: clean.trifr }));
ok("...and says so", clean.reason === "no-incidents-yet", clean.reason);

console.log("\n== the ragged edges");

const ragged = safetySummary([
  inc("u1", "", "2026-08-01"),                  // no kind at all
  inc("u2", "Lost time", "2026-08-02", "many"), // daysLost is not a number
  inc("u3", "Lost time", "2026-08-03", -4),     // ...or is negative
], [hrs("2026-08-01", "300000"), hrs("bad-date", 999), hrs("2026-08-02", -5)], Q3);

ok("an incident with no kind is grouped rather than dropped",
  ragged.byKind.some((k) => k.kind === "Unclassified" && k.count === 1),
  JSON.stringify(ragged.byKind));
// AN UNFILLED daysLost CANNOT UNDERSTATE THE RATE, because the rate is built on
// the COUNT of lost-time incidents rather than on the days.
ok("unusable daysLost values add nothing and change no rate",
  ragged.daysLost === 0 && ragged.lostTime === 2, JSON.stringify(ragged.daysLost));
ok("a numeric string of hours still counts", ragged.hours === 300_000, String(ragged.hours));
ok("a bad date and a negative figure contribute nothing", ragged.hours === 300_000);

// AN OPEN-ENDED WINDOW is how a studio asks "ever".
const ever = safetySummary([
  inc("e1", "Lost time", "2020-01-01"),
  inc("e2", "Lost time", "2030-01-01"),
], [hrs("2020-01-01", 1_000_000)], { from: "", to: "" });
ok("a window with no ends takes everything dated", ever.incidents === 2, String(ever.incidents));

console.log(fails ? `\nsafety model: ${fails} FAILURES\n` : "\nsafety model: all passed\n");
process.exit(fails ? 1 : 0);
