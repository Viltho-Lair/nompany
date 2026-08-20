# nompany

Multi-tenant ERP. Each customer is a **studio**, reached by slug at the apex
domain (`nompany.com/<slug>`), with nine departmental modules behind one
permission model.

- **Framework:** Next.js 16 (App Router, Turbopack) · React 19
- **Storage:** Redis — the ownership tree *is* the key tree, so a cascade delete
  is a prefix delete
- **Styling:** Tailwind CSS 3 · shadcn/ui · MUI
- **Hosting:** Vercel

Marketing lives in a separate repo and is served from `www`; this app serves no
public marketing pages.

## Getting started

```bash
npm install
```

```bash
npm run dev
```

`REDIS_URL` and `FIELD_ENCRYPTION_KEY` must be set in `.env.local`. **The
development `REDIS_URL` points at a live, shared instance — there is no separate
dev database.** Read `CLAUDE.md` before running anything that writes.

## Modules

`Sales · Projects · Technical · Finance · Inventory · Operations · HR ·
Tasks · Quality`

Plus identity (users, studios, collaborators) and a separate `/super` console
that runs on its own registry and cookie, outside every cascade.

## Three identities

They are genuinely distinct and never interchangeable:

| Identity | Cookie | Notes |
| --- | --- | --- |
| User | `nc_sid` | A person, global to the product |
| Collaborator | — | Studio-local; `CollaboratorID` ≠ `UserID` |
| SuperAdmin | `nom_super` | Separate registry, outside every cascade |

Membership authorises; the URL never does. "Not found" and "not a member"
render identically on purpose.

## Tests

```bash
npm test
```

Three suites, all of which CI enforces:

- `tests/access.test.js` — every guarded write is guarded (source scan)
- `tests/integration.test.mjs` — behaviour across modules
- `tests/gate-a.mjs` — **the parity contract**: golden responses, the
  permission matrix, Redis hop counts, and architectural assertions

Gate A exists so the refactor waves can claim exact functional parity and have
it checked rather than asserted. Re-recording goldens
(`NOMPANY_RECORD_GOLDENS=1`) is a deliberate act that belongs in its own commit
with a stated reason.

Every suite namespaces its keys under `NOMPANY_KEY_PREFIX` and sweeps on both
entry and exit. Never call `sweepOrphans()` from a test.

## Docs

`docs/` carries the architecture audit and the refactor plan — start with
[`docs/README.md`](docs/README.md). `CLAUDE.md` holds the invariants that must
survive any rewrite.

## Production build

```bash
npm run build
```
