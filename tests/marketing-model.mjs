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

// NO DIACRITICS ANYWHERE IN THE ARABIC (SEO-PLAN §1.8). The live Arabic title
// is `أدِر`, which nobody types into a search box. Hoisted here, with the
// other shared constants, rather than declared partway down where the claims
// section first needed it — the hero and company sections need it too.
const DIACRITICS = /[ً-ْٰ]/;

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

// NAMED depsEn/depsAr, not en/ar — the hero and company sections further down
// declare their own locale locals, and a bare `en`/`ar` here would read as
// theirs to anyone skimming the file.
const depsEn = D.liveDepartments("en");
const depsAr = D.liveDepartments("ar");
ok("both locales return the same eleven, in the same order",
  depsEn.map((d) => d.key).join(",") === depsAr.map((d) => d.key).join(",") && depsEn.length === 11);
ok("every English name is non-empty", depsEn.every((d) => d.name.trim().length > 0));
ok("every Arabic name is non-empty", depsAr.every((d) => d.name.trim().length > 0));
// AND THEY ARE ACTUALLY TRANSLATED. `sectionName` falls back to the stored
// English name for a key it has no entry for, so an Arabic list identical to the
// English one is the fallback firing eleven times rather than a translation.
ok("...and the Arabic is not the English",
  depsAr.filter((d, i) => d.name === depsEn[i].name).length === 0);

console.log("\n== every claim the hero makes, against its source");

const C = await import("@/shared/marketing/claims");
// HOISTED FROM THE HERO SECTION BELOW: the composed-claim check further down
// needs heroCopy to prove a claim actually reaches a page, not only that the
// register agrees with itself.
const H = await import("@/shared/marketing/hero");

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
  "paid-from-ten": async () => {
    const { PLANS } = await import("@/lib/pricing");
    const first = PLANS.filter((p) => !p.free).sort((a, b) => a.minUsers - b.minUsers)[0];
    return Boolean(first) && first.minUsers === 10;
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

  // HOW IT REACHES A PAGE. Three valid shapes, and only "composed" can be
  // checked by string matching — the whole point of the distinction (see
  // shared/marketing/claims.ts) is that a woven or rendered claim cannot be,
  // so nothing beyond the shape is asserted for those two.
  const stated = claim.stated;
  const validShape = stated?.how === "composed"
    || (stated?.how === "woven" && typeof stated.in === "string" && stated.in.length > 0)
    || (stated?.how === "rendered" && typeof stated.by === "string" && stated.by.length > 0);
  ok(`...and it names how it is stated`, validShape, id);

  // A COMPOSED CLAIM MUST ACTUALLY REACH A PAGE THROUGH claimText, not just
  // agree with itself. `claimText` is literally
  // `locale === "ar" ? claim.ar : claim.en`, so comparing it back against
  // `claim.en`/`claim.ar` compares the register to itself and can never fail
  // — it caught nothing, including the day "Free for teams of one to nine"
  // sat on the hero twice, once composed and once typed straight into the
  // copy as a literal. What actually proves composition is that the COPY
  // MODULE'S OWN FIELD equals claimText's output: if somebody later types the
  // sentence directly into hero.ts instead of calling claimText, this fails
  // and the string-equality check above would not have.
  //
  // COUPLING, NAMED RATHER THAN HIDDEN: this ties two specific claim ids to
  // two specific hero fields — "free-under-ten" to `badge`, "paid-from-ten"
  // to `footnote` — because those are the only two claims currently marked
  // `composed` (see CLAIMS in shared/marketing/claims.ts) and those are the
  // two hero fields that compose them. A third composed claim needs its own
  // line added here; this list is meant to grow, not an oversight to be
  // generalised away.
  if (id === "free-under-ten") {
    ok(`...and hero.badge composes it for en`,
      H.heroCopy("en").badge === C.claimText(id, "en"), id);
    ok(`...and hero.badge composes it for ar`,
      H.heroCopy("ar").badge === C.claimText(id, "ar"), id);
  }
  if (id === "paid-from-ten") {
    ok(`...and hero.footnote composes it for en`,
      H.heroCopy("en").footnote === C.claimText(id, "en"), id);
    ok(`...and hero.footnote composes it for ar`,
      H.heroCopy("ar").footnote === C.claimText(id, "ar"), id);
  }
}

// BOTH DIRECTIONS, or a claim added with no check passes by having no check.
for (const id of Object.keys(CHECKS)) {
  ok(`${id} is in the register`, id in C.CLAIMS);
}

for (const [id, claim] of Object.entries(C.CLAIMS)) {
  ok(`${id} carries no Arabic diacritics`, !DIACRITICS.test(claim.ar), claim.ar);
}

