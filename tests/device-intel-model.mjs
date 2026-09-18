// FINGERPRINT — the pure halves of the sign-in checks (platform/auth/deviceIntel.ts,
// docs/functionality/device-intel.md). No network, no database.
//
// Each block names the defect it guards.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });
const { judgeEvent, bindingHolds, callerAccountable, intelFacts, isBadBot, visitorKey } = await import("@/platform/auth/deviceIntel");
const { DEVICE_EVENT_MAX_AGE_SEC } = await import("@/shared/deviceIntel");

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

// ---- judging an event ---------------------------------------------------------
// A VISITOR ID IS ONLY BELIEVED FROM A FRESH EVENT ON THIS SITE. Our public key
// is in every page; without the host check anybody could run it on a page of
// their own and bring the event here.
const now = Date.parse("2026-09-19T10:00:00Z");
const good = { identification: { visitor_id: "v1" }, timestamp: now - 30_000, url: "https://nompany.com/en/login" };
const host = "nompany.com";

ok("a fresh event on this site is believed", judgeEvent(good, { now, host }).ok === true);
ok("…and names its visitor", judgeEvent(good, { now, host }).visitorId === "v1");
ok("an event from another site is refused",
  judgeEvent({ ...good, url: "https://evil.example/login" }, { now, host }).reason === "other-site");
ok("a look-alike host is refused, not prefix-matched",
  judgeEvent({ ...good, url: "https://nompany.com.evil.example/" }, { now, host }).reason === "other-site");
ok("an event older than the window is stale",
  judgeEvent({ ...good, timestamp: now - (DEVICE_EVENT_MAX_AGE_SEC * 1000 + 1) }, { now, host }).reason === "stale");
ok("an event at the edge of the window still counts",
  judgeEvent({ ...good, timestamp: now - DEVICE_EVENT_MAX_AGE_SEC * 1000 }, { now, host }).ok === true);
ok("an event from the future beyond clock skew is refused",
  judgeEvent({ ...good, timestamp: now + 5 * 60_000 }, { now, host }).reason === "future");
ok("an event without a visitor is refused", judgeEvent({ ...good, identification: {} }, { now, host }).ok === false);
ok("an event without a url is refused", judgeEvent({ ...good, url: undefined }, { now, host }).ok === false);
ok("no event at all is refused", judgeEvent(null, { now, host }).ok === false);
ok("an empty host never matches", judgeEvent(good, { now, host: "" }).ok === false);
ok("localhost with a port matches itself",
  judgeEvent({ ...good, url: "http://localhost:3010/en/login" }, { now, host: "localhost:3010" }).ok === true);

// ---- the binding ----------------------------------------------------------------
// A TRUSTED DEVICE COOKIE COPIED ONTO ANOTHER MACHINE USED TO SKIP THE CODE.
const bound = "hash-A";
const facts = (intel, visitorHash) => ({ intel, ...(visitorHash ? { visitorHash } : {}) });
ok("the same browser passes a bound device", bindingHolds(bound, facts("ok", "hash-A")) === true);
ok("another browser is asked for the code", bindingHolds(bound, facts("ok", "hash-B")) === false);
ok("a request that WITHHELD the event is asked for the code", bindingHolds(bound, facts("missing")) === false);
ok("a request with a FORGED event is asked for the code", bindingHolds(bound, facts("invalid")) === false);
// A THIRD PARTY'S OUTAGE MUST NOT LOCK ANYBODY OUT.
ok("Fingerprint down changes nothing", bindingHolds(bound, facts("unavailable")) === true);
ok("no secret key configured changes nothing", bindingHolds(bound, facts("off")) === true);
ok("a request that never asked (desktop app, passkey) changes nothing", bindingHolds(bound, null) === true);
ok("an unbound device behaves as it always did", bindingHolds(undefined, facts("missing")) === true);
ok("…even against another browser", bindingHolds("", facts("ok", "hash-B")) === true);

ok("only the caller's own failures are accountable",
  ["ok", "missing", "invalid"].every(callerAccountable) && !["off", "unavailable", undefined].some(callerAccountable));

// ---- what a sign-in records and counts --------------------------------------
ok("a verified browser records its digest", JSON.stringify(intelFacts({ status: "ok", visitorHash: "h", bot: "not_detected", vpn: false, incognito: false, suspectScore: 0 }))
  === JSON.stringify({ intel: "ok", visitorHash: "h" }));
ok("an unverified one records only the verdict", JSON.stringify(intelFacts({ status: "missing" })) === JSON.stringify({ intel: "missing" }));
ok("a bad bot is refused", isBadBot({ status: "ok", visitorHash: "h", bot: "bad", vpn: false, incognito: false, suspectScore: 9 }) === true);
ok("a good bot is not a bad one", isBadBot({ status: "ok", visitorHash: "h", bot: "good", vpn: false, incognito: false, suspectScore: 0 }) === false);
ok("an unverified request is never judged a bot", isBadBot({ status: "invalid" }) === false && isBadBot(undefined) === false);
// NO SHARED "unknown" BUCKET: every browser without the agent would fill one
// counter together and lock each other out.
ok("no verified device, no per-device counter", visitorKey({ status: "missing" }) === "" && visitorKey(undefined) === "");
ok("a verified device is counted by its digest", visitorKey({ status: "ok", visitorHash: "h", bot: "", vpn: false, incognito: false, suspectScore: null }) === "h");

console.log(fails ? `\n${fails} FAILURES\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
