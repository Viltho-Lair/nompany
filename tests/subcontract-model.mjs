// SUBCONTRACTS AND PAYMENT CERTIFICATES, PURELY. No store, no routes.
//
// THE DEFECT EVERY ASSERTION HERE GUARDS is a certificate that pays for the
// same work twice. Certificates in this trade are CUMULATIVE — each values the
// whole job to date and pays the difference — and the moment anything sums the
// periods instead, a corrected period is counted once in its own right and
// again inside every later cumulative. The error compounds silently and looks
// like a subcontractor being overpaid for reasons nobody can reconstruct.
//
// So `certifiedToDate` is the LAST counted certificate's cumulative, never a
// sum, and `thisPeriod` is a difference derived from the last COUNTED one.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const M = await import("@/modules/procurement/subcontractModel");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

// A 100,000 package with 5% retention.
const sub = { value: 100000, retentionPercent: 5, status: "Live" };
const cert = (over) => ({ status: "Certified", backCharges: [], ...over });

console.log("\n== cumulative valuations pay the difference");

const p = M.subcontractPosition(sub, [
  cert({ id: "c1", number: "1", periodEnd: "2031-03-31", cumulativeValue: 30000 }),
  cert({ id: "c2", number: "2", periodEnd: "2031-04-30", cumulativeValue: 50000 }),
], "2031-05-01");

ok("the first period is its own value", p.certificates[0].thisPeriod === 30000,
  String(p.certificates[0].thisPeriod));
ok("...and the second is the difference", p.certificates[1].thisPeriod === 20000,
  String(p.certificates[1].thisPeriod));
// THE ASSERTION THIS FILE EXISTS FOR: certified-to-date is the LAST cumulative,
// not 30000 + 50000.
ok("CERTIFIED TO DATE IS THE LAST CUMULATIVE, NOT A SUM", p.certifiedToDate === 50000,
  String(p.certifiedToDate));
ok("...so what is left is the rest of the package", p.remaining === 50000,
  String(p.remaining));
ok("...and half the package is done", Math.abs(p.completeFraction - 0.5) < 1e-9,
  String(p.completeFraction));

// A CORRECTION IS SELF-CORRECTING, which is the reason for cumulative in the
// first place: period 3 restating the total puts period 2's error right.
const corrected = M.subcontractPosition(sub, [
  cert({ id: "c1", number: "1", periodEnd: "2031-03-31", cumulativeValue: 30000 }),
  cert({ id: "c2", number: "2", periodEnd: "2031-04-30", cumulativeValue: 50000 }),
  cert({ id: "c3", number: "3", periodEnd: "2031-05-31", cumulativeValue: 45000 }),
], "2031-06-01");
ok("a later certificate can restate the total downwards",
  corrected.certifiedToDate === 45000, String(corrected.certifiedToDate));
ok("...and that period pays a negative amount",
  corrected.certificates[2].thisPeriod === -5000,
  String(corrected.certificates[2].thisPeriod));

console.log("\n== retention, from the shared arithmetic");

ok("retention is held on what has been certified", p.retention.held === 2500,
  String(p.retention.held));
ok("...leaving the net", p.retention.net === 47500, String(p.retention.net));
// NULL RATHER THAN ZERO when nobody has said when it is released — the same
// distinction billing.ts draws, because this uses billing's own function.
ok("...and releasable is null with no release date",
  p.retention.releasable === null && p.retention.blocked === "no-release-date",
  JSON.stringify(p.retention));

const released = M.subcontractPosition(
  { ...sub, retentionReleaseDate: "2031-01-01" },
  [cert({ id: "c1", number: "1", periodEnd: "2031-03-31", cumulativeValue: 50000 })],
  "2031-05-01");
ok("once the date has passed it is releasable", released.retention.releasable === 2500,
  String(released.retention.releasable));

console.log("\n== back-charges");

const charged = M.subcontractPosition(sub, [
  cert({
    id: "c1", number: "1", periodEnd: "2031-03-31", cumulativeValue: 20000,
    backCharges: [
      { description: "Skip hire recharged", amount: 800 },
      { description: "Made good to plasterboard", amount: 1200 },
    ],
  }),
], "2031-05-01");
const c = charged.certificates[0];
ok("back-charges total", c.backCharges === 2000, String(c.backCharges));
// 20000 less 5% retention (1000) less 2000 back-charges.
ok("...and come off the net payable", c.netPayable === 17000, String(c.netPayable));
ok("...and off the certified position too", charged.netCertified === 17000,
  String(charged.netCertified));

// A DEDUCTION WITH NO REASON IS NOT A DEDUCTION ANYBODY CAN ANSWER.
ok("an unexplained back-charge is dropped",
  M.backChargeTotal([{ amount: 500 }, { description: "  ", amount: 900 }]) === 0);
ok("...and a described one is kept",
  M.backChargeTotal([{ description: "Cleaning", amount: 500 }]) === 500);

