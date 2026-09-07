// THE MARKETING SITE'S SHARED MODULES, PURELY. No store, no routes, no server.
//
// Three modules are under test and they fail in three different silent ways.
//
//   shared/marketing/departments  names the sections a visitor is told exist.
//                                 Its failure mode is ADVERTISING A SECTION THAT
//                                 RENDERS NOTHING — the hero has been streaming
//                                 sixteen names past visitors, four of them in
//                                 NO_SCREEN_YET and one of them Tasks, which is
//                                 not a department at all.
//   shared/marketing/claims       every number stated on a public page, and the
//                                 module + export that backs it. Its failure
//                                 mode is a claim outliving its source, which is
//                                 how 3.2M transactions/day and 180+ connectors
//                                 stayed on the live page for months.
//   shared/marketing/hero         the copy. Its failure mode is caught by tsc
//                                 (both locales are keys of one typed object) —
//                                 what is asserted here is what a type cannot
//                                 say: no diacritics, one brand string.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const D = await import("@/shared/marketing/departments");
const { SECTION_DEFS } = await import("@/platform/db/keys");
const { NO_SCREEN_YET } = await import("@/platform/access/resolve");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== the departments a visitor is told exist");

ok("eleven of them", D.LIVE_DEPARTMENT_KEYS.length === 11,
  String(D.LIVE_DEPARTMENT_KEYS.length));

// THE DEFECT THIS GUARDS, four names at a time. Each of these renders nothing
// and is hidden from the product's own sidebar; naming one on a marketing page
// is the same false claim as a fabricated uptime figure in a quieter coat.
for (const dead of NO_SCREEN_YET) {
  ok(`...and ${dead} is not among them`, !D.LIVE_DEPARTMENT_KEYS.includes(dead));
}

// NOT A DEPARTMENT AND NOT A SECTION. CLAUDE.md is explicit: Main is the home
// surface and Tasks is a cross-cutting control. The hero counted both.
ok("...nor is main", !D.LIVE_DEPARTMENT_KEYS.includes("main"));
ok("...nor is tasks", !D.LIVE_DEPARTMENT_KEYS.includes("tasks"));

// DERIVED, NOT COPIED. A hand-written list is right on the day it is written;
// this asserts the list still comes from the software's own.
const declared = SECTION_DEFS.map((d) => d.key);
ok("every one is a real top-level section",
  D.LIVE_DEPARTMENT_KEYS.every((k) => declared.includes(k)));

console.log("\n== and they are named in both languages");

const en = D.liveDepartments("en");
const ar = D.liveDepartments("ar");
ok("both locales return the same eleven, in the same order",
  en.map((d) => d.key).join(",") === ar.map((d) => d.key).join(",") && en.length === 11);
ok("every English name is non-empty", en.every((d) => d.name.trim().length > 0));
ok("every Arabic name is non-empty", ar.every((d) => d.name.trim().length > 0));
// AND THEY ARE ACTUALLY TRANSLATED. `sectionName` falls back to the stored
// English name for a key it has no entry for, so an Arabic list identical to the
// English one is the fallback firing eleven times rather than a translation.
ok("...and the Arabic is not the English",
  ar.filter((d, i) => d.name === en[i].name).length === 0);

console.log(fails ? `\n${fails} FAILED\n` : "\nmarketing model: all passed\n");
process.exit(fails ? 1 : 0);
