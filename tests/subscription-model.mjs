// A STUDIO'S SUBSCRIPTION, PURELY — dates, the unpaid ladder, payment events and
// what a request may do, with "today" passed in so a year runs in milliseconds.
//
// EVERY BLOCK IS A WAY A CUSTOMER WOULD BE WRONGED: charged twice for one
// payment, locked out while paid up, kept working for nothing, charged for days
// they could not use, or given back a free period the owner said never returns.
// The rules are the owner's of 24/09/2026 (shared/subscription's header).

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const S = await import("@/shared/subscription");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const AT = "2026-01-01T00:00:00.000Z";
const paid = (sub, id, periods, today, extra = {}) => S.applyEvent(sub, { id, type: "paid", periods, ...extra }, today, AT);
const status = (sub, today) => S.subscriptionStatus(sub, today);
const plus = (day, n) => S.addDays(day, n);

console.log("\n== a month is a calendar month, anchored");

ok("31 January + 1 month is 28 February", S.addMonths("2026-01-31", 1) === "2026-02-28");
ok("...and a leap February keeps the 29th", S.addMonths("2028-01-31", 1) === "2028-02-29");
ok("the anchor brings it back to the 31st in March", S.addMonths("2026-02-28", 1, 31) === "2026-03-31");
ok("twelve months is a year", S.addMonths("2026-09-14", 12) === "2027-09-14");
ok("walking back works the same way", S.addMonths("2026-03-31", -1, 31) === "2026-02-28");
ok("days are counted across a month end", S.addDays("2026-01-25", 20) === "2026-02-14");
ok("...and between two days", S.daysBetween("2026-01-25", "2026-02-14") === 20);

console.log("\n== the unpaid ladder: due, closed at 20, shut down at 90, deleted at 365");

const onPaid = { ...S.newTrial({ studioId: "s1", today: "2026-01-14", trialMonths: 0, at: AT }), kind: "paid" };
const due = onPaid.paidUntil; // 2026-01-14
ok("a paid package created without paying is due that day", status(onPaid, due) === "due");
ok("...and still fully working", S.accessFor(status(onPaid, due)) === "full");
ok("day 19 is still due", status(onPaid, plus(due, 19)) === "due");
ok("DAY 20 IT IS CLOSED — view and export only", status(onPaid, plus(due, 20)) === "closed"
  && S.accessFor(status(onPaid, plus(due, 20))) === "view");
ok("day 89 is still closed", status(onPaid, plus(due, 89)) === "closed");
ok("DAY 90 IT IS SHUT DOWN — owner only", status(onPaid, plus(due, 90)) === "shut_down"
  && S.accessFor(status(onPaid, plus(due, 90))) === "owner-only");
ok("DAY 365 IT IS DUE FOR DELETION", status(onPaid, plus(due, 365)) === "expired");
const dates = S.ladderDates(onPaid);
ok("the ladder's dates are stated", dates.closesOn === plus(due, 20) && dates.shutsDownOn === plus(due, 90) && dates.deletedOn === plus(due, 365));

console.log("\n== only Standard has a free period, and it closes the day it ends");

const std = S.newTrial({ studioId: "s2", today: "2026-01-14", trialMonths: 3, at: AT });
ok("Standard's free months run three months", std.paidUntil === "2026-04-14" && std.kind === "trial");
ok("inside them the studio is on its free period", status(std, "2026-04-13") === "trial");
ok("THE DAY THEY END IT IS CLOSED — no 20 open days, nothing was invoiced", status(std, "2026-04-14") === "closed");
ok("...shut down 90 days later", status(std, plus("2026-04-14", 90)) === "shut_down");
ok("...deleted at a year", status(std, plus("2026-04-14", 365)) === "expired");
ok("its dates say it closes on the day", S.ladderDates(std).closesOn === "2026-04-14");

console.log("\n== paying");

const early = paid(std, "p1", 1, "2026-02-01", { packageId: "pkg_growth" });
ok("PAYING DURING THE FREE PERIOD STARTS THE PAID PACKAGE TODAY", early.sub.paidUntil === "2026-03-01", early.sub.paidUntil);
ok("...and it is no longer a free period", early.sub.kind === "paid" && status(early.sub, "2026-02-01") === "active");
ok("the same payment twice extends once", !paid(early.sub, "p1", 1, "2026-02-01").changed);

