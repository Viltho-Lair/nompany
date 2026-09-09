// API KEYS, asserted without a database.
//
// A key is a second way to prove you are a collaborator, and a NARROWING of
// what that collaborator may do. Every assertion here is about the narrowing.
import {
  KEY_PREFIX, KEY_PATTERN, VISIBLE_CHARS, MAX_KEYS, looksLikeKey, visiblePart,
  keyProblems, cleanKey, keyState, usable, effectiveScopes, shouldTouch,
  USED_GRANULARITY_MS, keyView,
} from "../src/modules/administration/apiKeys.ts";

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

// ---- the shape of a key -----------------------------------------------------
const GOOD = `${KEY_PREFIX}${"a".repeat(43)}`;
ok("a minted key matches the pattern", looksLikeKey(GOOD));
ok("something else does not", !looksLikeKey("sk_live_abc"));
ok("a truncated key does not", !looksLikeKey(`${KEY_PREFIX}abc`));
ok("a session cookie value does not", !looksLikeKey("eyJhbGciOiJIUzI1NiJ9.abc.def"));
// THE PREFIX IS PART OF THE PRODUCT: a key found in a log or a paste is
// recognisable as ours, which is what makes secret scanning possible at all.
ok("THE PREFIX IS RECOGNISABLE", KEY_PATTERN.source.startsWith("^nk_"));
ok("only the first few characters may be shown again",
  visiblePart(GOOD) === `${KEY_PREFIX}aaaaaa` && visiblePart(GOOD).length === VISIBLE_CHARS);

// ---- what may be minted -----------------------------------------------------
const can = (held) => (p) => held.includes(p);
const OWNER = can(["hr.employees.view", "hr.employees.edit", "finance.cash.view"]);

ok("a good request passes",
  keyProblems({ name: "Payroll export", scopes: ["hr.employees.view"] }, [], OWNER).length === 0);
// A KEY WITHOUT A NAME IS A KEY NOBODY DARES REVOKE: six rows of "nk_a1b2c3…"
// is a register in which the safe act cannot be told from the destructive one.
ok("A KEY NEEDS A NAME", keyProblems({ scopes: ["hr.employees.view"] }, [], OWNER).length === 1);
ok("a live key's name cannot be reused",
  keyProblems({ name: "Payroll export", scopes: ["hr.employees.view"] },
    [{ name: "Payroll export", scopes: [] }], OWNER).some((p) => /already the name/.test(p)));
ok("...but a revoked one's may be",
  keyProblems({ name: "Payroll export", scopes: ["hr.employees.view"] },
    [{ name: "Payroll export", revokedAt: "2026-01-01" }], OWNER).length === 0);
// A KEY THAT MAY DO NOTHING is a live secret whose only property is that it can
// be stolen — invariant 16 with a credential attached.
ok("A KEY WITH NO PERMISSIONS IS REFUSED",
  keyProblems({ name: "Empty", scopes: [] }, [], OWNER).some((p) => /at least one/.test(p)));
// INVARIANT 5 AT MINTING: nobody grants what they do not hold.
ok("NOBODY MINTS A KEY BEYOND THEIR OWN RIGHTS",
  keyProblems({ name: "Too much", scopes: ["hr.employees.view", "finance.payables.approve"] }, [], OWNER)
    .some((p) => /rights you do not hold/.test(p)));
ok("...and the refusal names which ones",
  keyProblems({ name: "Too much", scopes: ["finance.payables.approve"] }, [], OWNER)
    .some((p) => /finance\.payables\.approve/.test(p)));
ok("too many live keys is refused",
  keyProblems({ name: "One more", scopes: ["hr.employees.view"] },
    Array.from({ length: MAX_KEYS }, (_, i) => ({ name: `k${i}`, scopes: [] })), OWNER)
    .some((p) => /no more than/.test(p)));
ok("...and revoked ones do not count toward the cap",
  keyProblems({ name: "One more", scopes: ["hr.employees.view"] },
    Array.from({ length: MAX_KEYS }, (_, i) => ({ name: `k${i}`, revokedAt: "x" })), OWNER)
    .every((p) => !/no more than/.test(p)));
ok("an expiry that is not a date is refused",
  keyProblems({ name: "K", scopes: ["hr.employees.view"], expiresAt: "soon" }, [], OWNER)
    .some((p) => /must be a date/.test(p)));

