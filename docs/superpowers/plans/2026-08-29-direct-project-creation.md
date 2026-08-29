# Direct Project Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A project can be created directly — client, job and figures typed by hand — alongside today's "open from an approved quotation" path, and it joins the engagement layer as a deal of its own.

**Architecture:** `openProject` splits its *head*, not its body: two resolution functions return one `ProjectSource` shape, and the row write, the sheets, the engagement attach and the manager notification below them cannot tell which one ran. A quotation-less project mints its own engagement at `deterministicEngId("project", id)`, exactly as an internal quotation does one stage up, and `buildEngagements` gains the matching branch so the reconciler rebuilds what the live path writes.

**Tech Stack:** Next.js 16 · React 19 · TypeScript (`src/modules`, `src/platform`) · JavaScript (`src/components/studio2`) · Redis via `src/platform/db` · Tailwind v3 + shadcn + MUI Data Grid · node:assert test suites run by plain Node.

**Spec:** `docs/superpowers/specs/2026-08-29-direct-project-creation-design.md`

**Branch:** `direct-project-creation` (already created, off `main` at the spec commit).

## Global Constraints

- **Keys only from `src/platform/db/keys.ts`.** Never a literal, never a template at a call site. `deterministicEngId` is re-exported from there; import it from `@/platform/db/keys`, never from `./engagementId`.
- **Siblings import each other relatively** (`./keys`, `./store`), never through the `@/` alias. Cross-folder imports use the alias.
- **`platform/db` has no barrel.** Import the exact module.
- **Writes go through `editArr`/`editJSON`** (compare-and-set). Nothing in this plan writes a whole collection.
- **Default deny.** A direct create is `projects.list.create` — the right that already exists. **No new permission key is added by this plan.**
- **Goldens are the contract.** A changed response body is wrong until deliberately re-recorded, in **its own commit**, with the reason stated. `NOMPANY_RECORD_GOLDENS=1` is a local act only; it is never set in CI.
- **Hop counts are part of the contract.** The direct branch must not add a second Clients read on top of the one `ticketFacts` already performs.
- **Commit subjects are declarative sentences** describing the state after the change ("A project can be created without a quotation"), never conventional-commit prefixes. End every commit message with the `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` trailer.
- **Comments explain why**, especially where the obvious approach is wrong. When you change commented code, update the reason rather than deleting it.
- **Copy is bilingual.** Every new user-facing string gets an entry in the type, the EN dictionary and the AR dictionary of `src/shared/studio/projects.ts`. Client names, industries and site names are **data** and are never translated.
- **Logical properties only** in new markup (`ps-`/`pe-`/`ms-`/`me-`), never `pl-`/`pr-`.
- **Never** `FLUSHDB`, `FLUSHALL`, `sweepOrphans()`, or a broad-prefix delete. `REDIS_URL` is live and shared; the suites run under `NOMPANY_KEY_PREFIX`.
- **Verification after every task:** `npm test`, `npx tsc --noEmit`, `npx tsc --noEmit -p tsconfig.strict.json`. `npx next build` before the final commit.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `src/platform/engagement/backfill.ts` | Add the orphan-**project** clustering branch. Pure; no Redis. | 1 |
| `src/platform/db/engagement.ts` | `attachProjectEngagement`; third `projectId` fallback in `engagementIdForLineage`. | 1 |
| `tests/engagement-oncreate.mjs` | Two new assertions: the live attach, and the reconciler agreeing with it. | 1 |
| `tests/suite.mjs` | Register the new test functions; add the direct-create integration block. | 1, 2 |
| `src/modules/projects/projects.ts` | Split `openProject` into two heads + one shared body; `listProjectClients` gains `locations`. | 2, 4 |
| `tests/gate-a.mjs` | Four new goldens for the direct path. | 2 |
| `src/modules/inventory/inventory.ts` | `ensureSheetsExist` stops skipping quotation-less projects. | 3 |
| `src/components/studio2/StudioSheetViewer.js` | Distinguish "no quotation behind this project" from "the quotation has no priced lines". | 3 |
| `src/app/api/studios/[slug]/projects/route.ts` | `vocabulary.industries` and `studioDefaults` on the GET. | 4 |
| `src/components/studio2/StudioProjects.js` | The two-mode **New project** dialog. | 5 |
| `src/shared/studio/projects.ts` | New copy keys, EN + AR. | 3, 5 |

---

### Task 1: A project can root its own engagement

The spine change, first and alone, because Task 2 depends on it and because it is the half that fails silently. `engagementIdForLineage` returns `""` for a project with no ticket and no quotation, so without this a directly-created project joins **no deal at all**.

**Files:**
- Modify: `src/platform/engagement/backfill.ts` (append a third loop before `return out;`, ~line 128)
- Modify: `src/platform/db/engagement.ts:169-184` (the `EngagementLineage` type and `engagementIdForLineage`), and append `attachProjectEngagement` beside `attachQuotationEngagement` (~line 432)
- Modify: `src/modules/projects/projects.ts` (`removeProject`, the `engagementIdFor` call ~line 535)
- Test: `tests/engagement-oncreate.mjs`, registered in `tests/suite.mjs:133` and `tests/suite.mjs:4323`

**Interfaces:**
- Consumes: `buildEngagements(c: Record<string, Record<string, unknown>[]>): EngagementDescriptor[]`, `applyDescriptor(studioId, d)`, `deterministicEngId(kind: string, id: string): string`.
- Produces:
  - `attachProjectEngagement(studioId: string, project: Record<string, unknown>, client: Record<string, unknown> | null): Promise<string>` — returns the `engId`. Task 2 calls this.
  - `EngagementLineage` gains an optional `projectId?: unknown`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/engagement-oncreate.mjs`. Add `attachProjectEngagement` to the existing import from `../src/platform/db/engagement.ts`, and add a new import of `buildEngagements`:

```js
import { buildEngagements } from "../src/platform/engagement/backfill.ts";
```

```js
// A PROJECT RAISED DIRECTLY ROOTS ITS OWN DEAL. No ticket and no quotation
// means engagementIdForLineage answers "" — so without a root of its own this
// project joins nothing, and the stage registry's `unassignable: false` says a
// project is never supposed to be loose.
export async function testDirectProjectMintsItsOwnEngagement() {
  const sid = `s_${Date.now().toString(36)}d`;
  const project = {
    id: "prj_direct1", ticketId: "", quotationId: "", clientId: "c9",
    clientName: "", title: "Warehouse fit-out", number: "",
    createdAt: "2026-08-29T00:00:00.000Z",
  };
  const client = { id: "c9", name: "Northwind", industry: "Logistics" };
  const engId = await attachProjectEngagement(sid, project, client);
  assert.equal(engId, deterministicEngId("project", "prj_direct1"),
    "a direct project's engagement id is deterministic off the project");
  const view = await readEngagementView(sid, engId);
  assert.equal(view.singletons.project, "prj_direct1");
  assert.equal(view.singletons.ticket, null, "nothing invents a ticket");
  assert.equal(view.context.clientName, "Northwind",
    "the LIVE Client row names the deal, not the project's own copy");
  assert.equal(view.context.industry, "Logistics",
    "industry is the client's fact and is read off the client row");
}

