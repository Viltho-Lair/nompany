# Server-rendered first payload — Phase 1 (Tendering) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Tendering register's first payload is composed once, on the server, and handed to the screen as a prop — so a section click costs one HTTP request instead of two.

**Architecture:** Extract the composition that currently lives in the route handler into a named `tendersView(ctx)` that the route and the page both call. The page builds the module context with `tenderingContext(user, slug)` inside its existing `withRequest` scope, where the request cache makes the studio re-resolution free. The screen takes an `initial` prop and skips only its first fetch; `read`/`reload`/`send`/`useLiveUpdates` are untouched.

**Tech Stack:** Next.js 16 App Router (Server Components), React 19, TypeScript, Postgres via the Cloud Run gateway. Tests are plain `node tests/*.mjs` scripts with an `ok(label, cond, extra)` helper.

**Spec:** `docs/superpowers/specs/2026-09-06-server-rendered-first-payload-design.md`

## Global Constraints

Copied verbatim from the spec. Every task's requirements implicitly include these.

- **No golden may be re-recorded for this work. If a golden moves, the refactor is wrong.** `NOMPANY_RECORD_GOLDENS` is never set.
- **Ceiling: 49,152 bytes (48 KiB)** of `JSON.stringify(initial)`, measured with `Buffer.byteLength(json, "utf8")`, never `.length`.
- **Over the ceiling the page passes no `initial`** and the screen falls back to fetch-on-mount. Degrade, never refuse.
- **A view function is called from exactly two places: its route and the page.** A third caller is a second composition path.
- **The view call must stay inside the page's `withRequest` scope** — that is what makes the context builder's studio re-resolution free (`readArr`/`getIndex` read through `cachedRead`, `pgStore.ts:109` and `:496`).
- **The page never throws on a refusal.** A denied read is a value; it renders the screen with an error prop.
- **One screen per commit.** Several agent sessions share this working tree.
- **`git add` only your own files.** Never `git add -A`.
- **`git add` a new file BEFORE believing a green suite** — `tests/restructure.mjs` shells out to `git grep`, which searches tracked files only.
- Verification for every task: `npm test` && `npx tsc --noEmit` && `npx tsc --noEmit -p tsconfig.strict.json` && `npx next build`.
- Run the suite under your own namespace: `NOMPANY_TEST_SESSION=<something-short> npm test`.

---

### Task 1: The RSC payload ceiling

A pure module. No store, no imports, so it can be asserted without fixtures — and so the page can consult it without paying for anything.

**Files:**
- Create: `src/shared/rscPayload.ts`
- Create: `tests/rsc-payload.mjs`
- Modify: `package.json` (add to the `test` script)

**Interfaces:**
- Consumes: nothing.
- Produces: `RSC_PAYLOAD_CEILING_BYTES: number` (49152) and `fitsInRscPayload(value: unknown): boolean`.

- [ ] **Step 1: Write the failing test**

Create `tests/rsc-payload.mjs`:

