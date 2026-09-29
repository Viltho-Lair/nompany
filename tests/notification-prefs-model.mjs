// WHERE A NOTICE GOES BEYOND THE BELL — email, push, quiet hours (29/09/2026).
// Pure, plus source-level checks; no store, no network.
//
// Each block guards a way this goes wrong without anything failing:
//
//   THE DEFAULT. Email is OFF for everybody until they choose (the owner,
//   29/09/2026). A default that drifted to "digest" would email every user in
//   the product the next morning.
//   QUIET HOURS. 22:00–07:00 crosses midnight; a comparison that forgot that
//   would make quiet hours never apply, or apply all day.
//   THE KEY. Derived from NOMPANY_DATA_KEY, the same pair on every instance —
//   a random pair per boot would orphan every device on each deploy.
//   THE ENDPOINT. The server fetches whatever address a browser registered;
//   anything but a vendor's push service would be a request-forgery hole.
//   THE PUSH IS EMPTY. Words through Apple's or Google's servers would be the
//   doorbell carrying the message (finding L-7) all over again.

import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";
import crypto from "node:crypto";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });
process.env.NOMPANY_DATA_KEY = `m1:${Buffer.alloc(32, 9).toString("base64")}`;

const P = await import("@/shared/notificationPrefs");
const K = await import("@/shared/notificationKinds");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== the setting");

ok("email is off by default — the owner's rule", P.DEFAULT_PREFS.email === "off" && P.cleanPrefs(null).email === "off");
ok("an unknown email mode reads as off", P.cleanPrefs({ email: "hourly" }).email === "off");
ok("every category defaults on for email and push",
  K.NOTICE_CATEGORIES.every((c) => P.cleanPrefs(null).channels[c].email && P.cleanPrefs(null).channels[c].push));
ok("a category switched off stays off", P.cleanPrefs({ channels: { money: { email: false, push: true } } }).channels.money.email === false);
// A SETTING SAVED BEFORE A CATEGORY EXISTED reads with the new one ON.
ok("a category missing from a stored setting arrives on", P.cleanPrefs({ channels: {} }).channels.deadlines.push === true);
ok("a bad time falls back", P.cleanPrefs({ quiet: { on: true, from: "25:00", to: "x" } }).quiet.from === "22:00");
ok("an unknown time zone reads as UTC", P.cleanPrefs({ timezone: "Mars/Olympus" }).timezone === "");
ok("a real one is kept", P.cleanPrefs({ timezone: "Asia/Riyadh" }).timezone === "Asia/Riyadh");

console.log("\n== quiet hours");

const quiet = P.cleanPrefs({ quiet: { on: true, from: "22:00", to: "07:00" }, timezone: "UTC" });
ok("23:30 is quiet across midnight", P.inQuietHours(quiet, new Date("2026-09-29T23:30:00Z")));
ok("06:59 is quiet", P.inQuietHours(quiet, new Date("2026-09-29T06:59:00Z")));
ok("07:00 is not", !P.inQuietHours(quiet, new Date("2026-09-29T07:00:00Z")));
ok("noon is not", !P.inQuietHours(quiet, new Date("2026-09-29T12:00:00Z")));
ok("quiet hours off means never quiet", !P.inQuietHours({ ...quiet, quiet: { ...quiet.quiet, on: false } }, new Date("2026-09-29T23:30:00Z")));
const riyadh = P.cleanPrefs({ quiet: { on: true, from: "22:00", to: "07:00" }, timezone: "Asia/Riyadh" });
ok("the person's clock, not UTC: 20:00 UTC is 23:00 in Riyadh", P.inQuietHours(riyadh, new Date("2026-09-29T20:00:00Z")));
ok("equal ends are an empty window, not all day", !P.inQuietHours(P.cleanPrefs({ quiet: { on: true, from: "09:00", to: "09:00" } }), new Date("2026-09-29T09:00:00Z")));

console.log("\n== what goes where");

const instant = P.cleanPrefs({ email: "instant", channels: { money: { email: false, push: false } } });
ok("instant email carries an enabled category", P.wantsInstantEmail(instant, "work"));
ok("but not one switched off", !P.wantsInstantEmail(instant, "money"));
ok("instant is not the digest", !P.wantsInDigest(instant, "work"));
ok("off sends no email at all", !P.wantsInstantEmail(P.cleanPrefs(null), "work") && !P.wantsInDigest(P.cleanPrefs(null), "work"));
ok("push holds in quiet hours", !P.wantsPush(quiet, "work", new Date("2026-09-29T23:30:00Z")));
ok("and goes outside them", P.wantsPush(quiet, "work", new Date("2026-09-29T12:00:00Z")));
ok("a category with push off is not pushed", !P.wantsPush(instant, "money"));

