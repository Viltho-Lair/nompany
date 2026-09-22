// THE PROMOTIONS ENGINE (modules/sales/posPromotionsModel), asserted without a
// database — the same posture posModel and posReturnModel take.
//
// THE DEFECTS THESE GUARD, each named where it is checked: a receipt-level
// offer whose parts do not add up to the offer; a discount that outlives its
// dates because a stored flag said "active"; an offer that applies twice
// because nothing closed its level; a cap that lets one more through; an
// excluded item quietly discounted; and a coupon used by somebody it was not
// issued to.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });
const P = await import("@/modules/sales/posPromotionsModel");

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails += 1; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};
const j = (v) => JSON.stringify(v);

const NOW = "2026-09-22T09:00:00.000Z";
const line = (key, price, count = 1, extra = {}) => ({
  key, itemId: `i-${key}`, description: `Item ${key}`, count, price, ...extra,
});
const offer = (over = {}) => ({
  id: over.id || "p1",
  code: over.code || "PRM-0001",
  name: over.name || "Ten off",
  status: "active",
  startsAt: "2026-09-01T00:00:00.000Z",
  endsAt: null,
  applicationLevel: "line",
  priority: 10,
  tiers: [{ thresholdType: "none", thresholdValue: 0, benefits: [{ type: "percentage_off", value: { percent: 10 }, appliesTo: "matched_lines" }] }],
  ...over,
});
const run = (lines, promotions, ctx = {}) =>
  P.evaluate({ lines, promotions }, { now: NOW, currency: "SAR", channel: "pos", ...ctx });

console.log("\n== a line offer takes what it says");
const one = run([line("a", 100)], [offer()]);
ok("ten per cent off a hundred is ten", one.lines[0].promotionDiscount === 10 && one.lines[0].net === 90, j(one.lines[0]));
ok("the applied row carries the offer, not a number alone",
  one.applied[0].promotionCode === "PRM-0001" && one.applied[0].level === "line" && one.applied[0].appliedBy === "system");

console.log("\n== tiers: the highest one reached pays");
const laddered = offer({
  applicationLevel: "receipt",
  tiers: [
    { thresholdType: "amount", thresholdValue: 100, benefits: [{ type: "percentage_off", value: { percent: 10 }, appliesTo: "matched_lines" }] },
    { thresholdType: "amount", thresholdValue: 500, benefits: [{ type: "percentage_off", value: { percent: 20 }, appliesTo: "matched_lines" }] },
  ],
});
ok("under the first threshold nothing applies", run([line("a", 50)], [laddered]).discountTotal === 0);
ok("the first tier pays between the two", run([line("a", 200)], [laddered]).discountTotal === 20);
ok("the second pays once it is reached", run([line("a", 600)], [laddered]).discountTotal === 120);
ok("a tier ladder that goes backwards is refused",
  P.promotionProblems(P.cleanPromotion({
    name: "x", startsAt: NOW,
    tiers: [{ thresholdType: "amount", thresholdValue: 500, benefits: [] }, { thresholdType: "amount", thresholdValue: 100, benefits: [] }],
  })).includes("tier-1-order"));

console.log("\n== largest remainder: the parts add up to the whole");
const spread = run([line("a", 10), line("b", 20), line("c", 30)], [offer({
  applicationLevel: "receipt",
  tiers: [{ thresholdType: "none", thresholdValue: 0, benefits: [{ type: "fixed_amount_off", value: { amount: 10 }, appliesTo: "matched_lines" }] }],
})]);
ok("a receipt offer is spread by what each line came to",
  spread.lines.map((l) => l.promotionDiscount).join("|") === "1.67|3.33|5", j(spread.lines.map((l) => l.promotionDiscount)));
