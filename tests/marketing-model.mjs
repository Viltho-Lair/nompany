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
const { SHELL_PATHS, SHELL_PREFIXES, isMarketingPath } = await import("@/shared/marketing/routes");

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

// FOURTEEN SINCE 09/09/2026, and the number has moved twice in two days for two
// DIFFERENT reasons — which is the argument for deriving it rather than typing
// it. It went to fifteen when Reports & BI left NO_SCREEN_YET (a screen
// shipped), and to fourteen when Administration & Settings joined
// NOT_A_DEPARTMENT (it is how a studio is administered, not work anybody does
// in it — the same call that took it out of the product's own sidebar).
//
// The list is DERIVED both times; the hand-written copy is not, which is what
// the assertions below exist to catch. On the first move the copy said
// fourteen while fifteen rendered.
ok("fourteen of them", D.LIVE_DEPARTMENT_KEYS.length === 14,
  String(D.LIVE_DEPARTMENT_KEYS.length));

// AND ADMINISTRATION IS NOT ONE, asserted by name rather than left to the count
// — a count alone would go green again the day some other section is added.
ok("...and Administration & Settings is not among them",
  !D.LIVE_DEPARTMENT_KEYS.includes("administration"));

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
ok("both locales return the same fourteen, in the same order",
  depsEn.map((d) => d.key).join(",") === depsAr.map((d) => d.key).join(",") && depsEn.length === D.LIVE_DEPARTMENT_KEYS.length);
ok("every English name is non-empty", depsEn.every((d) => d.name.trim().length > 0));
ok("every Arabic name is non-empty", depsAr.every((d) => d.name.trim().length > 0));
// AND THEY ARE ACTUALLY TRANSLATED. `sectionName` falls back to the stored
// English name for a key it has no entry for, so an Arabic list identical to the
// English one is the fallback firing once per department rather than a translation.
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
  // THE COPY IS CHECKED AGAINST THE COUNT, not merely the count against itself.
  // The claim is hand-written English and Arabic; the list it describes is
  // derived. Asserting only the length would have let "Eleven departments" sit
  // over fourteen of them, which is precisely what happened.
  "live-departments": async () => {
    const n = D.LIVE_DEPARTMENT_KEYS.length;
    const words = {
      11: ["Eleven", "أحد عشر"],
      14: ["Fourteen", "أربعة عشر"],
      15: ["Fifteen", "خمسة عشر"],
    }[n];
    if (!words) return false;
    const claim = C.CLAIMS["live-departments"];
    // NO HARD-CODED COUNT HERE. This read `n === 14 &&`, which pinned the
    // number twice and made the word map above pointless — the map exists so
    // the CHECK follows the count and only the COPY has to be written. With
    // the count pinned as well, the department that shipped on 08/09/2026
    // failed this by existing. An unmapped count still returns false above.
    return claim.en.startsWith(words[0]) && claim.ar.startsWith(words[1]);
  },
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

// COMMENTS ARE STRIPPED BEFORE MATCHING, the treatment gate-a.mjs used for its
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
// PREVIEW AS A PATH SEGMENT, not the substring. This read `!/preview/` and was
// therefore red from the moment it was written: the layout's robots metadata
// carries Google's "max-image-preview" and "max-video-preview" directives, so
// the loose test could never pass no matter how thoroughly the branch was
// deleted — and nothing noticed, because this file did not parse and had never
// run. The branch it is actually looking for was
// /^\/(en|ar)\/preview(\/|$)/.test(pathname) inside isMarketing, so the token
// is always preceded by a "/" or a quote and never by a hyphen.
ok("...and the root layout has no preview theme branch",
  !/(?<![-\w])preview(?![-\w])/.test(rootLayout));