// ---- cleaning ---------------------------------------------------------------
const clean = cleanKey({ name: " Payroll ", scopes: ["b", "a", "a", ""], expiresAt: "2027-01-01" });
ok("cleaning trims", clean.name === "Payroll");
// DEDUPED AND SORTED, so two keys with the same rights read the same.
ok("SCOPES ARE DEDUPED AND SORTED", clean.scopes.join("|") === "a|b");

// ---- state ------------------------------------------------------------------
ok("a plain key is live", keyState({}, "2026-09-09") === "live");
ok("a revoked key is revoked", keyState({ revokedAt: "2026-01-01" }, "2026-09-09") === "revoked");
// EXPIRED ON ITS DATE, NOT AFTER IT: "valid until" that silently means "valid
// through" is a day of access nobody agreed to.
ok("A KEY EXPIRES ON ITS DATE, NOT AFTER IT",
  keyState({ expiresAt: "2026-09-09" }, "2026-09-09") === "expired");
ok("...and is live the day before", keyState({ expiresAt: "2026-09-10" }, "2026-09-09") === "live");
ok("revoked beats expired", keyState({ revokedAt: "x", expiresAt: "2020-01-01" }, "2026-09-09") === "revoked");
ok("only a live key is usable",
  usable({}, "2026-09-09") && !usable({ revokedAt: "x" }, "2026-09-09"));

// ---- the intersection, which is the whole security model --------------------
const KEY = { scopes: ["hr.employees.view", "hr.employees.edit", "finance.cash.view"] };
ok("a key may do what it was given and its owner still holds",
  effectiveScopes(KEY, OWNER).join("|") === "hr.employees.view|hr.employees.edit|finance.cash.view");
// A STORED SCOPE LIST CANNOT KNOW ITS OWNER WAS DEMOTED. This is why the
// mint-time check is not enough on its own.
ok("A DEMOTED OWNER'S KEY LOSES THE RIGHT IN THE SAME ACT",
  effectiveScopes(KEY, can(["hr.employees.view"])).join("|") === "hr.employees.view");
ok("an owner who lost everything holds a key that can do nothing",
  effectiveScopes(KEY, can([])).length === 0);
// THE KEY CAN ONLY EVER NARROW: promoting somebody does not widen a key they
// minted while they held less.
ok("A PROMOTION DOES NOT WIDEN AN EXISTING KEY",
  effectiveScopes({ scopes: ["hr.employees.view"] }, OWNER).join("|") === "hr.employees.view");

// ---- last used --------------------------------------------------------------
// A WRITE PER REQUEST IS A CONTENDED WRITE PER REQUEST on one document, which
// is a queue that never empties.
ok("a key never used before is touched", shouldTouch("", "2026-09-09T10:00:00.000Z"));
ok("a key used a moment ago is not",
  !shouldTouch("2026-09-09T09:59:00.000Z", "2026-09-09T10:00:00.000Z"));
ok("A KEY USED AN HOUR AGO IS TOUCHED",
  shouldTouch(new Date(Date.parse("2026-09-09T10:00:00.000Z") - USED_GRANULARITY_MS).toISOString(),
    "2026-09-09T10:00:00.000Z"));
ok("a nonsense clock touches nothing", !shouldTouch("", "not a time"));

// ---- the register -----------------------------------------------------------
const VIEW = keyView([
  { id: "a", name: "Old", createdAt: "2026-01-01", revokedAt: "2026-02-01" },
  { id: "b", name: "New", createdAt: "2026-09-01", scopes: ["x"], prefix: "nk_bbbbbb" },
  { id: "c", name: "Mid", createdAt: "2026-05-01", scopes: ["y"] },
], "2026-09-09");
// LIVE FIRST, then newest: a register is read to find the key to revoke.
ok("LIVE KEYS COME FIRST, THEN NEWEST",
  VIEW.map((k) => k.id).join("|") === "b|c|a", VIEW.map((k) => k.id).join("|"));
ok("the visible prefix travels", VIEW[0].prefix === "nk_bbbbbb");
// THE DIGEST NEVER LEAVES THE SERVER. A register that could show a key again is
// a register that leaks every key the day the wrong person reads it.
ok("NO DIGEST AND NO KEY IS IN THE VIEW",
  VIEW.every((k) => !("digest" in k) && !("key" in k)));
ok("each row carries its state", VIEW.map((k) => k.state).join("|") === "live|live|revoked");

console.log(fails ? `\napi keys model: ${fails} FAILURES\n` : "\napi keys model: all passed\n");
process.exit(fails ? 1 : 0);
