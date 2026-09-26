// NOVA'S WALKTHROUGH, PURELY. No store, no routes.
//
// `shared/walkthrough` decides when a tour opens and which of its steps a
// screen gets, and each part fails silently in its own way:
//
//   tourStatus    off must win over everything, the tour must come back at the
//                 NEXT sign-in (seen is per session, not per person), and a
//                 till's session must never see one — a tour covering a till
//                 mid-queue is a till nobody can sell on.
//   withTourOff   turning one tour back on must not turn the other one on too,
//                 and "on" is stored as ABSENCE, so a studio that never chose
//                 and one that chose to see it read the same.
//   resolveSteps  a step pointing at a control that is not on screen must be
//                 dropped, not drawn over nothing; the phone must get "open
//                 the menu" in place of the sidebar; and a studio without Nova
//                 must end on the empty corner naming the packages that bring
//                 her — never on that upsell when Nova IS in the package.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const W = await import("@/shared/walkthrough");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== when a tour opens");
ok("a new person sees both tours", W.tourStatus("account", null, null).show && W.tourStatus("studio", undefined, []).show);
ok("seen in this sign-in: not again", !W.tourStatus("studio", {}, ["studio"]).show);
ok("seen the account tour does not hide the studio's", W.tourStatus("studio", {}, ["account"]).show);
ok("off wins", !W.tourStatus("account", { account: true }, []).show && W.tourStatus("account", { account: true }, []).off);
ok("off for one tour leaves the other on", W.tourStatus("studio", { account: true }, []).show);
ok("a till's session never sees a tour", !W.tourStatus("studio", {}, [], "till").show);
const all = W.tourStatuses({ studio: true }, ["account"]);
ok("every tour answered", Object.keys(all).sort().join() === "account,studio");
ok("statuses agree with tourStatus", !all.account.show && !all.account.off && !all.studio.show && all.studio.off);

console.log("\n== switching a tour off and on");
ok("off is stored as true", W.withTourOff(null, "account", true).account === true);
ok("on is stored as ABSENCE, not false", !("account" in W.withTourOff({ account: true }, "account", false)));
ok("turning one on keeps the other off", W.withTourOff({ account: true, studio: true }, "studio", false).account === true);
ok("a stray key is not carried forward", !("legacy" in W.withTourOff({ legacy: true }, "studio", true)));
ok("a non-true value is not read as off", !("account" in W.withTourOff({ account: "yes" }, "studio", true)));
ok("isTour refuses a stranger", W.isTour("studio") && !W.isTour("super") && !W.isTour(undefined));

console.log("\n== which steps a screen gets");
// The studio tour's shape: with Nova in the package the last word is her
// launcher (and a plain close only if it is somehow missing); without her, the
// `corner` step — no target, so it always survives — names the packages that
// bring her, pointing at the empty place she would sit.
const studio = (nova) => [
  { key: "welcome" },
  { key: "nav", target: "nav" },
  { key: "menuButton", target: "menu", unless: "nav" },
  { key: "bell", target: "bell" },
  ...(nova
    ? [{ key: "nova", target: "nova" }, { key: "end", unless: "nova" }]
    : [{ key: "novaPlan", corner: true }]),
];
const keys = (shown, nova = true) => W.resolveSteps(studio(nova), (t) => shown.includes(t)).map((s) => s.key).join(",");
ok("desktop with Nova ends on Nova", keys(["nav", "menu", "bell", "nova"]) === "welcome,nav,bell,nova", keys(["nav", "menu", "bell", "nova"]));
ok("the phone gets the menu button instead of the sidebar", keys(["menu", "bell", "nova"]) === "welcome,menuButton,bell,nova");
ok("no Nova in the package: ends on the empty corner and the packages that bring her", keys(["nav", "bell"], false) === "welcome,nav,bell,novaPlan");
ok("Nova in the package but her launcher missing: a plain close, never the upsell", keys(["nav", "bell"]) === "welcome,nav,bell,end");
ok("a missing control is dropped, not drawn over nothing", !keys(["nav", "nova"]).includes("bell"));
ok("a step with no target always survives", keys([]).startsWith("welcome"));

console.log(fails ? `\n${fails} FAILED\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