ok("…and they sum to exactly the offer", spread.discountTotal === 10);
const thirds = run([line("a", 1), line("b", 1), line("c", 1)], [offer({
  applicationLevel: "receipt",
  tiers: [{ thresholdType: "none", thresholdValue: 0, benefits: [{ type: "fixed_amount_off", value: { amount: 1 }, appliesTo: "matched_lines" }] }],
})], { currency: "OMR" });
ok("three decimals for a three-decimal currency, still exact",
  thirds.discountTotal === 1 && thirds.lines.map((l) => l.promotionDiscount).join("|") === "0.334|0.333|0.333",
  j(thirds.lines.map((l) => l.promotionDiscount)));
ok("allocate hands the odd unit to the largest remainder, ties by key",
  j(P.allocate(10, [{ key: "a", weight: 1 }, { key: "b", weight: 1 }, { key: "c", weight: 1 }])) === j([
    { key: "a", minor: 4 }, { key: "b", minor: 3 }, { key: "c", minor: 3 }]));

console.log("\n== stacking and exclusivity");
const ten = offer({ id: "p1", code: "PRM-0001", priority: 10 });
const five = offer({ id: "p2", code: "PRM-0002", priority: 20, tiers: [{ thresholdType: "none", thresholdValue: 0, benefits: [{ type: "percentage_off", value: { percent: 5 }, appliesTo: "matched_lines" }] }] });
const both = run([line("a", 100)], [ten, five]);
ok("two non-exclusive offers both apply, the second on what is left",
  both.lines[0].applied.length === 2 && both.discountTotal === 14.5, j(both.discountTotal));
const shut = run([line("a", 100)], [{ ...ten, exclusive: true }, five]);
ok("an exclusive offer closes its level", shut.discountTotal === 10
  && shut.skipped.some((s) => s.promotionId === "p2" && s.reason === "exclusive-earlier"), j(shut));
const mixed = run([line("a", 100)], [{ ...ten, exclusive: true }, { ...five, applicationLevel: "receipt" }]);
ok("…and does not close the other level", mixed.discountTotal === 14.5, j(mixed.discountTotal));
ok("priority decides the order, not the array", run([line("a", 100)], [five, ten]).lines[0].applied[0].promotionId === "p1");

console.log("\n== the shapes an offer can take");
ok("buy two get one free, counted across the matched set",
  run([line("a", 10, 3)], [offer({ tiers: [{ thresholdType: "none", thresholdValue: 0, benefits: [{ type: "buy_x_get_y", value: { buy: 2, get: 1 }, appliesTo: "matched_lines" }] }] })]).discountTotal === 10);
ok("a fixed price replaces the shelf price per unit",
  run([line("a", 100, 2)], [offer({ tiers: [{ thresholdType: "none", thresholdValue: 0, benefits: [{ type: "fixed_price", value: { price: 80 }, appliesTo: "matched_lines" }] }] })]).discountTotal === 40);
const bundle = run([line("a", 60), line("b", 50)], [offer({ tiers: [{ thresholdType: "none", thresholdValue: 0, benefits: [{ type: "bundle_price", value: { price: 100 }, appliesTo: "matched_lines" }] }] })]);
// 10.00 over weights of 60 and 50: 5.4545… and 4.5454…, so the odd fils goes
// to the larger remainder — the second line — and the two still make 10.00.
ok("a bundle price is spread over what it bundles", bundle.discountTotal === 10
  && bundle.lines.map((l) => l.promotionDiscount).join("|") === "5.45|4.55", j(bundle.lines.map((l) => l.promotionDiscount)));
const cheapest = run([line("a", 30), line("b", 10)], [offer({ tiers: [{ thresholdType: "none", thresholdValue: 0, benefits: [{ type: "free_item", value: { qty: 1 }, appliesTo: "cheapest_matched" }] }] })]);
ok("the cheapest matched line is the free one", cheapest.discountTotal === 10 && cheapest.lines[1].net === 0);
const tag = run([line("a", 100)], [offer({ tiers: [{ thresholdType: "none", thresholdValue: 0, benefits: [] }] })]);
ok("an offer with no benefit is valid and tags the sale",
  tag.discountTotal === 0 && tag.applied.length === 1 && tag.applied[0].discount === 0, j(tag.applied));

