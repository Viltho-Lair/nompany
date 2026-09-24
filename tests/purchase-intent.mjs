// THE PACKAGE CHOSEN ON THE PRICING PAGE, CARRIED IN A SIGNED COOKIE — purely.
//
// THE DEFECT THIS GUARDS: the pricing links added `?package=` and nothing on
// signup, login, the one-time code or OAuth read it, so every choice died on
// the signup page (found 24/09/2026). The cookie that replaces it is something
// a visitor can type, so what is asserted here is that only a value this
// server signed, recently, naming a well-formed catalogue id, is ever believed.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const I = await import("@/platform/auth/purchaseIntent");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const NOW = Date.UTC(2026, 8, 24, 12, 0, 0);
const small = { packageId: "pkg_mudzrwl4vdrgce", categoryId: "cmue0xq5u", cycle: "monthly" };

console.log("\n== a link is read into an intent, and only a well-formed one");
ok("a package, a band and a cycle",
  JSON.stringify(I.parseIntent({ package: small.packageId, band: small.categoryId, cycle: "monthly" })) === JSON.stringify(small));
ok("no cycle is monthly", I.parseIntent({ package: small.packageId })?.cycle === "monthly");
ok("yearly is kept", I.parseIntent({ package: small.packageId, cycle: "yearly" })?.cycle === "yearly");
ok("a cycle that is neither is monthly, not refused",
  I.parseIntent({ package: small.packageId, cycle: "weekly" })?.cycle === "monthly");
ok("a fallback band id like c1 is kept", I.parseIntent({ package: small.packageId, band: "c1" })?.categoryId === "c1");
ok("a malformed band is dropped, the package kept",
  I.parseIntent({ package: small.packageId, band: "<script>" })?.categoryId === "");
ok("no package is no intent", I.parseIntent({}) === null);
// The OLD link shape. Pricing cards sent `micro`, `small-2` and `<id>-1`;
// none of those is a catalogue id and none may be mistaken for one.
for (const old of ["micro", "small-2", "pkg_mudzrwl4vdrgce-1", "pkg_", "PKG_ABCD1234", "pkg_abc$123"]) {
  ok(`an old or malformed key is no intent: ${old}`, I.parseIntent({ package: old }) === null);
}

console.log("\n== a sealed intent opens again, and nothing else does");
const sealed = I.sealIntent(small, NOW);
ok("it round-trips", JSON.stringify(I.openIntent(sealed, NOW)) === JSON.stringify(small));
ok("...within the week", I.openIntent(sealed, NOW + (I.INTENT_TTL_SEC - 60) * 1000) !== null);
ok("...and not after it", I.openIntent(sealed, NOW + (I.INTENT_TTL_SEC + 60) * 1000) === null);
ok("an issue time in the future is refused", I.openIntent(sealed, NOW - 60_000) === null);

// A FORGED PAYLOAD UNDER A REAL SIGNATURE is the attack worth naming: the body
// is readable base64, so swapping the package id is one edit away.
const [body, sig] = sealed.split(".");
const forgedBody = Buffer.from(JSON.stringify({ ...small, packageId: "pkg_somethingelse1", at: NOW }), "utf8").toString("base64url");
ok("a changed payload is refused", I.openIntent(`${forgedBody}.${sig}`, NOW) === null);
ok("a changed signature is refused", I.openIntent(`${body}.${sig.slice(0, -2)}xx`, NOW) === null);
ok("an unsigned value is refused", I.openIntent(body, NOW) === null);
ok("a third part is refused", I.openIntent(`${sealed}.x`, NOW) === null);
ok("nothing is refused", I.openIntent("", NOW) === null && I.openIntent(undefined, NOW) === null);

// SIGNED UNDER LOOSER RULES STILL HAS TO PASS TODAY'S. A payload the server
// itself signed, carrying a band that is not an id shape, opens with the band
// dropped rather than believed.
const loose = I.sealIntent({ ...small, categoryId: "../../etc" }, NOW);
ok("a signed payload is re-checked field by field", I.openIntent(loose, NOW)?.categoryId === "");

console.log("\n== the cookie is read from a request");
const req = (cookie) => new Request("https://www.nompany.com/en/account", { headers: { cookie } });
ok("found among other cookies",
  JSON.stringify(I.intentFromRequest(req(`nc_sid=abc; ${I.INTENT_COOKIE}=${sealed}; lang=ar`), NOW)) === JSON.stringify(small));
ok("absent is null", I.intentFromRequest(req("nc_sid=abc"), NOW) === null);
ok("the cookie is HttpOnly and Lax", /HttpOnly/.test(I.intentCookie(sealed, true)) && /SameSite=Lax/.test(I.intentCookie(sealed, true)));
ok("...Secure only over https", /Secure/.test(I.intentCookie(sealed, true)) && !/Secure/.test(I.intentCookie(sealed, false)));
ok("clearing expires it", /Max-Age=0/.test(I.clearedIntentCookie()));

console.log(fails ? `\n${fails} FAILED\n` : "\npurchase intent: all passed\n");
process.exit(fails ? 1 : 0);
