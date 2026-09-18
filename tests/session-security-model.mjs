// SEATS ARE FOR ONE PERSON — the pure halves of the session controls
// (the owner's plan, 18/09/2026, in the decision ledger).
//
// Each block names the defect it guards.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });
const { classifyDevice, deviceSlot, normalizeDeviceType, encodeHints, decodeHints } = await import("@/shared/deviceClass");

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

console.log(fails ? `\nsession security model: ${fails} FAILURES\n` : "\nsession security model: all passed\n");
process.exitCode = fails ? 1 : 0;
