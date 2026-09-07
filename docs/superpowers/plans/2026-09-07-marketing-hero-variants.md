# Marketing hero variants — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the three hero variants of the marketing rebuild behind a preview route, so
the winner is chosen from the running thing rather than from a description.

**Architecture:** Three server-rendered hero variants live under
`src/components/landing/hero/variants/`, each a client component reached through one dynamic
route, `/[locale]/preview/hero/[variant]`. They share one copy module, one derived
departments list and one claims register — all pure, all in `src/shared/marketing/`, all
typed so a missing Arabic string is a compile error. The route is `noindex`, absent from the
sitemap, and is deleted in the same commit that adopts a winner.

**Tech Stack:** Next.js 16 (App Router) · React 19 · `motion/react` (confined to
`src/components/landing/**`) · Tailwind v3 · Node's own test convention (`tests/*-model.mjs`,
no framework).

**Spec:** `docs/superpowers/specs/2026-09-07-marketing-site-rebuild-design.md` (§5 is this
plan; §13 step 1 is this plan). Companion: `SEO-PLAN.md` §1.1, §1.4, §2.12, §5.4.

**Branch:** `marketing-site-rebuild` (already cut from `main` at `4b50b43`).

---

## Global Constraints

Every task's requirements implicitly include this section. Values are copied verbatim from
the spec.

- **The settled state is what the server renders.** No element is parked at `opacity: 0`
  waiting on an observer, and no overlay gates the page on JavaScript. `motion/react` writes
  a component's `initial` into the server-rendered `style` attribute, so
  `initial={{ opacity: 0 }}` *is* `style="opacity:0"` in the HTML a tag-stripping extractor
  reads. Nothing in a hero variant may start invisible.
- **The H1 is a single text node.** The current per-character split renders as
  `T h e O p e r a t i n g S y s t e m`. No variant may import `AnimatedHeadline`.
- **Responsive by design, not by hiding.** On narrow viewports the assembly collapses to one
  card plus a static frame — never `hidden lg:block` over the product surface.
- **All scroll- and pointer-driven motion drops out under `prefers-reduced-motion`.**
- **`motion/react` stays confined to `src/components/landing/**`.** Gate A enforces it
  (`tests/gate-a.mjs:610-625`); it is ~30 KB gzipped and this confinement is the only reason
  the studio's chunk does not carry it.
- **Only the eleven live departments are named** anywhere. Manufacturing & Production,
  Assets & Equipment, Quality & HSE and Reports & BI are in `NO_SCREEN_YET`
  (`src/platform/access/resolve.ts:363`) and render nothing. Neither is Tasks a department —
  it is a cross-cutting control. Measured at this commit: eleven.
- **"Start free" is the only primary CTA.** No demo request anywhere; the free tier is the
  demo.
- **One brand string: `nompany`, lowercase, everywhere.** `Nompany` appears nowhere.
- **Arabic carries no diacritics.** `أدر`, never `أدِر`.
- **Copy lives in `src/shared/marketing/<page>.ts`, one module per page, and nothing may
  enumerate them** — no barrel. Both locales are keys of one typed object per module.
- **A public claim must have a source in the product** (SEO-PLAN §5.4, proposed invariant
  18). Every number and capability stated on a public page names the module and export that
  backs it, and a claim whose source is removed fails the build.
- **`git add` every new file before believing a green suite.** The architectural assertions
  in `tests/restructure.mjs` shell out to `git grep`, which sees tracked files only.
- **Stage only this plan's own files.** Never `git add -A`; several sessions share this
  working tree. `next-env.d.ts` is already modified on entry and is not ours.

### Verification, every task

```bash
npx tsc --noEmit
npx tsc --noEmit -p tsconfig.strict.json
npm test
```

`npx next build` and `node scripts/bundle-budget.mjs` are run in Task 7, where the route's
first-load number is settled and recorded. Stop any `next dev` on 3010 before `npm test` —
the local `cloud-sql-proxy` fails on connection bursts and a dev server holding pool
connections is one.

---

## File structure

| File | Responsibility |
|---|---|
| `src/shared/marketing/departments.ts` | **Create.** The eleven live departments, derived from `SECTION_DEFS` minus `NO_SCREEN_YET`, named in both locales. Pure. |
| `src/shared/marketing/claims.ts` | **Create.** The claims register: id, both-locale text, and the module + export that backs each. Strings only — no source module is imported here, so a client component may carry it. |
| `src/shared/marketing/hero.ts` | **Create.** Hero copy, both locales, one typed object. |
| `src/shared/marketing/company.ts` | **Create.** The one canonical company description and the brand names. A **draft awaiting revision** — see Task 3. |
| `src/components/landing/hero/variants/HeroV1Assembly.tsx` | **Create.** V1 — the studio assembling itself. |
| `src/components/landing/hero/variants/HeroV2Scroll.tsx` | **Create.** V2 — V1 plus a scroll-driven tilt and expansion. |
| `src/components/landing/hero/variants/HeroV3Continuity.tsx` | **Create.** V3 — badge, two-line headline with a rotating department name, dual CTA. |
| `src/components/landing/hero/DepartmentMarquee.tsx` | **Create.** The eleven-department marquee that sits beneath whichever variant wins. |
| `src/components/landing/preview/HeroPreview.tsx` | **Create.** The preview client shell: providers, the variant switcher, the marquee. |
| `src/app/[locale]/preview/hero/[variant]/page.js` | **Create.** The route. Server component, `noindex`, resolves the variant from the URL. |
| `src/components/Nav.js` | **Modify.** Add `BARE_PREFIXES` beside `BARE_ROUTES` so the preview escapes the account chrome. |
| `src/components/Footer.js` | **Modify.** Use `BARE_PREFIXES`. |
| `tests/marketing-model.mjs` | **Create.** Pure assertions over the three shared modules, plus the source-level assertions that hold the spec's non-negotiables. |
| `package.json` | **Modify.** Add `tests/marketing-model.mjs` to the `test` script. |
| `scripts/bundle-baselines.json` | **Modify.** Record the preview route's first load, in the same commit as the route. |

**Why `.tsx` for new components** when the 272 existing browser files are `.js`:
`tsconfig.strict.json` includes `src/**/*` and grades every `.ts`/`.tsx` with
`noImplicitAny` on. A new component written in `.tsx` is type-checked from birth and adds
nothing to the `checkJs` debt Wave 4 has to pay. `src/components/motion/{CountUp,Reveal}.tsx`
are the precedent — client components already written this way.

**Contingency, stated because it is foreseeable:** these `.tsx` files import untyped landing
`.js` (`providers/PointerProvider.js`, `lib/motion.js`). With `checkJs: false` TypeScript
infers from the JS rather than grading it, which is expected to be fine — but if the strict
pass produces implicit-any errors originating in those imports, the correct move is a
one-line `.d.ts` beside the offending `.js`, **not** downgrading the new file to `.jsx` and
not widening a tsconfig. Task 4 runs both passes before any variant work, so this is found at
the cheapest moment.

---

## What this plan deliberately does not build

Named here so nobody discovers them missing and assumes an omission.

- **The featured-companies trust band** (spec §5, "beneath whichever wins"). It needs
  §6.1's consent toggle, `/super` curation and public endpoint — sequencing step 5. §4.4
  requires it to degrade to nothing rather than to placeholders, so there is nothing honest
  to render today. The marquee is built; the band is not.