// ONE BRAND STRING (SEO-PLAN §1.7): `nompany`, lowercase.
for (const [id, claim] of Object.entries(C.CLAIMS)) {
  ok(`${id} spells the brand one way`,
    !/Nompany/.test(claim.en) && !/Nompany/.test(claim.ar), id);
}

console.log("\n== the hero's copy");

// H is imported above, alongside C, so the composed-claim check can use it.

// EVERY FIELD THE HERO STILL HAS, and every one must be written in both
// languages. There was a second list here — fields allowed to be empty — for
// the rotating variant's suffix, which was legitimately "" because its line
// read "One system for <department>" with nothing after it. That variant lost
// and its fields went with it, so the distinction has nothing left to describe.
const REQUIRED = ["badge", "h1", "lead", "ctaPrimary", "ctaSecondary", "footnote",
  "marqueeLabel"];

for (const locale of ["en", "ar"]) {
  const c = H.heroCopy(locale);
  for (const f of REQUIRED) {
    ok(`${locale}.${f} is written`, typeof c[f] === "string" && c[f].trim().length > 0);
  }
  ok(`${locale} spells the brand one way`,
    !REQUIRED.some((f) => /Nompany/.test(c[f])));
}

// THE H1 IS ONE STRING, not two lines to be split and animated per character.
// A tag-stripping extractor reads today's headline as `T h e O p e r a t i n g
// S y s t e m` (SEO-PLAN §1.4), and the fix is upstream of the component: if
// the copy module cannot express two lines, no component can split them.
ok("the English H1 is a single line", !H.heroCopy("en").h1.includes("\n"));
ok("the Arabic H1 is a single line", !H.heroCopy("ar").h1.includes("\n"));

// NO DIACRITICS ANYWHERE IN THE ARABIC.
// (Named arHero, not ar — the departments section above declares its own
// depsEn/depsAr rather than a bare en/ar, precisely to leave this name free.)
const arHero = H.heroCopy("ar");
for (const [f, v] of Object.entries(arHero)) {
  if (typeof v !== "string") continue;
  ok(`ar.${f} carries no diacritics`, !DIACRITICS.test(v), v);
}

// AN UNKNOWN LOCALE FALLS BACK RATHER THAN RETURNING UNDEFINED. Every dictionary
// in this repo does; a screen rendering "undefined" because a third locale
// arrived is not a failure anybody would file.
ok("an unknown locale falls back to English",
  H.heroCopy("fr").h1 === H.heroCopy("en").h1);

// THE LOCATION GUARD, OVER COPY THAT ACTUALLY RENDERS. The company-description
// version of this check below runs against company.ts, which nothing on the
// site imports — hero.ts is what a visitor reads. The company is not Saudi,
// is not based anywhere yet, and ZATCA is out of scope (spec §12.1), so this
// has to hold on every string heroCopy returns, in both languages.
const LOCATION_PATTERN = /Riyadh|السعودية|Saudi|ZATCA|KSA/i;

// COLLECT EVERY STRING VALUE AT ANY DEPTH, not only the top level. A copy
// module's shape is not flat and gets less flat as more pages are added, so a
// guard that walks `Object.entries(copy)` and skips non-string values quietly
// stops covering a field the day somebody nests one. That is not hypothetical:
// heroCopy used to nest three labels under `variantLabels`, and every one of
// them went unchecked against LOCATION_PATTERN because `typeof v !== "string"`
// skipped the object holding them. The nesting is gone; the walk stays, because
// the next copy module will nest something and nobody will remember this.
const collectStrings = (obj, prefix = "") => {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out.push([path, v]);
    else if (v && typeof v === "object") out.push(...collectStrings(v, path));
  }
  return out;
};

for (const locale of ["en", "ar"]) {
  const c = H.heroCopy(locale);
  for (const [path, v] of collectStrings(c)) {
    ok(`${locale}.${path} claims no location`, !LOCATION_PATTERN.test(v), v);
  }
}

console.log("\n== the entity, described once");

const CO = await import("@/shared/marketing/company");

ok("the Latin brand is lowercase", CO.BRAND === "nompany");
ok("the Arabic brand is settled", CO.BRAND_AR === "نومباني");