const onTime = paid(onPaid, "p2", 1, plus(due, 5));
ok("paid late but within the open 20 days, the period runs from the due date", onTime.sub.paidUntil === "2026-02-14", onTime.sub.paidUntil);
const afterClose = paid(onPaid, "p3", 1, plus(due, 30));
ok("PAID ONCE CLOSED, it starts again from the payment day — the closed days are not charged",
  afterClose.sub.paidUntil === S.addMonths(plus(due, 30), 1), afterClose.sub.paidUntil);
ok("...and it is open again at once", status(afterClose.sub, plus(due, 30)) === "active");
const afterShut = paid(onPaid, "p4", 1, plus(due, 200));
ok("paying while shut down restores it at once", status(afterShut.sub, plus(due, 200)) === "active");
ok("paying with a seat count sets the seats", paid(onPaid, "p5", 1, due, { seats: 12 }).sub.seats === 12);
ok("money is refused while complimentary",
  paid(S.complimentary({ studioId: "c", today: due, at: AT }), "p6", 1, due).problem === "complimentary");
ok("periods outside 1–36 are refused", paid(onPaid, "bad", 0, due).problem === "bad-periods");

console.log("\n== the free period never comes back");

// NOTHING PUTS A STUDIO BACK ON A FREE PERIOD ONCE IT HAS LEFT ONE (24/09/2026).
ok("once paid, the free period cannot be extended back into existence",
  S.applyEvent(early.sub, { id: "t1", type: "trial-extended", until: "2027-01-01" }, "2026-02-02", AT).problem === "not-trial");
ok("taking complimentary off makes it due that day, not a free period",
  S.applyEvent(S.complimentary({ studioId: "c", today: due, at: AT }), { id: "c1", type: "comp", on: false }, due, AT).sub.kind === "paid");

console.log("\n== refusals and reversals");

const failed = S.applyEvent(onTime.sub, { id: "f1", type: "failed", reason: "declined" }, "2026-02-14", AT);
ok("a refused charge takes away no paid day", failed.sub.paidUntil === onTime.sub.paidUntil);
const bounced = S.applyEvent(onTime.sub, { id: "r1", type: "reversed", periods: 1 }, plus(due, 25), AT);
ok("a bounced transfer takes back the period it bought", bounced.sub.paidUntil === due);
ok("...which can close the studio again", status(bounced.sub, plus(due, 25)) === "closed");

console.log("\n== cancelling");

const cancelled = S.applyEvent(onTime.sub, { id: "x1", type: "cancel" }, "2026-01-20", AT);
ok("a cancellation takes effect at paid-until", cancelled.sub.cancelAt === "2026-02-14");
ok("...the studio works until then", status(cancelled.sub, "2026-02-13") === "active");
ok("...and from then it is cancelled — view only, no 20 open days", status(cancelled.sub, "2026-02-14") === "cancelled"
  && S.accessFor("cancelled") === "view");
ok("resuming clears it", S.applyEvent(cancelled.sub, { id: "x2", type: "resume" }, "2026-01-21", AT).sub.cancelAt === "");

console.log("\n== what a request may do");

const gate = (access, method, path, isOwner = false) => S.gateRequest(access, { method, path, isOwner });
const P = "/api/studios/acme/sales";
ok("a working studio lets everything through", gate("full", "POST", P) === "" && gate("full", "DELETE", P) === "");
ok("a closed studio can be read", gate("view", "GET", P) === "");
ok("A CLOSED STUDIO CANNOT BE CHANGED", gate("view", "POST", P) === "studio-closed"
  && gate("view", "PUT", P) === "studio-closed" && gate("view", "PATCH", P) === "studio-closed" && gate("view", "DELETE", P) === "studio-closed");
ok("...not even by its owner", gate("view", "POST", P, true) === "studio-closed");
ok("A SHUT-DOWN STUDIO LOCKS MEMBERS OUT, reads included", gate("owner-only", "GET", P) === "studio-shut-down");
ok("...while its owner may still read (download everything is reading)", gate("owner-only", "GET", P, true) === "");
ok("...but may change nothing", gate("owner-only", "POST", P, true) === "studio-shut-down");
ok("marking a notification read stays open", gate("view", "PATCH", "/api/studios/acme/notifications") === ""
  && gate("owner-only", "PATCH", "/api/studios/acme/notifications") === "");
