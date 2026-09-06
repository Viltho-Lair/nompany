# nompany

Multi-tenant ERP. Each customer is a **studio**, reached by slug at the apex
domain (`nompany.com/<slug>`), with **fifteen sections** behind one permission
model.

- **Framework:** Next.js 16 (App Router, Turbopack) · React 19
- **Storage:** Postgres — Cloud SQL for PostgreSQL 18. Vercel cannot reach it
  directly, so every query goes through the Cloud Run gateway in
  `services/pg-gateway/` (`PG_TRANSPORT=gateway`). Redis is gone: the package is
  uninstalled and no file imports it.
- **Styling:** Tailwind CSS 3 · shadcn/ui · MUI v9
- **Hosting:** Vercel

## Three surfaces, one app

| Surface | Path | Served by |
| --- | --- | --- |
| The tenant ERP | `nompany.com/<slug>/…` | `src/proxy.js` rewrites to `src/app/studio` |
| Marketing, legal and account pages | `/{en,ar}/…` | `src/app/[locale]` |
| nompany's own console | `/super` | `src/app/super`, its own registry and cookie |

## Getting started

```bash
npm install
```

`DATABASE_URL` and `FIELD_ENCRYPTION_KEY` must be set in `.env.local`. **The
development `DATABASE_URL` points at a live, shared Cloud SQL instance — there is
no separate dev database.** Read `CLAUDE.md` before running anything that writes.

For a throwaway tenant to click around in, use the sandbox rather than `npm run
dev` — it sets `NOMPANY_KEY_PREFIX` before Next starts, seeds one account and one
studio, and prints the login:

```bash
npm run dev:sandbox
```

```bash
npm run dev:sandbox:clean
```

`npm run dev` has no prefix and therefore *is* production.

## Sections

Fifteen, the blueprint's: CRM & Sales · Tendering & Estimating · Projects ·
Engineering & Documents · Procurement & Subcontracting · Inventory & Warehouse ·
Manufacturing & Production · Field Operations & Service · Logistics & Fleet ·
Assets & Equipment · Quality & HSE · Human Resources · Finance & Accounting ·
Reports & BI · Administration & Settings.

Plus Main (the home surface) and Tasks (a cross-cutting control), which are not
sections. Four sections are declared and render nothing yet — Manufacturing,
Assets, Reports and Quality & HSE — and are listed in `NO_SCREEN_YET`.

## Three identities

They are genuinely distinct and never interchangeable:

| Identity | Cookie | Notes |
| --- | --- | --- |
| User | `nc_sid` | A person, global to the product |
| Collaborator | — | Studio-local; `CollaboratorID` ≠ `UserID` |
| SuperAdmin | `nc_super` | Separate registry, outside every cascade |

Membership authorises; the URL never does. A slug is a **public address** —
`requestJoinByCode` exists so somebody can type one they were told — so 403 and
404 are not interchangeable and existence is discoverable by design. What a
non-member learns is nothing about the **contents**: not a row, not a name, not a
count, not a section.

## Tests

```bash
npm test
```

That runs the model tests, the architectural assertions, the integration suite
and Gate A in one chain. The ones worth knowing by name:

- `tests/access.test.mjs` — every guarded write is guarded (source scan)
- `tests/restructure.mjs` — architectural assertions, via `git grep` over
  **tracked** files, so `git add` a new file before believing a green run
- `tests/integration.test.mjs` — behaviour across modules
- `tests/gate-a.test.mjs` — **the parity contract**: 257 golden responses, the
  159-key permission matrix, database hop counts

Gate A exists so the refactor waves can claim exact functional parity and have it
checked rather than asserted. Re-recording goldens (`NOMPANY_RECORD_GOLDENS=1`)
is a deliberate act that belongs in its own commit with a stated reason; it is
never set in CI.

Every suite namespaces its keys under `NOMPANY_KEY_PREFIX` and sweeps on both
entry and exit. **The prefix does not protect `collection_rows`** — see
`CLAUDE.md`'s Postgres section. Never call `sweepOrphans()` from a test.

Two runs cannot share a namespace; `tests/exclusive.mjs` refuses the second and
names the PID holding it. Rerun under your own:

```bash
NOMPANY_TEST_SESSION=<something-short> npm test
```

Not in `npm test`, run separately or by CI:

```bash
npm run test:parity
```

```bash
npm run test:gateway
```

## Verification

CI (`.github/workflows/ci.yml`) runs all of this on every push to `main` and
every pull request:

```bash
npx tsc --noEmit
```

```bash
npx tsc --noEmit -p tsconfig.strict.json
```

```bash
npm run lint:budget
```

```bash
npx next build
```

```bash
node scripts/bundle-budget.mjs
```

## Docs

`docs/functionality/` is **one file per system functionality** — read the one you
need rather than the folder. `docs/` also carries the architecture audit and the
wave plan; start with [`docs/README.md`](docs/README.md). `CLAUDE.md` holds the
invariants that must survive any rewrite.

## Production build

```bash
npm run build
```