// ==================================================================
// THE ONE LIST, HELD AGAINST THE PAGES THEMSELVES.
//
// Three files decided independently whether a path was a marketing path — the
// root layout for the theme, Nav and Footer for whether to stand down — and
// two of them were already wrong about `/contact`: it rendered the dark shell
// while the layout handed it the light theme's tokens, which is unreadable in
// patches rather than obviously broken. Nothing failed. The authority is which
// page renders `MarketingShell`, so that is what this reads.
console.log("\n== the marketing route list matches the pages that render the shell");
// A WALK RATHER THAN A GLOB, because the directory is literally named
// `[locale]` and every glob implementation reads that as a character class —
// it would quietly match nothing and this whole section would pass empty.
const LOCALE_DIR = "src/app/[locale]";
function pagesUnder(dir, rel = "") {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...pagesUnder(`${dir}/${e.name}`, `${rel}/${e.name}`));
    else if (e.name === "page.js" || e.name === "page.jsx") out.push({ file: `${dir}/${e.name}`, rel });
  }
  return out;
}
const allPages = pagesUnder(LOCALE_DIR);
ok("the locale tree was actually walked", allPages.length > 3, `${allPages.length} pages`);
const shellPages = allPages
  .filter((p) => readFileSync(p.file, "utf8").includes("MarketingShell"))
  .map((p) => p.rel);

const covered = (rel) =>
  SHELL_PATHS.includes(rel) || SHELL_PREFIXES.some((p) => rel === p || rel.startsWith(`${p}/`));

for (const rel of shellPages) {
  ok(`${rel} renders the shell and is listed`, covered(rel));
}
// AND THE OTHER DIRECTION, which is the half that catches a deleted page: an
// entry with nothing behind it keeps a route dark-by-default forever after the
// page that justified it has gone.
for (const rel of SHELL_PATHS) {
  ok(`...and ${rel} has a page behind it`, shellPages.includes(rel));
}
for (const pre of SHELL_PREFIXES) {
  ok(`...and ${pre} has at least one page behind it`,
    shellPages.some((r) => r === pre || r.startsWith(`${pre}/`)));
}
// THE THEME DEFAULT FOLLOWS THE CHROME. Every shell page must resolve as a
// marketing path in BOTH locales, or it is served the account theme's tokens.
for (const rel of SHELL_PATHS) {
  ok(`...and /en${rel} takes the marketing theme`, isMarketingPath(`/en${rel}`));
  ok(`...and /ar${rel} takes the marketing theme`, isMarketingPath(`/ar${rel}`));
}
ok("...and a job posting does too, not only the careers index",
  isMarketingPath("/en/careers/some-job-id") && isMarketingPath("/ar/careers/some-job-id"));
ok("...and the home page does, at / and at /en and /ar",
  isMarketingPath("/") && isMarketingPath("/en") && isMarketingPath("/ar"));
// A TRAILING SLASH IS THE SAME PAGE. The regex this replaced allowed one, and
// dropping that would have flipped the theme on a link somebody pasted.
ok("...and a trailing slash does not change the answer", isMarketingPath("/en/about/"));
// AND THE ACCOUNT SURFACE IS STILL THE ACCOUNT SURFACE. Terms and privacy are
// in the sitemap beside the marketing pages and are NOT on the shell, so
// listing them would break them in the mirror-image way.
ok("...and terms and privacy stay on the account theme",
  !isMarketingPath("/en/terms") && !isMarketingPath("/en/privacy"));
ok("...and a studio path is never marketing", !isMarketingPath("/en/account"));


// ==================================================================
// EVERY PUBLIC SEGMENT IS AN UNAVAILABLE STUDIO SLUG.
//
// A slug is the studio address AND the tenant handle, so a name taken today
// is a URL that can never exist tomorrow. Worse than that: the proxy 308s
// every RETIRED path to a marketing page BEFORE it looks for a studio, so a
// studio holding one of those slugs is redirected away from its own address
// by a table it cannot see. Five of them were takeable.
//
// keys.ts is a LEAF on purpose and imports nothing, so it cannot derive this
// list. That is what this assertion is for.
console.log("\n== every public segment is a reserved studio slug");
const { RESERVED_SLUGS } = await import("@/platform/db/keys");
const { reservedPublicSegments, RETIRED_PATHS } = await import("@/shared/marketing/routes");
for (const seg of reservedPublicSegments()) {
  ok(`"${seg}" cannot be registered as a studio slug`, RESERVED_SLUGS.has(seg));
}
ok("...and the proxy still redirects the four that were takeable",
  ["/projects", "/services", "/vendors", "/clients"].every((p) => p in RETIRED_PATHS));