console.log("\n== what must never be discounted");
ok("an excluded item is never matched",
  run([line("a", 100, 1, { excluded: true })], [offer()]).discountTotal === 0);
ok("…and an offer with nothing left to match says so",
  run([line("a", 100, 1, { excluded: true })], [offer()]).skipped[0].reason === "no-lines");
ok("a line never goes below nothing",
  run([line("a", 10)], [offer({ tiers: [{ thresholdType: "none", thresholdValue: 0, benefits: [{ type: "fixed_amount_off", value: { amount: 999 }, appliesTo: "matched_lines" }] }] })]).lines[0].net === 0);

console.log("\n== caps and limits");
const capped = run([line("a", 1000)], [offer({ maxDiscountAmount: 50 })]);
ok("an offer's own ceiling holds", capped.discountTotal === 50, j(capped.discountTotal));
const usage = (u) => run([line("a", 100)], [offer({ maxUsesTotal: 5, maxUsesPerCustomer: 1, maxUsesPerDay: 2 })], { usage: { p1: u }, customer: { id: "c1" } });
ok("a used-up offer is refused by name", usage({ total: 5 }).skipped[0].reason === "used-up");
ok("a per-customer limit is its own reason", usage({ perCustomer: 1 }).skipped[0].reason === "customer-limit");
ok("a per-day limit is its own reason", usage({ today: 2 }).skipped[0].reason === "day-limit");
ok("under every limit it applies", usage({ total: 1, perCustomer: 0, today: 1 }).discountTotal === 10);

console.log("\n== who the offer is for");
const members = offer({ eligibility: { tagIds: ["t-vip"], firstPurchaseOnly: false } });
ok("a customer offer needs a customer", run([line("a", 100)], [members]).skipped[0].reason === "needs-customer");
ok("…and the right one", run([line("a", 100)], [members], { customer: { id: "c1", tagIds: ["t-staff"] } }).skipped[0].reason === "not-eligible");
ok("attaching the customer re-prices the basket",
  run([line("a", 100)], [members], { customer: { id: "c1", tagIds: ["t-vip"] } }).discountTotal === 10);
const firstOnly = offer({ eligibility: { firstPurchaseOnly: true } });
ok("a first-purchase offer refuses a returning customer",
  run([line("a", 100)], [firstOnly], { customer: { id: "c1", firstPurchase: false } }).skipped[0].reason === "not-first-purchase");
ok("…and applies to a new one", run([line("a", 100)], [firstOnly], { customer: { id: "c1", firstPurchase: true } }).discountTotal === 10);

console.log("\n== chosen, taken off, and coupon-locked");
const manual = offer({ requiresManualSelection: true });
ok("an offer the till does not apply by itself waits to be chosen",
  run([line("a", 100)], [manual]).skipped[0].reason === "not-chosen");
ok("…and is the cashier's act when it is", run([line("a", 100)], [manual], { selected: ["p1"] }).applied[0].appliedBy === "user");
ok("choosing one without the right is refused",
  run([line("a", 100)], [manual], { selected: ["p1"], may: { applyManual: false } }).skipped[0].reason === "forbidden");
ok("an auto offer can be taken off", run([line("a", 100)], [offer()], { removed: ["p1"] }).skipped[0].reason === "removed");
ok("…but not without the right",
  run([line("a", 100)], [offer()], { removed: ["p1"], may: { removeAuto: false } }).discountTotal === 10);
const locked = offer({ requiresCoupon: true });
ok("a coupon-only offer does nothing without one", run([line("a", 100)], [locked]).skipped[0].reason === "needs-coupon");
const withCoupon = run([line("a", 100)], [locked], { coupons: [{ code: "SAVE-ABCD", promotionId: "p1" }] });
ok("…and carries the code onto the sale when there is one",
  withCoupon.discountTotal === 10 && withCoupon.applied[0].couponCode === "SAVE-ABCD");

