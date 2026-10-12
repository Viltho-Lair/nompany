// SEATS, PURELY — what a seat count costs, what adding seats part-way through a
// period costs, when a reduction lands, and what a renewal asks for. The rules
// are the owner's of 12/10/2026 (lib/data/seatBilling's header): pay for the
// seats you chose, more at once and billed on the next renewal, fewer from the
// renewal, a payment request on the day a period starts.
//
// EVERY BLOCK IS A WAY A CUSTOMER WOULD BE BILLED WRONG: charged for seats
// nobody bought, charged less for more seats, charged twice for one addition,
// refunded for a reduction that was never theirs, or billed for nothing.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const P = await import("@/shared/seatPricing");
const Q = await import("@/shared/upgradeQuote");
const S = await import("@/shared/subscription");
const R = await import("@/shared/paymentRequests");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

// The owner's own figures: 38 JOD a seat up to 20, 34 to 50, 30 after.
const card = {
  id: "pro", type: "compound", name: "Pro",
  categories: [
    { id: "b1", label: "5–20", minEmployees: 5, maxEmployees: 20, perEmployee: 38 },
    { id: "b2", label: "21–50", minEmployees: 21, maxEmployees: 50, perEmployee: 34 },
    { id: "b3", label: "51+", minEmployees: 51, maxEmployees: 0, perEmployee: 30 },
  ],
};
const bands = P.seatBands(card);
const monthly = (seats) => { const r = P.priceSeats(bands, seats, "JOD"); return "error" in r ? r.error : r.monthly; };

console.log("\n== a seat count is priced band by band");

ok("10 seats are 10 × 38", monthly(10) === 380);
ok("25 seats are 20 × 38 + 5 × 34 — not 25 × 34, and not 50 × 34", monthly(25) === 930, String(monthly(25)));
ok("21 seats cost MORE than 20 — no cliff that rewards buying a seat you do not need", monthly(21) > monthly(20), `${monthly(21)} vs ${monthly(20)}`);
ok("an open top band prices any number above it", monthly(60) === 20 * 38 + 30 * 34 + 10 * 30);
ok("fewer than the package sells is refused, not priced", monthly(4) === "below-minimum");

const capped = P.seatBands({ ...card, categories: card.categories.slice(0, 2) });
ok("more than a capped package sells is refused", "error" in P.priceSeats(capped, 51, "JOD"));

const gappy = P.seatBands({ type: "compound", categories: [
  { id: "a", minEmployees: 5, maxEmployees: 20, perEmployee: 38 },
  { id: "b", minEmployees: 25, maxEmployees: 50, perEmployee: 34 },
] });
const g = P.priceSeats(gappy, 22, "JOD");
ok("seats in a gap between two bands are priced by the band above, never free", !("error" in g) && g.monthly === 20 * 38 + 2 * 34, JSON.stringify(g));

const single = P.seatBands({ type: "standard", minEmployees: 5, maxEmployees: 0, perEmployee: 38 });
ok("a package with one rate is one band", single.length === 1 && P.priceSeats(single, 7, "JOD").monthly === 266);

console.log("\n== a year is twelve discounted months");

ok("monthly is the monthly figure", P.periodPrice(380, "monthly", 15, "JOD") === 380);
ok("yearly at 15% off is 12 × 323", P.periodPrice(380, "yearly", 15, "JOD") === 3876);

console.log("\n== the quote");

const list = { currency: "JOD", taxPercent: 16, yearlyDiscountPct: 15, cards: [card], tiers: [{ id: "t", name: "Plus", monthly: 50, yearly: 42.5 }] };
const q = Q.quoteSeats(list, { packageId: "pro", seats: 25, tierId: "", cycle: "monthly" });
ok("25 seats, monthly, 930 before tax and 16% on top", !("error" in q) && q.amount === 930 && q.tax === 148.8 && q.total === 1078.8, JSON.stringify(q));
ok("the quote names the band its last seat is in", q.categoryId === "b2");
ok("its lines add up to its amount", q.lines.reduce((s, l) => s + l.periodAmount, 0) === q.amount);
const qt = Q.quoteSeats(list, { packageId: "pro", seats: 10, tierId: "t", cycle: "monthly" });
ok("a tier is a flat figure on top", qt.amount === 380 + 50 && qt.tierAmount === 50);
ok("an unknown package is refused", "error" in Q.quoteSeats(list, { packageId: "nope", seats: 10, tierId: "", cycle: "monthly" }));
ok("a seat count outside the package is refused", Q.quoteSeats(list, { packageId: "pro", seats: 3, tierId: "", cycle: "monthly" }).error === "below-minimum");

console.log("\n== adding seats part-way through a period");

// The owner's example: 10 seats, renewing on the 1st, 3 added on the 16th of a 30-day month.
const added = P.prorate({ before: monthly(10), after: monthly(13), from: "2026-11-01", to: "2026-12-01", today: "2026-11-16", currency: "JOD" });
ok("3 seats for 15 of 30 days is 3 × 38 × 15/30 = 57", added.amount === 57, JSON.stringify(added));
const crossing = P.prorate({ before: monthly(18), after: monthly(25), from: "2026-11-01", to: "2026-12-01", today: "2026-11-01", currency: "JOD" });
ok("crossing a band charges each new seat at the band it lands in (2 × 38 + 5 × 34)", crossing.amount === 2 * 38 + 5 * 34);
ok("a reduction refunds nothing", P.prorate({ before: 380, after: 304, from: "2026-11-01", to: "2026-12-01", today: "2026-11-10", currency: "JOD" }).amount === 0);
const p1 = P.periodAround("2026-12-01", 1, 1, "2026-11-16");
ok("the period a day falls in, while paid ahead", p1.from === "2026-11-01" && p1.to === "2026-12-01");
const p2 = P.periodAround("2026-11-01", 1, 1, "2026-11-10");
ok("...and while a renewal is still unpaid", p2.from === "2026-11-01" && p2.to === "2026-12-01");
const p3 = P.periodAround("2027-03-14", 12, 14, "2026-06-01");
ok("...and in the middle of a yearly plan", p3.from === "2026-03-14" && p3.to === "2027-03-14");