// AND `gallery` IS FREE AGAIN, asserted from both ends rather than left to the
// absence of a line. A retired entry costs a permanently unavailable slug, and
// this one was reserving a word a studio might want in order to keep links to
// the page least likely to have any. Dropping it means BOTH halves have to go:
// an entry left in the redirect map with the slug freed is the original bug
// exactly, and a slug left reserved with no redirect behind it is a word taken
// out of circulation for nothing.
ok("gallery is not redirected any more", !("/gallery" in RETIRED_PATHS));
ok("...and a studio may register it", !RESERVED_SLUGS.has("gallery"));


// ==================================================================
// THE SITEMAP'S DATES MATCH THE TREE.
//
// `lastmod` was `new Date()` (noise a crawler discounts), then a hand-kept
// date map (right only while somebody remembers). It is a content hash now,
// and this is the assertion that makes the hash worth having: a copy change
// without a date change fails here instead of shipping a wrong signal.
console.log("\n== the sitemap lastmod matches the page sources");
const lm = await import("../scripts/sitemap-lastmod.mjs");
const committedLastmod = lm.readCommitted();
const treeHashes = lm.hashesForTree();
const stalePaths = lm.staleEntries(committedLastmod, treeHashes);
ok("no page content has changed since its date was recorded", stalePaths.length === 0,
  stalePaths.length ? stalePaths.map((p) => p || "/").join(", ") + " — run: node scripts/sitemap-lastmod.mjs --write" : "");

// EVERY PUBLIC PAGE IS ADVERTISED AND DATED. `SITEMAP_PATHS` derives from the
// dated file, so asserting the two agree would prove nothing — what can go
// wrong is a page existing and never reaching either. The shell route list is
// the authority on which pages exist, so it is what this compares against.
const { SITEMAP_SOURCES } = await import("@/shared/marketing/sitemapSources");
for (const p of Object.keys(SITEMAP_SOURCES)) {
  ok((p || "/") + " carries a recorded date", Boolean(committedLastmod[p]));
}
for (const p of SHELL_PATHS) {
  ok("...and " + p + " is advertised in the sitemap", p in SITEMAP_SOURCES);
}

// RUNNING IT TWICE MUST NOT MOVE A DATE. If it did, every run would
// re-advertise every page as changed — the exact defect being fixed.
const again = lm.reconcile(committedLastmod, treeHashes, "2099-01-01");
ok("...and reconciling an unchanged tree keeps every date where it was",
  Object.entries(again).every(([p, v]) => v.date === committedLastmod[p].date));

// ...WHILE A CHANGED PAGE DOES MOVE. The other half: a hash that never
// triggered would be a date map with extra steps.
const tampered = { ...committedLastmod, "/about": { hash: "0000000000000000", date: "2020-01-01" } };
const moved = lm.reconcile(tampered, treeHashes, "2099-01-01");
ok("...and a changed page takes the new date", moved["/about"].date === "2099-01-01");


// ==================================================================
// THE PUBLIC FIGURES CANNOT BE LARGER THAN THE TRUTH.
//
// The site carried 180+ connectors, 99.99% uptime and 3.2M transactions a day,
// none of which anything computed. The replacement is a nightly aggregate, and
// its whole safety rests on two properties that are worth asserting rather than
// trusting: a small number is never printed, and a printed number is rounded
// DOWN. Either one failing puts a wrong figure on the front page.
console.log("\n== the platform figures round down and stay hidden while small");
const PS = await import("@/platform/db/platformStats");