// THE RECONCILER MUST REBUILD WHAT THE LIVE PATH WROTE. A live attach with no
// matching backfill branch is a root the next pass silently drops — the exact
// shape of the internal-quotation defect, one stage further down.
export function testBackfillClustersOrphanProjects() {
  const [d] = buildEngagements({
    projects: [{
      id: "prj_direct1", ticketId: "", quotationId: "", clientId: "c9",
      clientName: "", title: "Warehouse fit-out", number: "",
      createdAt: "2026-08-29T00:00:00.000Z",
    }],
    salesClients: [{ id: "c9", name: "Northwind", industry: "Logistics" }],
  });
  assert.equal(d.engId, deterministicEngId("project", "prj_direct1"));
  assert.equal(d.singletons.project, "prj_direct1");
  assert.equal(d.singletons.ticket, null);
  assert.equal(d.context.clientName, "Northwind");
  assert.equal(d.context.createdAt, "2026-08-29T00:00:00.000Z",
    "the deal is dated when the project was raised, not when the root was written");
}

// A PROJECT BEHIND A TICKET OR A QUOTATION STILL BELONGS TO THAT DEAL. This is
// the regression guard on the new branch: widen its condition by one field and
// every project in the product suddenly roots a second engagement of its own.
export function testBackfillLeavesLineagedProjectsAlone() {
  const withTicket = buildEngagements({ projects: [{ id: "prj_2", ticketId: "tk_1", quotationId: "quo_1" }] });
  assert.equal(withTicket.length, 0, "a project behind a ticket roots no engagement of its own");
  const withQuote = buildEngagements({ projects: [{ id: "prj_3", ticketId: "", quotationId: "quo_2" }] });
  assert.equal(withQuote.length, 0, "nor does one behind an internal quotation");
}
```

Add all three to the standalone runner at the bottom of that file:

```js
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    for (const t of [
      testAttachTicketEngagement,
      testDirectProjectMintsItsOwnEngagement,
      testBackfillClustersOrphanProjects,
      testBackfillLeavesLineagedProjectsAlone,
    ]) { await t(); console.log(`ok ${t.name}`); }
  })().catch((e) => { console.error(e); process.exit(1); });
}
```

Then register them in the suite. In `tests/suite.mjs:133` widen the import:

```js
import {
  testAttachTicketEngagement,
  testDirectProjectMintsItsOwnEngagement,
  testBackfillClustersOrphanProjects,
  testBackfillLeavesLineagedProjectsAlone,
} from "./engagement-oncreate.mjs";
```

and at `tests/suite.mjs:4323` widen the loop:

```js
  for (const t of [
    testAttachTicketEngagement,
    testDirectProjectMintsItsOwnEngagement,
    testBackfillClustersOrphanProjects,
    testBackfillLeavesLineagedProjectsAlone,
  ]) {
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:integration`
Expected: FAIL — `testDirectProjectMintsItsOwnEngagement` reports `attachProjectEngagement is not a function`, and the two `buildEngagements` tests report `Cannot destructure property 'engId' of 'undefined'` (the branch does not exist, so `out` is empty).

- [ ] **Step 3: Add the backfill branch**

In `src/platform/engagement/backfill.ts`, immediately before `return out;`:

```ts
  // ORPHAN PROJECTS — no ticket and no quotation behind them → their own
  // engagement. A project raised directly (Sales was never involved) is a real
  // deal with a real client, and the stage registry's `unassignable: false`
  // says a project is never loose. Third rather than first, so a project that
  // DOES have lineage is already claimed by the ticket branch above and cannot
  // root a second engagement of its own.
  //
  // This branch is what makes the live dual-write safe. openProject attaches a
  // direct project's engagement best-effort; if the reconciler could not
  // reproduce that root it would drop it on the next pass, which is the
  // internal-quotation defect one stage further down.
  for (const p of c.projects || []) {
    if (p.ticketId || p.quotationId) continue;
    const engId = deterministicEngId("project", p.id as string);
    // Same resolution as both branches above: the live Client row first, the
    // record's own stored name only as the fallback for free text that never
    // became a record.
    const directClient = clientById.get(p.clientId as string);
    const members: Record<string, string[]> = {};
    for (const [slot, coll] of memberTypes) {
      members[slot] = byField(c[coll] || [], "projectId", p.id).map((r) => r.id as string);
    }
    out.push({
      // THE REF IS THE NUMBER ONCE FINANCE ISSUES ONE, the title until then. A
      // direct project starts with a blank number by design (Finance's act),
      // and a permanently blank ref would leave its card unnamed on the
      // engagements view. Re-running the reconciler upgrades it in place.
      engId, ref: (p.number as string) || (p.title as string) || "",
      context: {
        clientId: (p.clientId as string) || null,
        clientName: directClient ? (directClient.name as string) : (p.clientName as string) || "",
        // INDUSTRY IS THE CLIENT'S FACT and is read off the client row — the
        // project deliberately stores no copy of it (see the spec, §4.3).
        industry: (directClient?.industry as string) || "",
        title: (p.title as string) || "",
        // A project's deadline is its target end; there is no separate one.
        deadline: (p.endDate as string) || "",
        contact: {}, site: {},
        // The deal began when the project was raised, not when this root was
        // written — applyDescriptor scores ENG.index off context.createdAt.
        createdAt: (p.createdAt as string) || "",
      },
      singletons: { ticket: null, approvedQuotation: null, project: p.id as string },
      members,
    });
  }
```

- [ ] **Step 4: Add the live helper and the lineage fallback**

In `src/platform/db/engagement.ts`, replace the `EngagementLineage` type and `engagementIdForLineage` (lines 169-184) with:

```ts
/** The lineage fields a spine record carries, and all a derivation needs. */
export type EngagementLineage = { ticketId?: unknown; quotationId?: unknown; projectId?: unknown };

// WHICH ENGAGEMENT A SPINE RECORD BELONGS TO, DERIVED — the ticket's when there
// is a ticket behind it, the quotation's own when there is not (an internal
// quotation mints its own, see attachQuotationEngagement), and the project's
// own when there is neither (a project raised directly, see
// attachProjectEngagement). This rule is what openProject resolved inline and
// what every attach on the spine already obeys; it lives here once because a
// delete that derived it even slightly differently would detach from an
// engagement nobody ever attached to, and silently succeed.
//
// THE ORDER IS THE WHOLE CONTRACT. Project is last, so adding it moves nothing:
// a project behind a ticket still resolves to the ticket's engagement, and a
// project behind an internal quotation still resolves to the quotation's.
export function engagementIdForLineage(lineage: EngagementLineage): string {
  const ticketId = String(lineage.ticketId || "");
  if (ticketId) return deterministicEngId("ticket", ticketId);
  const quotationId = String(lineage.quotationId || "");
  if (quotationId) return deterministicEngId("quotation", quotationId);
  const projectId = String(lineage.projectId || "");
  return projectId ? deterministicEngId("project", projectId) : "";
}
```

Append beside `attachQuotationEngagement` (after line ~432):

```ts
// A PROJECT RAISED DIRECTLY mints its OWN engagement — the backfill's
// orphan-project path, reused so a live direct project and a backfilled one
// match byte-for-byte. Same shape as attachQuotationEngagement one stage up,
// and for the same reason: two implementations of one clustering is how the
// live path and the reconciler come to disagree about which deal a record is on.
export async function attachProjectEngagement(
  studioId: string, project: Record<string, unknown>, client: Record<string, unknown> | null,
): Promise<string> {
  const [descriptor] = buildEngagements({
    projects: [project], salesClients: client ? [client] : [],
  });
  await applyDescriptor(studioId, descriptor);
  return descriptor.engId;
}
```

In `src/modules/projects/projects.ts`, `removeProject` — widen the lineage it hands over so a direct project's detach works even when its reverse index was never written:

```ts
    const engId = await engagementIdFor(ctx.studio.id, "project", id,
      { ticketId: project.ticketId, quotationId: project.quotationId, projectId: id });
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test:integration`
Expected: PASS — `ok testDirectProjectMintsItsOwnEngagement`, `ok testBackfillClustersOrphanProjects`, `ok testBackfillLeavesLineagedProjectsAlone`, and every pre-existing engagement assertion still green (the parity and vocabulary tests in `engagement-backfill.mjs` are the ones that would catch a widened branch).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/platform/engagement/backfill.ts src/platform/db/engagement.ts src/modules/projects/projects.ts tests/engagement-oncreate.mjs tests/suite.mjs
git commit -m "A project with no ticket and no quotation roots its own engagement

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: `openProject` splits its head — a project can be created without a quotation

**Files:**
- Modify: `src/modules/projects/projects.ts:243-400` (`openProject`)
- Modify: `tests/suite.mjs` (a new block after the existing projects block, ~line 590)
- Modify: `tests/gate-a.mjs:1521-1630` (the projects block — four new goldens)
- Create: `tests/goldens/projects.direct.opened.json`, `projects.direct.refused.noclient.json`, `projects.direct.refused.notitle.json`, `projects.direct.list.populated.json` (recorded, not hand-written)

**Interfaces:**
- Consumes: `attachProjectEngagement` (Task 1); `resolveClientFor(scope, {clientId, clientName, industry, contact, site, collaboratorId}): Promise<Client | null>` from `@/modules/sales/salesClients`.
- Produces: `openProject(ctx, body)` accepts a body with **no** `quotationId`, taking instead `clientId | clientName`, `title`, `industry`, `notes`, `value`, `contactName/Email/Phone/Position`, `site: {name, country, city, url}`, plus the existing `managerCollaboratorId`, `location`, `startDate`, `endDate`, `supportPeriodDays`. Response shape is unchanged: `{ status: 201, body: { ok, project, sheets } }`.

- [ ] **Step 1: Write the failing integration test**

Add to `tests/suite.mjs` immediately after the existing `openProject attaches the project as the ticket engagement's singleton` assertion block (~line 590). `projectsContext`, `openProject` and `listProjects` are already imported at line 48; add `readEngagementView` if not already in scope (it is, at line 123).

```js
console.log("\n== a project can be created directly, with no quotation behind it");
{
  // THE SECOND WAY IN. Everything above this point opened a project from an
  // approved quotation; this is work handed to the studio directly — no
  // ticket, no RFQ, no quotation — and it has to become a real project with a
  // real client and a deal of its own.
  const proj = await projectsContext(owner, slug);
  const direct = await openProject(proj, {
    clientName: "Northwind Logistics",
    title: "Warehouse fit-out",
    industry: "Logistics",
    notes: "Handed to us directly by the client.",
    value: 42000,
    contactName: "Dana Reed", contactEmail: "dana@northwind.test",
    contactPhone: "+962 7 000 0000", contactPosition: "Facilities Manager",
    site: { name: "North yard", country: "Jordan", city: "Amman", url: "" },
    location: "Amman",
    startDate: "2026-09-01", endDate: "2026-12-01",
  });
  ok("a direct project is created", !!direct.project?.id, JSON.stringify(direct));
  ok("it carries no lineage at all",
    direct.project?.quotationId === "" && direct.project?.ticketId === "" && direct.project?.rfqId === "",
    `${direct.project?.quotationId}/${direct.project?.ticketId}/${direct.project?.rfqId}`);
  ok("its value is the typed figure, not a quotation total", direct.project?.value === 42000,
    String(direct.project?.value));
  ok("its number is blank until Finance issues one", direct.project?.number === "",
    String(direct.project?.number));

  // THE CLIENT IS SALES', RESOLVED THE WAY EVERY OTHER CREATE RESOLVES IT.
  // A typed name that matches nothing becomes a real Client record, with this
  // deal's contact and site folded onto it — not a free-text string on the
  // project row.
  ok("a real Client record was raised", !!direct.project?.clientId, String(direct.project?.clientId));
  ok("the project names the resolved client", direct.project?.clientName === "Northwind Logistics",
    String(direct.project?.clientName));

  // AND IT JOINS A DEAL. This is the half that fails silently: no ticket and
  // no quotation means no derived engagement id, so without the project-rooted
  // root the project is invisible on the engagements view.
  const directEngId = deterministicEngId("project", String(direct.project?.id));
  const directView = await readEngagementView(sid, directEngId);
  ok("the direct project roots its own engagement",
    directView?.singletons?.project === direct.project?.id,
    JSON.stringify(directView?.singletons));
  ok("and that engagement names the client live",
    directView?.context?.clientName === "Northwind Logistics",
    String(directView?.context?.clientName));

  // REFUSALS — neither writes a row.
  const before = (await listProjects(await projectsContext(owner, slug))).length;
  const noTitle = await openProject(await projectsContext(owner, slug),
    { clientName: "Northwind Logistics" });
  ok("a direct create with no title is refused", noTitle?.error === "missing", JSON.stringify(noTitle));
  const noClient = await openProject(await projectsContext(owner, slug), { title: "Nameless" });
  ok("a direct create with no client is refused", noClient?.error === "client", JSON.stringify(noClient));
  const after = (await listProjects(await projectsContext(owner, slug))).length;
  ok("a refused direct create writes no row", before === after, `${before} → ${after}`);
}
```

> `sid` is the seeded studio id already in scope in that block; if the surrounding block names it differently, use the same identifier the neighbouring engagement assertions use.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:integration`
Expected: FAIL — `a direct project is created` reports `{"error":"quotation"}`, because `openProject` looks the quotation up unconditionally and refuses when it finds none.

- [ ] **Step 3: Split `openProject` into two heads and one body**

In `src/modules/projects/projects.ts`, add the import beside the existing module imports:

```ts
import { resolveClientFor } from "@/modules/sales/salesClients";
```

and widen the engagement import to include `attachProjectEngagement`.

Above `openProject`, add the shape and the two heads. **The quotation head is today's code moved verbatim** — every comment travels with it; do not rewrite the reasoning about engagement-first client resolution or the ticket fallback.

```ts
// WHAT A PROJECT IS OPENED FROM, resolved to one shape.
//
// Two heads, one body. The quotation head reads the whole chain off an approved
// quotation; the direct head takes the job as typed. Everything below the split
// — the row, the sheets, the engagement, the manager notification — cannot tell
// which one ran, and that is the point: a second create path is a second place
// for the engagement dual-write to be forgotten, which is precisely how a
// record ends up on no deal at all.
type ProjectSource = {
  title: string;
  clientId: string;
  clientName: string;
  value: number;
  quotationId: string;
  quotationNumber: string;
  rfqId: string;
  ticketId: string;
  // THE ENGAGEMENT THIS PROJECT JOINS, when it is knowable before the row
  // exists. Blank for the direct head, whose engagement is rooted ON the
  // project and therefore cannot be derived until the project has an id — see
  // the attach below.
  engId: string;
  // The resolved Client record, carried only by the direct head, so the
  // engagement it mints names the client live rather than from a copy.
  client: Client | null;
};

// THE DIRECT HEAD — no quotation, so no commercial gate and no
// one-project-per-quotation check. What it must do instead is resolve the
// client the same way every other create resolves it: find-or-create by
// normalised name, then fold this deal's contact and site onto the Client
// record. That is `resolveClientFor`, which createTicket and createQuotation
// both call — a third implementation is how three clients named "Acme" end up
// in one studio.
async function directSource(
  ctx: ProjectsContext, body: Record<string, unknown>,
): Promise<ProjectSource | { error: string }> {
  const { studio, salesClientsSection, collaborator } = ctx;
  const title = str(body?.title, 200);
  if (!title) return { error: "missing" };
  // A studio with no Sales clients section has no client model to resolve
  // into, and refuses exactly as createQuotation refuses in that case.
  if (!salesClientsSection) return { error: "client" };

  const site = (body?.site && typeof body.site === "object" ? body.site : {}) as Record<string, unknown>;
  const client = await resolveClientFor(
    { studio, section: salesClientsSection },
    {
      clientId: str(body?.clientId, 60),
      clientName: str(body?.clientName, 200),
      // INDUSTRY IS THE CLIENT'S FACT and is written onto the Client record.
      // The project stores no copy — a fourth copy of something the Client row
      // owns is the drift this product keeps removing.
      industry: str(body?.industry, 120),
      contact: {
        name: str(body?.contactName, 200),
        email: str(body?.contactEmail, 200),
        phone: str(body?.contactPhone, 60),
        position: str(body?.contactPosition, 120),
      },
      site: {
        name: str(site.name, 200), country: str(site.country, 120),
        city: str(site.city, 120), url: str(site.url, 500),
      },
      collaboratorId: collaborator.id,
    },
  );
  if (!client) return { error: "client" };

  return {
    title,
    clientId: client.id,
    clientName: client.name || "",
    // TYPED, because there is no quotation total to read. A direct project may
    // legitimately start at zero — the figure is agreed later — so this is a
    // default, not a refusal.
    value: nonNeg(body?.value, 0),
    quotationId: "", quotationNumber: "", rfqId: "", ticketId: "",
    engId: "",
    client,
  };
}
```

Then rewrite `openProject`'s body as:

```ts
export async function openProject(ctx: ProjectsContext, body: Record<string, unknown>) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "projects.list.create");
  if (denied) return denied;

  const { studio, listSection, collaborator, sheetsSection } = ctx;

  // WHICH HEAD RUNS IS DECIDED BY THE BODY, not by a mode flag. A payload with
  // a quotationId is opening a project from that quotation and must pass the
  // commercial gate; a payload without one is raising new work directly. There
  // is no third case, and no flag a client could set to skip the gate.
  const source = str(body?.quotationId, 60)
    ? await quotationSource(ctx, body)
    : await directSource(ctx, body);
  if ("error" in source) return source;

  const now = new Date().toISOString();
  const project = await Projects.create({ studio, section: listSection }, {
    // BLANK UNTIL FINANCE ISSUES IT — unchanged, and true of both heads. The
    // project number is quoted on invoices, purchase orders and delivery notes;
    // issuing it is Finance's act, taken when they authorise the client's PO.
    // A placeholder would be quoted on something before long, and then it would
    // be the number.
    number: "",
    title: source.title,
    quotationId: source.quotationId, quotationNumber: source.quotationNumber,
    rfqId: source.rfqId, ticketId: source.ticketId,
    clientId: source.clientId, clientName: source.clientName,
    value: source.value,
    stage: DEFAULT_STAGE,
    managerCollaboratorId: str(body?.managerCollaboratorId, 60),
    location: str(body?.location, 200),
    supportPeriodDays: nonNeg(body?.supportPeriodDays,
      (ctx.settings as { supportPeriodDays?: number })?.supportPeriodDays ?? DEFAULT_SUPPORT_DAYS),
    receivedDate: now.slice(0, 10),
    startDate: str(body?.startDate, 10),
    endDate: str(body?.endDate, 10),
    // The direct head asks for a description; the quotation head has never
    // sent one and still stores "".
    notes: str(body?.notes, 4000),
    openedByCollaboratorId: collaborator.id,
    createdAt: now,
  });

  // THE ENGAGEMENT. Best-effort in both heads — the module's own rules are what
  // actually refuse a bad create; this mirrors the outcome rather than being
  // the source of it, so a re-attach the layer would refuse is swallowed rather
  // than surfaced as an error the caller never asked for.
  try {
    if (source.engId) {
      // Derived: the project joins the ticket's engagement, or the internal
      // quotation's, and that engagement records which quotation was approved.
      await attachRecord(studio.id, source.engId, "project", project.id);
      await setApprovedQuotation(studio.id, source.engId, String(project.quotationId || ""));
    } else {
      // Rooted: a direct project IS the deal, so its engagement is minted on
      // the project itself and cannot be derived before the row exists.
      await attachProjectEngagement(studio.id, project, source.client as unknown as Record<string, unknown>);
    }
  } catch { /* best-effort: reconciled later */ }
