# Client data sealed at rest

The owner's requirement, 17/09/2026: nobody who reaches the database — a dump, a
backup, the Cloud SQL console, somebody who should not be there — may read a client.
Inside a studio every client reads exactly as before, and Nova sees what the app sees.

## What it does

Client details are encrypted in the app on their way into Postgres and decrypted on
their way out. The table holds tokens (`ns1.d1.…`); a reader sees plain rows.

**Sealed:**

- **A client record (`salesClients`), whole** — every field except `id`, `studioId`,
  `sectionId`, `createdAt`, `updatedAt` and `createdByCollaboratorId`. A field added to
  the client later is sealed without being listed.
- **A client's details wherever they are copied**, by field name in every collection:
  `clientName`, `contactName`, `contactEmail`, `contactPhone`, `contactPosition`,
  `ticketRef`, `issuer` — so quotations, projects, invoices, credit notes, orders and
  tenders are covered, and so is the next record to copy one.
- **Per collection:** a deal's `ref`, `title`, `description` and `location`
  (`salesTickets`); an RFQ's `reference` (`rfqs`, "RFQ-ACME-001"); a task's `title` and
  `description` (`tasks`, "Approve quotation … · ACME"); a journal entry's `memo`
  ("Invoice INV-0003 — ACME").

The list is `platform/db/sealCipher.ts`, and nowhere else.

## How

- **Where:** `platform/db/sections.ts`, the one door every row passes on either backend.
  Modules, routes and screens hand in and receive plain rows and do not know sealing
  exists.
- **Cipher:** AES-256-GCM from Node's `crypto`. Each value is bound to
  `studio|row id|field` as authenticated data, so a value moved to another row, field
  or studio refuses to open instead of reading as someone else's.
- **The IV is an HMAC of the value and its binding**, so sealing the same value in the
  same place gives the same text (a patch re-run on a contended update, and parity's
  text comparison, both need that). Equal values are visible as equal only within one
  field of one row.
- **Keys, no outside service:** a master keyring in `NOMPANY_DATA_KEY`
  (`<id>:<base64 32 bytes>`, comma-separated, current first), held **in Vercel and on
  the owner's machine and never in Google Cloud**, where the data is. Each studio has
  its own random data key, stored wrapped by the master under `S.dataKey` in its own
  documents, and made the first time the studio writes anything that needs sealing.
  Deleting a studio deletes its key.
- **A sandbox never uses the real key.** With `NOMPANY_KEY_PREFIX` set (tests,
  `dev:sandbox`) the keyring is the public test key `t0`, whatever the environment
  says; `t0` is refused in a live store.
- **Fails closed.** No master key: a write that would seal throws, naming the variable;
  a sealed value read without a key throws. A row with no client data still reads and
  writes normally. A value that will not open is an error, never a blank.
- **Filters:** a `where` on a sealed field is never sent to SQL (it could only miss);
  the repository filters the opened rows in memory, so callers get the same answer.
- **Old rows:** a plain row still reads, and is sealed **whole** the first time anything
  writes to it. `scripts/migrate/seal-clients.mjs` seals the rest — dry run by default,
  exports first, re-scans to prove it, and needs the owner's two confirmations.
- **Rotation:** `rotateStudioKey` gives a studio a new data key (old ones kept, so old
  values open); `rewrapStudioKeys` moves a studio's keys onto the current master so a
  retired master can be removed from the variable. Neither has a screen or a script yet.

## Setting it up

1. Generate the master key on your own machine:
   `node -e "console.log('m1:' + require('crypto').randomBytes(32).toString('base64'))"`
2. Put it in Vercel as `NOMPANY_DATA_KEY` (Production and Preview) and in `.env.local`.
   Never in Google Cloud, never in the repo.
3. Keep two offline copies. **Losing it loses every client, permanently.**
4. Deploy, then run the seal script (dry run first).

## Not built yet

- **Engagement records** (`documents`, `eng:` keys) still hold the client name, contact
  and site in the clear.
- **The idempotency cache** (`platform/http/idempotency.ts`) keeps a full response body
  for 24 hours when a request sends `Idempotency-Key`, which can include a client.
- **Notifications, chat and Nova's stored conversations** can quote a client name in
  their text and are not sealed.
- **`generatedDocuments`** (a filled document stored under a ticket or quotation) can
  hold a client's name in its body.
- **Server logs** do not redact email, phone or name.
- A deal's `clientBudget` and a quotation's `title`/`description` are not sealed.
- No screen or script for rotating a studio key or re-wrapping under a new master.
- Searching clients inside the database is impossible by design; nothing does today.