ok("nothing is shown when there are no stats at all", !PS.showsFigure(null, "studios"));
const belowAll = { studios: PS.THRESHOLDS.studios - 1, people: 0, records: 0, refreshedAt: "x" };
ok("...nor when a count is one short of its threshold", !PS.showsFigure(belowAll, "studios"));
const atThreshold = { ...belowAll, studios: PS.THRESHOLDS.studios };
ok("...and it is shown exactly at the threshold, not one above",
  PS.showsFigure(atThreshold, "studios"));

// ROUNDED DOWN, NEVER UP. This is the property that lets the product stand
// behind every figure it prints: the number is never larger than the truth,
// only older. An off-by-one here is a public overstatement.
for (const n of [7, 34, 99, 100, 149, 512, 999, 1000, 4321, 9999, 10000, 87654]) {
  ok("statedFigure(" + n + ") never exceeds " + n, PS.statedFigure(n) <= n);
}
ok("...and it is a real zero below the first bucket", PS.statedFigure(7) === 0);
ok("...and a negative or absent count is zero, never NaN",
  PS.statedFigure(-5) === 0 && PS.statedFigure(NaN) === 0);

// MONOTONIC: a larger count can never state a smaller figure. Without this a
// bucket boundary could make the public number go DOWN as the product grew,
// which is the one direction a reader would notice.
let lastStated = -1, monotonic = true;
for (let n = 0; n <= 12000; n += 7) {
  const v = PS.statedFigure(n);
  if (v < lastStated) monotonic = false;
  lastStated = v;
}
ok("...and the stated figure never falls as the real one rises", monotonic);

// NOTHING PER-TENANT IS IN THE STORED SHAPE. The document is what a public
// endpoint serves; a studio name or id reaching it is the leak this design
// exists to prevent.
const statKeys = Object.keys(PS.EMPTY_STATS);
ok("the stored stats hold only aggregate fields",
  statKeys.every((k) => ["studios", "people", "records", "refreshedAt"].includes(k)),
  statKeys.join(", "));

const nav = readFileSync("src/components/Nav.js", "utf8");
// THIS ASSERTED THE MECHANISM WAS GONE AND MEANT THE ROUTE. `BARE_PREFIXES`
// was introduced for `/preview/hero/<variant>` and deleted with it, so
// forbidding the identifier read as a faithful guard — until careers moved
// onto the marketing shell and needed the same thing for `/careers/<jobId>`,
// a genuine route family that cannot be listed exhaustively. The guard would
// have refused the correct fix. It names the route now, which is what it was
// ever about; the mechanism is free to serve whoever needs it.
ok("...and no preview path survives in the nav's bare-chrome lists",
  !/(?<![-\w])preview(?![-\w])/.test(nav));

// AND THE CEILING RATCHETED ITSELF. bundle-budget.mjs reads 1792 while the
// preview route holds a baseline entry and 1716 once it does not, so deleting
// the route restores the tighter gate with nobody remembering to. This asserts
// the mechanism fired, rather than that somebody edited a constant.
const baselines = JSON.parse(readFileSync("scripts/bundle-baselines.json", "utf8"));
ok("...and the preview route's bundle baseline went too",
  !("/[locale]/preview/hero/[variant]" in baselines));

console.log("\n== the platform page describes exactly the live departments");

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

console.log("\n== the footers claim nothing that is not true");

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

console.log("\n== a company is named publicly only when both parties agree");

const SH = await import("@/shared/marketing/showcase");

const consented = { name: "Alpha", logo: "a.png", sector: "Contracting", showcaseConsent: { at: "2026-09-01T00:00:00Z", by: "col_1" } };
const featured = { name: "Beta", logo: "b.png", featured: true };
const both = { ...consented, name: "Gamma", featured: true, featuredOrder: 1 };