console.log("\n== conditions");
const onItems = offer({ conditions: [{ type: "item_in_list", value: { itemIds: ["i-b"] } }] });
const picked = run([line("a", 100), line("b", 100)], [onItems]);
ok("an item list matches only its own lines", picked.lines[0].promotionDiscount === 0 && picked.lines[1].promotionDiscount === 10);
const byType = offer({ conditions: [{ type: "category_in_list", value: { categories: ["Drinks"] } }] });
ok("a category is the item's own type until items have one",
  run([line("a", 100, 1, { itemType: "Drinks" })], [byType]).discountTotal === 10);
const byVendor = offer({ conditions: [{ type: "brand_in_list", value: { brands: ["v1"] } }] });
ok("a brand is the vendor until items have one",
  run([line("a", 100, 1, { vendorId: "v1" })], [byVendor]).discountTotal === 10);
const threeKilos = offer({ conditions: [{ type: "min_quantity", value: { qty: 3, unit: "kg" } }] });
ok("a quantity condition counts only its own unit",
  run([line("a", 100, 3, { unit: "pcs" })], [threeKilos]).skipped[0].reason === "min-quantity");
// Three kilos at 100 is 300, so a tenth of it is 30.
ok("…and applies when the unit matches", run([line("a", 100, 3, { unit: "kg" })], [threeKilos]).discountTotal === 30);
const onCard = offer({ conditions: [{ type: "payment_method", value: { methods: ["card"] } }] });
ok("a payment condition waits until the payment is known",
  run([line("a", 100)], [onCard]).skipped[0].reason === "payment-method");
ok("…and applies once it is", run([line("a", 100)], [onCard], { paymentMethods: ["card"] }).discountTotal === 10);

console.log("\n== dates, schedules and the studio's clock");
const dated = offer({ startsAt: "2026-09-20T00:00:00.000Z", endsAt: "2026-09-22T08:00:00.000Z" });
ok("an offer past its end is not live", P.promotionValidAt(dated, NOW) === false);
ok("…and the till says why rather than applying it", run([line("a", 100)], [dated]).skipped[0].reason === "not-live");
ok("an offer before its start is not live", P.promotionValidAt(offer({ startsAt: "2026-10-01T00:00:00.000Z" }), NOW) === false);
ok("a paused offer is not live", P.promotionValidAt(offer({ status: "paused" }), NOW) === false);
ok("open-ended means open-ended", P.promotionValidAt(offer({ endsAt: null }), "2030-01-01T00:00:00.000Z") === true);
// 21:30 UTC is 00:30 the NEXT DAY in Riyadh — the date and the weekday both move.
const lateNight = offer({ schedule: { days: [2], windows: [{ from: "22:00", to: "02:00" }] } });
ok("a window that wraps midnight is one window",
  P.promotionValidAt(lateNight, "2026-09-22T20:30:00.000Z", "Asia/Riyadh") === true, "23:30 Riyadh, Tuesday");
ok("the day is the studio's day, not UTC's",
  P.promotionValidAt({ ...lateNight, schedule: { days: [3], windows: [] } }, "2026-09-22T21:30:00.000Z", "Asia/Riyadh") === true,
  "00:30 Wednesday in Riyadh is still Tuesday in UTC");
ok("outside the window it is not live",
  P.promotionValidAt(lateNight, "2026-09-22T12:00:00.000Z", "Asia/Riyadh") === false);
ok("an unknown timezone falls back rather than refusing a sale",
  P.localParts(new Date("2026-09-22T09:00:00.000Z"), "Not/AZone").minutes === 540);
ok("days until the end are counted, and open-ended has none",
  P.daysUntilEnd(offer({ endsAt: "2026-09-25T09:00:00.000Z" }), NOW) === 3 && P.daysUntilEnd(offer(), NOW) === null);

console.log("\n== the same basket twice is the same answer");
const lines = [line("a", 33.333, 3), line("b", 10, 2), line("c", 7.77)];
const promos = [ten, five, { ...offer({ id: "p3", code: "PRM-0003", applicationLevel: "receipt", priority: 5 }) }];
ok("deterministic", j(run(lines, promos)) === j(run(lines, promos)));
ok("…and the lines still add up",
  run(lines, promos).lines.every((l) => Math.abs(l.gross - l.promotionDiscount - l.net) < 0.0001));