```

Everything from `// THE PROJECT SHEETS.` onward is unchanged, except that the two `Sheets.create` calls read the lineage from `source` rather than from the local `quotationId`/`quote` variables:

```ts
        projectId: project.id,
        quotationId: source.quotationId, rfqId: source.rfqId, ticketId: source.ticketId,
```

Move the whole of today's quotation resolution — from `if (!technicalSection) return { error: "no-technical" };` down to the `engClientId`/`clientName` fallback — into `quotationSource(ctx, body): Promise<ProjectSource | { error: string }>`, returning:

```ts
  return {
    title: str(body?.title, 200) || t.title || quote.title || "",
    clientId: engClientId, clientName,
    value: Number(quote.total) || 0,
    quotationId, quotationNumber: quote.number || "",
    rfqId: quote.rfqId || "", ticketId: quote.ticketId || "",
    engId, client: null,
  };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:integration`
Expected: PASS — the nine new assertions green, **and every pre-existing projects assertion still green**. The quotation path must be a refactor, not a rewrite: if `projects.opened` or the internal-quotation client-source assertions moved, the split is wrong.

- [ ] **Step 5: Add the Gate A goldens**

In `tests/gate-a.mjs`, inside the projects block after the `projects.refused.twice` shot (~line 1624):

```js
  // THE DIRECT PATH — a project raised with no quotation behind it. Recorded
  // as its own goldens rather than folded into the existing ones, because the
  // response shape is identical and only the lineage differs: a golden that
  // covered both would not notice the lineage going wrong.
  await shot("projects.direct.refused.notitle", await capture(
    PROJECTS.POST, req(`/api/studios/${slug}/projects`, { method: "POST",
      body: { clientName: "Northwind Logistics" } }), P));

  await shot("projects.direct.refused.noclient", await capture(
    PROJECTS.POST, req(`/api/studios/${slug}/projects`, { method: "POST",
      body: { title: "Nameless" } }), P));

  await shot("projects.direct.opened", await capture(
    PROJECTS.POST, req(`/api/studios/${slug}/projects`, { method: "POST", body: {
      clientName: "Northwind Logistics", title: "Warehouse fit-out",
      industry: "Logistics", value: 42000, location: "Amman",
      contactName: "Dana Reed", contactPosition: "Facilities Manager",
      site: { name: "North yard", country: "Jordan", city: "Amman", url: "" },
      startDate: "2026-09-01", endDate: "2026-12-01",
    } }), P));

  const bothWays = await capture(PROJECTS.GET, req(`/api/studios/${slug}/projects`), P);
  await shot("projects.direct.list.populated", bothWays);
  ok("the list holds the quotation-opened project and the direct one",
    bothWays.body?.projects?.length === 2, String(bothWays.body?.projects?.length));
```