// NEITHER FLAG PUBLISHES ANYTHING ON ITS OWN, and these two assertions are the
// whole feature. A studio that consented is ELIGIBLE, not published — otherwise
// agreeing puts you on the home page. A studio we featured but that never
// agreed is the worse half: that is publishing somebody's name on our own word.
ok("consent alone does not publish", !SH.isPubliclyFeatured(consented));
ok("featuring alone does not publish", !SH.isPubliclyFeatured(featured));
ok("...both together do", SH.isPubliclyFeatured(both));

// WITHDRAWAL IS IMMEDIATE BY CONSTRUCTION. Nothing is copied to a published
// list, so clearing the consent removes the company on the next read. The
// failure this guards is the quiet one: a studio that changed its mind and is
// still on the site because withdrawing meant emailing somebody.
ok("clearing consent removes it", !SH.isPubliclyFeatured({ ...both, showcaseConsent: null }));
ok("...and so does unfeaturing", !SH.isPubliclyFeatured({ ...both, featured: false }));

// CONSENT IS A TIMESTAMP, NOT A BOOLEAN. A record saying only `true` cannot
// answer "since when", which is the first question anybody asks about
// permission to use a company's name.
ok("an empty timestamp is not consent", !SH.hasConsented({ showcaseConsent: { at: "", by: "col_1" } }));
ok("...a real one is", SH.hasConsented(consented));

// THE PUBLIC SHAPE IS AN ALLOW-LIST. A studio record carries the slug, the
// member count, the plan, the currency and every setting the tenant ever saved.
// A function that REMOVED the private fields would leak whichever one somebody
// adds next; this one names what goes out, so a new field is private until
// somebody writes it into that line.
const row = SH.toPublicCompany({ ...both, slug: "gamma", currency: "SAR", packageId: "pkg_1", memberCount: 42 });
ok("the public row has exactly four fields",
  JSON.stringify(Object.keys(row).sort()) === JSON.stringify(["logo", "name", "order", "sector"]),
  Object.keys(row).join(","));
// NO SLUG, and it is the one that looks harmless — a customer list keyed by
// address is a roster of tenants to try.
for (const leaked of ["slug", "currency", "packageId", "memberCount", "id"]) {
  ok(`...and no ${leaked}`, !(leaked in row));
}

// ORDERED BY OURS, THEN BY NAME. Two studios sharing an order number is not
// worth refusing — somebody will type 1 twice — but an unstable tie-break
// reshuffles the page between requests for no reason.
const feed = SH.publicCompanies([
  { name: "Zed", featured: true, featuredOrder: 1, showcaseConsent: { at: "x", by: "c" } },
  { name: "Ana", featured: true, featuredOrder: 1, showcaseConsent: { at: "x", by: "c" } },
  { name: "Mid", featured: true, featuredOrder: 0, showcaseConsent: { at: "x", by: "c" } },
  { name: "Nope", featured: true },
]);
ok("the feed is ordered, then alphabetical",
  feed.map((c) => c.name).join(",") === "Mid,Ana,Zed", feed.map((c) => c.name).join(","));
ok("...and excludes the one that never agreed", !feed.some((c) => c.name === "Nope"));

// DEGRADES TO NOTHING. If nobody has consented the feed is empty, and the page
// renders nothing rather than a placeholder — a logo wall of companies that are
// not customers says less than no logo wall.
ok("no consent means an empty feed", SH.publicCompanies([featured, { name: "X" }]).length === 0);

console.log("\n== no Arabic copy carries a diacritic");