console.log("\n== what may be stored");
const cleaned = P.cleanPromotion({
  name: "  Summer  ", startsAt: NOW, endsAt: "2026-10-01T00:00:00.000Z", priority: "3",
  applicationLevel: "receipt", exclusive: "yes", maxDiscountAmount: "",
  channels: "nonsense", status: "active",
  conditions: [{ type: "made_up", value: { itemIds: ["x"] } }],
  tiers: [{ thresholdType: "amount", thresholdValue: "200", benefits: [{ type: "percentage_off", value: { percent: 150 }, appliesTo: "made_up" }] }],
});
ok("an unknown channel falls back to the till", cleaned.channels === "pos");
ok("an unknown condition type is refused into a known one", cleaned.conditions[0].type === "item_in_list");
ok("a percentage cannot exceed a hundred", cleaned.tiers[0].benefits[0].value.percent === 100);
ok("an unknown appliesTo falls back to the matched lines", cleaned.tiers[0].benefits[0].appliesTo === "matched_lines");
ok("a blank ceiling is no ceiling, not nought", cleaned.maxDiscountAmount === null);
ok("only a true exclusive is exclusive", cleaned.exclusive === false);
ok("an end before the start is refused",
  P.promotionProblems(P.cleanPromotion({ name: "x", startsAt: "2026-09-10T00:00:00.000Z", endsAt: "2026-09-01T00:00:00.000Z" })).includes("ends-before-starts"));
ok("a nameless offer is refused", P.promotionProblems(P.cleanPromotion({ startsAt: NOW })).includes("name"));
ok("a quantity condition with no unit is refused",
  P.promotionProblems(P.cleanPromotion({ name: "x", startsAt: NOW, conditions: [{ type: "min_quantity", value: { qty: 3 } }] })).includes("min-quantity-unit"));

console.log("\n== coupons");
let seed = 0;
const rng = () => { seed += 0.137; return seed % 1; };
const code = P.couponCode(rng, 8, "eid");
ok("a code carries its prefix and an unambiguous alphabet",
  code.startsWith("EID-") && [...code.slice(4)].every((c) => P.COUPON_ALPHABET.includes(c)), code);
ok("no 0/O or 1/I in the alphabet", !/[01OIL]/.test(P.COUPON_ALPHABET));
const base = { promotionId: "p1", code: "X", redeemed: 0 };
ok("a coupon needs a customer on the sale", P.couponProblem(base, NOW, "") === "needs-customer");
ok("a personal coupon refuses anybody else", P.couponProblem({ ...base, customerId: "c1" }, NOW, "c2") === "not-yours");
ok("…and admits its own customer", P.couponProblem({ ...base, customerId: "c1" }, NOW, "c1") === "");
ok("a public coupon admits any customer", P.couponProblem(base, NOW, "c9") === "");
ok("a single-use coupon is used once", P.couponProblem({ ...base, singleUse: true, redeemed: 1 }, NOW, "c1") === "already-used");
ok("a redemption ceiling holds", P.couponProblem({ ...base, maxRedemptions: 2, redeemed: 2 }, NOW, "c1") === "used-up");
ok("a per-customer ceiling holds", P.couponProblem({ ...base, perCustomerLimit: 1, redeemedByCustomer: 1 }, NOW, "c1") === "customer-limit");
ok("an expired coupon says so", P.couponProblem({ ...base, expiresAt: "2026-09-01T00:00:00.000Z" }, NOW, "c1") === "expired");
ok("an unknown code is not a coupon", P.couponProblem(null, NOW, "c1") === "unknown-coupon");

console.log(fails ? `\npos promotions model: ${fails} FAILURES\n` : "\npos promotions model: all passed\n");
process.exitCode = fails ? 1 : 0;