> The pre-existing assertion `one quotation yielded exactly one project` reads `populated`, captured before this block. Leave it alone — it is still true of the capture it reads.

- [ ] **Step 6: Record the new goldens and verify**

These are **new files**, not a re-record of an existing contract, so recording them belongs in this commit.

Run: `NOMPANY_RECORD_GOLDENS=1 npm run test:gate-a`
Then run without the flag: `npm run test:gate-a`
Expected: PASS. Inspect `git status` — exactly four new files under `tests/goldens/`, and **no modification to any existing golden**. A modified existing golden means the split changed the quotation path; stop and fix it rather than re-recording.

- [ ] **Step 7: Typecheck and full suite**

Run: `npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json && npm test`
Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add src/modules/projects/projects.ts tests/suite.mjs tests/gate-a.mjs tests/goldens/projects.direct.*.json
git commit -m "A project can be created without a quotation behind it

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: A quotation-less project's sheets say why they are empty

**Files:**
- Modify: `src/modules/inventory/inventory.ts:710` (the `ensureSheetsExist` guard)
- Modify: `src/components/studio2/StudioSheetViewer.js:365-368` (the empty branch)
- Modify: `src/shared/studio/projects.ts` (one new copy key, type + EN + AR)
- Test: `tests/suite.mjs` — extend the direct-create block from Task 2