for (const locale of ["en", "ar"]) {
  const c = CO.companyCopy(locale);
  const d = c.description;
  ok(`${locale} has a description`, typeof d === "string" && d.trim().length > 0);
  ok(`${locale} spells the brand one way`, !/Nompany/.test(d));
  // THE COMPANY IS NOT SAUDI AND ZATCA IS NOT IN SCOPE (spec §12.1). A public
  // sentence implying either is the same class of defect as a fabricated
  // uptime figure, and it is the one the owner named explicitly. Same
  // recursive walk as the hero guard above, over every field companyCopy
  // returns rather than `description` alone — company.ts is flat today, but
  // one guard being stricter than the other is exactly the gap that let the
  // hero's own nested fields go unchecked, and this module has no reason to
  // repeat that.
  for (const [path, v] of collectStrings(c)) {
    ok(`${locale}.${path} claims no location`, !LOCATION_PATTERN.test(v), v);
  }
}
ok("the Arabic description carries no diacritics",
  !DIACRITICS.test(CO.companyCopy("ar").description));

console.log("\n== the hero variants, at the source");

const { readFileSync, readdirSync, existsSync } = await import("node:fs");

const VARIANT_DIR = "src/components/landing/hero/variants";
// ONE HERO NOW, NOT THREE. Three variants were built behind a preview route and
// judged running rather than described; the assembly won, and the losing two,
// the route, its shell and the chrome hooks it needed were deleted with the
// choice. The directory keeps its name because the checks below are about what
// a hero may DO, not about how many there are — a second one would land here
// and be covered without an edit.
ok("the hero has a home", existsSync(VARIANT_DIR));

const variantFiles = existsSync(VARIANT_DIR)
  ? readdirSync(VARIANT_DIR).filter((f) => /\.(tsx|jsx?)$/.test(f))
  : [];
ok("...and a hero is in it", variantFiles.length > 0);

// COMMENTS ARE STRIPPED BEFORE MATCHING, same treatment as gate-a.mjs's own
// `stripComments` (see its note by `carriesLibrary`). An assertion that guards
// a pattern trips over the comment explaining why the pattern is banned — the
// opacity-0 check below exists BECAUSE `initial={{ opacity: 0 }}` is dangerous,
// which is exactly the phrase its own doc comment needs to name. Task 4 dodged
// this once by rewording HeroV1Assembly's comment around the raw grep; that is
// a one-time cost paid again by every variant after it. Strip instead, so the
// checks guard real code and never a comment about it.
const stripComments = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