console.log("\n== the push key");

const Push = await import("@/platform/notify/push");
const a = Push.vapid();
Push.resetVapid();
const b = Push.vapid();
ok("a key pair is derived", Boolean(a?.publicKey) && Boolean(a?.privateKey));
ok("the same pair every time — every instance, every deploy", a.publicKey === b.publicKey && a.keyId === b.keyId);
ok("the public key is an uncompressed P-256 point", Buffer.from(a.publicKey, "base64url").length === 65 && Buffer.from(a.publicKey, "base64url")[0] === 4);
{
  const jwt = Push.vapidJwt("https://fcm.googleapis.com", a, Date.UTC(2026, 8, 29));
  const [h, c, s] = jwt.split(".");
  const pub = Buffer.from(a.publicKey, "base64url");
  const verifyKey = crypto.createPublicKey({ key: { kty: "EC", crv: "P-256", x: pub.subarray(1, 33).toString("base64url"), y: pub.subarray(33).toString("base64url") }, format: "jwk" });
  ok("the token verifies with the public key the browser holds",
    crypto.verify("sha256", Buffer.from(`${h}.${c}`), { key: verifyKey, dsaEncoding: "ieee-p1363" }, Buffer.from(s, "base64url")));
  const claims = JSON.parse(Buffer.from(c, "base64url").toString());
  ok("it names the push service it is for", claims.aud === "https://fcm.googleapis.com");
  ok("and expires within a day", claims.exp - Date.UTC(2026, 8, 29) / 1000 <= 86400);
}

console.log("\n== where a push may go");

for (const good of [
  "https://fcm.googleapis.com/fcm/send/abc",
  "https://updates.push.services.mozilla.com/wpush/v2/abc",
  "https://web.push.apple.com/QAbc",
  "https://db5p.notify.windows.com/w/?token=abc",
]) ok(`accepted: ${new URL(good).hostname}`, Push.pushEndpointAllowed(good));
for (const bad of [
  "http://fcm.googleapis.com/fcm/send/abc",
  "https://169.254.169.254/latest/meta-data",
  "https://localhost/push",
  "https://fcm.googleapis.com.evil.example/x",
  "https://user:pw@fcm.googleapis.com/x",
  "https://fcm.googleapis.com:8443/x",
  "not a url",
]) ok(`refused: ${bad}`, !Push.pushEndpointAllowed(bad));

console.log("\n== the push carries nothing");

{
  const src = readFileSync("src/platform/notify/push.ts", "utf8");
  ok("a push is sent with an empty body", /"Content-Length": "0"/.test(src) && !/body:\s*JSON\.stringify/.test(src));
  ok("a 404 or 410 prunes the device", /status === 404 \|\| status === 410/.test(src));
  const sw = readFileSync("public/sw.js", "utf8");
  ok("the worker fetches the words on the person's own session", /\/api\/account\/push\/latest/.test(sw));
  ok("the worker never intercepts page requests", !/addEventListener\("fetch"/.test(sw));
  const route = readFileSync("src/app/api/account/push/route.ts", "utf8");
  ok("no endpoint is returned to the screen", /publicDevice/.test(route));
}

console.log("\n== delivery waits for the response, and the digest for a real send");

{
  const n = readFileSync("src/platform/notify/notifications.ts", "utf8");
  ok("the bell is written before anything is delivered elsewhere",
    /addRows<NotificationRow>[\s\S]*?publish\(CH\.user[\s\S]*?later\(\(\) => deliverBeyondBell/.test(n));
  const d = readFileSync("src/platform/notify/deliver.ts", "utf8");
  ok("email and push run after the response", /import\("next\/server"\)[\s\S]*?after\(run\)/.test(d));
  const digest = readFileSync("src/app/api/cron/notice-digest/route.ts", "utf8");
  ok("the digest's window moves only when the email went", /if \(out\.ok\) \{\s*await markDigestSent/.test(digest));
  ok("the digest is scheduled", JSON.parse(readFileSync("vercel.json", "utf8")).crons.some((c) => c.path === "/api/cron/notice-digest"));
}

console.log(fails ? `\n${fails} FAILED\n` : "\nnotification prefs model: all passed\n");
process.exit(fails ? 1 : 0);
