// FINISH SETTING UP, purely (modules/main/firstRun). The checklist is derived
// from what the studio holds, never stored, so each item must tick itself the
// moment the thing is done — and a KPI target switched off must not count.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const F = await import("@/modules/main/firstRun");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};
const state = (studio, people = 1) => Object.fromEntries(F.firstRunChecklist(studio, people, "acme").map((i) => [i.key, i.done]));

const fresh = state({});
ok("a brand-new studio has all four left", Object.values(fresh).every((d) => d === false));
ok("company details need BOTH a country and a currency", state({ country: "Jordan" }).company === false && state({ country: "Jordan", currency: "JOD" }).company === true);
ok("a logo ticks the logo", state({ logo: "media_1" }).logo === true);
ok("the owner alone is not a team; a second person is", state({}, 1).team === false && state({}, 2).team === true);
const v = (value, byFlow = {}) => [{ at: "2031-01-01", by: "c", value, byFlow }];
ok("a KPI target set studio-wide ticks the KPIs", state({ kpiTargets: { "wo-on-time": v(1) } }).kpis === true);
ok("...and one set only for a flow does too", state({ kpiTargets: { "deal-quoted": v(null, { A: 3 }) } }).kpis === true);
ok("a target switched OFF (its latest version null) does not count", state({ kpiTargets: { "deal-quoted": [...v(7), ...v(null)] } }).kpis === false);
const items = F.firstRunChecklist({ country: "Jordan", currency: "JOD", logo: "m", kpiTargets: { x: v(1) } }, 3, "acme");
ok("with everything set the checklist is done", F.firstRunDone(items));
ok("each item links where it is done", items.find((i) => i.key === "team").href === "/acme/administration-members"
  && items.find((i) => i.key === "kpis").href === "/acme/administration-settings#kpis");

console.log(fails ? `\nfirst run: ${fails} FAILED` : "\nfirst run: all passed");
process.exit(fails ? 1 : 0);
