// SEATS ARE FOR ONE PERSON — the pure halves of the session controls
// (the owner's plan, 18/09/2026, in the decision ledger).
//
// Each block names the defect it guards.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });
const { classifyDevice, deviceSlot, normalizeDeviceType, encodeHints, decodeHints } = await import("@/shared/deviceClass");
const { planSignIn, SESSION_LIMITS, publicSession, sessionIdOf, sharingSignals } = await import("@/platform/auth/sessionPolicy");

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

ok("a Phone and a Portable Device share the mobile slot",
  deviceSlot("Phone") === "mobile" && deviceSlot("Portable Device") === "mobile" && deviceSlot("Computer") === "computer");
ok("a stored \"Tablet\" reads as a Portable Device", normalizeDeviceType("Tablet") === "Portable Device" && deviceSlot("Tablet") === "mobile");
ok("an unknown type takes the computer slot", deviceSlot("") === "computer");

// ---- the session limit --------------------------------------------------------
// THE LOOPHOLE: nothing counted sessions, so one login served twenty people.
const NOW = 1_800_000_000_000;
const sess = (id, deviceType, createdAt, extra = {}) =>
  ({ id, tokenHash: `h${id}`, deviceType, createdAt, expiresAt: NOW + 3600_000, ...extra });
ok("the limit is two computers and one phone-or-portable", SESSION_LIMITS.computer === 2 && SESSION_LIMITS.mobile === 1);

let plan = planSignIn([sess("a", "Computer", 1)], "computer", NOW);
ok("a second computer fits", plan.autoEnd.length === 0 && plan.choose.length === 0);

plan = planSignIn([sess("a", "Computer", 2), sess("b", "Computer", 1)], "computer", NOW);
ok("a third computer must choose between the two, oldest first",
  plan.autoEnd.length === 0 && plan.choose.map((r) => r.id).join() === "b,a", JSON.stringify(plan));

plan = planSignIn([sess("a", "Computer", 1), sess("b", "Computer", 2)], "mobile", NOW);
ok("a phone beside two computers fits — the slots are separate", plan.choose.length === 0);

plan = planSignIn([sess("p", "Phone", 1)], "mobile", NOW);
ok("a tablet after a phone must replace it — they share the slot", plan.choose.map((r) => r.id).join() === "p");

plan = planSignIn([
  sess("t1", "Computer", 1, { scope: "till" }), sess("t2", "Computer", 2, { scope: "till" }), sess("a", "Computer", 3),
], "computer", NOW);
ok("a till's sessions are not counted against the person", plan.choose.length === 0);

plan = planSignIn([sess("x", "Computer", 1, { expiresAt: NOW - 1 }), sess("y", "Computer", 2, { expiresAt: NOW - 1 })], "computer", NOW);
ok("an expired session holds no slot", plan.choose.length === 0);

plan = planSignIn([sess("old1", undefined, 1), sess("old2", undefined, 2), sess("old3", undefined, 3), sess("old4", undefined, 4)], "computer", NOW);
ok("sessions from before the limit take computer slots, and the excess ends without asking",
  plan.autoEnd.map((r) => r.id).join() === "old1,old2" && plan.choose.map((r) => r.id).join() === "old3,old4", JSON.stringify(plan));

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
let sig = sharingSignals({ evictions: [NOW - DAY, NOW - 2 * DAY], newDevices: [NOW - 3 * DAY, NOW - 5 * DAY, NOW - 9 * DAY] }, 3, NOW);
ok("one busy person is not flagged", !sig.flagged && sig.evictions7d === 2 && sig.newDevices30d === 3, JSON.stringify(sig));
sig = sharingSignals({ evictions: Array.from({ length: 6 }, (_, i) => NOW - i * 3600_000) }, 3, NOW);
ok("six forced sign-outs in a week is flagged", sig.flagged && sig.reasons.includes("evictions"));
sig = sharingSignals({ evictions: Array.from({ length: 9 }, () => NOW - 8 * DAY) }, 1, NOW);
ok("…but not when they are older than a week", !sig.flagged && sig.evictions7d === 0);
sig = sharingSignals({ newDevices: Array.from({ length: 5 }, (_, i) => NOW - i * DAY) }, 1, NOW);
ok("five new devices in a month is flagged", sig.flagged && sig.reasons.join() === "new-devices");
ok("no activity at all is quiet", !sharingSignals(null, 0, NOW).flagged);

console.log(fails ? `\nsession security model: ${fails} FAILURES\n` : "\nsession security model: all passed\n");
process.exitCode = fails ? 1 : 0;
