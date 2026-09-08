// CREDIT NOTES — what may be credited, and what a credit does to the balance.
//
// Pure, so it needs no database. The rules here are the ones that decide
// whether a studio can take a receivable negative or chase money it has already
// given back, which is why they are asserted before any screen draws from them.

import {
  creditedSoFar, creditableRemaining, creditNoteProblem, netOfCredits,
  CREDIT_NOTE_STATUSES,
} from "../src/modules/finance/creditNotes.ts";

let fails = 0;
const ok = (msg, cond, detail = "") => {
  if (!cond) { fails += 1; console.log(` FAIL  ${msg}${detail ? `  — ${detail}` : ""}`); }
  else console.log(`  ok   ${msg}`);
};

const INV = { id: "inv1", status: "Sent", total: 1200, paid: 0 };
const note = (amount, status = "Issued", invoiceId = "inv1") => ({ id: `cn${amount}`, invoiceId, status, amount });

console.log("\n== only an issued note credits anything");

ok("the ladder is draft, issued, cancelled",
  CREDIT_NOTE_STATUSES.join() === "Draft,Issued,Cancelled");

ok("an issued note counts", creditedSoFar([note(200)], "inv1") === 200);
// A DRAFT IS SOMEBODY TYPING. Counting it would let an unfinished note block a
// real one, which is the wrong way for this to fail.
ok("a draft credits nothing", creditedSoFar([note(200, "Draft")], "inv1") === 0);
// AND A CANCELLED NOTE CREDITS NOTHING, or cancelling one would leave the
// invoice permanently short.
ok("a cancelled note credits nothing", creditedSoFar([note(200, "Cancelled")], "inv1") === 0);
ok("a note against another invoice is not counted",
  creditedSoFar([note(200, "Issued", "inv2")], "inv1") === 0);
ok("several issued notes add up", creditedSoFar([note(200), note(300)], "inv1") === 500);

console.log("\n== what is left to credit");

ok("all of it, at first", creditableRemaining(INV, []) === 1200);
ok("less what is issued", creditableRemaining(INV, [note(200)]) === 1000);
ok("nothing left once fully credited", creditableRemaining(INV, [note(1200)]) === 0);
// NEVER BELOW NOUGHT, even if data from before a rule existed says otherwise —
// a negative "remaining" would read as headroom.
ok("never negative", creditableRemaining(INV, [note(1500)]) === 0);

console.log("\n== what may be raised");

ok("a good one passes", creditNoteProblem(INV, [], 200) === "");
ok("no invoice is notfound", creditNoteProblem(null, [], 200) === "notfound");

// A DRAFT INVOICE IS EDITED, NOT CREDITED. Nothing has gone to the client and
// nothing has posted, so a credit note would be two documents doing one
// correction's job.
ok("a draft invoice cannot be credited",
  creditNoteProblem({ ...INV, status: "Draft" }, [], 200) === "not-issued");
// A CANCELLED INVOICE IS ALREADY WHOLLY REVERSED. Crediting it would take the
// receivable negative — the studio owing money it never charged.
ok("a cancelled invoice cannot be credited",
  creditNoteProblem({ ...INV, status: "Cancelled" }, [], 200) === "cancelled");

ok("nought is not an amount", creditNoteProblem(INV, [], 0) === "amount");
ok("a negative is not an amount", creditNoteProblem(INV, [], -50) === "amount");
ok("nonsense is not an amount", creditNoteProblem(INV, [], "many") === "amount");

// THE ONE THAT MATTERS: two notes for two thirds each would credit more than
// the invoice was ever for, and it is the SECOND that must be refused.
ok("more than the invoice is refused", creditNoteProblem(INV, [], 1300) === "over-credit");
ok("...counting what is already issued",
  creditNoteProblem(INV, [note(1000)], 300) === "over-credit");
ok("...and exactly what is left is allowed",
  creditNoteProblem(INV, [note(1000)], 200) === "");
// A DRAFT NOTE DOES NOT RESERVE HEADROOM, which is the other half of "a draft
// credits nothing": an unfinished note must not block a real one.
ok("a draft note reserves nothing",
  creditNoteProblem(INV, [note(1200, "Draft")], 1200) === "");

console.log("\n== the balance a client actually owes");

const clean = netOfCredits({ ...INV, paid: 0 }, []);
ok("with no credits the net is the total", clean.net === 1200 && clean.outstanding === 1200);

const part = netOfCredits({ ...INV, paid: 0 }, [note(200)]);
ok("a credit reduces the net", part.net === 1000 && part.credited === 200);
// THE INVOICE'S OWN TOTAL IS UNTOUCHED. It is what was charged and stays what
// was charged; the client holding INV-0007 for 1,200 keeps holding one.
ok("...and never the invoice's own total", part.total === 1200);

// THE CASE THIS EXISTS FOR: 1,200 invoiced, 200 credited, 1,000 paid is
// SETTLED. Reporting 200 still due would send somebody to chase money the
// studio has already given back.
const settled = netOfCredits({ ...INV, paid: 1000 }, [note(200)]);
ok("outstanding is against the net, not the original", settled.outstanding === 0,
  String(settled.outstanding));
ok("...and it is not marked fully credited", settled.fullyCredited === false);

const whole = netOfCredits({ ...INV, paid: 0 }, [note(1200)]);
ok("a wholly credited invoice owes nothing", whole.net === 0 && whole.outstanding === 0);
ok("...and says it is fully credited", whole.fullyCredited === true);

// NOTHING GOES NEGATIVE, whatever the stored rows say.
const odd = netOfCredits({ ...INV, paid: 2000 }, [note(1200)]);
ok("an overpaid, wholly credited invoice still reports nought outstanding",
  odd.outstanding === 0, String(odd.outstanding));

console.log(fails ? `\ncredit note model: ${fails} FAILURES\n` : "\ncredit note model: all passed\n");
process.exit(fails ? 1 : 0);