// ONE CHECK OVER EVERY MODULE, and the gap it closes is why. Three modules were
// checked by hand — platform, pricing, company — and three were not, so ten
// shadda marks sat in the home, security and platform copy until somebody
// happened to look. A per-module assertion is a list somebody has to remember
// to extend; this one covers whatever exists.
//
// SHADDA COUNTS. It is not a vowel mark, and Arabic prose often keeps it — but
// nobody types it into a search box either, which is the whole reason this rule
// exists. Allowing one class of diacritic and banning another would make the
// rule a matter of taste.
const COPY_MODULES = {
  hero: (m) => m.heroCopy,
  home: (m) => m.homeCopy,
  platform: (m) => m.platformCopy,
  security: (m) => m.securityCopy,
  about: (m) => m.aboutCopy,
  contact: (m) => m.contactCopy,
  company: (m) => m.companyCopy,
};
for (const [name, pick] of Object.entries(COPY_MODULES)) {
  const mod = await import(`@/shared/marketing/${name}`);
  const fn = pick(mod);
  ok(`${name} exposes its copy`, typeof fn === "function");
  if (typeof fn !== "function") continue;
  const ar = JSON.stringify(fn("ar"));
  ok(`${name} Arabic carries no diacritic`, !DIACRITICS.test(ar),
    (ar.match(DIACRITICS) || []).join(""));
  ok(`${name} spells the brand one way`, !/Nompany/.test(ar) && !/Nompany/.test(JSON.stringify(fn("en"))));
}

console.log("\n== an enquiry reaches the right mailbox");

const EQ = await import("@/shared/marketing/enquiry");

// THE SENDER SAYS WHICH DESK, and nothing else on the form does.
//
// THIS USED TO INFER IT FROM A HEADCOUNT — ten people or more meant sales — and
// the inference was the only reason the form asked for a team size at all. It
// was reasonable and still a guess: a forty-person company with a broken import
// is a support question, and a six-person one asking about invoicing is not.
ok("sales goes to new business", EQ.mailboxFor("sales") === "newBusiness");
ok("support goes to support", EQ.mailboxFor("support") === "support");

// AN UNANSWERED DROPDOWN MISFILES, IT DOES NOT LOSE. Both addresses reach a
// person, so falling back is safe; guessing new business would put a support
// question in front of the wrong reader. The old team-size values land here
// too, which is the honest answer for a stale client posting the old shape.
for (const missing of ["", null, undefined, "nonsense", "10-49", "250+"]) {
  ok(`an unstated topic falls back to support`, EQ.mailboxFor(missing) === "support");
}

// THE TOKENS ARE WHAT TRAVEL, not the words a visitor reads. An Arabic enquiry
// must not arrive carrying an Arabic string the router would have to
// understand — the same rule statuses and stages follow everywhere here.
ok("the topics are stored as tokens", EQ.TOPICS.every((t) => /^[a-z]+$/.test(t)),
  EQ.TOPICS.join(", "));

// THE TOPIC AND THE MAILBOX ARE DELIBERATELY DIFFERENT WORDS: the topic is what
// the visitor chose, the mailbox is where it goes, and they map one to one
// today with no reason they must forever.
ok("the role is not named after the department", EQ.mailboxFor("sales") !== "sales");

// VALIDATION IS SHARED WITH THE SERVER, and these are the fields a form can
// actually get wrong.
const bad = EQ.validateEnquiry({ name: "a", email: "nope", company: "", message: "short" });
ok("a short name, a bad address, no company and a short message all fail",
  ["name", "email", "company", "message"].every((k) => bad[k]), JSON.stringify(bad));
ok("a complete enquiry passes",
  Object.keys(EQ.validateEnquiry({ name: "Ada L", email: "a@b.co", company: "Co", message: "Twelve chars plus." })).length === 0);
// AN UNBOUNDED BODY IS AN OPEN RELAY.
const long = EQ.normaliseEnquiry({ name: "x".repeat(999), email: "a@b.co", company: "c", message: "y".repeat(99999) });
ok("fields are cut to their limits",
  long.name.length === EQ.LIMITS.name && long.message.length === EQ.LIMITS.message);

console.log(fails ? `\n${fails} FAILED\n` : "\nmarketing model: all passed\n");
process.exit(fails ? 1 : 0);
