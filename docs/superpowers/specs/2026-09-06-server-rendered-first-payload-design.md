# Server-rendered first payload — design

**Date:** 2026-09-06
**Status:** approved for implementation, Tendering first
**Origin:** a section click measured at 5.88s.

---

## The defect

A section click is TWO HTTP requests, strictly serialized, and the second cannot
begin until the first has painted:

1. The RSC render resolves the studio (`studioRequest`) and renders an **empty**
   screen.
2. The screen's chunk downloads, React mounts it, and its `useEffect` fires
   `fetch('/api/studios/<slug>/…')`.
3. That route resolves the user, the studio, the collaborator, the roles and the
   sections **again** — from scratch, because it is a different HTTP request and
   therefore a different process, a different `withRequest` scope and a different
   request cache — and only then reads the data.

Nothing is shared between them, and no mechanism can share it. `cache()` in
`_shell.js` spans a layout and its page within ONE render pass; `withRequestCache`
spans one `withRequest` call. Neither spans two HTTP requests.

| | HTTP requests | Dependent round trips |
|---|---|---|
| Today | 2 | ~9 |
| After the wave collapse (separate change) | 2 | ~5 |
| After this design | **1** | **~3** |

## What this is not

Two other fixes came out of the same investigation and are NOT this design:

- **The function region.** Vercel functions defaulted to `iad1` (Washington DC)
  while Cloud SQL and the gateway are `me-central1`. Moved to `fra1` (Frankfurt)
  on 06/09/2026 in the Vercel dashboard, taking every round trip from ~200-250ms
  to ~75ms. **The setting lives only in the dashboard and is invisible to this
  repository.** Mirroring it into `vercel.json` is outstanding and must be
  verified on a preview deployment first — a Hobby plan has previously rejected
  an entire deployment over `vercel.json` config.
- **The wave collapse.** `studioRequest` makes 4 dependent waves where 2 suffice:
  `getStudioBySlug` depends on nothing from the session read but is awaited after
  it. Separate change; this design assumes it but does not require it.

This design removes the SECOND REQUEST. It is orthogonal to both.

---

## The load-bearing fact

`readArr` and `getIndex` both read through `cachedRead` (`pgStore.ts:109`,
`pgStore.ts:496`), the cache map holds **promises** rather than values so
concurrent duplicates collapse to one command, and `withRequestCache` is
established by `withRequest`, which wraps the page render.

**Therefore the page may call `studioRequest()` and then a module's own context
builder inside the same render, and the builder's re-resolution of the studio
costs ZERO extra round trips.** Every key it touches is already in the map.

Without this the design would not net out positive, because `moduleContext`
(`modules/context.ts:151`) calls `studioContext` itself. It is the single fact
the whole thing rests on, and it is why the view call must never be moved outside
the `withRequest` scope.

---

## The design

### 1. View functions

The composition currently lives in the ROUTE HANDLER, not the service. 16 of the
40 studio GET routes assemble their response body on top of the service result —
`listTenders` returns `{ asOf, tenders }` and the route adds `ok`, `canCreate`,
`canEdit`, `canDelete`.

Server-rendering the same body means extracting that assembly into ONE named
function per screen, called by the route and by the page:

```ts
// modules/tendering/tenders.ts
export async function tendersView(ctx: TenderingContext) {
  const result = await listTenders(ctx);
  if (refused(result)) return result;
  return {
    ok: true, asOf: result.asOf, tenders: result.tenders,
    canCreate: !requirePermission(ctx.access, "tendering.tenders.create"),
    canEdit:   !requirePermission(ctx.access, "tendering.tenders.edit"),
    canDelete: !requirePermission(ctx.access, "tendering.tenders.delete"),
  };
}
```

The route becomes a thin HTTP head over it. This is the direction `route.ts`
already argues for — permission in the service, HTTP shape in the route — and is
not a new pattern.

**A view function is called from exactly two places: its route and the page.** A
third caller is how a second composition path is born.

### 2. The screen takes `initial`

Every screen has the same shape today. `data` IS the route's whole response body:

```js
const [data, setData] = useState(initial ?? null);
useEffect(() => { if (initial) return; read().then(apply); }, [initial, read, apply]);
```

`read`, `reload`, `send` and `useLiveUpdates` are UNTOUCHED — only the first
fetch is skipped. Mutations and live updates keep working exactly as they do,
which is what keeps this a three-line change per screen.

### 3. The manifest, split by purity rather than by module

Modules own their own entries; there is no central file everyone edits. But the
cut is **by purity, not by module**, because a client component must be able to
read the metadata half without dragging twelve modules' Postgres-importing
service code into the client graph. `platform/db` deliberately has no barrel for
exactly this reason, and `platform/access` has one precisely because it is pure.

Two manifests:

- **Client-safe** — `{ key, navLabel, icon }`. Pure values. A client component
  may import it.
- **Server-only** — `{ build, view }` or `{ build, Component }`. Guarded with the
  `server-only` package, so a client import fails at BUILD time rather than
  surfacing at runtime.

An entry holds **either** a `view` (the page awaits it and passes `initial`)
**or** a `Component` (a Server Component the page renders, for a screen that
wants to stream a slow list under Suspense rather than block). A discriminated
union, and an assertion that **exactly one** is present — neither is a screen
that silently renders nothing.

### 4. What the manifest does NOT drive

**Not the sidebar.** It is already database-driven:
`visibleSections(studio, collaborator, allSections, access)` reads per-tenant
section rows, and a tenant's typed section names are data that is never
translated. The manifest supplies nav DEFAULTS and icons; it cannot supply the
nav.

**Not the permission catalogue.** The catalogue and "which sections have screens"
are two INDEPENDENT lists, and `testNoAreaExistsForASectionWithNoScreen` exists
to compare them. If rights were defined by manifest entries there would be no
second list to compare, and invariant 16 — *a right nothing can exercise is a
bug* — would become unfalsifiable rather than satisfied. **The redundancy is
load-bearing.** Considered and deliberately declined, 06/09/2026.

### 5. The dispatch is normalised, and the URL does not move

The page's screen dispatch is not a switch. It is a precedence-ordered ternary
chain mixing `screenKey`, `active?.key` and record ids, and the ordering is
load-bearing: `crm-sales-quotations` and `crm-sales-pipeline` must precede
`screenKey === "crm-sales"` or they silently render the department dashboard —
which the file's own comments identify as how a right ends up exercising nothing.

A manifest keyed independently of that chain would be a second copy of the
precedence rules, free to disagree with the first. So the chain is normalised:
**one function returns a named screen id, used by BOTH the render chain and the
manifest lookup.** The precedence lives in one place.

**The URL structure does not change.** A studio's address is its slug —
`nompany.com/<slug>/<section-key>`, rewritten by `src/proxy.js` — and a section
key is a single flat token (`crm-sales-pipeline`, `tendering-rates`), not
`module/screen`. A `[module]/[screen]` route was considered and declined
06/09/2026: it would change every URL in the product, and `/people` and `/access`
are already aliased in `requestedKey` because delivered notifications link to
them and cannot be rewritten. Per-route caching, its other stated benefit, is
unavailable here — the studio page is `force-dynamic` and must be, since
membership authorises and a cached studio page is a cross-tenant leak. Screens
are already code-split with `nextDynamic()`.

---

## The RSC payload ceiling

The data now ships in the RSC stream. `scripts/bundle-budget.mjs` measures
CLIENT JS ONLY and will not see it, so without a rule a screen that
server-renders a 500-row list regresses the wire invisibly.

**Ceiling: 49,152 bytes (48 KiB) of `JSON.stringify(initial)`, uncompressed, per
screen.** Stated in bytes rather than "48 KB" because the two readings differ by
1,152 bytes and an implementer should not have to guess which. The measure is
`Buffer.byteLength(JSON.stringify(initial), "utf8")`, not `.length` — a string's
length is characters, and an Arabic tenant's rows are multi-byte.

Derived rather than picked. Server-rendering saves one HTTP request — one round
trip to Frankfurt, ~75ms, and that is conservative because it ignores the API
request's own dependent waves. At a deliberately pessimistic 5 Mbps effective
downlink, 75ms carries ~47 KB. Below that the bytes are cheaper than the round
trip; above it they are not.