```js
// THE CEILING ON A SERVER-RENDERED FIRST PAYLOAD, PURELY.
//
// Server-rendering a screen's first payload saves one HTTP request — one round
// trip to Frankfurt, ~75ms — and pays for it in bytes on the RSC stream. At a
// deliberately pessimistic 5 Mbps that round trip buys ~47 KB, so below the
// ceiling the bytes are cheaper than the trip and above it they are not.
//
// scripts/bundle-budget.mjs measures CLIENT JS ONLY and cannot see this, which
// is why the rule lives here and is checked at request time rather than at build
// time: the size depends on the tenant's data, and no fixture proves anything
// about a real tenant.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const R = await import("@/shared/rscPayload");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== the ceiling");

ok("the ceiling is 48 KiB in bytes", R.RSC_PAYLOAD_CEILING_BYTES === 49152,
  String(R.RSC_PAYLOAD_CEILING_BYTES));

const filler = (bytes) => ({ pad: "a".repeat(bytes) });

ok("a small payload fits", R.fitsInRscPayload({ ok: true, tenders: [] }));
ok("a payload under the ceiling fits", R.fitsInRscPayload(filler(40000)));
ok("a payload over the ceiling does not", !R.fitsInRscPayload(filler(60000)));

// EXACTLY AT THE CEILING FITS. An inclusive bound, so the constant names the
// largest payload that is allowed rather than the smallest that is refused —
// otherwise the number in the comment and the number in the code disagree by one.
const exact = JSON.stringify(filler(1)).length; // {"pad":"a"} → measure the wrapper
const padding = R.RSC_PAYLOAD_CEILING_BYTES - (exact - 1);
ok("a payload of exactly the ceiling fits",
  R.fitsInRscPayload(filler(padding))
  && Buffer.byteLength(JSON.stringify(filler(padding)), "utf8") === R.RSC_PAYLOAD_CEILING_BYTES,
  String(Buffer.byteLength(JSON.stringify(filler(padding)), "utf8")));

// BYTES, NOT CHARACTERS, and this is the assertion that proves it. An Arabic
// tenant's rows are multi-byte, so `.length` would let a payload nearly three
// times the ceiling through — the studio is bilingual and this is not a corner.
const arabic = { pad: "م".repeat(30000) }; // 30k chars, 60k bytes in UTF-8
ok("the measure is bytes, not characters",
  !R.fitsInRscPayload(arabic)
  && JSON.stringify(arabic).length < R.RSC_PAYLOAD_CEILING_BYTES,
  `${JSON.stringify(arabic).length} chars, ${Buffer.byteLength(JSON.stringify(arabic), "utf8")} bytes`);

// A VALUE THAT CANNOT BE SERIALISED IS NOT A PAYLOAD. JSON.stringify throws on
// a circular structure; the page must get `false` and fall back, not a crash.
const circular = {};
circular.self = circular;
ok("an unserialisable value does not fit", !R.fitsInRscPayload(circular));

console.log(fails ? `\n${fails} FAILED\n` : "\nall passed\n");
process.exit(fails ? 1 : 0);
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node tests/rsc-payload.mjs
```

Expected: FAIL — `Cannot find module '@/shared/rscPayload'`.

- [ ] **Step 3: Write the minimal implementation**

Create `src/shared/rscPayload.ts`:

```ts
// HOW BIG A SERVER-RENDERED FIRST PAYLOAD IS ALLOWED TO BE.
//
// A screen whose first payload is rendered on the server costs one HTTP request
// fewer — the page composes it and hands it down, instead of the browser
// mounting an empty screen and fetching. That saving is one round trip; the
// price is bytes on the RSC stream.
//
// DERIVED, NOT PICKED. One round trip to Frankfurt is ~75ms, and that is
// conservative because it ignores the dependent waves the API request makes on
// top of it. At a deliberately pessimistic 5 Mbps effective downlink, 75ms
// carries ~47 KB. Below this the bytes are cheaper than the trip; above it they
// are not. RE-DERIVE THIS IF THE FUNCTION REGION MOVES — the whole argument is
// the round trip's cost, and that is a distance.
//
// AND IT IS CHECKED AT REQUEST TIME, not at build time, because the size depends
// on the tenant's data. scripts/bundle-budget.mjs measures CLIENT JS and cannot
// see the RSC stream at all, so without this a screen that renders a 500-row
// list regresses the wire invisibly.
export const RSC_PAYLOAD_CEILING_BYTES = 49_152; // 48 KiB

/**
 * Whether `value` is small enough to hand down as a server-rendered payload.
 *
 * BYTES, NOT CHARACTERS. `String.length` counts UTF-16 code units, so an Arabic
 * tenant's rows — which the studio has by design — would measure at roughly a
 * third of what actually crosses the wire.
 *
 * An unserialisable value is not a payload, so it does not fit. Answering
 * `false` rather than throwing is what lets the caller fall back to
 * fetch-on-mount instead of taking the screen down.
 */
export function fitsInRscPayload(value: unknown): boolean {
  try {
    const json = JSON.stringify(value);
    if (typeof json !== "string") return false;
    return Buffer.byteLength(json, "utf8") <= RSC_PAYLOAD_CEILING_BYTES;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
node tests/rsc-payload.mjs
```

Expected: PASS, `all passed`.

- [ ] **Step 5: Add it to the suite**

In `package.json`, in the `test` script, insert `node tests/rsc-payload.mjs && ` immediately after `node tests/restructure.mjs && `.

- [ ] **Step 6: Verify and commit**

