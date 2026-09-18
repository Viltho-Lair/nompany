// SEATS ARE FOR ONE PERSON — the pure halves of the session controls
// (the owner's plan, 18/09/2026, in the decision ledger).
//
// Each block names the defect it guards.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });
const { classifyDevice, normalizeDeviceType, encodeHints, decodeHints } = await import("@/shared/deviceClass");
const { publicSession, sessionIdOf, sharingSignals, counts } = await import("@/platform/auth/sessionPolicy");

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

// ---- device types -----------------------------------------------------------
// THE USER AGENT ALONE FILED ANDROID TABLETS AS PHONES AND iPADS AS COMPUTERS.
const UA = {
  windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  androidPhone: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36",
  androidTablet: "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  linuxDesktop: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
};
ok("a Windows desktop is a Computer", classifyDevice(UA.windows, { touchPoints: 0, shortSide: 1080 }) === "Computer");
ok("a Windows touch laptop is still a Computer", classifyDevice(UA.windows, { touchPoints: 10, shortSide: 1080 }) === "Computer");
ok("an iPhone is a Phone", classifyDevice(UA.iphone) === "Phone");
ok("an Android phone is a Phone", classifyDevice(UA.androidPhone) === "Phone");
ok("an Android TABLET is a Portable Device, not a Phone", classifyDevice(UA.androidTablet) === "Portable Device");
ok("an iPad in desktop mode (a Mac with touch) is a Portable Device", classifyDevice(UA.mac, { touchPoints: 5, shortSide: 820 }) === "Portable Device");
ok("a real Mac is a Computer", classifyDevice(UA.mac, { touchPoints: 0, shortSide: 900 }) === "Computer");
ok("a phone asking for the desktop site is still a Phone", classifyDevice(UA.linuxDesktop, { touchPoints: 5, shortSide: 390 }) === "Phone");
ok("no hints at all falls back to the user agent", classifyDevice(UA.linuxDesktop) === "Computer");

ok("hints survive the cookie", JSON.stringify(decodeHints(encodeHints({ touchPoints: 5, shortSide: 390 }))) === JSON.stringify({ touchPoints: 5, shortSide: 390 }));
ok("a malformed hint reads as none", Object.keys(decodeHints("t5;drop table")).length === 0);

ok("a stored \"Tablet\" reads as a Portable Device", normalizeDeviceType("Tablet") === "Portable Device");
ok("an unknown type reads as none", normalizeDeviceType("Toaster") === "");

// ---- sessions -------------------------------------------------------------------
// THERE IS NO LIMIT on where a person is signed in (the owner, 19/09/2026); what
// is pure here is how a session is named and shown, and what the console counts.
const NOW = 1_800_000_000_000;
const sess = (id, deviceType, createdAt, extra = {}) =>
  ({ id, tokenHash: `h${id}`, deviceType, createdAt, expiresAt: NOW + 3600_000, ...extra });
ok("a till's session is not counted as the person's", !counts(sess("t", "Computer", 1, { scope: "till" })) && counts(sess("a", "Computer", 1)));

const legacyId = sessionIdOf({ token: "plain-token", createdAt: 1, expiresAt: NOW + 1 }, () => "abcdef0123456789ffff");
ok("a row from before ids is named by its digest, never its token",
  legacyId === "habcdef0123456789" && !legacyId.includes("plain"), legacyId);
const shown = publicSession({ ...sess("a", "Tablet", 1), token: "secret" }, (t) => t);
ok("what a person is shown carries no token or digest",
  !JSON.stringify(shown).includes("secret") && !("tokenHash" in shown) && shown.deviceType === "Portable Device");

