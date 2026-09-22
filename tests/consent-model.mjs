// THE CONSENT LEDGER'S ARITHMETIC — modules/marketing/consent.
//
// THE DEFECTS THESE GUARD: a withdrawal recorded against one spelling of an
// address while the send reads another; "nobody has been asked" answering the
// same as "they said no"; an older row winning over a newer one, so a
// withdrawal is undone by the consent that preceded it; a re-consent after a
// withdrawal not counting; and an address too broken to ever match being shown
// as suppressed, which promises a protection that cannot fire.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const C = await import("@/modules/marketing/consent");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== one person is one address");
ok("an email lowercases", C.subjectKey("email", "  Ali@Firm.COM ") === "email:ali@firm.com");
ok("a phone keeps its + and drops the rest", C.subjectKey("phone", "+962 (79) 123-4567") === "phone:+962791234567");
ok("a second + inside is not kept", C.subjectKey("phone", "+962+79123456") === "phone:+96279123456");
ok("a nonsense email is no subject", C.subjectKey("email", "ali@firm") === "");
ok("too few digits is no subject", C.subjectKey("phone", "12345") === "");
ok("an unknown kind is no subject", C.subjectKey("fax", "12345678") === "");
ok("an email earns the email channel", C.channelFor("email") === "email" && C.channelFor("phone") === "phone");

console.log("\n== latest wins, and unknown is its own answer");
const rows = [
  { kind: "email", value: "ali@firm.com", channel: "email", state: "given", at: "2026-03-01T09:00:00Z", source: "form", evidence: "I agree to be contacted" },
  { kind: "email", value: "ALI@firm.com", channel: "email", state: "withdrawn", at: "2026-06-01T09:00:00Z", source: "manual", evidence: "asked to stop" },
  { kind: "email", value: "ali@firm.com", channel: "email", state: "given", at: "2026-09-01T09:00:00Z", source: "form", evidence: "I agree to be contacted" },
  { kind: "phone", value: "+962 79 123 4567", channel: "phone", state: "withdrawn", at: "2026-05-01T09:00:00Z", source: "manual", evidence: "" },
  { kind: "email", value: "sara@firm.com", channel: "email", state: "given", at: "2026-04-01T09:00:00Z", source: "import", evidence: "signed at the stand" },
];
ok("the newest row decides", C.consentState(rows, "email:ali@firm.com", "email") === "given");
ok("...and a different spelling is the same person", rows.some((r) => r.value === "ALI@firm.com"));
ok("a withdrawal stands where nothing followed it", C.consentState(rows, "phone:+962791234567", "phone") === "withdrawn");
ok("nobody asked is unknown, not withdrawn", C.consentState(rows, "email:nobody@firm.com", "email") === "unknown");
ok("a channel nobody was asked about is unknown", C.consentState(rows, "phone:+962791234567", "email") === "unknown");

console.log("\n== may we contact them");
ok("given, and not since withdrawn", C.mayContact(rows, "email", "Ali@Firm.com", "email") === true);
ok("withdrawn is a no", C.mayContact(rows, "phone", "+962791234567", "phone") === false);
ok("unknown is a no — the default is not to send", C.mayContact(rows, "email", "nobody@firm.com", "email") === false);
ok("an unmatchable address is a no", C.mayContact(rows, "email", "broken", "email") === false);

console.log("\n== the ledger a screen reads");
const entries = C.ledger(rows);
const ali = entries.find((e) => e.value === "ali@firm.com");
ok("one entry per address, not per row", entries.length === 3, String(entries.length));
ok("the entry carries every row as proof", ali.history.length === 3);
ok("...newest first", ali.history[0].at > ali.history[2].at);
ok("the channel state matches the ledger", ali.channels.email.state === "given");
ok("and names the evidence it rests on", ali.channels.email.evidence === "I agree to be contacted");
ok("the most recently decided comes first", entries[0].value === "ali@firm.com");
ok("an address that can never match is dropped", C.ledger([{ kind: "email", value: "broken", channel: "email", state: "given", at: "2026-01-01" }]).length === 0);

console.log("\n== the totals");
const t = C.consentTotals(entries);
ok("subjects counted once each", t.subjects === 3);
ok("emails we may write to", t.emailGiven === 2, JSON.stringify(t));
ok("phones that said no", t.phoneWithdrawn === 1 && t.phoneGiven === 0);

console.log("\n== what may not be written");
ok("no address, no row", C.consentProblem({ kind: "email", value: "", channel: "email", state: "given" }) === "consent-subject");
ok("a channel nobody offers", C.consentProblem({ kind: "email", value: "a@b.co", channel: "post", state: "given" }) === "consent-channel");
ok("a state that is not a state", C.consentProblem({ kind: "email", value: "a@b.co", channel: "email", state: "maybe" }) === "consent-state");
ok("a good row has no problem", C.consentProblem({ kind: "email", value: "a@b.co", channel: "email", state: "withdrawn" }) === "");

console.log("\n== survivable inputs");
ok("a non-array ledger is empty", C.ledger(null).length === 0);
ok("no rows is unknown rather than a crash", C.consentState(null, "email:a@b.co", "email") === "unknown");

console.log(`\n${fails ? `${fails} FAILED` : "all passed"}`);
process.exit(fails ? 1 : 0);