ok("so do the access check and the live stream", gate("owner-only", "POST", "/api/studios/acme/access-check") === ""
  && gate("owner-only", "GET", "/api/studios/acme/stream") === "");
// A CLOSED OR SHUT-DOWN STUDIO'S OWNER MUST STILL BE ABLE TO ASK TO PAY.
ok("asking to upgrade stays open in a shut-down studio", gate("owner-only", "POST", "/api/studios/acme/upgrade", true) === "");
ok("...and in a closed one", gate("view", "POST", "/api/studios/acme/upgrade", true) === "");
ok("...and only those paths — a look-alike does not slip through", gate("view", "POST", "/api/studios/acme/notificationsx") === "studio-closed");
ok("billing days are Amman's", S.billingDay("2026-09-23T22:30:00Z") === "2026-09-24");

console.log("\n== what an upgrade costs, and what paying for it buys");

const Q = await import("@/shared/upgradeQuote");
const list = {
  currency: "JOD", taxPercent: 16,
  cards: [
    { id: "pkg_std", type: "free", monthly: 0, maxEmployees: 4 },
    { id: "pkg_small", type: "compound", categories: [
      { id: "c1", label: "5–9", maxEmployees: 9, monthly: 30, yearly: 25 },
      { id: "c2", label: "10–24", maxEmployees: 24, monthly: 70, yearly: 60 },
    ] },
    { id: "pkg_large", type: "premium", monthly: 5, maxEmployees: 0 },
  ],
  tiers: [{ id: "tir_adv", monthly: 10, yearly: 8 }],
};
const q = (choice) => Q.quoteUpgrade(list, { packageId: "", categoryId: "", tierId: "", cycle: "monthly", ...choice });
ok("only priced, self-serve packages are offered — not the free one, not invoiced-on-headcount",
  Q.upgradablePackages(list).map((c) => c.id).join(",") === "pkg_small");
const monthly = q({ packageId: "pkg_small", categoryId: "c2" });
ok("a band's monthly price, its seats and 16% tax", monthly.amount === 70 && monthly.seats === 24 && monthly.tax === 11.2 && monthly.total === 81.2, JSON.stringify(monthly));
// THE PRICE LIST'S `yearly` IS PER MONTH, BILLED YEARLY — a year is twelve of it.
const yearly = q({ packageId: "pkg_small", categoryId: "c2", cycle: "yearly" });
ok("A YEAR IS TWELVE OF THE YEARLY FIGURE, not the figure alone", yearly.amount === 720, String(yearly.amount));
ok("a tier adds its own price for the same period", q({ packageId: "pkg_small", categoryId: "c1", tierId: "tir_adv" }).amount === 40);
ok("a band that does not exist is refused", q({ packageId: "pkg_small", categoryId: "gone" }).error === "unknown-band");
ok("the free package cannot be 'upgraded' to", q({ packageId: "pkg_std" }).error === "unknown-package");
ok("dinars keep three decimals", q({ packageId: "pkg_small", categoryId: "c1", cycle: "monthly" }).tax === 4.8);

// A YEARLY UPGRADE RECORDED AS ONE PERIOD MUST BUY A YEAR, whatever period the
// studio was on before.
const yearPaid = paid(onPaid, "y1", 1, due, { period: "yearly" });
ok("a payment naming a yearly period buys a year", yearPaid.sub.paidUntil === S.addMonths(due, 12) && yearPaid.sub.period === "yearly");

console.log("\n== the warnings the Terms promise: 30, 7 and 1 days before shut-down and deletion");