```bash
git add src/shared/rscPayload.ts tests/rsc-payload.mjs package.json
```

Then run the full verification (`NOMPANY_TEST_SESSION=rsc1 npm test`, `npx tsc --noEmit`, `npx tsc --noEmit -p tsconfig.strict.json`, `npx next build`) and commit:

```bash
git commit -m "A server-rendered payload has a size it may not exceed"
```

---

### Task 2: `tendersView` — one composition path

The route currently composes its own body. Move that composition into a named function the route calls, so the page can call the same one. **The route's response body must not change** — that is what the goldens prove.

**Files:**
- Modify: `src/modules/tendering/tenders.ts` (add `tendersView` after `listTenders`)
- Modify: `src/app/api/studios/[slug]/tendering/tenders/route.ts:15-32`
- Modify: `tests/gate-a.mjs:2520` (add the assertion after `shot("tendering.list", list)`)

**Interfaces:**
- Consumes: `listTenders(ctx: TenderingContext)`, `requirePermission(access, key)`, `refused(v)`.
- Produces: `tendersView(ctx: TenderingContext)` returning either the refusal `listTenders` returned, or `{ ok: true, asOf: string, tenders: Tender[], canCreate: boolean, canEdit: boolean, canDelete: boolean }`.

- [ ] **Step 1: Write the failing assertion**

In `tests/gate-a.mjs`, immediately after the line `await shot("tendering.list", list);` (currently line 2520), add:

```js
  // ONE COMPOSITION PATH, ASSERTED FROM BOTH ENDS. The page server-renders this
  // screen's first payload by calling tendersView; the route calls the same
  // function. If the two ever diverge, the screen and the API disagree about a
  // studio's own register — and only one of them has a golden pinning it, so the
  // disagreement would be invisible.
  //
  // `asOf` IS EXCLUDED AND SEPARATELY ASSERTED. It is a clock, and these are two
  // calls, so it differs by construction; comparing it would assert that time
  // does not pass. What matters is that both carry a real one.
  const viaView = await TENDERING.tendersView(await TENDERING.tenderingContext(owner, slug));
  const strip = (o) => { const { asOf, ...rest } = o || {}; return rest; };
  ok("the route's body IS the view function's output",
    JSON.stringify(strip(viaView)) === JSON.stringify(strip(list.body)),
    `${JSON.stringify(strip(viaView)).slice(0, 200)} vs ${JSON.stringify(strip(list.body)).slice(0, 200)}`);
  ok("...and both carry their own clock",
    Number.isFinite(Date.parse(String(viaView.asOf))) && Number.isFinite(Date.parse(String(list.body?.asOf))),
    `${viaView.asOf} / ${list.body?.asOf}`);
```

Before this block will run, `TENDERING` must be imported in `tests/gate-a.mjs`. Find the block where the other `@/modules/...` imports are made and add:

```js
const TENDERING = await import("@/modules/tendering/tenders");
```

`owner` and `slug` are already in scope in this block — `owner` is the identity the surrounding tendering assertions use and `slug` is the fixture studio's. If the local variable holding the owner identity is named differently in that block, use that name; do not introduce a new fixture.

- [ ] **Step 2: Run it to verify it fails**

```bash
NOMPANY_TEST_SESSION=view1 node tests/gate-a.test.mjs
```

Expected: FAIL — `TENDERING.tendersView is not a function`.

Note: a thrown error inside a Gate A block writes its earlier goldens and then stops, so the run can report `0 failures` while having crashed. **Read the exit code and the final `gate A: all passed` line, not the FAIL count.**

- [ ] **Step 3: Write the implementation**

In `src/modules/tendering/tenders.ts`, after `listTenders`, add:

```ts
/**
 * THE REGISTER'S WHOLE PAYLOAD, COMPOSED ONCE.
 *
 * This assembly used to live in the route handler, which was fine while the
 * route was the only thing that produced it. The page server-renders the
 * screen's first payload now, and two copies of "what the register answers"
 * would be two answers free to disagree — with only one of them pinned by a
 * golden, so the disagreement would not be visible until a studio saw it.
 *
 * CALLED FROM EXACTLY TWO PLACES: this module's route, and the studio page. A
 * third caller is how the second composition path comes back.
 */
export async function tendersView(ctx: TenderingContext) {
  const result = await listTenders(ctx);
  if (refused(result)) return result;
  return {
    ok: true as const,
    // THE CLOCK TRAVELS WITH THE ANSWER. Every "days left" on the register is
    // measured from this one instant and the screen never reads its own — so
    // leaving it behind here left `nowMs` at zero and made every deadline read
    // as missed by twenty thousand days.
    asOf: result.asOf,
    tenders: result.tenders,
    // THE RIGHTS TRAVEL WITH THE LIST, so the register draws a control only
    // where the service would accept the request behind it.
    canCreate: !requirePermission(ctx.access, "tendering.tenders.create"),
    canEdit: !requirePermission(ctx.access, "tendering.tenders.edit"),
    canDelete: !requirePermission(ctx.access, "tendering.tenders.delete"),
  };
}
```

**`requirePermission` is already imported** in this file (line 15, from `@/platform/access`). Add nothing for it.

**Do NOT import `refused`.** It lives in `@/platform/http/route`, and a module importing the HTTP layer inverts the dependency this codebase keeps the other way round — services know nothing about routes. Test the refusal structurally instead, which is the same shape `refused` narrows on. So the first two lines of `tendersView` are:

```ts
  const result = await listTenders(ctx);
  // NOT `refused()` — that lives in the HTTP layer, and a service importing a
  // route helper points the dependency backwards. Same shape, asked here.
  if (result && typeof result === "object" && "error" in result) return result;
```

- [ ] **Step 4: Make the route a thin head over it**

In `src/app/api/studios/[slug]/tendering/tenders/route.ts`, replace the whole `GET` export (lines 15-32) with:

```ts
// PERMISSION IS ENFORCED IN THE SERVICE, not here — every function below calls
// requirePermission before touching a row. A route can be added and forgotten;
// the function that does the work cannot be reached around. This layer decides
// HTTP shape and nothing else.
//
// AND THE BODY IS NOT COMPOSED HERE ANY MORE. tendersView owns it, because the
// studio page renders the same payload on the server and two copies of it would
// be free to disagree. See its note in modules/tendering/tenders.ts.
export const GET = route({ ...spec, body: false }, tendersView);
```

Update the import on line 3 to include `tendersView`. Remove `requirePermission` from this file's imports **only if nothing else in the file still uses it** — check before deleting.

- [ ] **Step 5: Run it to verify it passes AND that no golden moved**

```bash
NOMPANY_TEST_SESSION=view1 node tests/gate-a.test.mjs
git status --short tests/goldens/
```

Expected: the new assertions pass, `gate A: all passed`, exit code 0, **and `git status` shows no modified goldens.** If any golden shows as modified, the refactor changed the response body and is wrong — revert and find the difference before continuing.

- [ ] **Step 6: Verify and commit**

Run the full verification, then:

```bash
git add src/modules/tendering/tenders.ts "src/app/api/studios/[slug]/tendering/tenders/route.ts" tests/gate-a.mjs
git commit -m "The register's payload is composed by one function, not by its route"
```

---

### Task 3: The screen accepts a first payload

**Files:**
- Modify: `src/components/studio2/StudioTenders.js:67-95`

**Interfaces:**
- Consumes: nothing new.
- Produces: `StudioTenders` accepts two new optional props — `initial` (the `tendersView` payload, or absent) and `initialError` (a refusal string, or absent).

- [ ] **Step 1: Change the signature and the first-load effect**

Replace the component's opening and its load effect. The current shape is:

```js
export default function StudioTenders({ slug }) {
  const locale = useStudioLocale();
  const tr = tenderingDict(locale);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
```

becomes:

```js
// `initial` IS THE ROUTE'S OWN BODY, composed on the server by tendersView so
// the first paint costs no round trip. Everything below it is unchanged: `read`
// and `reload` still exist, still hit the same route, and are still what a
// mutation and a live update go through. Only the FIRST fetch is skipped.
//
// Absent when the page could not send one — the reader was refused, or the
// payload was over the RSC ceiling. Then this behaves exactly as it always did.
export default function StudioTenders({ slug, initial, initialError = "" }) {
  const locale = useStudioLocale();
  const tr = tenderingDict(locale);
  const [data, setData] = useState(initial ?? null);
  const [error, setError] = useState(initialError);
```