**Interfaces:**
- Consumes: `openProject` from Task 2, which now writes two sheets with `quotationId: ""`.
- Produces: nothing new. `composeSheet(sheet, null, …)` already returns `[]` tables for a sheet with no quotation, so the viewer's existing empty branch fires — this task only makes it say the right thing.

- [ ] **Step 1: Write the failing test**

Append inside the Task 2 block in `tests/suite.mjs`:

```js
  // THE SHEETS EXIST FOR A DIRECT PROJECT TOO, and they are empty — decided
  // deliberately, so a project's Sheets tab is the same tab everywhere. What
  // they must not be is absent: an absent tab reads as a missing feature.
  ok("a direct project is drawn up two sheets", (direct.sheets || []).length === 2,
    String((direct.sheets || []).length));
  ok("and neither claims a quotation it does not have",
    (direct.sheets || []).every((s) => s.quotationId === ""),
    JSON.stringify((direct.sheets || []).map((s) => s.quotationId)));
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:integration`
Expected: FAIL if Task 2's sheet loop was made conditional; PASS if it already writes both. **If it passes, do not skip the task** — steps 3-5 are the reason the sheets are usable, and the guard in step 3 is a real inconsistency either way.

- [ ] **Step 3: Stop the lazy seeder skipping quotation-less projects**

`ensureSheetsExist` seeds the pair for any project missing it. Its guard predates a project that could exist without a quotation; leaving it means `openProject` creates the sheets and the seeder would never re-create them, so the two paths disagree about whether a direct project has sheets.

In `src/modules/inventory/inventory.ts`, replace line 710:

```ts
    if (!p.quotationId) continue;             // nothing to read rows back from
```

with:

```ts
    // NO GUARD ON quotationId. This used to skip a project with none, on the
    // reasoning that there was nothing to read rows back from — true, and no
    // longer a reason to skip: a project raised directly has no quotation by
    // design, and its sheets are deliberately empty rather than absent. Leaving
    // the guard would mean openProject creates them and this seeder never
    // would, so the two paths disagree about whether a project has sheets.
    // composeSheet with no quotation returns no tables, which the viewer says
    // in words.
```

- [ ] **Step 4: Tell the viewer which kind of empty it is**

Add the copy key to `src/shared/studio/projects.ts` — in the type block, the EN dictionary and the AR dictionary, each in its existing alphabetical position:

```ts
  noQuotationBehindProject: string;
```
```ts
  noQuotationBehindProject: "This project has no quotation behind it, so there are no lines to work. Sheets fill from an approved quotation's priced rows.",
```
```ts
  noQuotationBehindProject: "لا يوجد عرض سعر خلف هذا المشروع، فليست هناك بنود للعمل عليها. تمتلئ الجداول من البنود المسعّرة في عرض سعر معتمد.",
```

In `src/components/studio2/StudioSheetViewer.js`, replace the empty branch at line 365:

```jsx
      {sheet.tables.length === 0 ? (
        <p className={`${panel} text-sm text-slate-500`}>
          {/* TWO KINDS OF EMPTY, and they mean different things. A sheet with
              no quotation behind it can never fill from this screen — the
              project was raised directly — where a quotation with no priced
              lines is waiting on somebody to price it. Saying "no priced
              lines" for the first reads as a bug in a screen that is working. */}
          {sheet.quotationId ? tr.quotationNoPricedLines : tr.noQuotationBehindProject}
        </p>
      ) : sheet.tables.map((table) => (
```

> `tr` in this file is the sheet viewer's existing dictionary. If `quotationNoPricedLines` resolves from a different module than `projects`, add `noQuotationBehindProject` to **that** module's dictionary instead — one module per surface, and nothing enumerates them.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, including both new sheet assertions and every pre-existing inventory assertion. `projects.direct.opened`'s golden already pins the two sheets, so a changed sheet shape shows up there.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/modules/inventory/inventory.ts src/components/studio2/StudioSheetViewer.js src/shared/studio/projects.ts tests/suite.mjs
git commit -m "A project with no quotation has sheets, and they say why they are empty

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: The projects screen is handed what the direct form needs — a golden re-record

**This task changes an existing response body, so it is its own commit and nothing else rides in it.** It lands before the UI so the UI has data to read.

**Files:**
- Modify: `src/modules/projects/projects.ts:561-572` (`listProjectClients`)
- Modify: `src/app/api/studios/[slug]/projects/route.ts` (the GET's return)
- Re-record: `tests/goldens/projects.empty.json`, `projects.list.populated.json`, `projects.direct.list.populated.json`, and any other projects golden the diff touches

**Interfaces:**
- Produces, on `GET /api/studios/<slug>/projects`:
  - `clients[].locations: {name, country, city, url}[]`
  - `vocabulary.industries: string[]`
  - `studioDefaults: { country: string, city: string }`

- [ ] **Step 1: Add the three fields**

In `src/modules/projects/projects.ts`, `listProjectClients`:

```ts
  return rows.map((c) => ({
    id: c.id,
    name: c.name || "",
    logo: c.logo || "",
    contacts: clientContacts(c),
    // THE SITES THIS CLIENT ALREADY HAS. ClientBlock offers them back so a
    // known site is chosen rather than retyped — without them the direct
    // create form silently loses half of what the block is for, and the client
    // accumulates near-duplicate sites nothing will reconcile.
    locations: Array.isArray(c.locations) ? c.locations : [],
  }));
```

In `src/app/api/studios/[slug]/projects/route.ts`, add the import beside the existing module imports:

```ts
import { TICKET_INDUSTRIES } from "@/modules/sales/tickets";
```

and extend the GET's return:

```ts
    // The studio's own country and city, so a new site on the direct create
    // form starts where a ticket and a quotation start rather than empty.
    studioDefaults: { country: c.studio?.country || "", city: c.studio?.city || "" },
    vocabulary: {
      stages: PROJECT_STAGES,
      serviceActions: (c.studio.serviceActions as string[]) || [],
      // THE SAME LIST SALES AND TECHNICAL OFFER, not a third copy — an
      // industry typed here has to match one typed there or the two screens
      // describe the same client differently.
      industries: TICKET_INDUSTRIES,
    },
```

- [ ] **Step 2: Run the goldens to see them fail**

Run: `npm run test:gate-a`
Expected: FAIL — `projects.empty`, `projects.list.populated` and `projects.direct.list.populated` each report a first-difference at the new fields. **Read the reported diff and confirm every difference is one of the three additions.** Anything else means the change did more than intended.

- [ ] **Step 3: Re-record, deliberately**

Run: `NOMPANY_RECORD_GOLDENS=1 npm run test:gate-a`
Then: `git diff --stat tests/goldens/`
Expected: only projects goldens touched. If a finance, inventory or operations golden moved, the change leaked — revert and narrow it.

- [ ] **Step 4: Verify the re-record holds**

Run: `npm test && npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json`
Expected: all green.

- [ ] **Step 5: Commit — the re-record and its reason together**

```bash
git add src/modules/projects/projects.ts "src/app/api/studios/[slug]/projects/route.ts" tests/goldens/
git commit -m "The projects screen is handed a client's sites, the industry list and the studio's own city

Re-records three projects goldens, deliberately. The direct create form needs
all three and the screen was handed none of them: ClientBlock offers a client's
saved sites back so nobody retypes one, the industry Combo reads the same list
Sales and Technical offer rather than a third copy, and a new site starts at the
studio's own country and city the way a ticket and a quotation already do.

The diff is confined to the projects goldens and to the three added fields.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: The New project dialog

**Files:**
- Modify: `src/components/studio2/StudioProjects.js` — `ProjectList` (~line 215-475) and `OpenProject` (~line 478-518)
- Modify: `src/shared/studio/projects.ts` — new keys, type + EN + AR

**Interfaces:**
- Consumes: `data.clients` (now with `locations`), `data.vocabulary.industries`, `data.studioDefaults` (Task 4); `onOpen(payload)` → `send("", "POST", payload)`, already wired.
- Produces: nothing other modules read.

- [ ] **Step 1: Add the copy**

In `src/shared/studio/projects.ts`, add to the type block and to **both** dictionaries, each in its existing alphabetical position:

```ts
  newProject: string;
  fromApprovedQuotation: string;
  newClientWork: string;
  projectValue: string;
  descriptionOfTheWork: string;
  createProject: string;
  creatingProject: string;
  nameIsnListCreatesClient: string;
```

EN:
```ts
  newProject: "New project",
  fromApprovedQuotation: "From an approved quotation",
  newClientWork: "New client work",
  projectValue: "Project value",
  descriptionOfTheWork: "Description of the work",
  createProject: "Create project",
  creatingProject: "Creating…",
  nameIsnListCreatesClient: "That name isn't on the list — a new client will be created.",
```

AR:
```ts
  newProject: "مشروع جديد",
  fromApprovedQuotation: "من عرض سعر معتمد",
  newClientWork: "عمل جديد لعميل",
  projectValue: "قيمة المشروع",
  descriptionOfTheWork: "وصف العمل",
  createProject: "إنشاء المشروع",
  creatingProject: "جارٍ الإنشاء…",
  nameIsnListCreatesClient: "هذا الاسم ليس في القائمة — سيُنشأ عميل جديد.",
```

- [ ] **Step 2: Wire the new props through `ProjectList`**

In `StudioProjects.js`, the `view === "projects-list"` branch already destructures `data`. Pass the three new pieces down:

```jsx
        <ProjectList projects={projects} approvedQuotations={approvedQuotations} people={people}
          clients={clients} industries={vocabulary.industries || []}
          studioDefaults={data.studioDefaults || {}}
          stages={vocabulary.stages} canManage={canManageList} slug={slug} nav={nav} focus={focus}
```

and widen `ProjectList`'s signature and the dialog it renders:

```jsx
function ProjectList({ projects, approvedQuotations, people, clients = [], industries = [],
  studioDefaults = {}, stages, canManage, slug, nav, focus, onOpen, onSave, onDelete }) {
```

```jsx
      <Toolbar canManage={canManage} label={tr.newProject} onAdd={() => setOpening(true)}>
```

```jsx
      {opening && (
        <Dialog title={tr.newProject} onClose={closeOpen} width="max-w-[720px]">
          <NewProject quotations={approvedQuotations} people={people} clients={clients}
            industries={industries} studioDefaults={studioDefaults} onCancel={closeOpen}
            onSave={async (p) => { const ok = await onOpen(p); if (ok) setOpening(false); return ok; }} />
        </Dialog>
      )}
```

> The dialog's `description` prop goes: it used to say "only approved quotations can become projects", which is no longer true and would be the screen lying about its own behaviour.

- [ ] **Step 3: Replace `OpenProject` with `NewProject`**

Add the imports this needs at the top of `StudioProjects.js`:

```js
import ClientBlock, { EMPTY_CLIENT_BLOCK, clientBlockPayload } from "@/components/studio2/ClientBlock";
import Combo from "@/components/studio2/Combo";
import { BARE_CONTROL } from "@/components/fields/Field";
```

Replace the whole `OpenProject` function with:

```jsx
// THE TWO WAYS A PROJECT BEGINS, in one dialog.
//
// From an approved quotation: the whole chain is already known, so the form
// asks for three things and the server reads the rest off the quotation.
// New client work: the studio was handed the job directly — no ticket, no RFQ,
// no quotation — so the client, the job and its figures are typed, and the
// contact and site are captured with the SAME block a new quotation captures
// them with. One block, not a poorer second copy of it.
//
// Which mode opens first is decided by what the studio actually has. A studio
// with no approved quotations used to get a dialog whose entire body said so
// and offered a Close button; it now gets the form that works.
function NewProject({ quotations, people, clients, industries, studioDefaults, onSave, onCancel }) {
  const tr = projectsDict(useStudioLocale());
  const [mode, setMode] = useState(quotations.length > 0 ? "quotation" : "direct");
  const [busy, setBusy] = useState(false);

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-1 rounded-full bg-slate-100 p-1 dark:bg-white/5">
        {[
          { key: "quotation", label: tr.fromApprovedQuotation },
          { key: "direct", label: tr.newClientWork },
        ].map((m) => (
          <button key={m.key} type="button" aria-pressed={mode === m.key}
            onClick={() => setMode(m.key)}
            className={`rounded-full px-4 py-2 text-sm font-600 transition-colors ${mode === m.key
              ? "bg-[var(--geex-surface)] text-brand-950 shadow-sm dark:text-white"
              : "text-slate-500 dark:text-slate-400"}`}>
            {m.label}
          </button>
        ))}
      </div>

      {mode === "quotation"
        ? <FromQuotation quotations={quotations} people={people} busy={busy} setBusy={setBusy}
            onSave={onSave} onCancel={onCancel} />
        : <DirectProject people={people} clients={clients} industries={industries}
            studioDefaults={studioDefaults} busy={busy} setBusy={setBusy}
            onSave={onSave} onCancel={onCancel} />}
    </>
  );
}

// UNCHANGED IN BEHAVIOUR — today's form, minus the dead end. The "no approved
// quotations waiting" body is now a line inside the mode rather than the whole
// dialog, because the other mode is always available.
function FromQuotation({ quotations, people, busy, setBusy, onSave, onCancel }) {
  const tr = projectsDict(useStudioLocale());
  const [quotationId, setQuotationId] = useState(quotations[0]?.id || "");
  const [managerCollaboratorId, setManager] = useState("");
  const [location, setLocation] = useState("");
  const chosen = quotations.find((q) => q.id === quotationId);

  if (quotations.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{tr.noApprovedQuotationsWaiting}</p>;
  }

  return (
    <>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{tr.onlyApprovedQuotationsCan}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2" label={tr.approvedQuotation} as="select" required
          value={quotationId} onChange={(v) => setQuotationId(v)}
          options={quotations.map((q) => ({ value: q.id, label: `${q.number} — ${q.title}` }))}
          hint={chosen ? `${chosen.clientName} · ${money(chosen.total)}` : undefined} />
        <Field label={tr.projectManager} as="select" value={managerCollaboratorId}
          onChange={(v) => setManager(v)}
          options={[{ value: "", label: tr.unassigned }, ...people.map((p) => ({ value: p.id, label: p.alias }))]} />
        <Field label={tr.location} value={location} onChange={(v) => setLocation(v)} hint={tr.siteCity} />
      </div>
      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !quotationId} onClick={async () => {
          setBusy(true);
          await onSave({ quotationId, managerCollaboratorId, location });
          setBusy(false);
        }}>{busy ? tr.opening : tr.openProject}</button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </>
  );
}

