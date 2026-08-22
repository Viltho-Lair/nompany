# Security Audit & Notification System Design

Two halves of one document because they meet in the same place: an ERP that cannot tell you *why* you were refused, and cannot tell you *that something needs you*, fails its users in the same way.

---

# Part I — Access control audit

## 1. What the model gets right

Stated first, because the recommendations below are refinements to a sound design, not a rescue.

| Property | Where | Why it matters |
|---|---|---|
| One resolver, one answer | `access.js:effectivePermissions` | The UI and the write path cannot disagree. This is the structural fix for the largest class of authorisation bug. |
| Default deny | same | No role ⇒ nothing. No fallback path exists. |
| No inheritance | `permissions.js` | Rights are leaves only. "Does Sales imply Sales › Tickets?" is a question with no correct answer, and the model makes it unaskable. |
| Cumulative by storage, not by resolution | `LEVEL_VERBS` | Granting "edit" stores `view`+`create`+`edit`. What is stored is exactly what is allowed; nothing is computed at check time. |
| Escalation blocked at **both** doors | `escalates()` in People **and** join approval | The join-approval door was the second, unguarded one: approving as "admin" assigns the wildcard. |
| Defence in depth | coarse `{write:true}` gate **plus** `requirePermission` in the service | 12 checks in `hr.js`, 16 in `inventory.js`, 12 in `sales.js`. A loose gate is not a vulnerability because the service is the authority. |
| Scope genuinely enforced | `hr.js:317`, `:460` | `scoped: true` exists on exactly two areas and both honour it. |
| Separation of duties | `signables.js` | Reviewer ≠ approver, enforced at the transition, not in the permission model — because holding both rights is legitimate and using both on one record is not. |
| Membership authorises, never the URL | `studioContext` | And a non-member learns nothing: "not found" and "not a member" render identically. |
| Owner cannot be locked out | `effectivePermissions` short-circuit | A studio that can lock out its owner is an unanswerable support ticket. |
| Decisions are explainable | `explain()` | Re-runs the same steps and reports which one settled it — it cannot disagree with enforcement. |

## 2. Threat model

| Actor | Can reach | Should never reach |
|---|---|---|
| Anonymous | `/en/*`, `/api/identity/*`, `/api/track`, `/api/pricing`, public media | any studio data, any user data |
| Authenticated non-member | their account, `/api/studios/join` | anything under a studio they do not belong to — **including its media** |
| Member, no role | the studio shell | every section (default deny) |
| Member with role | granted areas | ungranted areas; granting beyond their own hold |
| Studio admin | everything in **their** studio | other studios; the platform console |
| Super admin | the whole platform | *(no restriction — hence the need for an audit trail)* |
| Redis-level reader | — | live sessions, PII, notification bodies |

## 3. Findings, by attack path

Full severity table in `recommendations.md`. Grouped here by how an attacker would actually reach them.

### 3.1 Path — a fresh account reads another tenant's files · **C-2**

Sign up, verify, and issue `GET /api/media/<32-hex>`. The check is `visibility === "private" && !(await currentUser())` — *"is somebody signed in"*, not *"is this person entitled"*. `putMedia` records an `owner`; no read path compares it. The keyspace is `g:media:<id>` with no studio in the key, so there is nothing to scope against.

Reachable content: approval signature graphics (`signables.js` accepts `/api/media/<32-hex>` as a signature), studio logos, letterheads, employee photos, uploaded purchase orders. Ids leak through `src` attributes, generated documents and exported PDFs.

**Fix.** Studio-owned blobs move to `s:<StudioID>:media:<id>` (the builder exists at `keys.S.media`, unused) and the read resolves the studio and requires membership. Platform blobs compare `owner`. Serve private blobs via short-lived signed URLs.

### 3.2 Path — anyone with curl takes the platform down · **C-3**

`POST /api/track` has no session, no rate limit, no origin check, and writes `sAdd stat:vis:<day>` with a caller-supplied 64-character `vid`. The module comment states nothing expires, deliberately. Redis is the only storage the product has; at the memory ceiling every write fails — sign-ups, invoices, quotations, sessions.

**Fix.** Per-IP window through the existing `incrWithTTL`; replace the visitor set with a HyperLogLog (`PFADD`/`PFCOUNT` — constant 12 KB, exactly the right shape for a unique count); TTL on `stat:vis:*` with monthly rollup; `Origin` check against the marketing host.

### 3.3 Path — unlimited password guessing · **C-4**

`login()` calls `verifyPassword` before any counter is touched. The limiters live inside `createChallenge`, reached only *after* a correct password on an untrusted device. A wrong password returns immediately, uncounted. `/api/identity/forgot` and `/reset` are likewise unlimited.