// ---- the sharing flag ---------------------------------------------------------
// A FLAG IS A REASON TO LOOK. It must not fire on one person with a laptop, a
// home computer and a new phone, and must fire on a login that twenty share.
const DAY = 24 * 3600_000;
let sig = sharingSignals({ newDevices: [NOW - 3 * DAY, NOW - 5 * DAY, NOW - 9 * DAY] }, 3, NOW);
ok("one busy person with three new devices is not flagged", !sig.flagged && sig.newDevices30d === 3, JSON.stringify(sig));
sig = sharingSignals({ newDevices: [NOW - 40 * DAY, NOW - 41 * DAY, NOW - 42 * DAY, NOW - 43 * DAY, NOW - 44 * DAY] }, 1, NOW);
ok("…nor five from more than a month ago", !sig.flagged && sig.newDevices30d === 0);
ok("many places signed in at once is shown, not flagged — there is no limit", !sharingSignals({}, 12, NOW).flagged && sharingSignals({}, 12, NOW).activeSessions === 12);
ok("a stored list of forced sign-outs from the old limit is no longer read",
  !sharingSignals({ evictions: Array.from({ length: 9 }, () => NOW - DAY) }, 1, NOW).flagged);
sig = sharingSignals({ newDevices: Array.from({ length: 5 }, (_, i) => NOW - i * DAY) }, 1, NOW);
ok("five new devices in a month is flagged", sig.flagged && sig.reasons.join() === "new-devices");
ok("no activity at all is quiet", !sharingSignals(null, 0, NOW).flagged);

// ---- the lock and the PIN -----------------------------------------------------
// A LOCK THAT ONLY DREW OVER THE PAGE would leave every other tab and the API
// open; the server's answer is `isLocked`, so its arithmetic is the lock.
const { isLocked, IDLE_GRACE_MS } = await import("@/platform/auth/sessionPolicy");
const { pinProblem, isIdleChoice } = await import("@/shared/pin");
ok("a session nobody locked, with no timeout, is open", !isLocked({ lastActiveAt: NOW - 10 * DAY }, NOW));
ok("pressing the lock locks it", isLocked({ lockedAt: NOW - 1 }, NOW));
ok("an idle timeout locks it once it has run out",
  isLocked({ idleMs: 5 * 60_000, lastActiveAt: NOW - 5 * 60_000 - IDLE_GRACE_MS - 1 }, NOW));
ok("…but not inside the grace of one missed heartbeat",
  !isLocked({ idleMs: 5 * 60_000, lastActiveAt: NOW - 5 * 60_000 - 1000 }, NOW));
ok("a session from before states existed reads as open", !isLocked(null, NOW));

ok("a 4-to-8 digit PIN is accepted", pinProblem("4827") === "" && pinProblem("90417263") === "");
ok("letters and short PINs are refused", pinProblem("12a4") === "format" && pinProblem("123") === "format" && pinProblem("123456789") === "format");
ok("one digit repeated is refused", pinProblem("0000") === "weak");
ok("a straight run either way is refused", pinProblem("1234") === "weak" && pinProblem("98765") === "weak");
ok("idle timeouts are a fixed list, off included", isIdleChoice(0) && isIdleChoice(15) && !isIdleChoice(7) && !isIdleChoice(10_000));

// ---- passkeys ------------------------------------------------------------------
// THE RELYING PARTY: a passkey made on www.nompany.com must also work on
// nompany.com, where studios live — so the domain drops "www." — while the
// origin a signature is checked against stays exactly the page's own.
const { relyingParty } = await import("@/platform/auth/passkeys");
const rp = (url, host, proto) => relyingParty(new Request(url, { headers: { host, ...(proto ? { "x-forwarded-proto": proto } : {}) } }));
let party = rp("https://www.nompany.com/en/login", "www.nompany.com", "https");
ok("the passkey domain drops www", party.rpID === "nompany.com" && party.origin === "https://www.nompany.com", JSON.stringify(party));
party = rp("https://nompany.com/acme/main", "nompany.com", "https");
ok("…and the studio's own address is the same domain", party.rpID === "nompany.com");
party = rp("http://localhost:3010/en/login", "localhost:3010");
ok("the sandbox is its own relying party, port kept in the origin only",
  party.rpID === "localhost" && party.origin === "http://localhost:3010", JSON.stringify(party));

console.log(fails ? `\nsession security model: ${fails} FAILURES\n` : "\nsession security model: all passed\n");
process.exitCode = fails ? 1 : 0;