function DirectProject({ people, clients, industries, studioDefaults, busy, setBusy, onSave, onCancel }) {
  const tr = projectsDict(useStudioLocale());
  const [f, setF] = useState({
    clientName: "", title: "", industry: "", notes: "", managerCollaboratorId: "",
    value: "", startDate: "", endDate: "",
    ...EMPTY_CLIENT_BLOCK,
    locationCountry: studioDefaults.country || "",
    locationCity: studioDefaults.city || "",
  });
  const set = (patch) => setF((s) => ({ ...s, ...patch }));

  // The client the typed name resolves to, if any — the same case-insensitive,
  // whitespace-collapsed match the ticket and the quotation use, so "Acme  Co"
  // and "acme co" are one client rather than two.
  const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  const matched = clients.find((c) => norm(c.name) === norm(f.clientName)) || null;
  const ready = f.clientName.trim() && f.title.trim();

  async function save() {
    setBusy(true);
    const cb = clientBlockPayload(f);
    await onSave({
      ...(matched ? { clientId: matched.id } : { clientName: f.clientName.trim() }),
      title: f.title.trim(),
      industry: f.industry.trim(),
      notes: f.notes.trim(),
      value: Number(f.value) || 0,
      managerCollaboratorId: f.managerCollaboratorId,
      startDate: f.startDate, endDate: f.endDate,
      contactName: cb.contactName, contactEmail: cb.contactEmail,
      contactPhone: cb.contactPhone, contactPosition: cb.contactPosition,
      // THE SITE TRAVELS AS `site`, NOT AS `location`. The project row's own
      // `location` is a STRING — it is the list's Location column and its
      // filter — and the two would collide on one key. The site's city fills
      // it, so nothing downstream sees a new shape.
      site: cb.location,
      location: cb.location.city || cb.location.name || "",
    });
    setBusy(false);
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr.client} required filled={!!f.clientName}
          hint={matched ? tr.existingClient : (f.clientName.trim() ? tr.nameIsnListCreatesClient : undefined)}>
          <Combo value={f.clientName} onChange={(v) => set({ clientName: v })}
            options={clients.map((c) => c.name)} inputClassName={BARE_CONTROL} />
        </Field>

        <Field label={tr.typeIndustry} filled={!!f.industry}>
          <Combo value={f.industry} onChange={(v) => set({ industry: v })}
            options={industries} inputClassName={BARE_CONTROL} />
        </Field>

        <Field className="sm:col-span-2" label={tr.title} required value={f.title}
          onChange={(v) => set({ title: v })} />

        <Field className="sm:col-span-2" label={tr.descriptionOfTheWork} as="textarea"
          value={f.notes} onChange={(v) => set({ notes: v })} />

        <Field label={tr.projectManager} as="select" value={f.managerCollaboratorId}
          onChange={(v) => set({ managerCollaboratorId: v })}
          options={[{ value: "", label: tr.unassigned }, ...people.map((p) => ({ value: p.id, label: p.alias }))]} />

        {/* TYPED, because there is no quotation total to read it from. */}
        <Field label={tr.projectValue} type="number" min="0" value={f.value}
          onChange={(v) => set({ value: v })} />

        <Field label={tr.start} filled={!!f.startDate}>
          <StudioDate value={f.startDate} onChange={(iso) => set({ startDate: iso })} />
        </Field>
        <Field label={tr.targetEnd} filled={!!f.endDate}>
          <StudioDate value={f.endDate} onChange={(iso) => set({ endDate: iso })} />
        </Field>
      </div>

      {/* The same block a new quotation raises a client with. Positions are
          offered from the contacts this client already has — Projects has no
          contact-position vocabulary of its own, and inventing a second one to
          hold the same words is how two lists drift. */}
      <ClientBlock value={f} onChange={(patch) => set(patch)} client={matched}
        positions={[...new Set((matched?.contacts || []).map((c) => c.position).filter(Boolean))]} />

      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !ready} onClick={save}>
          {busy ? tr.creatingProject : tr.createProject}
        </button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Fix the list's empty state**