**Fix.** Limit before `verifyPassword`, keyed on email **and** IP, with escalating lockout and a generic response either way. Raise `BCRYPT_ROUNDS` 10 → 12 (`passwords.js:8`).

### 3.4 Path — a captured console token never expires · **C-5**

`sessionTokens[]` on the `g:superAdmins` row carries no expiry. `SUPER_TTL_SEC` sets only the cookie `Max-Age`, which the client controls. `findSuperBySession` reads the whole registry and uses `Array.includes` — a non-constant-time comparison on a secret.

**Fix.** Mint console sessions the way the subscriber side already does correctly: `ix:supersession:<sha256(token)>` → adminId with `EX`. Keep the array as a display list. `crypto.timingSafeEqual`.

### 3.5 Path — a database read is total compromise · **H-1**

`ix:session:<token>` → UserID stores the raw bearer. Any backup, support export, or second application on the shared Redis Cloud instance yields every live session. Same for `otp:<challengeId>` and the reset code in `u:<id>:verification` (plaintext, compared with `!==`).

**Fix.** Store `sha256(token)` as the key; the cookie is unchanged. Hash the reset code and compare in constant time.

### 3.6 Path — one authenticated account exhausts storage · **C-6**

5 MB per file, unlimited files, base64-inflated to ~6.7 MB per key, never reclaimed by any cascade or by the sweep. Media is already **76% of the live dataset**. `BLOB_READ_WRITE_TOKEN` is provisioned and unused.

### 3.7 Path — the scheduled job deletes everything · **C-1**

Not an attack — an accident waiting on a configuration. `sweepOrphans()` repairs through prefixed key builders and reaps through bare literals. Under any `NOMPANY_KEY_PREFIX` it reads empty registries and prefix-deletes every real user and studio subtree.

### 3.8 Cross-cutting

| Gap | Consequence |
|---|---|
| **No CSRF defence beyond `SameSite=Lax`** (H-10) | No `Origin`/`Referer` check on any mutation. `Lax` does not cover same-site subdomains, and the platform deliberately spans apex and `www`. |
| **No security headers** (H-10) | `next.config.mjs` sets `reactStrictMode` and nothing else. No CSP, HSTS, `X-Frame-Options`, `Referrer-Policy`, `X-Content-Type-Options`; `poweredByHeader` on. |
| **No audit trail** (H-11) | `s:<id>:activityLog` declared, zero readers, zero writers. Plan changes, suspensions, role grants, quotation unlocks and member removals leave no record. |
| **Field encryption fails open and silent** (H-9) | No key ⇒ plaintext, no signal. Decrypt failure ⇒ `""`. A key rotation blanks every ID and passport number with no error. The same key derives the device IP HMAC, which also silently degrades. |
| **Notification bodies over pub/sub** (L-7) | `CH.user(userId)` publishes full text on a shared Redis instance. Publish `{kind, id}` and let the client fetch. |
| **Super admin is all-or-nothing** | No roles, no scoping, no MFA, no IP allowlist on the console — combined with H-11, no accountability either. |
| **Write and read rights diverge on PII** (M-9) | `hr.employees.edit` writes `idNumber`; `hr.employees.salary` reads it. You can overwrite what you cannot see. |
| **`quality.documents.share` grants nothing** (M-1) | A permission on the Access grid that does nothing. The catalogue's own rule says a right nothing can exercise is a bug. |

## 4. Hardening plan

**Week 1 — the four one-liners.** C-1 prefix guard + refusal on empty registries · C-4 limiter before `verifyPassword` · C-5 server-side console expiry · C-3 track limiter. Plus security headers:

```js
// next.config.mjs
poweredByHeader: false,
async headers() {
  return [{ source: "/:path*", headers: [
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "geolocation=(), camera=(), microphone=()" },
    { key: "Content-Security-Policy", value: CSP },   // report-only first, then enforce
  ]}];
}
```

**Weeks 2-4.** Media to Blob, studio-scoped, quota'd (C-2 + C-6) · hash session tokens and reset codes (H-1) · `fieldCrypto` fails closed (H-9) · `Origin` check in the route wrapper (H-10).

**Month 2.** Audit log (H-11) — one `AuditLog` write from the shared route wrapper, so it is one edit rather than 97: `{ at, actor, actorType, studioId, action, subject, before, after, ip, requestId }`. Super-admin MFA. `explain()` surfaced in the UI. Delete or build the three dead capabilities.