- [ ] **Step 2: Skip the first fetch when a payload arrived**

Replace the existing mount effect:

```js
  useEffect(() => {
    let current = true;
    (async () => {
      const answer = await read();
      if (current) apply(answer);
    })();
    return () => { current = false; };
  }, [read, apply]);
```

with:

```js
  // THE FIRST FETCH IS THE ONE THIS SAVES. With a server payload in hand there
  // is nothing to ask for, and asking anyway would spend the round trip the
  // whole change exists to remove.
  useEffect(() => {
    if (initial) return undefined;
    let current = true;
    (async () => {
      const answer = await read();
      if (current) apply(answer);
    })();
    return () => { current = false; };
  }, [initial, read, apply]);
```

- [ ] **Step 3: Re-read on focus, because `asOf` is a clock**

Immediately after the `useLiveUpdates(slug, reload);` line, add:

```js
  // A SERVER PAYLOAD IS A MOMENT, AND THE ROUTER CACHES IT. Every "days left" on
  // this register is measured from `asOf`, and Next serves an RSC payload from
  // the client router cache on a back-navigation — so without this, returning to
  // the register could show deadlines measured from an instant that has passed.
  // The old fetch-on-mount re-read every time and never had the problem.
  //
  // Bounded to one navigation: coming back to the tab re-reads. Only when a
  // server payload was actually used — a screen that fetched on mount is already
  // as fresh as it ever was.
  useEffect(() => {
    if (!initial) return undefined;
    const onFocus = () => { reload(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [initial, reload]);
```

- [ ] **Step 4: Verify it still works with no payload**

The screen must behave exactly as before when `initial` is absent — that is the fallback path and the path every other studio screen still takes.

```bash
npm run dev:sandbox
```

Open `localhost:3010/sandbox/tendering` and confirm the register loads. **Front the browser tab** — a hidden pane will not take the session cookie. At this point the page is not passing `initial` yet, so this is exercising exactly the fallback.

- [ ] **Step 5: Verify and commit**

Run the full verification, then:

```bash
git add src/components/studio2/StudioTenders.js
git commit -m "The register draws itself from a payload it was handed, when it was handed one"
```

---

### Task 4: The page composes and hands the payload down

**Files:**
- Modify: `src/app/studio/[[...segments]]/page.js` (the import block, and the `screenKey === "tendering"` branch at line 572)

**Interfaces:**
- Consumes: `tenderingContext(user, slug)`, `tendersView(ctx)`, `fitsInRscPayload(value)`, `studioRequest()`.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Add the imports**

At the top of `src/app/studio/[[...segments]]/page.js`, alongside the existing imports:

```js
import { tenderingContext, tendersView } from "@/modules/tendering/tenders";
import { fitsInRscPayload } from "@/shared/rscPayload";
import { log } from "@/platform/http/observability";
```

`log` is the module's public logger (`observability.ts:104`) — `log.info(message, fields?)`. `emit` is internal and is **not** exported; do not reach for it and do not export it.

- [ ] **Step 2: Compose the payload where the branch is chosen**

Inside `renderStudio`, **after** `const context = await studioRequest();` and its refusal handling, and before the JSX, add:

```js
  // THE REGISTER'S FIRST PAYLOAD, COMPOSED HERE RATHER THAN FETCHED BY THE
  // BROWSER. This is the whole of the change: the screen used to mount empty and
  // then ask an API route which re-resolved the user, the studio, the
  // collaborator, the roles and the sections from scratch, because a second HTTP
  // request cannot share a request cache with the first.
  //
  // INSIDE THIS RENDER, DELIBERATELY. tenderingContext resolves the studio
  // itself, and it is free here and nowhere else: readArr and getIndex read
  // through cachedRead, the map holds promises, and withRequestCache is
  // established by the withRequest that wraps this render. Moved outside it,
  // every one of those reads becomes a real round trip again.
  let tendersInitial;
  let tendersError = "";
  if (screenKey === "tendering" && !deniedSection && !boqTenderId) {
    const ctx = await tenderingContext(context.user, studio.slug);
    if (ctx.error) {
      // A REFUSAL IS A VALUE HERE, NOT A THROWN RESPONSE. Throwing would take
      // the whole screen down where the fetch path showed a message.
      tendersError = String(ctx.error);
    } else {
      const payload = await tendersView(ctx);
      if (payload && payload.error) {
        tendersError = String(payload.error);
      } else if (fitsInRscPayload(payload)) {
        tendersInitial = payload;
      } else {
        // OVER THE CEILING: hand down nothing and let the screen fetch, which is
        // what it did before this existed. Logged rather than silent, because a
        // studio that is permanently over the ceiling is permanently paying the
        // round trip and nobody would otherwise know.
        log.info("rsc payload over ceiling", { screen: "tendering", slug: studio.slug });
      }
    }
  }
```