The `Empty` at the bottom of `ProjectList` still says projects come from approved quotations. Replace its body so it names both ways in:

```jsx
        <Empty
          title={tr.noProjectsYet}
          body={approvedQuotations.length === 0
            ? tr.projectsOpenApprovedQuotation
            : tr.approvedQuotationsReadyOpen}
        />
```

Leave the two existing strings in place but update `projectsOpenApprovedQuotation` in **both** dictionaries so it no longer claims a quotation is required:

```ts
  projectsOpenApprovedQuotation: "Projects open from an approved quotation, or are created directly for work handed to you.",
```
```ts
  projectsOpenApprovedQuotation: "تُفتح المشاريع من عرض سعر معتمد، أو تُنشأ مباشرة لعمل أُسند إليك.",
```

- [ ] **Step 5: Build and typecheck**

Run: `npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json && npx next build`
Expected: no errors. Note what neither catches: a `.jsx` reading an unbound `tr`, or a Server Component calling `useStudioLocale`. Step 6 is what catches those.

- [ ] **Step 6: Open the screen**

```bash
npm run dev:sandbox
```

Log in as `sandbox@nompany.test` at `localhost:3010/sandbox`, open `/sandbox/projects-list`, and check each of these:

1. The toolbar button reads **New project**.
2. The dialog opens on **New client work** (the sandbox has no approved quotations).
3. Typing a client name off the list shows the "a new client will be created" hint; the contact and site blocks render, with the country and city pre-filled from the studio.
4. Create a project. It appears in the grid with its typed value, its client name and its location.
5. Open it. The detail dialog shows the client and the value; the lineage strip is empty rather than broken.
6. Its Sheets tab shows two sheets, each saying the project has no quotation behind it.
7. Switch the studio to Arabic and reopen the dialog: the labels mirror, the segmented control sits the right way round, and nothing renders `undefined`.

Take a screenshot of the direct form and of the created project's row.

Sweep when done: `npm run dev:sandbox:clean`

- [ ] **Step 7: Full verification**

Run: `npm test && npx tsc --noEmit && npx tsc --noEmit -p tsconfig.strict.json && npx next build && node scripts/bundle-budget.mjs`
Expected: all green, and the bundle budget still under both ceilings. `ClientBlock` and `Combo` are already in the studio chunk (Technical imports both), so this should not move.

- [ ] **Step 8: Commit**

```bash
git add src/components/studio2/StudioProjects.js src/shared/studio/projects.ts
git commit -m "The projects list opens a new project two ways, and says which

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Write down what it does

`docs/functionality/` is one file per system functionality, and every file ends with what is **not** built, stated in words. This change gives Projects a second create path and there is no file for it.

**Files:**
- Create: `docs/functionality/projects.md`
- Modify: `docs/progress.md` (one line under the current wave)

- [ ] **Step 1: Write the file**

`docs/functionality/projects.md` covers: the two ways a project is created and which facts each supplies; that the client is Sales' record, resolved by `resolveClientFor`, and that industry lives on the client rather than on the project; that the number is Finance's to issue; that a direct project roots its own engagement; and what the sheets can and cannot show. It ends with a **Not built yet** section naming, in words:

- attaching a quotation to an existing direct project (the sheets are ready, the path is not written);
- promoting a direct project's engagement into a ticket-rooted one if a ticket arrives later;
- issuing a project number from anywhere other than Finance.

- [ ] **Step 2: Note it in progress.md**

One line, ISO-dated, under the current wave, naming the branch and what landed.

- [ ] **Step 3: Commit**

```bash
git add docs/functionality/projects.md docs/progress.md
git commit -m "A project's two ways in are written down

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:** §3.1 → Task 5 (`FromQuotation`). §3.2 → Task 5 (`DirectProject`). §4.1 → Task 2. §4.2 → Task 2 (no new key, no new route). §4.3 → Task 2, including the "no industry on the row" rule. §5 → Task 1, both edits plus the `removeProject` widening. §6 → Task 3. §7 → Task 4. §8 → Tasks 3 and 5. §9 items 1-2 → Task 1; item 3 → Task 2 step 6 (no existing golden may move); item 4 → the hop-count check folded into Task 2's `npm test`; item 5 → Task 2's refusal assertions. §10 → Task 6.

**Type consistency:** `ProjectSource` is defined in Task 2 and used only there. `attachProjectEngagement(studioId, project, client)` is defined in Task 1 and called in Task 2 with that exact signature. `EngagementLineage.projectId` is added in Task 1 and used by `removeProject` in the same task. The form sends `site` (object) and `location` (string) as two distinct keys; `directSource` reads both under those names.

**Known risk, flagged rather than hidden:** Task 2's step 6 asserts that no *existing* golden moves. If one does, the split changed the quotation path — that is a stop-and-fix, never a re-record.