**Continuous.** Two CI checks, both cheap and both catching real classes:
- every `ALL_PERMISSIONS` key appears in at least one `requirePermission`/`can` call (fails on `quality.documents.share` today — correctly);
- every route file resolves through the wrapper's `auth` spec.

---

# Part II — Notification system

## 5. What exists

The **delivery machinery is finished and well built**. What is missing is what fires it, and most of the UI around it.

| Layer | State |
|---|---|
| Storage | `s:<StudioID>:notifications`, fan-out on write, one row per recipient, `readAt` on the row · **done** |
| Platform storage | `g:superNotifications` · **done** |
| Real-time | per-user channel `nt:u:<UserID>`, SSE, one `EventSource` per tab · **done** |
| Read state | `markRead`, scoped to the caller inside the atomic write · **done** |
| Cascade | reaped by `cascadeDeleteCollaborator` and the studio prefix · **done** |
| Studio bell | `NotificationBell.js` — unread badge, merge of fetched + streamed, mark-all-read, offline indicator · **done** |
| Console bell | `super/_components/Header.js` + `useSuperNotifications` · **done** |
| Console list page | `/super/application/notifications` · **done** |

Two details worth preserving: `href` is stored **studio-relative** so a rename cannot orphan old notifications, and `markRead` filters by recipient *inside* the committed write so a forged id cannot mark someone else's row read.

## 6. What is missing — producers

Only **five** producers exist in the whole product: studio created, chat waiting, rating left (all → console), join requested (→ admins), quality revision handed on (→ next signer).

### 6.1 Declared and never emitted

| Constant | Consequence today |
|---|---|
| `NOTIFY.joinDecided` | **A person who asks to join a studio is never told whether they were approved or declined.** They must re-open the address and guess. |
| `NOTIFY.taskAssigned` | Work is assigned on the board and nobody is told. |
| `NOTIFY.peopleChanged` | Access changes silently. |
| `NOTIFY.mention` | No mention mechanism exists. |

### 6.2 Event-driven triggers to add

Each fires from the service that already performs the action — no new plumbing.

| Trigger | Recipient | Tone | Permission-gated to |
|---|---|---|---|
| RFQ raised against your section | Technical members | `primary` | `technical.rfq.view` |
| RFQ rejected → ticket closed | ticket owner | `warning` | `sales.tickets.view` |
| Quotation ready / locked | ticket owner | `success` | `sales.tickets.view` |
| Quotation unlocked | Technical + ticket owner | `warning` | both |
| Approval task assigned to you | the assignee | `primary` | `tasks.board.view` |
| Approval decided | requester | `success` / `danger` | `sales.tickets.view` |
| Project opened from your ticket | ticket owner | `success` | `projects.list.view` |
| Vacation requested | approvers | `primary` | `hr.vacations.approve` |
| Vacation decided | requester | `success` / `danger` | own record |
| Material order raised / received | sheet owner | `primary` | `inventory.sheets.view` |
| AWB status changed | shipment owner | `primary` | `inventory.awb.view` |
| Delivery recorded | project owner | `success` | `projects.list.view` |
| Invoice raised | Finance | `primary` | `finance.cash.view` |
| Document needs your review / approval | that signer | `warning` | `quality.documents.review` / `.approve` |
| Revision published | acknowledgement list | `primary` | `quality.documents.view` |
| Member added / removed | studio admins | `primary` | `people.members.view` |
| Your access changed | that person | `warning` | own |
| Share link opened *(once M-1 is built)* | document owner | `info` | `quality.documents.share` |

**Every notification is permission-gated at write time.** A notice that names a record the recipient may not open is an information leak dressed as a courtesy, and the recipient list must be filtered through `effectivePermissions` before fan-out — not at render time.

### 6.3 Deadline triggers — the missing evaluator

Nine of the most valuable notifications in an ERP are time-based, and there is **no scheduled evaluator** to produce them:

SLA approaching / breached · invoice due / overdue · permit expiring (30/7 days) · certification expiring · vacation starting tomorrow · stock below reorder level · AWB overdue at a checkpoint · document review due · quotation validity expiring.

**Add a daily cron** (`/api/cron/deadlines`, gated by the existing `cronDenied`) that walks each studio's relevant collections and emits. Idempotence matters more here than anywhere else — it must not re-notify daily for the same breach — so each notice carries a `dedupeKey` (`sla:<projectId>:breach`) and `notifyCollaborators` skips a recipient who already holds an unread row with that key.

This is the same job that becomes far cheaper after the SQL migration, where "invoices due in 7 days" is an indexed query rather than a full-collection scan per studio.

## 7. What is missing — UI

### 7.1 Toast / snackbar layer — **nothing exists**