for (const file of variantFiles) {
  const src = readFileSync(`${VARIANT_DIR}/${file}`, "utf8");
  const code = stripComments(src);

  // NOTHING IN A HERO STARTS INVISIBLE.
  //
  // `motion/react` writes a component's `initial` into the SERVER-RENDERED
  // style attribute, so `initial={{ opacity: 0 }}` is literally
  // `style="opacity:0"` in the HTML a crawler that does not run JavaScript
  // reads — and Google renders JS while ChatGPT, Claude and Perplexity's
  // crawlers do not. The spec's rule is that the settled state is what the
  // server renders; this is that rule as a grep. A decorative element that
  // wants an entrance animates transform or scale, which is visible at rest.
  ok(`${file} parks nothing at opacity 0`,
    !/initial=\{\{[^}]*opacity:\s*0/.test(code), file);

  // THE H1 IS A SINGLE TEXT NODE. AnimatedHeadline splits a headline into
  // per-character aria-hidden spans; a tag-stripping extractor reads the live
  // page's H1 as `T h e O p e r a t i n g S y s t e m`.
  ok(`${file} does not split its headline`, !/AnimatedHeadline/.test(code), file);

  // EVERY CLAIM ON THE PAGE IS REGISTERED. A variant reaches its figures
  // through claimText or through the copy module that does; a number typed
  // straight into JSX is how 99.99% uptime got onto the live page.
  const digitsInJsx = code.match(/>\s*[0-9][0-9,.]*\+?\s*</g) || [];
  ok(`${file} states no unregistered figure`, digitsInJsx.length === 0,
    digitsInJsx.join(" "));
}

// THE SCAFFOLDING IS GONE, and this asserts it rather than trusting it.
//
// The preview route shipped to production deliberately, noindex and disallowed,
// because that is where three variants get looked at. It was always meant to be
// deleted in the commit that adopted a winner — and the failure mode of that
// plan is nobody doing it, leaving a preview surface live forever carrying two
// discarded designs. So the deletion is a test now, not an intention.
//
// It also guards three things that existed ONLY to serve that route and would
// otherwise sit in shared files as puzzling dead code: a robots disallow for a
// path that 404s, a theme branch in the root layout, and a prefix matcher in
// the site nav that matches nothing.
ok("the preview route is deleted",
  !existsSync("src/app/[locale]/preview/hero/[variant]/page.js"));
ok("...and its shell with it",
  !existsSync("src/components/landing/preview/HeroPreview.tsx"));
ok("...and the losing variants",
  !existsSync(`${VARIANT_DIR}/HeroV2Scroll.tsx`)
  && !existsSync(`${VARIANT_DIR}/HeroV3Continuity.tsx`));

const robots = readFileSync("src/app/robots.js", "utf8");
ok("...so robots.txt no longer disallows a path that does not exist",
  !/preview/.test(robots));
const rootLayout = readFileSync("src/app/layout.js", "utf8");
ok("...and the root layout has no preview theme branch",
  !/preview/.test(rootLayout));
const nav = readFileSync("src/components/Nav.js", "utf8");
ok("...and the nav's prefix matcher went with the family it matched",
  !/BARE_PREFIXES/.test(nav));

// AND THE CEILING RATCHETED ITSELF. bundle-budget.mjs reads 1792 while the
// preview route holds a baseline entry and 1716 once it does not, so deleting
// the route restores the tighter gate with nobody remembering to. This asserts
// the mechanism fired, rather than that somebody edited a constant.
const baselines = JSON.parse(readFileSync("scripts/bundle-baselines.json", "utf8"));
ok("...and the preview route's bundle baseline went too",
  !("/[locale]/preview/hero/[variant]" in baselines));

console.log("
== the platform page describes exactly the live departments");

const P = await import("@/shared/marketing/platform");

for (const locale of ["en", "ar"]) {
  const copy = P.platformCopy(locale);
  const described = Object.keys(copy.blurbs);

  // EVERY LIVE DEPARTMENT IS DESCRIBED. A section that ships a screen and is
  // not described here renders on the platform page as a bare name with an
  // empty paragraph — visible to a visitor, invisible to everyone else.
  for (const key of D.LIVE_DEPARTMENT_KEYS) {
    ok(`${locale} describes ${key}`,
      typeof copy.blurbs[key] === "string" && copy.blurbs[key].trim().length > 0);
  }

  // AND NOTHING ELSE IS. This is the half that matters: a blurb for a section
  // in NO_SCREEN_YET would advertise a screen that renders nothing, which is
  // the same false claim as a fabricated uptime figure and much easier to
  // write by accident — the four dead sections have real names and sound like
  // features.
  const extra = described.filter((k) => !D.LIVE_DEPARTMENT_KEYS.includes(k));
  ok(`${locale} describes no section that renders nothing`,
    extra.length === 0, extra.join(", "));

  ok(`${locale} platform copy is written`,
    copy.title.trim().length > 0 && copy.lead.trim().length > 0
    && copy.foundation.length > 0);
  ok(`${locale} platform copy spells the brand one way`,
    !/Nompany/.test(JSON.stringify(copy)));
}
ok("the Arabic platform copy carries no diacritics",
  !DIACRITICS.test(JSON.stringify(P.platformCopy("ar"))));

// THE PRICING COPY MODULE IS GONE, and with it the assertion that it held no
// digits. The page renders /super's packages catalogue now — the names,
// bullets, bands and every figure are edited in the console rather than
// authored in this repository, so there is no copy module left to keep clean.
// A price is a save, not a deploy.

console.log("
== the footers claim nothing that is not true");

const landingFooter = readFileSync("src/components/landing/chrome/SiteFooter.jsx", "utf8");
const footerCode = stripComments(landingFooter);

// A DUTCH LEGAL ENTITY, ON EVERY PAGE, for a company that is not incorporated
// anywhere yet and will be based in Jordan — and spelling the brand with a
// capital while doing it.
ok("the footer names no legal entity that does not exist",
  !/\bBV\b/.test(footerCode));
ok("...and spells the brand one way", !/Nompany/.test(footerCode));

// AN UPTIME CLAIM WITH NOTHING BEHIND IT. Nothing measures uptime: no monitor,
// no status page, and the cron budget cannot compute a credible figure. The
// claim is dropped rather than estimated.
ok("...and claims no system status", !/allSystemsOk/.test(footerCode));

// EVERY REMAINING FOOTER LINK RESOLVES. Twelve of fifteen were spans styled to
// look like links, including one offering Manufacturing — a section that
// renders nothing. A dead link is removed, never left pointing at a "coming
// soon", so a label with no href is the defect this catches.
const labelsWithoutHref = (footerCode.match(/\{ label: tr\.[A-Za-z]+ \}/g) || []);
ok("...and every footer entry has a destination",
  labelsWithoutHref.length === 0, labelsWithoutHref.join(" "));

console.log(fails ? `\n${fails} FAILED\n` : "\nmarketing model: all passed\n");
process.exit(fails ? 1 : 0);