- **A real captured screenshot** for V1/V2 to settle into (spec §5, "settling into a real
  captured screen"). The screenshot pipeline is sequencing step 8. The variants settle into
  the existing synthetic `DashboardAssembly`, and the swap point is a named comment in each
  variant.
- **`/[locale]/platform`**, which the secondary CTA will eventually point at (step 3). In the
  preview the secondary CTA scrolls to the marquee on the same page — visible, working, and
  not a dead link.
- **The rest of the claims register.** Only the claims the hero actually states are
  registered. The register grows with each page.

---

## Task 1: The eleven live departments, derived

**Files:**
- Create: `src/shared/marketing/departments.ts`
- Create: `tests/marketing-model.mjs`
- Modify: `package.json` (the `test` script)

**Interfaces:**
- Consumes: `SECTION_DEFS` from `@/platform/db/keys`, `NO_SCREEN_YET` from
  `@/platform/access/resolve`, `sectionName` from `@/shared/studio/sections`.
- Produces: `LIVE_DEPARTMENT_KEYS: readonly string[]` and
  `liveDepartments(locale: string): { key: string; name: string }[]`, used by Tasks 3, 5, 6
  and 7.

**Why this exists.** `Hero.js`'s `modulesFor` filters `SECTION_DEFS` by `d.key !== "main"`
alone, so today's hero streams **sixteen** names past the visitor — including Tasks, which is
not a department, and Manufacturing & Production, Assets & Equipment, Quality & HSE and
Reports & BI, which render nothing. That is SEO-PLAN §2.12 on the live page: advertising four
empty sections. Deriving the list rather than hand-writing it is the same argument the
existing comment on `modulesFor` already makes — it just filters one predicate short.

- [ ] **Step 1: Write the failing test**

Create `tests/marketing-model.mjs`:

```javascript
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
```

- [ ] **Step 2: Add it to `npm test` and run it to verify it fails**

`tests/restructure.mjs:862` (`testEveryModelTestIsActuallyRun`) fails the build for any
`tests/*-model.mjs` absent from the `test` script, so this is not optional and is not
deferrable. In `package.json`, insert `node tests/marketing-model.mjs && ` immediately before
`node tests/departments-model.mjs` in the `"test"` script.

Run: `node tests/marketing-model.mjs`
Expected: FAIL — `ERR_MODULE_NOT_FOUND` for `@/shared/marketing/departments`.

- [ ] **Step 3: Write the module**

Create `src/shared/marketing/departments.ts`:

```typescript
import { SECTION_DEFS } from "@/platform/db/keys";
import { NO_SCREEN_YET } from "@/platform/access/resolve";
import { sectionName } from "@/shared/studio/sections";

// THE DEPARTMENTS THE PRODUCT ACTUALLY HAS, for the marketing site.
//
// DERIVED FROM THE SOFTWARE'S OWN LIST so the public pages cannot drift from it.
// The hero already made that argument and then filtered one predicate short: it
// dropped "main" and kept everything else, which streamed SIXTEEN names past
// every visitor — Tasks, which is a cross-cutting control rather than a
// department, and the four sections in NO_SCREEN_YET, which are declared and
// render nothing. Naming an empty section on a marketing page is the same class
// of claim as a fabricated uptime figure (SEO-PLAN §2.12).
//
// THREE EXCLUSIONS, EACH FOR ITS OWN REASON — they are not one rule:
//   main          the studio's home surface, not a department.
//   tasks         a control that cuts across departments, not one of them.
//   NO_SCREEN_YET declared, hidden from the product's own sidebar, renders
//                 nothing. A section leaves this list the day its screen ships,
//                 and this page gains it on the same day with no edit here.
//
// CHILDREN ARE NOT DEPARTMENTS EITHER. A visitor is told the product has CRM &
// Sales; Pipeline, Tickets and Quotations are what is inside it, and belong to
// /platform/<section> when those pages are written.
const NOT_A_DEPARTMENT = new Set<string>(["main", "tasks"]);

export const LIVE_DEPARTMENT_KEYS: readonly string[] = SECTION_DEFS
  .map((d) => d.key)
  .filter((key) => !NOT_A_DEPARTMENT.has(key))
  .filter((key) => !(NO_SCREEN_YET as readonly string[]).includes(key));

export type Department = { key: string; name: string };

/**
 * The eleven, named in the reader's language.
 *
 * Names come from `sectionName` — the studio's own dictionary — rather than a
 * second Arabic list here. A marketing page and the product calling the same
 * department two different things is the drift this whole module exists to
 * prevent, and it would be invisible to anyone reading only one of them.
 */
export function liveDepartments(locale: string): Department[] {
  return SECTION_DEFS
    .filter((d) => LIVE_DEPARTMENT_KEYS.includes(d.key))
    .map((d) => ({ key: d.key, name: sectionName(d.key, d.name, locale) }));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tests/marketing-model.mjs`
Expected: PASS — "marketing model: all passed", eleven keys, no dead section, Arabic distinct
from English.

- [ ] **Step 5: Run the full suite and both type passes**

```bash
npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json && npm test
```

Expected: all green. `testEveryModelTestIsActuallyRun` in particular, which is why Step 2
happened before Step 3.

- [ ] **Step 6: Commit**

```bash
git add src/shared/marketing/departments.ts tests/marketing-model.mjs package.json
git commit -m "$(cat <<'EOF'
The marketing site names the eleven departments that exist

The hero derived its list from SECTION_DEFS to avoid drifting from the
software, and then filtered one predicate short: it dropped Main and kept
everything else. That streamed sixteen names past every visitor — Tasks,
which is a cross-cutting control rather than a department, and the four
sections in NO_SCREEN_YET, which are declared and render nothing.

Three exclusions, each for its own reason, so a section joins the list the
day its screen ships with no edit here.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: The claims register

**Files:**
- Create: `src/shared/marketing/claims.ts`
- Modify: `tests/marketing-model.mjs`

**Interfaces:**
- Consumes: nothing. **This module imports no source module** — see the design note below.
- Produces: `CLAIMS: Record<ClaimId, Claim>`, `type ClaimId`, and
  `claimText(id: ClaimId, locale: string): string`, used by Tasks 3, 4, 5 and 6.

**The design decision, because the obvious shape is wrong.** SEO-PLAN §5.4 asks for a
register where "a claim whose source is removed fails the build", which suggests a `verify()`
predicate on each claim. That predicate would have to import the source — `PLANS`,
`SECTION_DEFS`, `PERMISSION_AREAS` — and the register is imported by client components, so
every source it touches would land in the marketing bundle. `PERMISSION_AREAS` alone is 159
keys of server-side catalogue.

So the register holds **strings and a source ADDRESS**: the module specifier and the export
name. The verification lives in `tests/marketing-model.mjs`, which imports each named module
dynamically and asserts both that the export still exists and that the claim's specific
number still holds. The build-failing property is unchanged — a deleted source is an
`ERR_MODULE_NOT_FOUND` in a test that `npm test` runs — and the bundle stays clean.

- [ ] **Step 1: Write the failing test**

Append to `tests/marketing-model.mjs`, immediately before the final `console.log(fails ? …)`
line:

```javascript
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node tests/marketing-model.mjs`
Expected: FAIL — `ERR_MODULE_NOT_FOUND` for `@/shared/marketing/claims`.

- [ ] **Step 3: Write the register**

Create `src/shared/marketing/claims.ts`:

```typescript
// THE CLAIMS REGISTER — every number and capability stated on a public page,
// and the module and export that backs it.
//
// WHY IT EXISTS. The marketing site shipped 3.2M transactions/day, 180+
// connectors, 99.99% uptime, 120+ countries and SSO/SCIM for a product that had
// none of them, and nothing in the pipeline could notice. This is SEO-PLAN
// §5.4's proposed eighteenth invariant: a public claim must have a source in the
// product, and a claim whose source is removed fails the build.
//
// IT IMPORTS NOTHING, DELIBERATELY. The obvious shape is a `verify()` predicate
// per claim — but a predicate has to import PLANS, SECTION_DEFS and the 159-key
// permission catalogue, and this module is imported by CLIENT components, so
// every source it touched would land in the marketing bundle. So a claim carries
// its source as an ADDRESS, and tests/marketing-model.mjs imports each named
// module and asserts both that the export survives and that the specific number
// still holds. Same build-failing property, no bundle cost.
//
// A CLAIM IS REGISTERED WHERE IT IS STATED, not where it is true. The register
// grows one page at a time; only what the hero says is here.

export type ClaimSource = {
  /** The module specifier, exactly as the test will import it. */
  module: string;
  /** The export within it that the claim rests on. */
  export: string;
};

export type Claim = {
  /** How the claim reads on the page, in the reader's language. */
  en: string;
  ar: string;
  source: ClaimSource;
};

export const CLAIMS = {
  // FREE FOR TEAMS UP TO NINE. The free plan's own band, not a marketing round
  // number: PLANS[0] is `free`, minUsers 1, maxUsers 9.
  "free-under-ten": {
    en: "Free for teams of one to nine",
    ar: "مجاني للفرق من واحد إلى تسعة",
    source: { module: "@/lib/pricing", export: "PLANS" },
  },
  // ELEVEN, and it moves on its own. The four in NO_SCREEN_YET are excluded by
  // shared/marketing/departments, so this number follows the software the day a
  // screen ships rather than the day somebody remembers to edit it.
  "eleven-departments": {
    en: "Eleven departments on one data model",
    ar: "أحد عشر قسما على نموذج بيانات واحد",
    source: { module: "@/shared/marketing/departments", export: "LIVE_DEPARTMENT_KEYS" },
  },
  // ARABIC AND ENGLISH WITH TRUE RTL. Not a translation layer over an English
  // product: `dir` is resolved per locale and MUI is mirrored through a second
  // Emotion cache. The claim rests on the locale table itself.
  "bilingual-rtl": {
    en: "Arabic and English, with true right-to-left throughout",
    ar: "العربية والإنجليزية، مع دعم كامل للكتابة من اليمين إلى اليسار",
    source: { module: "@/shared/i18n", export: "locales" },
  },
  // EVERY RECORD PERMISSIONED TO THE ROW. What backs it is invariant 4 — no role
  // means nothing, and there is no fallback path — asserted against the resolver
  // rather than against a sentence about it.
  "permissioned-to-the-row": {
    en: "Every record permissioned to the row",
    ar: "كل سجل محكوم بالصلاحيات حتى مستوى الصف",
    source: { module: "@/platform/access/resolve", export: "effectivePermissions" },
  },
} as const satisfies Record<string, Claim>;

export type ClaimId = keyof typeof CLAIMS;

/** A registered claim, in the reader's language. */
export function claimText(id: ClaimId, locale: string): string {
  const claim = CLAIMS[id];
  return locale === "ar" ? claim.ar : claim.en;
}
```

> If `satisfies Record<string, Claim>` fights `as const` (readonly properties against a
> mutable type) on this TypeScript version, drop the `as const` and type the object
> `Record<ClaimId, Claim>` with `ClaimId` declared as an explicit union of the four ids. Do
> not delete the `satisfies` — it is what makes a malformed claim a compile error.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node tests/marketing-model.mjs`
Expected: PASS — four claims, each with a resolving module, a surviving export, a true
assertion, both languages, no diacritics, one brand string.

- [ ] **Step 5: Both type passes**

```bash
npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/shared/marketing/claims.ts tests/marketing-model.mjs
git commit -m "$(cat <<'EOF'
A public claim names the code that backs it

The marketing site shipped 3.2M transactions/day, 180+ connectors, 99.99%
uptime and SSO/SCIM for a product that had none of them, and nothing in the
pipeline could notice. Four claims are registered — the ones the new hero
makes — each carrying the module and export it rests on, and the suite
imports each one and asserts the number still holds.

The register imports nothing itself: a verify() predicate would have to pull
PLANS, SECTION_DEFS and the 159-key catalogue into a module that client
components carry. A source address costs the bundle nothing and fails the
build the same way.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: The hero copy module, and the canonical company description

**Files:**
- Create: `src/shared/marketing/hero.ts`
- Create: `src/shared/marketing/company.ts`
- Modify: `tests/marketing-model.mjs`

**Interfaces:**
- Consumes: `claimText` and `ClaimId` from `@/shared/marketing/claims`.
- Produces: `heroCopy(locale: string): HeroStrings`, used by Tasks 4, 5, 6 and 7.
  `HeroStrings` has these exact fields: `badge`, `h1`, `lead`, `ctaPrimary`, `ctaSecondary`,
  `footnote`, `marqueeLabel`, `rotatingPrefix`, `rotatingSuffix`, `previewLabel`,
  `variantLabels: { v1: string; v2: string; v3: string }`.

**What the copy replaces.** `src/shared/landing.ts` currently supplies
`heroBadge: "Nompany 4.0 — now with agentic workflows"` — a version number that does not
exist, a capability that does not exist, and the brand spelled with a capital. `heroLine1` /
`heroLine2` are the split headline. `heroLead` ends mid-sentence to hand off to a typewriter.
None of it survives. **`src/shared/landing.ts` is not edited by this plan** — the existing
landing page still renders from it, and it is retired when the new home page replaces it at
sequencing step 3.

- [ ] **Step 1: Write the failing test**

Append to `tests/marketing-model.mjs`, before the final `console.log(fails ? …)` line:

```javascript
console.log("\n== the hero's copy");

const H = await import("@/shared/marketing/hero");

for (const locale of ["en", "ar"]) {
  const c = H.heroCopy(locale);
  const fields = ["badge", "h1", "lead", "ctaPrimary", "ctaSecondary", "footnote",
    "marqueeLabel", "rotatingPrefix", "rotatingSuffix", "previewLabel"];
  for (const f of fields) {
    ok(`${locale}.${f} is written`, typeof c[f] === "string" && c[f].trim().length > 0);
  }
  ok(`${locale} names all three variants`,
    ["v1", "v2", "v3"].every((v) => c.variantLabels[v]?.trim().length > 0));
  ok(`${locale} spells the brand one way`,
    !fields.some((f) => /Nompany/.test(c[f])));
}

// THE H1 IS ONE STRING, not two lines to be split and animated per character.
// A tag-stripping extractor reads today's headline as `T h e O p e r a t i n g
// S y s t e m` (SEO-PLAN §1.4), and the fix is upstream of the component: if
// the copy module cannot express two lines, no component can split them.
ok("the English H1 is a single line", !H.heroCopy("en").h1.includes("\n"));
ok("the Arabic H1 is a single line", !H.heroCopy("ar").h1.includes("\n"));

// NO DIACRITICS ANYWHERE IN THE ARABIC.
const ar = H.heroCopy("ar");
for (const [f, v] of Object.entries(ar)) {
  if (typeof v !== "string") continue;
  ok(`ar.${f} carries no diacritics`, !DIACRITICS.test(v), v);
}

// AN UNKNOWN LOCALE FALLS BACK RATHER THAN RETURNING UNDEFINED. Every dictionary
// in this repo does; a screen rendering "undefined" because a third locale
// arrived is not a failure anybody would file.
ok("an unknown locale falls back to English",
  H.heroCopy("fr").h1 === H.heroCopy("en").h1);
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node tests/marketing-model.mjs`
Expected: FAIL — `ERR_MODULE_NOT_FOUND` for `@/shared/marketing/hero`.

- [ ] **Step 3: Write the module**

Create `src/shared/marketing/hero.ts`:

```typescript
import { defaultLocale, type Locale } from "@/shared/locale";
import { claimText } from "@/shared/marketing/claims";

// THE HERO'S COPY, one module for one surface — the studio's own convention
// (src/shared/studio/, one module per surface, and nothing enumerates them). A
// barrel over src/shared/marketing would make every page's words reachable from
// every component and the split stops paying.
//
// BOTH LOCALES ARE KEYS OF ONE TYPED OBJECT, which is the property that has kept
// this site at parity without anybody policing it: a missing Arabic string is a
// compile error rather than an English sentence on an Arabic page.
//
// WHAT LEFT WITH THE OLD COPY. `landing.ts` supplies heroBadge "Nompany 4.0 —
// now with agentic workflows": a version number that does not exist, a
// capability that does not exist, and the brand spelled with a capital. Every
// figure here is registered in ./claims and asserted against its source.

type HeroStrings = {
  badge: string;
  h1: string;
  lead: string;
  ctaPrimary: string;
  ctaSecondary: string;
  footnote: string;
  marqueeLabel: string;
  /** V3's rotating line reads `<prefix> <department> <suffix>`. */
  rotatingPrefix: string;
  rotatingSuffix: string;
  /** The preview shell's own chrome — never shipped on a public page. */
  previewLabel: string;
  variantLabels: { v1: string; v2: string; v3: string };
};

const en: HeroStrings = {
  badge: claimText("free-under-ten", "en"),
  // ONE TEXT NODE. Not two lines, not a highlighted word carved out of a
  // sentence — the component receives a string and renders a string.
  h1: "Run the whole company on one system",
  lead: "Sales, tendering, projects, procurement, inventory, field work, logistics, engineering, people and finance — sharing one data model, in Arabic and English, with every record permissioned to the row.",
  ctaPrimary: "Start free",
  ctaSecondary: "See how it works",
  footnote: "Free for teams of one to nine. No card, no sales call.",
  marqueeLabel: "The departments, today",
  rotatingPrefix: "One system for",
  rotatingSuffix: "",
  previewLabel: "Hero preview — not a public page",
  variantLabels: {
    v1: "V1 · Assembly",
    v2: "V2 · Scroll reveal",
    v3: "V3 · Continuity",
  },
};

// HAND-WRITTEN, NEVER MACHINE-TRANSLATED (SEO-PLAN §2.9). Arabic-speaking buyers
// detect translated copy immediately and it is this site's strongest asset in
// this market. NO DIACRITICS: the live Arabic title is `أدِر`, and nobody types
// a kasra into a search box (SEO-PLAN §1.8).
const ar: HeroStrings = {
  badge: claimText("free-under-ten", "ar"),
  h1: "أدر الشركة كلها على نظام واحد",
  lead: "المبيعات والمناقصات والمشاريع والمشتريات والمخزون والعمل الميداني والخدمات اللوجستية والهندسة والموارد البشرية والمالية — على نموذج بيانات واحد، بالعربية والإنجليزية، وكل سجل محكوم بالصلاحيات حتى مستوى الصف.",
  ctaPrimary: "ابدأ مجانا",
  ctaSecondary: "شاهد كيف يعمل",
  footnote: "مجاني للفرق من واحد إلى تسعة. بدون بطاقة، وبدون مكالمة مبيعات.",
  marqueeLabel: "الأقسام، اليوم",
  rotatingPrefix: "نظام واحد لـ",
  rotatingSuffix: "",
  previewLabel: "معاينة الواجهة — ليست صفحة عامة",
  variantLabels: {
    v1: "الأول · التجميع",
    v2: "الثاني · الكشف بالتمرير",
    v3: "الثالث · الاستمرارية",
  },
};

const hero = { en, ar };

export function heroCopy(locale: string): HeroStrings {
  return hero[locale as Locale] || hero[defaultLocale];
}

export type { HeroStrings };
```

- [ ] **Step 4: Write the canonical company description**

Spec §12.2 requires this drafted now and **marked for revision** rather than left blank:
every external profile and the `Organization` schema reuse it verbatim, and profiles created
from different drafts are a permanent inconsistency. It is deliberately **unused until
sequencing step 7** (the About page) — it exists so there is one draft to revise rather than
four written independently later.

Create `src/shared/marketing/company.ts`:

```typescript
import { defaultLocale, type Locale } from "@/shared/locale";

// THE ENTITY, DESCRIBED ONCE.
//
// One sentence, in both languages, reused verbatim by: the About page, the
// Organization schema, OpenGraph, and every external profile created later.
// Five profiles written from five drafts is a permanent inconsistency that
// nobody can fix afterwards without editing five sites.
//
// ⚠️ THE DESCRIPTION IS A DRAFT AWAITING REVISION (spec §12.2). It is written
// rather than left blank because a blank one gets filled in four places at
// once; it is marked because publishing an unrevised draft externally is the
// thing this module exists to prevent. REVISE BEFORE ANY EXTERNAL PROFILE IS
// CREATED — after that it is expensive to change and partly out of our hands.
//
// WHAT IT MAY NOT SAY, and this is not stylistic (spec §12.1): the company is
// not based anywhere yet, is not Saudi, and will be based in Jordan. The market
// is the whole region. No city, no country claim, no ZATCA, no regulatory
// posture. src/lib/seo.ts still asserts Riyadh/SA in Organization schema and is
// corrected in the SEO pass; nothing new may repeat it.

/** The Latin brand string. Lowercase, everywhere. `Nompany` appears nowhere. */
export const BRAND = "nompany";

/**
 * The Arabic-script brand name (spec §12.1).
 *
 * Settled deliberately rather than transliterated per page: an Arabic searcher
 * typing the brand phonetically previously matched nothing, and this is
 * irreversible in practice once it is on a directory listing.
 */
export const BRAND_AR = "نومباني";

type CompanyStrings = {
  /** One sentence. DRAFT — see the warning above. */
  description: string;
};

const en: CompanyStrings = {
  description:
    "nompany is an ERP for small and medium companies across the region — sales, tendering, projects, procurement, inventory, field work, logistics, engineering, people and finance on one data model, in Arabic and English.",
};

const ar: CompanyStrings = {
  description:
    "نومباني نظام تخطيط موارد للشركات الصغيرة والمتوسطة في المنطقة — المبيعات والمناقصات والمشاريع والمشتريات والمخزون والعمل الميداني والخدمات اللوجستية والهندسة والموارد البشرية والمالية على نموذج بيانات واحد، بالعربية والإنجليزية.",
};

const company = { en, ar };

export function companyCopy(locale: string): CompanyStrings {
  return company[locale as Locale] || company[defaultLocale];
}
```

Append its assertions to `tests/marketing-model.mjs`, before the final `console.log`:

```javascript
console.log("\n== the entity, described once");

const CO = await import("@/shared/marketing/company");

ok("the Latin brand is lowercase", CO.BRAND === "nompany");
ok("the Arabic brand is settled", CO.BRAND_AR === "نومباني");

for (const locale of ["en", "ar"]) {
  const d = CO.companyCopy(locale).description;
  ok(`${locale} has a description`, typeof d === "string" && d.trim().length > 0);
  ok(`${locale} spells the brand one way`, !/Nompany/.test(d));
  // THE COMPANY IS NOT SAUDI AND ZATCA IS NOT IN SCOPE (spec §12.1). A public
  // sentence implying either is the same class of defect as a fabricated
  // uptime figure, and it is the one the owner named explicitly.
  ok(`${locale} claims no location`, !/Riyadh|السعودية|Saudi|ZATCA|KSA/i.test(d));
}
ok("the Arabic description carries no diacritics",
  !DIACRITICS.test(CO.companyCopy("ar").description));
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node tests/marketing-model.mjs`
Expected: PASS across all four sections.

- [ ] **Step 6: Both type passes**

```bash
npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json
```

Expected: clean. Every field of `HeroStrings` must be present in both `en` and `ar` or this
step is where it is caught.

- [ ] **Step 7: Commit**

```bash
git add src/shared/marketing/hero.ts src/shared/marketing/company.ts tests/marketing-model.mjs
git commit -m "$(cat <<'EOF'
The hero's copy says only what the product does

heroBadge read "Nompany 4.0 — now with agentic workflows": a version number
that does not exist, a capability that does not exist, and the brand spelled
with a capital. The replacement takes its figures from the claims register,
so each one is asserted against the module that backs it.

The H1 is a single string rather than two lines, upstream of the component
that renders it: if the copy cannot express two lines, nothing can split them
per character, which is what a tag-stripping extractor reads today.

Arabic is hand-written and carries no diacritics — nobody types a kasra into
a search box.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: The preview route, the shell, and V1

**Files:**
- Create: `src/app/[locale]/preview/hero/[variant]/page.js`
- Create: `src/components/landing/preview/HeroPreview.tsx`
- Create: `src/components/landing/hero/variants/HeroV1Assembly.tsx`
- Modify: `src/components/Nav.js` (add `BARE_PREFIXES`)
- Modify: `src/components/Footer.js` (use `BARE_PREFIXES`)
- Modify: `tests/marketing-model.mjs`

**Interfaces:**
- Consumes: `heroCopy` (Task 3), `liveDepartments` (Task 1), `DashboardAssembly` from
  `@/components/landing/hero/DashboardAssembly`, `PointerProvider` / `LandingLocaleProvider`
  from the landing.
- Produces:
  - `HeroPreview({ locale, variant }: { locale: string; variant: "v1" | "v2" | "v3" })` —
    default export of `HeroPreview.tsx`. Tasks 5, 6 and 7 extend it.
  - `HeroV1Assembly({ locale }: { locale: string })` — named export.
  - `BARE_PREFIXES: string[]` — named export of `Nav.js`, consumed by `Footer.js`.

**Why the route is shaped this way.** One dynamic segment rather than three routes or a query
param: the URL names the variant so a link can be sent and compared, each variant is genuinely
server-rendered (which is the constraint being judged), and the bundle budget sees **one**
route entry rather than three. `/en/preview/hero/v1`, `/ar/preview/hero/v1`, and so on.

**Why it is `noindex` and out of the sitemap.** It ships to production because that is where
it will be looked at, and a preview surface in the index is exactly the thin-URL problem this
rebuild exists to fix. `robots.js` also gains `/*/preview`, so it is refused by path as well
as by meta.

- [ ] **Step 1: Write the failing test**

Append to `tests/marketing-model.mjs`, before the final `console.log(fails ? …)` line:

```javascript
console.log("\n== the hero variants, at the source");

const { readFileSync, readdirSync, existsSync } = await import("node:fs");

const VARIANT_DIR = "src/components/landing/hero/variants";
ok("the variants have a home", existsSync(VARIANT_DIR));

const variantFiles = existsSync(VARIANT_DIR)
  ? readdirSync(VARIANT_DIR).filter((f) => /\.(tsx|jsx?)$/.test(f))
  : [];
ok("...and at least one variant is in it", variantFiles.length > 0);

for (const file of variantFiles) {
  const src = readFileSync(`${VARIANT_DIR}/${file}`, "utf8");

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
    !/initial=\{\{[^}]*opacity:\s*0/.test(src), file);

  // THE H1 IS A SINGLE TEXT NODE. AnimatedHeadline splits a headline into
  // per-character aria-hidden spans; a tag-stripping extractor reads the live
  // page's H1 as `T h e O p e r a t i n g S y s t e m`.
  ok(`${file} does not split its headline`, !/AnimatedHeadline/.test(src), file);

  // EVERY CLAIM ON THE PAGE IS REGISTERED. A variant reaches its figures
  // through claimText or through the copy module that does; a number typed
  // straight into JSX is how 99.99% uptime got onto the live page.
  const digitsInJsx = src.match(/>\s*[0-9][0-9,.]*\+?\s*</g) || [];
  ok(`${file} states no unregistered figure`, digitsInJsx.length === 0,
    digitsInJsx.join(" "));
}

// THE PREVIEW IS NOT A PUBLIC PAGE. It ships to production because that is
// where it gets looked at, and a preview surface in the index is the thin-URL
// problem this rebuild exists to fix.
const routeFile = "src/app/[locale]/preview/hero/[variant]/page.js";
ok("the preview route exists", existsSync(routeFile));
if (existsSync(routeFile)) {
  const route = readFileSync(routeFile, "utf8");
  ok("...and is noindex", /index:\s*false/.test(route) && /follow:\s*false/.test(route));
}
const sitemap = readFileSync("src/app/sitemap.js", "utf8");
ok("...and is absent from the sitemap", !/preview/.test(sitemap));
const robots = readFileSync("src/app/robots.js", "utf8");
ok("...and disallowed in robots.txt", /\/\*\/preview/.test(robots));
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node tests/marketing-model.mjs`
Expected: FAIL — "the variants have a home" false, "the preview route exists" false,
"disallowed in robots.txt" false.

- [ ] **Step 3: Add the chrome escape hatch**

In `src/components/Nav.js`, immediately after the existing `BARE_ROUTES` export
(`src/components/Nav.js:17`), add:

```javascript
// PREFIXES, because a route family cannot be listed exhaustively. BARE_ROUTES is
// matched exactly, which is right for a fixed set of pages; the hero preview is
// one route with a variant segment (/preview/hero/v1, /v2, /v3) and listing each
// one would go stale the moment a fourth variant is tried. Shared with Footer.js
// exactly as BARE_ROUTES is — keep the two in step.
export const BARE_PREFIXES = ["/preview"];
```

Then change the suppression check at `src/components/Nav.js:104` from:

```javascript
  if (BARE_ROUTES.some((r) => pathname === `/${locale}${r}`)) return null;
```

to:

```javascript
  const bare = BARE_ROUTES.some((r) => pathname === `/${locale}${r}`)
    || BARE_PREFIXES.some((r) => pathname.startsWith(`/${locale}${r}`));
  if (bare) return null;
```

In `src/components/Footer.js`, change the import at line 6 and the check at line 16:

```javascript
import { BARE_ROUTES, BARE_PREFIXES } from "@/components/Nav";
```

```javascript
  const isBare = BARE_ROUTES.some((r) => pathname === `/${locale}${r}`)
    || BARE_PREFIXES.some((r) => pathname.startsWith(`/${locale}${r}`));
```

- [ ] **Step 4: Keep the preview out of the index**

In `src/app/robots.js`, add `"/*/preview"` to the `disallow` array, immediately after
`"/*/questionnaire"`, with the reason:

```javascript
          // The hero preview ships to production because that is where it is
          // looked at, and it is a preview surface rather than a page. Refused
          // by path as well as by the route's own noindex.
          "/*/preview",
```

`src/app/sitemap.js` needs no change — `PATHS` is an explicit list and the preview is simply
not on it. The test asserts that.

- [ ] **Step 5: Write V1**

Create `src/components/landing/hero/variants/HeroV1Assembly.tsx`:

```tsx
"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { heroCopy } from "@/shared/marketing/hero";
import { SPRING_SOFT } from "@/components/landing/lib/motion";
import { DashboardAssembly } from "@/components/landing/hero/DashboardAssembly";

/* ==================================================================
   V1 — THE STUDIO ASSEMBLING ITSELF.
   Dark, badge pill, one-line headline, Start free / See how it works,
   and the product surface building itself in place beside the copy.

   THE COPY COLUMN CARRIES NO ENTRANCE ANIMATION, and that is the whole
   point of the variant rather than an omission. `motion/react` writes
   `initial` into the server-rendered style attribute, so an
   `initial={{ opacity: 0 }}` on a headline is `style="opacity:0"` in
   the HTML — which Google renders past and ChatGPT, Claude and
   Perplexity's crawlers do not. The motion lives on the visual column,
   which is decorative, and the words are settled from the first byte.

   SETTLES INTO A SYNTHETIC SCREEN FOR NOW. The spec calls for a real
   captured one; the screenshot pipeline is sequencing step 8, and this
   import is the single line that changes when it lands.
================================================================== */

export function HeroV1Assembly({ locale }: { locale: string }) {
  const tr = heroCopy(locale);
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 pt-20 pb-16 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-28 lg:pb-24">
      <div className="relative z-10 max-w-xl">
        <span className="surface inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs text-fg-muted">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-mint" />
          </span>
          {tr.badge}
        </span>

        {/* ONE TEXT NODE. */}
        <h1 className="mt-7 font-display text-4xl leading-[1.06] font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.65rem]">
          {tr.h1}
        </h1>

        <p className="mt-6 text-lg text-fg-muted">{tr.lead}</p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href={`/${locale}/signup`}
            className="inline-flex items-center rounded-full bg-gradient-to-br from-iris to-violet px-6 py-3 text-sm font-medium text-white shadow-lg shadow-iris/25 transition-transform hover:scale-[1.02]"
          >
            {tr.ctaPrimary}
          </Link>
          {/* NOT A DEAD LINK. It points at /platform once that page exists
              (sequencing step 3); until then it scrolls to the department
              marquee on this same page, which is the thing it promises. */}
          <a
            href="#departments"
            className="surface inline-flex items-center rounded-full px-6 py-3 text-sm text-fg-muted transition-colors hover:text-fg"
          >
            {tr.ctaSecondary}
          </a>
        </div>

        <p className="mt-5 text-xs text-fg-dim">{tr.footnote}</p>
      </div>

      {/* THE VISUAL COLUMN IS DECORATIVE and may animate freely. It is not
          hidden on narrow viewports — it collapses: DashboardAssembly's own
          grid drops to a single column below `md`, so a phone gets one card
          rather than a scaled-down dashboard nobody can read.

          THE ENTRANCE IS SCALE, NEVER OPACITY, so the frame is present in the
          server-rendered HTML at full opacity and merely arrives at its final
          size — and it is dropped entirely under reduced motion rather than
          shortened, because a settle-in is exactly the kind of movement the
          setting is asking not to see. DashboardAssembly reads the same
          preference itself for its own tilt and float loops. */}
      <motion.div
        className="relative z-0 lg:pl-6"
        initial={reduceMotion ? false : { scale: 0.97 }}
        animate={{ scale: 1 }}
        transition={reduceMotion ? { duration: 0 } : SPRING_SOFT}
        aria-hidden="true"
      >
        <DashboardAssembly />
      </motion.div>
    </section>
  );
}
```

- [ ] **Step 6: Write the preview shell**

Create `src/components/landing/preview/HeroPreview.tsx`:

```tsx
"use client";

import Link from "next/link";
import { dirFor } from "@/shared/locale";
import { heroCopy } from "@/shared/marketing/hero";
import { LandingLocaleProvider } from "@/components/landing/locale";
import { PointerProvider } from "@/components/landing/providers/PointerProvider";
import { AmbientBackground } from "@/components/landing/AmbientBackground";
import { HeroV1Assembly } from "@/components/landing/hero/variants/HeroV1Assembly";

/* ==================================================================
   THE HERO PREVIEW SHELL — three variants, one URL each, judged side
   by side rather than from a description.

   IT BRINGS THE LANDING'S CHROME AND NOT THE ACCOUNT'S: `.landing-page`
   for the dark palette, the ambient layer, the pointer provider V1's
   tilt reads from. Nav.js and Footer.js suppress themselves on
   /<locale>/preview/* via BARE_PREFIXES.

   NO PRELOADER, deliberately — the spec removes it, and a preview that
   reintroduced the thing being removed would be judging the wrong page.

   THIS FILE IS DELETED with the route in the commit that adopts a
   winner. It is scaffolding, and scaffolding that outlives the build
   becomes a page nobody meant to publish.
================================================================== */

export type VariantId = "v1" | "v2" | "v3";

const VARIANTS: VariantId[] = ["v1", "v2", "v3"];

export default function HeroPreview({
  locale,
  variant,
}: {
  locale: string;
  variant: VariantId;
}) {
  const tr = heroCopy(locale);

  return (
    <div dir={dirFor(locale)} className="landing-page relative min-h-screen">
      <LandingLocaleProvider locale={locale}>
        <PointerProvider>
          <AmbientBackground />

          {/* The switcher. Plain links, so each variant is a real
              server-rendered document rather than a client swap — which is
              the property being judged. */}
          <div className="relative z-50 mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-6 pt-6 text-xs">
            <span className="text-fg-dim">{tr.previewLabel}</span>
            <div className="surface ms-auto flex items-center gap-1 rounded-full p-1">
              {VARIANTS.map((v) => (
                <Link
                  key={v}
                  href={`/${locale}/preview/hero/${v}`}
                  className={`rounded-full px-3 py-1.5 transition-colors ${
                    v === variant
                      ? "bg-gradient-to-br from-iris to-violet text-white"
                      : "text-fg-muted hover:text-fg"
                  }`}
                >
                  {tr.variantLabels[v]}
                </Link>
              ))}
            </div>
            {/* Both languages from the same bar — the spec requires every page
                to be opened in both before it is called done, and a hero is
                judged on how the Arabic sits as much as on the English. */}
            <Link
              href={`/${locale === "ar" ? "en" : "ar"}/preview/hero/${variant}`}
              className="surface rounded-full px-3 py-1.5 text-fg-muted transition-colors hover:text-fg"
            >
              {locale === "ar" ? "EN" : "عربي"}
            </Link>
          </div>

          {variant === "v1" && <HeroV1Assembly locale={locale} />}
        </PointerProvider>
      </LandingLocaleProvider>
    </div>
  );
}
```

- [ ] **Step 7: Write the route**

Create `src/app/[locale]/preview/hero/[variant]/page.js`:

```javascript
import { notFound } from "next/navigation";
import HeroPreview from "@/components/landing/preview/HeroPreview";

// THE HERO PREVIEW — three variants behind one route, so the winner is chosen
// from the running thing rather than from a description (spec §5).
//
// NOT A PUBLIC PAGE. It ships to production because that is where it gets
// looked at, and it is noindex here, disallowed in robots.js and absent from
// the sitemap. It is deleted, route and shell together, in the commit that
// adopts a winner — scaffolding that outlives the build becomes a page nobody
// meant to publish.
//
// ONE DYNAMIC SEGMENT rather than three routes: the URL names the variant so a
// link can be sent, each variant is genuinely server-rendered — which is the
// constraint being judged — and the per-route bundle budget sees one entry.

const VARIANTS = ["v1", "v2", "v3"];

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return {
    title: "Hero preview",
    robots: { index: false, follow: false },
  };
}

export default async function HeroPreviewPage({ params }) {
  const { locale, variant } = await params;
  // A WRONG VARIANT IS A 404, not a redirect to v1. SEO-PLAN §1.11 is about
  // exactly this: a URL that names nothing should answer like one.
  if (!VARIANTS.includes(variant)) notFound();

  return <HeroPreview locale={locale} variant={variant} />;
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `node tests/marketing-model.mjs`
Expected: PASS — the variant directory exists, V1 parks nothing at opacity 0, imports no
`AnimatedHeadline`, states no bare figure; the route exists and is noindex; robots disallows
`/*/preview`; the sitemap does not mention it.

- [ ] **Step 9: Both type passes, then the suite**

```bash
npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json && npm test
```

This is the step that finds the `.tsx`-importing-untyped-`.js` question early. If the strict
pass reports implicit-any originating in `PointerProvider.js` or `lib/motion.js`, add a
minimal `.d.ts` beside the offending `.js` rather than downgrading the new file or widening a
tsconfig — see the contingency note in the file structure section.

- [ ] **Step 10: Open it in the browser pane, both languages**

```bash
npm run dev:sandbox
```

Then, in the Browser pane: `http://localhost:3010/en/preview/hero/v1` and
`http://localhost:3010/ar/preview/hero/v1`. **Front the tab** — the pane does not composite
unless displayed, and a hidden pane behaves differently in ways that read as bugs.

Assert by reading the page rather than by looking at it:
- `read_page` shows exactly one `heading level=1`, carrying `tr.h1` as one string.
- The Arabic page's H1 is `أدر الشركة كلها على نظام واحد` and the layout mirrors.
- The account `Nav` and `Footer` are absent (that is `BARE_PREFIXES` working).
- `read_console_messages` shows no errors. **A server component calling a client locale hook
  throws only on the first request** — neither `tsc` nor `next build` catches it, and this is
  the step that does.
- `/en/preview/hero/v9` returns 404.

Then stop the dev server before running the suite again — the local `cloud-sql-proxy` fails
on connection bursts, and `preview_stop` can leave the `next dev` child alive on 3010.

- [ ] **Step 11: Commit**

```bash
git add "src/app/[locale]/preview/hero/[variant]/page.js" \
  src/components/landing/preview/HeroPreview.tsx \
  src/components/landing/hero/variants/HeroV1Assembly.tsx \
  src/components/Nav.js src/components/Footer.js src/app/robots.js \
  tests/marketing-model.mjs
git commit -m "$(cat <<'EOF'
The first hero variant is a page you can open

Three variants behind one route with a variant segment, so each one is a
real server-rendered document at its own URL rather than a client swap — the
property being judged is what the server renders, so a switcher that swapped
in the browser would be judging something else.

V1's copy column carries no entrance animation, and that is the variant
rather than an omission: motion/react writes `initial` into the
server-rendered style attribute, so an initial opacity of 0 on a headline is
style="opacity:0" in the HTML that crawlers which do not run JavaScript read.
The motion is on the decorative column.

Noindex, disallowed by path, absent from the sitemap, and deleted with the
route when a winner is adopted.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: V2 — scroll reveal

**Files:**
- Create: `src/components/landing/hero/variants/HeroV2Scroll.tsx`
- Modify: `src/components/landing/preview/HeroPreview.tsx`

**Interfaces:**
- Consumes: `heroCopy` (Task 3), `DashboardAssembly`, `useScroll`/`useTransform`/
  `useReducedMotion` from `motion/react`.
- Produces: `HeroV2Scroll({ locale }: { locale: string })` — named export.

**What it is.** V1's copy column unchanged, with the product frame tilted back and expanding
to flat as the page scrolls — the hero handing off into what follows. The copy stays settled;
only the frame moves.

**The constraint that shapes it.** The frame's resting state must be its *server-rendered*
state, so the transform starts from a visible, readable frame and scroll flattens it — not
from nothing. And under `prefers-reduced-motion` the scroll binding is not attached at all,
which is stronger than animating to the same value: no scroll listener, no transform, no
per-frame work.

- [ ] **Step 1: Write V2**

Create `src/components/landing/hero/variants/HeroV2Scroll.tsx`:

```tsx
"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { heroCopy } from "@/shared/marketing/hero";
import { DashboardAssembly } from "@/components/landing/hero/DashboardAssembly";

/* ==================================================================
   V2 — SCROLL REVEAL.
   V1's copy, with the product frame tilted back at rest and flattening
   as the page scrolls, handing the hero off into the section below.

   THE FRAME'S RESTING STATE IS ITS SERVER-RENDERED STATE. The tilt is
   where the frame STARTS and scroll removes it — the frame is readable
   in the first frame and in the HTML, and scroll changes how it sits
   rather than whether it is there. A scroll-driven reveal that began
   at opacity 0 would be the defect this rebuild exists to fix, wearing
   a nicer coat.

   REDUCED MOTION UNBINDS RATHER THAN FLATTENS. `useScroll` is still
   called — hooks cannot be conditional — but its output is not
   consumed, so there is no transform, no per-frame matrix update, and
   nothing for the compositor to do.

   RULED OUT ON THE WAY HERE, and recorded so it is not revisited: the
   scroll-driven image-sequence treatment (hundreds of frames) is
   ruinous for LCP and mobile data, and every WebGL/shader hero would
   dominate INP on the page that matters most and would need CSP
   changes.
================================================================== */

export function HeroV2Scroll({ locale }: { locale: string }) {
  const tr = heroCopy(locale);
  const reduceMotion = useReducedMotion();
  const frame = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: frame,
    offset: ["start 0.85", "start 0.15"],
  });
  const eased = useSpring(scrollYProgress, { stiffness: 90, damping: 22, mass: 0.6 });

  // FROM TILTED TO FLAT, never from absent.
  const rotateX = useTransform(eased, [0, 1], [14, 0]);
  const scale = useTransform(eased, [0, 1], [0.94, 1]);

  return (
    <section className="relative mx-auto max-w-7xl px-6 pt-20 pb-16 lg:pt-28 lg:pb-24">
      <div className="mx-auto max-w-3xl text-center">
        <span className="surface inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs text-fg-muted">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-mint" />
          </span>
          {tr.badge}
        </span>

        <h1 className="mt-7 font-display text-4xl leading-[1.06] font-semibold tracking-tight text-balance sm:text-5xl lg:text-[4rem]">
          {tr.h1}
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-fg-muted">{tr.lead}</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/${locale}/signup`}
            className="inline-flex items-center rounded-full bg-gradient-to-br from-iris to-violet px-6 py-3 text-sm font-medium text-white shadow-lg shadow-iris/25 transition-transform hover:scale-[1.02]"
          >
            {tr.ctaPrimary}
          </Link>
          <a
            href="#departments"
            className="surface inline-flex items-center rounded-full px-6 py-3 text-sm text-fg-muted transition-colors hover:text-fg"
          >
            {tr.ctaSecondary}
          </a>
        </div>

        <p className="mt-5 text-xs text-fg-dim">{tr.footnote}</p>
      </div>

      <div ref={frame} className="mt-14 [perspective:1800px] lg:mt-20" aria-hidden="true">
        <motion.div
          className="gpu origin-top"
          style={reduceMotion ? undefined : { rotateX, scale, transformStyle: "preserve-3d" }}
        >
          <DashboardAssembly />
        </motion.div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Wire it into the shell**

In `src/components/landing/preview/HeroPreview.tsx`, add the import beside V1's and the
branch beside V1's:

```tsx
import { HeroV2Scroll } from "@/components/landing/hero/variants/HeroV2Scroll";
```

```tsx
          {variant === "v1" && <HeroV1Assembly locale={locale} />}
          {variant === "v2" && <HeroV2Scroll locale={locale} />}
```

- [ ] **Step 3: Run the source assertions**

Run: `node tests/marketing-model.mjs`
Expected: PASS — the loop in Task 4 Step 1 now covers `HeroV2Scroll.tsx` automatically, since
it reads the directory rather than a list of filenames. Specifically: no `initial` with
opacity 0, no `AnimatedHeadline`, no bare figure.

- [ ] **Step 4: Both type passes**

```bash
npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json
```

Expected: clean. `useRef<HTMLDivElement>(null)` against `useScroll`'s `target` is the likely
friction point; if the version in this tree wants `RefObject<HTMLElement>`, widen the ref's
type parameter rather than casting.

- [ ] **Step 5: Verify in the browser pane, both languages**

`http://localhost:3010/en/preview/hero/v2` and `/ar/preview/hero/v2`, tab fronted.

- `read_page` shows one H1 carrying the full string.
- Scroll with `computer {action: "scroll", scroll_direction: "down"}` and confirm the frame
  flattens. **The pane does not composite unless displayed and never fires
  `requestAnimationFrame`, so a spring cannot be watched there** — what is being checked is
  that the frame is present and readable at rest and that scrolling produces no error, not
  that the easing looks right. Judge the motion in a real browser.
- `read_console_messages` clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/landing/hero/variants/HeroV2Scroll.tsx \
  src/components/landing/preview/HeroPreview.tsx
git commit -m "$(cat <<'EOF'
The second hero variant hands off into the page

V1's copy with the product frame tilted at rest and flattening as the page
scrolls. The tilt is where the frame starts and scroll removes it, so the
frame is readable in the first frame and in the HTML — a scroll-driven
reveal that began at opacity 0 would be the defect this rebuild exists to
fix in a nicer coat.

Reduced motion unbinds the transform rather than animating it to the same
value: no per-frame matrix update and nothing for the compositor to do.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: V3 — continuity

**Files:**
- Create: `src/components/landing/hero/variants/HeroV3Continuity.tsx`
- Modify: `src/components/landing/preview/HeroPreview.tsx`

**Interfaces:**
- Consumes: `heroCopy` (Task 3), `liveDepartments` (Task 1), `AnimatePresence`/`motion`/
  `useReducedMotion` from `motion/react`.
- Produces: `HeroV3Continuity({ locale }: { locale: string })` — named export.

**What it is.** The control against which the other two are judged: closest to the current
site. Badge, a two-line headline whose second line rotates through the eleven department
names, dual CTA, and a strip beneath.

**The rotation, and why it does not break the H1 rule.** The H1 is `tr.h1` — one text node,
unchanged from V1 and V2. The rotating line sits **beneath** it as a `<p>`, and its first
department name is server-rendered as real text, so a crawler reads a complete sentence and
the rotation is a client enhancement over it. A rotating word *inside* the H1 would make the
H1's server-rendered content one arbitrary frame of an animation, which is a different defect
from the split-character one but the same family.

- [ ] **Step 1: Write V3**

Create `src/components/landing/hero/variants/HeroV3Continuity.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { heroCopy } from "@/shared/marketing/hero";
import { liveDepartments } from "@/shared/marketing/departments";
import { EASE_OUT_EXPO } from "@/components/landing/lib/motion";

/* ==================================================================
   V3 — CONTINUITY. The control: closest to the current site, and the
   thing the other two have to beat.

   THE ROTATION IS NOT IN THE H1. The headline is one text node, the
   same string V1 and V2 render. The rotating department sits beneath
   it in a paragraph whose FIRST department is server-rendered as real
   text — so a crawler reads a complete sentence and the rotation is an
   enhancement over it. A rotating word inside the H1 would make the
   server-rendered headline one arbitrary frame of an animation: a
   different defect from the split-character one, the same family.

   ELEVEN NAMES, NOT SIXTEEN. The current hero's typewriter streams
   every SECTION_DEFS entry but Main — which is Tasks, plus the four
   sections that render nothing. liveDepartments is the filter.
================================================================== */

const ROTATE_MS = 2200;

export function HeroV3Continuity({ locale }: { locale: string }) {
  const tr = heroCopy(locale);
  const reduceMotion = useReducedMotion();
  const departments = liveDepartments(locale);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // NO ROTATION AT ALL under reduced motion — the first department stands,
    // which is a complete sentence rather than a degraded animation.
    if (reduceMotion) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % departments.length),
      ROTATE_MS,
    );
    return () => window.clearInterval(id);
  }, [reduceMotion, departments.length]);

  const current = departments[index] ?? departments[0];

  return (
    <section className="relative mx-auto max-w-5xl px-6 pt-20 pb-16 text-center lg:pt-28 lg:pb-24">
      <span className="surface inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs text-fg-muted">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-mint" />
        </span>
        {tr.badge}
      </span>

      <h1 className="mt-7 font-display text-4xl leading-[1.06] font-semibold tracking-tight text-balance sm:text-5xl lg:text-[4rem]">
        {tr.h1}
      </h1>

      {/* The rotating line. `min-h` reserves the row so a longer department name
          arriving cannot push the CTAs down — layout shift is a Core Web Vital,
          and a hero that jumps is the one place a visitor notices it. */}
      <p className="mt-5 flex min-h-[2.5rem] flex-wrap items-center justify-center gap-x-2 font-display text-xl text-fg-muted sm:text-2xl">
        <span>{tr.rotatingPrefix}</span>
        <span className="relative inline-flex">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={current.key}
              className="text-gradient font-semibold"
              initial={reduceMotion ? false : { y: 12 }}
              animate={{ y: 0 }}
              exit={reduceMotion ? undefined : { y: -12 }}
              // SPREAD, not passed through. The token is a `readonly` tuple —
              // one definition shared with the studio, which feeds the same
              // numbers to CSS — and a readonly tuple does not assign to the
              // mutable `number[]` the library's easing type wants. Copying it
              // is the honest fix; re-typing the token or writing the four
              // numbers out again are both worse.
              transition={{ duration: 0.42, ease: [...EASE_OUT_EXPO] }}
            >
              {current.name}
            </motion.span>
          </AnimatePresence>
        </span>
        {tr.rotatingSuffix ? <span>{tr.rotatingSuffix}</span> : null}
      </p>

      <p className="mx-auto mt-6 max-w-2xl text-lg text-fg-muted">{tr.lead}</p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href={`/${locale}/signup`}
          className="inline-flex items-center rounded-full bg-gradient-to-br from-iris to-violet px-6 py-3 text-sm font-medium text-white shadow-lg shadow-iris/25 transition-transform hover:scale-[1.02]"
        >
          {tr.ctaPrimary}
        </Link>
        <a
          href="#departments"
          className="surface inline-flex items-center rounded-full px-6 py-3 text-sm text-fg-muted transition-colors hover:text-fg"
        >
          {tr.ctaSecondary}
        </a>
      </div>

      <p className="mt-5 text-xs text-fg-dim">{tr.footnote}</p>
    </section>
  );
}
```

Note the rotating span animates `y` only and never `opacity` — which is what keeps it inside
the "nothing starts invisible" rule that Task 4's assertion enforces on every file in this
directory.

- [ ] **Step 2: Wire it into the shell**

In `src/components/landing/preview/HeroPreview.tsx`:

```tsx
import { HeroV3Continuity } from "@/components/landing/hero/variants/HeroV3Continuity";
```

```tsx
          {variant === "v3" && <HeroV3Continuity locale={locale} />}
```

- [ ] **Step 3: Run the source assertions and both type passes**

```bash
node tests/marketing-model.mjs && npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json
```

Expected: PASS. The directory-reading loop now covers all three variants.

- [ ] **Step 4: Verify in the browser pane, both languages**

`/en/preview/hero/v3` and `/ar/preview/hero/v3`, tab fronted.

- `read_page`: one H1, and the rotating paragraph carries a real department name.
- **Read the rotation from the DOM rather than watching it**: the pane never fires
  `requestAnimationFrame`, so the `AnimatePresence` swap cannot be observed there. Confirm
  instead with `javascript_tool` that the department names present are exactly the eleven and
  that Manufacturing, Assets, Quality and Reports are absent — that is the assertion that
  matters and it is deterministic.
- On `/ar`, confirm the names are Arabic and the line mirrors.

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/hero/variants/HeroV3Continuity.tsx \
  src/components/landing/preview/HeroPreview.tsx
git commit -m "$(cat <<'EOF'
The third hero variant is the control

Closest to the current site, so the other two are judged against something
rather than against nothing.

The rotation is not in the H1. The headline is the same single text node the
other two render, and the rotating department sits beneath it in a paragraph
whose first department is server-rendered as real text — a rotating word
inside an H1 would make the server-rendered headline one arbitrary frame of
an animation.

Eleven names, not the sixteen the current typewriter streams.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: The department marquee, the budget, and the verification pass

**Files:**
- Create: `src/components/landing/hero/DepartmentMarquee.tsx`
- Modify: `src/components/landing/preview/HeroPreview.tsx`
- Modify: `scripts/bundle-baselines.json`

**Interfaces:**
- Consumes: `liveDepartments` (Task 1), `heroCopy` (Task 3).
- Produces: `DepartmentMarquee({ locale }: { locale: string })` — named export, and the DOM
  anchor `id="departments"` that all three variants' secondary CTA points at.

**What it must never say.** The treatment is a marquee of names; the content is honest. It
must never read "integrate with your favourite tools" — there are no integrations, and that
is the same false claim as 180+ connectors in a new coat.

**Why the marquee is CSS rather than `motion/react`.** A continuous scroll is a linear,
infinite transform with no state — exactly what a CSS animation does for free, on the
compositor, without a per-frame JavaScript callback. `prefers-reduced-motion` stops it with a
media query rather than a hook. Using the animation library here would cost bundle and frames
for nothing.

- [ ] **Step 1: Write the marquee**

Create `src/components/landing/hero/DepartmentMarquee.tsx`:

```tsx
"use client";

import { liveDepartments } from "@/shared/marketing/departments";
import { heroCopy } from "@/shared/marketing/hero";

/* ==================================================================
   THE ELEVEN DEPARTMENTS, STREAMING.
   Sits beneath whichever hero variant wins.

   WHAT IT MUST NEVER SAY. The treatment this borrows is an integration
   strip — "connect your favourite tools". There are no integrations,
   and writing that sentence would be 180+ connectors in a new coat.
   What streams past is the eleven departments the product has, named
   from the software's own list.

   CSS, NOT motion/react. A continuous scroll is a linear infinite
   transform with no state: the compositor does it for free, and
   prefers-reduced-motion stops it with a media query rather than a
   hook. The library would cost bundle and frames for nothing.

   THE LIST IS RENDERED TWICE and the track translates by exactly -50%,
   which is what makes the loop seamless. The second copy is
   aria-hidden: a screen reader should hear eleven departments, not
   twenty-two.
================================================================== */

export function DepartmentMarquee({ locale }: { locale: string }) {
  const tr = heroCopy(locale);
  const departments = liveDepartments(locale);

  return (
    <section id="departments" className="relative border-y border-line py-10">
      <p className="mb-6 text-center text-xs tracking-wider text-fg-dim uppercase">
        {tr.marqueeLabel}
      </p>

      {/* The mask fades both ends so names enter and leave rather than being
          clipped. Logical inset so it mirrors with the document direction. */}
      <div
        className="relative overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
        }}
      >
        <div className="marquee-track flex w-max gap-4">
          {[false, true].map((isClone) => (
            <div
              key={String(isClone)}
              className="flex shrink-0 gap-4"
              aria-hidden={isClone || undefined}
            >
              {departments.map((d) => (
                <span
                  key={d.key}
                  className="surface whitespace-nowrap rounded-full px-5 py-2.5 text-sm text-fg-muted"
                >
                  {d.name}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

Add the keyframes to `src/app/globals.css`, beside the existing `@keyframes skel-sweep`:

```css
/* THE DEPARTMENT MARQUEE. Two copies of the list translate by exactly -50%,
   which lands the second copy where the first began — that is what makes the
   loop seamless rather than snapping. Transform only, so it runs on the
   compositor and repaints nothing.

   RTL IS NOT A SEPARATE ANIMATION. The track's own direction reverses with the
   document, so the same negative translation carries names the other way. */
@keyframes marquee-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
.marquee-track {
  animation: marquee-scroll 38s linear infinite;
}
[dir="rtl"] .marquee-track {
  animation-direction: reverse;
}
@media (prefers-reduced-motion: reduce) {
  .marquee-track { animation: none; }
}
```

- [ ] **Step 2: Put it beneath every variant**

In `src/components/landing/preview/HeroPreview.tsx`, add the import and render it once, after
the variant branches, so all three are judged with the same thing beneath them:

```tsx
import { DepartmentMarquee } from "@/components/landing/hero/DepartmentMarquee";
```

```tsx
          {variant === "v1" && <HeroV1Assembly locale={locale} />}
          {variant === "v2" && <HeroV2Scroll locale={locale} />}
          {variant === "v3" && <HeroV3Continuity locale={locale} />}

          {/* Beneath whichever wins. The featured-companies trust band belongs
              here too and is NOT built: it needs the consent toggle, the /super
              curation flag and the public endpoint (sequencing step 5), and the
              spec requires it to degrade to nothing rather than to placeholder
              logos. A logo wall of companies that are not customers says less
              than no logo wall. */}
          <DepartmentMarquee locale={locale} />
```

- [ ] **Step 3: Run the suite and both type passes**

```bash
npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json && npm test
```

Expected: all green.

- [ ] **Step 4: Stage everything, THEN build**

```bash
git add src/components/landing/hero/DepartmentMarquee.tsx \
  src/components/landing/preview/HeroPreview.tsx src/app/globals.css
```

Staged before the build is believed, because `tests/restructure.mjs` shells out to `git grep`,
which searches tracked files only — an untracked new file is invisible to the architectural
assertions, the suite passes locally, and the identical tree fails in CI the moment it is
committed.

- [ ] **Step 5: Build and read the route's real first load**

```bash
npx next build
```

Then read the actual number rather than trusting the largest-chunk gate:

```bash
node -e "const s=require('./.next/diagnostics/route-bundle-stats.json');console.log(JSON.stringify(s,null,1))" | grep -i preview
```

The per-route first-load gate is the one that matters. An **unlisted route is held to
300 KB**, and this route carries all three variants plus `DashboardAssembly` in one chunk —
`next/dynamic` in the route's Server Component would defer the SERVER render and create no
client lazy boundary, so it cannot help here.

**If it is over 300 KB**, the fix is the documented one and not a raised ceiling: create a
**client** module (`src/components/landing/hero/variants/LazyVariants.tsx`, `"use client"`)
that `nextDynamic()`s the three variants, and import the variants from it in `HeroPreview`.
An `import()` inside a client module survives to runtime and creates a real lazy boundary —
this is the same change that took the studio's first load from 962 KB to 679. Re-run the
build and re-read.

- [ ] **Step 6: Record the baseline in this commit**

```bash
node scripts/bundle-budget.mjs --record
git diff scripts/bundle-baselines.json
```

Check the diff adds `"/[locale]/preview/hero/[variant]"` and **changes nothing else**. If any
other route moved, that is a finding to explain before committing, not a number to accept —
baselines are re-recorded deliberately, in the same commit as the routes that change them.

```bash
node scripts/bundle-budget.mjs
```

Expected: green on all three gates.

- [ ] **Step 7: Final verification, both languages, all three variants**

Restart the sandbox and walk all six URLs with the tab fronted:

```bash
npm run dev:sandbox
```

`/{en,ar}/preview/hero/{v1,v2,v3}`. For each:

- `read_page`: exactly one `heading level=1`.
- The marquee lists exactly eleven names and none of them is Manufacturing & Production,
  Assets & Equipment, Quality & HSE, Reports & BI or Tasks. Check with `javascript_tool`
  rather than by eye.
- `read_console_messages`: no errors.
- On `/ar`: the document mirrors, the names are Arabic, and no diacritic appears in the H1.

Then a screenshot of each of the six for the record, and stop the dev server — check nothing
is still holding 3010 before running the suite again.

- [ ] **Step 8: Commit**

```bash
git add src/components/landing/hero/DepartmentMarquee.tsx \
  src/components/landing/preview/HeroPreview.tsx src/app/globals.css \
  scripts/bundle-baselines.json
git commit -m "$(cat <<'EOF'
The eleven departments stream beneath every hero variant

The treatment is an integration strip and the content is not: there are no
integrations, and "connect your favourite tools" would be 180+ connectors in
a new coat. What streams past is the eleven departments the product has,
named from the software's own list.

CSS rather than motion/react — a continuous scroll is a linear infinite
transform with no state, so the compositor does it for free and a media
query stops it under reduced motion. Two copies translating by exactly -50%
is what makes the loop seamless.

The preview route's first load is recorded in this commit, as a baseline
must be.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 9: Push**

```bash
git push -u origin marketing-site-rebuild
```

---

## After this plan

The three variants are running at
`https://www.nompany.com/{en,ar}/preview/hero/{v1,v2,v3}` once the branch is deployed. Pick
one. The commit that adopts a winner:

1. Moves the chosen variant out of `variants/` and into the hero's own place.
2. **Deletes the other two, the preview route, `HeroPreview.tsx`, the `robots.js` disallow
   and the `BARE_PREFIXES` entry if nothing else uses it.** Deleted, not left behind — a
   preview route that outlives the choice is a page nobody meant to publish.
3. Removes the baseline entry for the preview route in the same commit.

Then sequencing step 2 (shared chrome) and step 3 (home, platform, pricing), each with its
own plan.

**Both of the questions this plan originally left open are answered** (spec §12, 07/09/2026),
and the answers are why the copy above reads as it does:

- **The positioning is generalist SMEs, region-wide.** `SEO-PLAN.md` §6.3 argues hard for
  narrowing to Saudi contractors; that is answered no. The construction depth stays a real
  differentiator to name on `/platform`, but it is depth the product has rather than the
  audience it addresses.
- **The Arabic brand name is `نومباني`.** The hero never spells the brand in Arabic, so no
  variant uses it — it lives in `src/shared/marketing/company.ts` for the About page,
  `alternateName` and external profiles.

**Three things this plan does not need but the next ones do**, recorded so they are not
asked again:

- `sales@nompany.com` and `support@nompany.com` are live aliases onto the owner's mailbox and
  both deliver. That gives the contact backend (§6.3, step 4) a real address; whether the 10+
  path is that address, WhatsApp, or the form alone is still open.
- **`src/lib/seo.ts` asserts a Riyadh address and Saudi `areaServed` in `organizationLd`, and
  `localBusinessLd` carries opening hours.** The company is not Saudi and has no address yet
  (spec §12.1), so those are live false claims in machine-readable form — the exact class of
  defect §7.3's register exists to prevent, sitting in the schema rather than the copy. Not
  step 1's to fix, and it should not wait until step 9 by default.
- **The stop rule** (`SEO-PLAN.md` §9.6) is still unwritten, and it has to be written before
  the content cadence starts rather than after the numbers arrive.