The largest single gap in the product's feedback vocabulary. Today every mutation either silently succeeds or silently fails.

```
ui/patterns/Toaster.tsx        one provider, mounted in StudioFrame and the super shell
ui/patterns/toast.ts           toast.success() / .error() / .info() / .promise()
```

Behaviour: success auto-dismisses at 4 s, quiet; **errors persist** until dismissed and carry a retry action; a 409 says *"Someone else changed this — reload and try again"* with a Reload button; a 403 shows `explain()`'s sentence; stack of 3 maximum, `aria-live="polite"`, bottom-inline-end, RTL-aware.

Toasts are for *this request's outcome*. Notifications are for *things that happened to you*. Never route one through the other.

### 7.2 Notification centre — a page, not just a panel

The bell holds a dropdown. There is no full view, so a person cannot search or filter, and nothing older than the panel's reach is findable.

```
/<slug>/notifications
├─ tabs: All · Unread · Mentions · Assigned to me
├─ filters: type, module, date range, actor
├─ grouped by day, each row: icon · title · body · relative time · module chip
├─ bulk: select → mark read / archive
└─ empty state per tab
```

### 7.3 Preferences — nothing exists

A bell that rings for everything stops being read; that argument is already made in `data/users.js` to justify why signups are events rather than notifications. It applies to the whole system.

```
/<slug>/settings/notifications
  per category (Sales · Technical · Projects · Inventory · HR · Finance · Quality · People · System)
  × per channel (In-app · Email · Digest)
  + quiet hours (with timezone)
  + digest frequency: off / daily / weekly
  + "only things assigned to me" master switch
```

Stored on the collaborator row (studio-local, which is right — a person may want different settings per studio). Defaults on: everything in-app, email for anything assigned to or awaiting *you*, digest off.

### 7.4 Email and digest — nothing exists

`platform/notify/email.js` and `platform/notify/emailTemplates.js` exist and are used only for OTP and password reset. Add: a single-notification email for high-urgency types (approval awaiting you, document needs your signature, SLA breached), and a digest that batches the rest. Both routed through the outbox from `recommendations.md` gap #3, so delivery is retriable and observable rather than fire-and-forget.

### 7.5 Smaller UI pieces

| Piece | Why |
|---|---|
| **In-context badges** — unread count on the sidebar section, on a ticket row, on a board column | Notifications are how you learn *something* happened; badges are how you find *where* |
| **Toast → notification promotion** | If a toast is dismissed unseen and the event mattered, it should be waiting in the bell |
| **Snooze** | "remind me tomorrow" on deadline notices |
| **Actor avatar on each row** | "Sara sent this for approval" is a different notice from "this was sent for approval" |
| **Skeleton for the bell panel** | Per `ui-ux-overhaul.md` §2.6 |
| **Grouping** | "3 tickets assigned to you" rather than three rows |
| **Sound + browser Notification API**, opt-in | For the Live views, which people leave open on a second screen |
| **`aria-live` on the badge** | Currently the count changes silently for screen-reader users |

## 8. Data model changes

Small and additive; none disturbs the cascade.

```js
{
  id, type, title, body, href, tone, at, readAt, recipientId, studioId,   // today
  // additions
  category,        // "sales" | "hr" | … — drives preferences and filters
  priority,        // "low" | "normal" | "urgent" — drives email vs in-app
  dedupeKey,       // "sla:<projectId>:breach" — stops the daily job re-notifying
  actorId,         // CollaboratorID of whoever caused it (never a UserID)
  subject,         // { kind: "salesTicket", id } — for badges and grouping
  archivedAt,      // separate from readAt: read ≠ dealt with
}
```

Plus `notificationPrefs` on the collaborator row, and `MAX_PER_STUDIO` raised (or moved to a per-recipient cap) once the notification centre exists — 200 per *studio* is small once every trigger in §6 is firing.

## 9. Sequence

| Phase | Work |
|---|---|
| **1** | The four declared-never-emitted types. `joinDecided` first — it is the most visibly broken thing in the product. |
| **2** | Toast layer (§7.1). Unblocks every other feedback improvement. |
| **3** | Event-driven triggers (§6.2), permission-gated at write time, one module at a time. |
| **4** | Notification centre page (§7.2) + in-context badges. |
| **5** | Preferences (§7.3), with the model changes in §8. |
| **6** | Deadline evaluator (§6.3) with dedupe keys. |
| **7** | Email + digest (§7.4) through the outbox. |

Phases 1 and 2 are each a few days and together fix the two most visible gaps: nobody is told the outcome of anything, and nobody is told whether their save worked.