const shutOn = plus(due, 90);
const at = (daysLeft) => S.addDays(shutOn, -daysLeft);
ok("nothing is sent while paid up", S.noticesDue(onTime.sub, "2026-01-20", []).send.length === 0);
ok("nothing is sent more than 30 days before shut-down", S.noticesDue(onPaid, at(31), []).send.length === 0);
const d30 = S.noticesDue(onPaid, at(30), []);
ok("30 days before shut-down, the 30-day warning", d30.send.length === 1 && d30.send[0].kind === "shut-down" && d30.send[0].days === 30);
ok("...and once sent it is not sent again", S.noticesDue(onPaid, at(29), d30.markSent).send.length === 0);
ok("7 days before, the 7-day warning", S.noticesDue(onPaid, at(7), d30.markSent).send[0]?.days === 7);
// A JOB THAT MISSED A WEEK SENDS THE MOST URGENT ONE, NOT THREE AT ONCE.
const late = S.noticesDue(onPaid, at(5), []);
ok("a run that missed days sends only the most urgent warning", late.send.length === 1 && late.send[0].days === 7);
ok("...and marks the earlier one sent with it", late.markSent.some((k) => k.startsWith("shut-down:30:")));
ok("1 day before, the last warning", S.noticesDue(onPaid, at(1), [...d30.markSent, `shut-down:7:${shutOn}`]).send[0]?.days === 1);
const delOn = plus(due, 365);
const shut = S.noticesDue(onPaid, S.addDays(delOn, -30), []);
ok("once shut down, the deletion warnings begin", shut.send.length === 1 && shut.send[0].kind === "deletion" && shut.send[0].days === 30);

console.log("\n== an unpaid studio is deleted at a year — only if it was warned");

ok("before its year is up it is not due", S.unpaidDeletionDue(onPaid, plus(due, 364), []) === "not-expired");
ok("AT A YEAR, UNWARNED, IT IS KEPT", S.unpaidDeletionDue(onPaid, plus(due, 365), []) === "not-warned");
ok("at a year, warned the day before, it is due", S.unpaidDeletionDue(onPaid, plus(due, 365), [`deletion:1:${delOn}`]) === "");
ok("a studio that paid is never due", S.unpaidDeletionDue(afterShut.sub, plus(due, 365), [`deletion:1:${delOn}`]) === "not-expired");

console.log("\n== the billing watch: what happens next, and when");

ok("a paid-up studio far from its date is not watched", S.nextStep(yearPaid.sub, due) === null);
ok("a complimentary one never is", S.nextStep(S.complimentary({ studioId: "c", today: due, at: AT }), due) === null);
ok("a free period ending within 30 days is watched", S.nextStep(std, "2026-04-01")?.step === "free-period-ends");
ok("...and one ending later is not", S.nextStep(std, "2026-02-01") === null);
ok("a due studio's next step is closing, at day 20", S.nextStep(onPaid, due)?.step === "closes" && S.nextStep(onPaid, due)?.on === plus(due, 20));
ok("a closed one's is shutting down", S.nextStep(onPaid, plus(due, 30))?.step === "shuts-down");
ok("a shut-down one's is deletion", S.nextStep(onPaid, plus(due, 100))?.step === "deleted");