`screenKey`, `deniedSection`, `boqTenderId` and `studio` are all already computed in this function above the JSX. If any is computed *below* where you are inserting, move this block down to sit after all four, not the other way round — the ordering of that chain is load-bearing.

- [ ] **Step 3: Pass it to the screen**

Change line 572 from:

```js
        : screenKey === "tendering" ? <StudioTenders slug={studio.slug} />
```

to:

```js
        : screenKey === "tendering" ? <StudioTenders slug={studio.slug} initial={tendersInitial} initialError={tendersError} />
```

- [ ] **Step 4: Verify the whole path in the sandbox**

```bash
npm run dev:sandbox
```

Open `localhost:3010/sandbox/tendering` with the browser tab **fronted**. Confirm:

1. The register renders its rows.
2. **The network tab shows NO `GET /api/studios/sandbox/tendering/tenders` on first paint.** That is the entire point of the task; if the request is still there, `initial` is not reaching the screen.
3. Creating a tender still works (that path goes through `send` → `reload`, which does fetch).

Neither `tsc` nor `next build` catches a Server Component calling a client hook, so opening the screen is the only check for this task that is worth anything.

- [ ] **Step 5: Verify and commit**

Run the full verification. Confirm again that `git status --short tests/goldens/` is empty. Then:

```bash
git add "src/app/studio/[[...segments]]/page.js"
git commit -m "The tender register arrives with its first page already in it"
```

---

### Task 5: The written record

Two documents are wrong the moment Task 4 lands, and one was already wrong.

**Files:**
- Modify: `docs/functionality/tendering.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Record the behaviour change in the functionality file**

In `docs/functionality/tendering.md`, add a short section stating: the register's first payload is composed on the server by `tendersView` and handed to the screen, so opening it costs one HTTP request rather than two; `asOf` therefore comes from the render rather than from a fetch, and the screen re-reads on window focus because Next serves RSC payloads from the client router cache on a back-navigation. State in its "Not built yet" section that **no other screen is converted**.

- [ ] **Step 2: Correct the golden count in CLAUDE.md**

`CLAUDE.md` states 189 goldens in two places. Measure and correct:

```bash
ls tests/goldens | wc -l
```

Replace both occurrences with the measured number, and keep the surrounding sentence's insistence that these numbers are stated as measured rather than quoted.

- [ ] **Step 3: Add the region note to CLAUDE.md**

The Vercel function region moved from `iad1` to `fra1` on 06/09/2026, in the dashboard, and nothing in this repository records it. Add a line under "Current state" saying so, and that mirroring it into `vercel.json` is outstanding and must be checked on a preview deployment first.

- [ ] **Step 4: Commit**

```bash
git add docs/functionality/tendering.md CLAUDE.md
git commit -m "The register says where its first page comes from, and the counts are measured again"
```

---

## Verification of the whole phase

Before declaring Phase 1 done, all five must hold:

1. `NOMPANY_TEST_SESSION=<yours> npm test` exits 0 and prints `gate A: all passed`.
2. `git status --short tests/goldens/` is **empty**. No golden was re-recorded.
3. `npx tsc --noEmit` and `npx tsc --noEmit -p tsconfig.strict.json` are clean.
4. `npx next build` succeeds and `node scripts/bundle-budget.mjs` is within both ceilings.
5. In the sandbox, opening `/sandbox/tendering` makes **no** `GET .../tendering/tenders` request on first paint, and creating a tender still works.

**Then re-measure.** Open the studio on the live site, click into Tendering, and record the wall-clock time and the `request finished` line's `ms` and `pgDocuments`. That number decides whether Phase 2 happens at all — the spec says so explicitly, and it is the point of doing one screen first.