**Measured uncompressed, deliberately.** The compression ratio is data-dependent,
and a rule requiring the payload to be compressed to evaluate cannot be evaluated
at request time — which is where it must be evaluated, because the size depends
on the tenant's data and no fixture proves anything about a real tenant. The
largest golden today is 20 KB (`projects.direct.list.populated`), so every
current fixture fits with headroom; the ceiling binds on real tenants, which is
the point.

**Over the ceiling the page passes no `initial` and the screen falls back to
fetch-on-mount.** Degrading rather than refusing: a tenant with 5,000 rows gets
today's behaviour, not a broken screen. The fallback is LOGGED through
`observability.emit`, so a tenant repeatedly exceeding it is visible rather than
silently slow.

The ceiling is re-derived if the function region changes, and the derivation is
stated in the code beside the constant.

---

## Traps, and the rule for each

**1. `asOf` and the client router cache.** The service stamps `asOf: now()`, and
every "days left" on the register is measured from it. Next caches RSC payloads
client-side, so a back-navigation can replay a stale instant where today's fetch
always re-reads.

*Rule:* first paint uses the server payload; the screen re-reads when the tab
regains focus. Staleness is bounded to one navigation and the latency win is
kept. A real behaviour change, recorded in `docs/functionality/tendering.md` in
the same commit.

**2. Refusals are values, not fetch failures.** Server-side a denied read is
`refused(result)`, not a non-ok response.

*Rule:* the page renders the screen WITH an error prop. It never throws — a
throw takes out the whole screen where today it shows a message.

**3. Multi-endpoint screens.** `StudioPeople` fetches six endpoints.

*Rule:* only the PRIMARY list is server-rendered; the rest stay on
fetch-on-mount. Six payloads in one RSC stream trades the round trip back for
bytes and would blow the ceiling anyway.

**4. Record pages.** Customer 360, project costs and BOQ take an id from the
second segment.

*Rule:* the view function takes `(ctx, id)`. Same pattern, one more argument.

**5. A half-converted tree.** Several agent sessions share this working tree.

*Rule:* one screen per commit, each independently green. Never a commit that
converts several.

**6. `nav` IS A MAP, NOT AN ARRAY — and this trap is created BY this design.**
`sectionNav` returns `{ [sectionKey]: boolean }`: a visibility map carrying no
section names at all. `.map` or `.flatMap` on it throws during render and the
screen fails to load — and `tsc`, strict `tsc`, `next build`, the goldens and the
full suite are all green over it, because none of them render a component. A
neighbouring session shipped exactly that to production on 06/09/2026.

Every EXISTING call site is bracket access (`nav?.["tendering-register"]`), which
is immune. The hazard is new composition, which is precisely what this design
introduces — nineteen more screens, each a fresh opportunity to reach for
`Object.entries(nav).map(...)`. Carry the mistake across the fan-out and it is
carried nineteen times.

*Rule:* a view function passes `nav` through untouched or not at all, and never
iterates it. **If a screen needs section NAMES they come from the section rows**,
which is the only correct source anyway — a studio renames its sections, and the
map has never held a name. Phase 2's manifest work adds a source-level assertion
that no view function iterates `nav`.

---

## Testing

**The golden invariant is the whole regression suite, for free.** If the
composition merely MOVES into a view function, the route's response body is
byte-identical.

> **No golden may be re-recorded for this work. If a golden moves, the refactor
> is wrong.**

**THAT RULE IS ONLY SOUND OVER THE GOLDENS THIS WORK OWNS, and stating it without
that qualifier nearly caused a correct refactor to be reverted.** Gate A runs against
a SHARED fixture studio, and several agent sessions work this repository at once — so
another session's legitimate change moves goldens in the same run. The scope is
`tendering.*` and `owner.*`; a movement anywhere else is somebody else's feature and
must be checked with them rather than treated as evidence about this one. A pass
condition that cannot tell whose change moved what is not a pass condition.