// NEGATIVE NET IS A REAL ANSWER and is not clamped: a period of back-charges
// larger than the work done means the studio is owed money.
const owing = M.subcontractPosition(sub, [
  cert({
    id: "c1", number: "1", periodEnd: "2031-03-31", cumulativeValue: 1000,
    backCharges: [{ description: "Damage to a door set", amount: 4000 }],
  }),
], "2031-05-01");
ok("a period can be net negative", owing.certificates[0].netPayable === -3050,
  String(owing.certificates[0].netPayable));

console.log("\n== a certificate nobody has agreed is not money owed");

const withDraft = M.subcontractPosition(sub, [
  cert({ id: "c1", number: "1", periodEnd: "2031-03-31", cumulativeValue: 30000 }),
  cert({ id: "c2", number: "2", periodEnd: "2031-04-30", cumulativeValue: 60000, status: "Draft" }),
], "2031-05-01");
ok("a draft does not move certified-to-date", withDraft.certifiedToDate === 30000,
  String(withDraft.certifiedToDate));
// AND A DRAFT BETWEEN TWO CERTIFIED PERIODS MUST NOT ABSORB THE ONE AFTER IT —
// `thisPeriod` is measured from the last COUNTED certificate.
const straddling = M.subcontractPosition(sub, [
  cert({ id: "c1", number: "1", periodEnd: "2031-03-31", cumulativeValue: 30000 }),
  cert({ id: "c2", number: "2", periodEnd: "2031-04-30", cumulativeValue: 40000, status: "Draft" }),
  cert({ id: "c3", number: "3", periodEnd: "2031-05-31", cumulativeValue: 50000 }),
], "2031-06-01");
ok("a later certified period measures from the last CERTIFIED one",
  straddling.certificates[2].thisPeriod === 20000,
  String(straddling.certificates[2].thisPeriod));
ok("...and the draft between them still shows its own difference",
  straddling.certificates[1].thisPeriod === 10000,
  String(straddling.certificates[1].thisPeriod));

console.log("\n== out of order, and nothing certified");

// SORTED BY PERIOD, because `thisPeriod` is a difference and arrival order
// would compute it against the wrong predecessor.
const jumbled = M.subcontractPosition(sub, [
  cert({ id: "c2", number: "2", periodEnd: "2031-04-30", cumulativeValue: 50000 }),
  cert({ id: "c1", number: "1", periodEnd: "2031-03-31", cumulativeValue: 30000 }),
], "2031-05-01");
ok("certificates are valued in period order regardless of arrival",
  jumbled.certificates[0].id === "c1" && jumbled.certificates[1].thisPeriod === 20000,
  JSON.stringify(jumbled.certificates.map((x) => [x.id, x.thisPeriod])));

const empty = M.subcontractPosition(sub, [], "2031-05-01");
ok("nothing certified says so", empty.blocked === "no-certificates");
ok("...with nothing certified to date", empty.certifiedToDate === 0);
ok("a package with no value has no fraction, not zero",
  M.subcontractPosition({ value: 0, retentionPercent: 5 }, [], "2031-05-01")
    .completeFraction === null);

// OVER-VALUED IS FLAGGED, NOT REFUSED: a variation agreed off-system is the
// usual cause, and refusing the figure would make the screen lie about what has
// been certified.
const over = M.subcontractPosition(sub, [
  cert({ id: "c1", number: "1", periodEnd: "2031-03-31", cumulativeValue: 120000 }),
], "2031-05-01");
ok("valuing past the package value is flagged", over.overValued === true);
ok("...and the figure is still shown", over.certifiedToDate === 120000);
ok("...with the remainder negative", over.remaining === -20000, String(over.remaining));

console.log("\n== what may be certified");

ok("a live subcontract accepts a certificate",
  M.certificateProblem(sub, 10000, 0) === null);
// A DRAFT HAS BEEN AGREED WITH NOBODY.
ok("a draft subcontract does not",
  M.certificateProblem({ ...sub, status: "Draft" }, 10000, 0) === "not-live");
ok("...nor a terminated one",
  M.certificateProblem({ ...sub, status: "Terminated" }, 10000, 0) === "terminated");
// CUMULATIVE CANNOT GO BACKWARDS: that is what a back-charge is for, and a
// back-charge says why while a reversed valuation says nothing.
ok("a valuation below the last certified one is refused",
  M.certificateProblem(sub, 9000, 10000) === "below-previous");
ok("...and equal to it is allowed", M.certificateProblem(sub, 10000, 10000) === null);
ok("a negative valuation is refused", M.certificateProblem(sub, -1, 0) === "value");
ok("a missing subcontract is refused", M.certificateProblem(null, 1, 0) === "notfound");

console.log(`\n${fails ? `${fails} FAILURES` : "all passed"}\n`);
process.exit(fails ? 1 : 0);
