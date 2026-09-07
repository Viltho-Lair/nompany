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

console.log("\n== every claim the hero makes, against its source");

const C = await import("@/shared/marketing/claims");

// EACH CLAIM IS CHECKED AGAINST THE THING THAT BACKS IT, not against a copy of
// the number. A register that stored "11" and asserted 11 === 11 would pass
// forever and mean nothing.
const CHECKS = {
  "free-under-ten": async () => {
    const { PLANS } = await import("@/lib/pricing");
    const free = PLANS.find((p) => p.free);
    return Boolean(free) && free.minUsers === 1 && free.maxUsers === 9;
  },
  "eleven-departments": async () => D.LIVE_DEPARTMENT_KEYS.length === 11,
  "bilingual-rtl": async () => {
    const { locales } = await import("@/shared/i18n");
    const { dirFor } = await import("@/shared/locale");
    return locales.includes("en") && locales.includes("ar")
      && dirFor("ar") === "rtl" && dirFor("en") === "ltr";
  },
  "permissioned-to-the-row": async () => {
    const { effectivePermissions } = await import("@/platform/access/resolve");
    // DEFAULT DENY (invariant 4) is the claim. Somebody with no role holds
    // nothing — there is no fallback path. If that ever stops being true the
    // sentence on the page stops being true with it.
    //
    // SYNCHRONOUS, and it takes a Subject: `{ collaborator, roles }`. Written
    // with the collaborator spelled out rather than omitted, because an
    // undefined collaborator reaches the same empty set down a different road
    // (every optional chain short-circuits) — which would pass while asserting
    // nothing about a real person holding no role.
    const nothing = effectivePermissions({ collaborator: { roleIds: [] }, roles: [] });
    return nothing instanceof Set && nothing.size === 0;
  },
};

for (const [id, claim] of Object.entries(C.CLAIMS)) {
  ok(`${id} states its source`,
    Boolean(claim.source?.module) && Boolean(claim.source?.export), id);

  // THE SOURCE EXISTS. This is the half that fails the build when somebody
  // deletes the module a public sentence rests on.
  let mod = null;
  try { mod = await import(claim.source.module); } catch { mod = null; }
  ok(`...and ${claim.source.module} resolves`, mod !== null, id);
  ok(`...and exports ${claim.source.export}`,
    mod !== null && claim.source.export in mod, id);

  // AND THE CLAIM STILL HOLDS. An export surviving a refactor that changed its
  // meaning is exactly the case a presence check misses.
  ok(`...and the claim is still true`,
    typeof CHECKS[id] === "function" && (await CHECKS[id]()) === true, id);

  ok(`...and it is written in both languages`,
    claim.en.trim().length > 0 && claim.ar.trim().length > 0, id);
}

// BOTH DIRECTIONS, or a claim added with no check passes by having no check.
for (const id of Object.keys(CHECKS)) {
  ok(`${id} is in the register`, id in C.CLAIMS);
}

// NO DIACRITICS IN THE ARABIC (SEO-PLAN §1.8). The live Arabic title is `أدِر`,
// which nobody types into a search box.
const DIACRITICS = /[ً-ْٰ]/;
for (const [id, claim] of Object.entries(C.CLAIMS)) {
  ok(`${id} carries no Arabic diacritics`, !DIACRITICS.test(claim.ar), claim.ar);
}

// ONE BRAND STRING (SEO-PLAN §1.7): `nompany`, lowercase.
for (const [id, claim] of Object.entries(C.CLAIMS)) {
  ok(`${id} spells the brand one way`,
    !/Nompany/.test(claim.en) && !/Nompany/.test(claim.ar), id);
}

console.log(fails ? `\n${fails} FAILED\n` : "\nmarketing model: all passed\n");
process.exit(fails ? 1 : 0);