console.log("\n== the subscription carries the seats");

const AT = "2026-11-16T09:00:00.000Z";
const sub = { ...S.newTrial({ studioId: "s1", today: "2026-11-01", trialMonths: 0, at: AT }), kind: "paid", paidUntil: "2026-12-01", seats: 10 };
const charge = { id: "c1", at: AT, from: "2026-11-16", to: "2026-12-01", seatsBefore: 10, seatsAfter: 13, amount: 57, currency: "JOD" };

const reduced = S.applyEvent(sub, { id: "r1", type: "seats-reduced", seats: 8 }, "2026-11-10", AT).sub;
ok("a reduction is scheduled, and the limit stays where it was", reduced.seats === 10 && reduced.seatsNext === 8);
const add = S.applyEvent(reduced, { id: "a1", type: "seats-added", seats: 13, charge }, "2026-11-16", AT);
ok("adding seats raises the limit at once", add.sub.seats === 13);
ok("...records what the days left cost", add.sub.accrued.length === 1 && add.sub.accrued[0].amount === 57);
ok("...and gives up a reduction asked for earlier", add.sub.seatsNext === 0);
ok("the same addition delivered twice is charged once", S.applyEvent(add.sub, { id: "a1", type: "seats-added", seats: 13, charge }, "2026-11-16", AT).changed === false);
ok("'adding' the count it already has is refused", S.applyEvent(add.sub, { id: "a2", type: "seats-added", seats: 13 }, "2026-11-16", AT).problem === "not-more-seats");
ok("'reducing' to more than it has is refused", S.applyEvent(sub, { id: "r2", type: "seats-reduced", seats: 11 }, "2026-11-16", AT).problem === "not-fewer-seats");
const undo = S.applyEvent(reduced, { id: "r3", type: "seats-reduced", seats: 10 }, "2026-11-12", AT).sub;
ok("asking for the count it has takes a scheduled reduction back", undo.seatsNext === 0 && undo.seats === 10);

const renewed = S.applyEvent({ ...add.sub, seatsNext: 0 }, { id: "renewal:2026-12-01", type: "renewal-requested", requestId: "renewal:2026-12-01", seats: 13, chargeIds: ["c1"] }, "2026-12-01", AT).sub;
ok("a renewal takes the charges it billed off the unbilled list", renewed.accrued.length === 0);
const landed = S.applyEvent(reduced, { id: "renewal:x", type: "renewal-requested", requestId: "renewal:x", seats: 8, chargeIds: [] }, "2026-12-01", AT).sub;
ok("a scheduled reduction lands on the renewal", landed.seats === 8 && landed.seatsNext === 0);

console.log("\n== the renewal's payment request");

const today = "2026-12-01";
ok("a paid seat plan is due on the day its period starts", R.renewalDue(add.sub, [], today) === "2026-12-01");
ok("...not the day before", R.renewalDue(add.sub, [], "2026-11-30") === null);
ok("...once per period, however often the job runs", R.renewalDue(add.sub, [{ id: R.renewalId("2026-12-01"), status: "open" }], today) === null);
ok("a complimentary studio is never billed", R.renewalDue({ ...add.sub, kind: "comp" }, [], today) === null);
ok("nor one on Standard's free months", R.renewalDue({ ...add.sub, kind: "trial" }, [], today) === null);
ok("nor a cancelled one", R.renewalDue({ ...add.sub, cancelAt: "2026-12-01" }, [], today) === null);
ok("nor one on a package's old fixed size, with no seats bought", R.renewalDue({ ...add.sub, seats: 0 }, [], today) === null);

// The owner's worked example: renewed at 8 seats with the 57 from November.
const q8 = Q.quoteSeats({ ...list, cards: [{ ...card, categories: [{ id: "b0", label: "1–20", minEmployees: 1, maxEmployees: 20, perEmployee: 38 }] }] }, { packageId: "pro", seats: 8, tierId: "", cycle: "monthly" });
const req = R.buildRequest({ id: "renewal:2026-12-01", kind: "renewal", quote: q8, at: AT, today, from: today, anchorDay: 1, priceCountry: "JO", packageName: "Pro", tierName: "", charges: [charge] });
ok("8 × 38 + the 57 added in November = 361 before tax", req.subtotal === 361, String(req.subtotal));
ok("16% tax to the fils: 57.76, total 418.76", req.tax === 57.76 && req.total === 418.76, `${req.tax} ${req.total}`);
ok("the added seats are a line of their own", req.lines.length === 2 && req.lines[1].amount === 57);
ok("the request names the charges it billed", req.chargeIds.length === 1 && req.chargeIds[0] === "c1");
ok("it pays for the period from the renewal day", req.periodFrom === "2026-12-01" && req.periodTo === "2027-01-01");
const other = R.buildRequest({ id: "x", kind: "renewal", quote: q8, at: AT, today, from: today, priceCountry: "JO", packageName: "Pro", tierName: "", charges: [{ ...charge, currency: "USD" }] });
ok("a charge in another currency is not added to a total it is not in", other.subtotal === 304 && other.chargeIds.length === 0);
ok("the open request is the one waiting", R.openRequest([{ id: "a", status: "paid" }, { id: "b", status: "open" }])?.id === "b");

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