**And confirm WHICH response a golden pins before trusting it.** A golden over a
WRITE returns the stored record; a list or page renders from a decorated row, a
different code path with different fields. A neighbouring session added fields to a
list row that no golden covered and got a green "nothing moved" that meant "nothing
was watching". Checked here: `tests/goldens/tendering.list.json` pins the GET —
`ok`, `asOf`, `tenders`, `canCreate`, `canEdit`, `canDelete` — which is exactly what
`tendersView` composes, so the payload the page server-renders is pinned rather than
merely adjacent to something that is.

There are **242 goldens** as measured today (`ls tests/goldens | wc -l`).
`CLAUDE.md` says 189 and is stale; correcting it is part of the first commit,
because a pass condition quoted from memory is a pass condition nobody can check.

Beyond that:

- **Hop counting.** Gate A already counts round trips per request. A converted
  screen's page render gains the data read and loses nothing; the API route it
  replaces stops being called on first paint.
- **The ceiling.** A unit test over the pure size check — under, over, and
  exactly at 48 KB — plus an assertion that the over case yields no `initial`.
- **Manifest coverage** (phase 2 onward): every screen id the normaliser can
  return has a manifest entry or is explicitly declared as having none, read from
  the real list rather than a hand-typed copy.
- **Exactly-one-of.** Every server manifest entry has a `view` or a `Component`,
  never both and never neither.
- **Open the screen.** Neither `tsc` nor `next build` catches a Server Component
  calling a client hook, and this design moves work across that boundary.
  `npm run dev:sandbox` is the check.

---

## Phasing

| Phase | Scope | Exit |
|---|---|---|
| 1 | **Tendering only.** `tendersView`, page wiring, `initial` prop, the ceiling and its test | a section click re-measured against Frankfurt; goldens unmoved |
| 2 | **Extract `useInitialPayload`** (see below); normalise the dispatch into a named screen id; add the two manifests and their assertions | `restructure.mjs` green with zero further screens converted |
| 3 | Fan out, one screen per commit | every screen converted or explicitly declared as not |

### Phase 2 gained a prerequisite, and it was found by measuring

**Task 3 cost 1 KB of client JS.** Measured 06/09/2026: 1643 KB against the 1644 ceiling, largest
chunk unmoved at 158 KB. One kilobyte is nothing — **and twenty screens is nineteen more than
fits.**

The cause is duplication I wrote without noticing: every converted screen carries its own copy
of the `if (initial) return` guard and the focus-reload effect. The house rule is explicit about
this — when you copy a block into a second place, extract it instead.

**So the fan-out does not start until `useInitialPayload(initial, reload)` exists**, shipped
once, leaving the per-screen cost at roughly a prop name. That is not only a size argument: the
`asOf` staleness rule currently lives in a comment block inside one screen, and re-implementing
it nineteen times is nineteen chances to get "only when a server payload was actually used"
subtly wrong. One hook, one rule, one place to fix it.

Deliberately NOT extracted in Phase 1. One caller is not a pattern, and extracting on
speculation is how an abstraction ends up shaped for a case that never arrives. Two would have
been the moment; the measurement simply says the moment comes before the third.

**Phase 1 gates phase 2.** Tendering needs no manifest — `screenKey === "tendering"`
is one clean branch — which is why it goes first: it proves the seam before
nineteen screens depend on it. If the re-measurement after Frankfurt shows a
section click already under a second, phases 2 and 3 are re-argued rather than
assumed; this design would then be buying a smaller win than it costs, and the
honest answer is to stop having spent one screen.

---

## Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **Nothing is converted.** This is a design; no view function exists.
- **The dispatch is not normalised**, so there is no manifest and no coverage
  assertion.
- **`vercel.json` does not pin the region.** Frankfurt lives only in the Vercel
  dashboard.
- **`findUserBySession` still reads the whole users registry** on every
  authenticated request. Deliberately out of scope: it is payload, not a round
  trip, and fixing it needs a key-layout change and a migration.
- **Cloud Run still scales to zero.** Whether a cold start is part of the
  measured latency is unverified; Cloud Run's own metrics answer it, and no
  `--min-instances` is bought until they do.