// THE SANDBOX CLOCK REWRITES A SUBSCRIPTION'S DATES, which on live data would be
// nompany giving away or taking away paid time. It must be unreachable there.
const { readFileSync: rf } = await import("node:fs");
const sandboxSrc = rf("src/lib/sandbox.ts", "utf8");
const clockSrc = rf("src/lib/data/subscriptions.ts", "utf8");
const clockRoute = rf("src/app/api/studios/[slug]/sandbox-clock/route.ts", "utf8");
ok("the sandbox guard refuses a production build outright", /NODE_ENV === "production"\) return false/.test(sandboxSrc));
ok("...and otherwise asks a key builder, not the environment", /REG\.studios\.startsWith/.test(sandboxSrc));
ok("the clock itself refuses outside the sandbox, whatever called it",
  /export async function sandboxSetClock[\s\S]{0,300}if \(!isSandbox\(\)\) return \{ error: "notfound"/.test(clockSrc));
ok("...and so does its route", /!isSandbox\(\) \? \{ error: "notfound" \}/.test(clockRoute));
ok("the clock stays reachable in a shut-down studio so it can be moved back",
  gate("owner-only", "POST", "/api/studios/acme/sandbox-clock", true) === "");

console.log("\n== no door around the gate");

// THE WRAPPER ASKS FOR EVERY STUDIO ROUTE; A ROUTE WRITTEN OUTSIDE IT MUST ASK
// FOR ITSELF. Found on 24/09/2026: engine records aside, seven studio routes
// wrote with their own handlers — members, roles, join requests, deals and
// three settings screens — and each would have been a way to keep changing a
// closed studio. A new one written the same way fails here.
const { readFileSync, readdirSync, statSync } = await import("node:fs");
const { join } = await import("node:path");
const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : n === "route.ts" ? [p] : [];
});
const wrapper = readFileSync("src/platform/http/route.ts", "utf8");
ok("the route wrapper asks on the session path and the API-key path",
  (wrapper.match(/await subscriptionRefusal\(/g) || []).length >= 2);
const OPEN = /[\\/](notifications|access-check|stream)[\\/]route\.ts$/;
const unguarded = walk("src/app/api/studios/[slug]")
  .filter((p) => !OPEN.test(p))
  .filter((p) => /export async function (POST|PUT|PATCH|DELETE)\b/.test(readFileSync(p, "utf8")))
  .filter((p) => !readFileSync(p, "utf8").includes("subscriptionRefusal("));
ok("every studio route that writes outside the wrapper asks the subscription", unguarded.length === 0, unguarded.join(", "));
ok("an upload into a studio asks it too", readFileSync("src/app/api/media/route.ts", "utf8").includes("subscriptionRefusal("));


// ---- paying by bank transfer (26/09/2026) --------------------------------------
// A customer says they sent the money; nompany checks and answers. Every block
// below is a way that conversation could wrong somebody.

const C = await import("@/shared/billingClaims");
const I = await import("@/shared/nompanyInvoice");

console.log("\n== a claim holds the ladder for the hold's hours, and only while it waits");

const claimAt = "2026-03-10T08:00:00.000Z";
const pendingClaim = { id: "c1", kind: "transfer", status: "pending", at: claimAt, by: "u", sealed: "", amount: 116, currency: "USD", sentOn: "2026-03-10", plan: null };
ok("a waiting claim holds the studio for 48 hours from when it was made",
  C.claimHoldUntil([pendingClaim], "2026-03-11T08:00:00.000Z", 48) === "2026-03-12T08:00:00.000Z");
ok("...and holds nothing once those hours are up — a claim nobody answers is not a way to keep working unpaid",
  C.claimHoldUntil([pendingClaim], "2026-03-12T08:00:01.000Z", 48) === "");
ok("an answered claim holds nothing", C.claimHoldUntil([{ ...pendingClaim, status: "rejected" }], claimAt, 48) === "");
ok("a refund request holds nothing", C.claimHoldUntil([{ ...pendingClaim, kind: "refund" }], claimAt, 48) === "");
ok("a hold of 0 hours holds nothing", C.claimHoldUntil([pendingClaim], claimAt, 0) === "");
ok("the hold can't be set past a week", C.cleanHoldHours(1000) === C.MAX_CLAIM_HOLD_HOURS);
ok("a held studio works fully, whatever the ladder says", C.heldAccess("owner-only", "2026-03-12T08:00:00.000Z") === "full");
ok("...and an unheld one keeps the ladder's answer", C.heldAccess("view", "") === "view");

console.log("\n== a claim must say enough to find the money");

const claimDay = "2026-03-10";
const good = { amount: 116, currency: "USD", sentOn: "2026-03-09", bankReference: "FT2603091234" };
ok("a complete claim is accepted", C.transferProblem(good, claimDay) === "");
ok("no amount is refused", C.transferProblem({ ...good, amount: 0 }, claimDay) === "bad-amount");
ok("a currency that is not a code is refused", C.transferProblem({ ...good, currency: "usd$" }, claimDay) === "bad-currency");
ok("a transfer sent tomorrow is refused", C.transferProblem({ ...good, sentOn: "2026-03-11" }, claimDay) === "bad-date");
ok("a transfer from months ago is refused — that is a conversation, not a claim", C.transferProblem({ ...good, sentOn: "2025-12-01" }, claimDay) === "bad-date");
ok("no bank reference is refused — it is what finds the transfer", C.transferProblem({ ...good, bankReference: " " }, claimDay) === "missing-reference");
ok("only one transfer claim is open at a time", C.openTransfer([pendingClaim, { ...pendingClaim, id: "c0", status: "confirmed" }])?.id === "c1");
ok("the transfer reference names the studio and the request's day",
  C.transferReference("acme", "2026-03-09T10:00:00Z") === "NOMPANY-ACME-20260309");
ok("an unrequested renewal still gets a reference", C.transferReference("acme", "") === "NOMPANY-ACME");

console.log("\n== the invoice says what arrived, tax split out of it");

const split = I.splitTotal(116, 16, "USD");
ok("116 with 16% tax is 100 and 16", split.subtotal === 100 && split.tax === 16 && split.total === 116);
const jod = I.splitTotal(10, 16, "JOD");
ok("a dinar invoice keeps three decimals, and subtotal + tax is exactly what arrived",
  jod.subtotal === 8.621 && jod.tax === 1.379 && Math.round((jod.subtotal + jod.tax) * 1000) === 10000, JSON.stringify(jod));
ok("no tax is no tax", I.splitTotal(50, 0, "USD").tax === 0);
const fig = I.invoiceFigures({ total: 232, currency: "USD", taxPercent: 16, description: "x", periods: 2 });
ok("two periods are two of the line, priced each", fig.lines[0].quantity === 2 && fig.lines[0].unitPrice === 100 && fig.subtotal === 200);
ok("invoice numbers are per kind and per year", I.documentNumber("nmp", "invoice", 2026, 7) === "NMP-2026-00007"
  && I.documentNumber("NMP", "credit-note", 2026, 1) === "NMP-CN-2026-00001");
ok("a prefix can't smuggle characters onto the paper", I.documentNumber("N/M P", "invoice", 2026, 1) === "NMP-2026-00001");
ok("no invoice is issued without nompany's name, address and tax number",
  I.sellerProblem({ name: "nompany", address: "Amman", taxNumber: "" }) === "seller-incomplete"
  && I.sellerProblem({ name: "nompany", address: "Amman", taxNumber: "123" }) === "");

console.log("\n== a refund: a credit note never returns more than was paid");

const inv = { number: "NMP-2026-00001", total: 116, taxPercent: 16, currency: "USD" };
const part = I.creditFigures(inv, 58, 0);
ok("half the invoice is credited at the invoice's own tax rate", part.subtotal === 50 && part.tax === 8 && part.total === 58);
ok("more than is left is refused", I.creditFigures(inv, 60, 58).error === "over-refund");
ok("nothing is refused", I.creditFigures(inv, 0, 0).error === "bad-amount");
ok("what was credited is summed per invoice", I.creditedAgainst([
  { kind: "credit-note", creditsInvoice: "NMP-2026-00001", total: 58 },
  { kind: "credit-note", creditsInvoice: "NMP-2026-00002", total: 10 },
  { kind: "invoice", number: "NMP-2026-00001", total: 116 },
], "NMP-2026-00001") === 58);

const paidYear = paid(onPaid, "p-year", 1, "2026-01-14", { period: "yearly" }).sub;
const kept = S.applyEvent(paidYear, { id: "r1", type: "refunded", periods: 0, amount: 10 }, "2026-02-01", AT);
ok("a goodwill refund leaves the studio paid as it was", kept.changed && kept.sub.paidUntil === paidYear.paidUntil);
const back = S.applyEvent(paidYear, { id: "r2", type: "refunded", periods: 1, amount: 1160 }, "2026-02-01", AT);
ok("refunding the year takes the year back", back.sub.paidUntil === S.addMonths(paidYear.paidUntil, -12, paidYear.anchorDay), `${paidYear.paidUntil} → ${back.sub.paidUntil}`);
ok("a refund of nothing is refused", S.applyEvent(paidYear, { id: "r3", type: "refunded", periods: 0, amount: 0 }, "2026-02-01", AT).problem === "bad-amount");
ok("the same refund recorded twice is one refund",
  S.applyEvent(back.sub, { id: "r2", type: "refunded", periods: 1, amount: 1160 }, "2026-02-01", AT).changed === false);

console.log("\n== the owner can reach billing whatever the ladder says");
ok("a shut-down studio's owner can still say they paid", S.gateRequest("owner-only", { method: "POST", path: "/api/studios/acme/billing", isOwner: true }) === "");
ok("...and open an invoice", S.gateRequest("view", { method: "GET", path: "/api/studios/acme/billing/documents/NMP-2026-00001", isOwner: true }) === "");
ok("a lookalike path is still gated", S.gateRequest("view", { method: "POST", path: "/api/studios/acme/billingx", isOwner: true }) === "studio-closed");

console.log(`\n${fails ? `${fails} FAILED` : "all passed"}`);
process.exit(fails ? 1 : 0);
