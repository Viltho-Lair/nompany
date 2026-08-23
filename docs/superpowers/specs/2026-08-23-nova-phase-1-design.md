# Nova — Phase 1 Design (Ask-Nova + self-service actions)

**Status:** approved direction (user, 23/08/2026), building in increments.
**Scope:** Phase 1 only. Guided help (Phase 2) and proactive insights (Phase 3)
are deferred and out of this spec.

## 1. What Nova is (Phase 1)

A per-user, in-studio assistant that:

1. **Answers questions** from the studio's data, filtered to exactly what the
   asking collaborator may see.
2. **Performs simple self-service actions** the user could already do by hand —
   request leave, raise a ticket, log an expense — through the *existing*
   permission-checked services, after conversational elicitation and a **hard
   confirm** before any write.

Nova can never read or do anything the asking user could not. That is the whole
security posture, and §4 makes it structural rather than a promise.

**Settled scope decisions (user):** read + curated actions (not read-only);
**unlimited** when the package includes Nova (no usage meter in v1);
**session-only** memory (the client holds the transcript and sends it each turn;
nothing persisted server-side, so no cascade work); Claude via the Anthropic API.

## 2. Two gating layers

- **Availability — the package `novaHeadEnabled` switch** (SHIPPED). A studio on a
  package with Nova off has no Nova at all. Resolved through `planOf` as
  `plan.novaEnabled`.
- **Capabilities — the `/super → Application → Nova` switchboard** (this phase). A
  platform-wide registry of every Nova capability with an on/off per capability.
  Nova offers a capability only if it is (a) switched on here AND (b) the asking
  user holds its permission (checked live). Default-enabled = the safe
  low-privilege set (§3); everything else ships in the catalogue but default-off,
  for nompany to enable deliberately.

Stored as one small registry value (`REG.novaConfig`): `{ enabled: { [capKey]:
boolean } }`. Absent key ⇒ the capability's built-in default.

## 3. The capability registry

One client-safe registry, `src/lib/nova/capabilities.ts`, enumerating every
capability as `{ key, label, department, kind: "read"|"action", permissionKey,
scope, defaultOn, fields? }`. It is the single source for both the `/super`
switchboard (labels/grouping) and Nova's tool builder (§4). Drawn from the
capability research (23/08/2026).

**Read capabilities (default-on)** — each enforces its own leaf permission key
(see §4, the coarse-gate tightening): Sales tickets/clients; Technical
RFQs/quotations; Projects/SLAs/overtimes; Tasks board (+ "mine"); Quality docs;
HR my-record/my-leave/employees/certifications; Finance invoices/expenses/
summary/bills/assets; Inventory vendors/items/stock/orders/deliveries/AWB;
Operations locations/permits/shifts/positions; Main headlines; my notifications.

**Action capabilities:**
- **Default-ON (genuinely low-privilege member self-service):** `requestVacation`
  (HR), self-cancel my pending leave (`decideVacation` self-branch), `markRead`
  (notifications), `reportPosition`/`clearPosition` (Operations, self),
  own-task-advance (`updateTask` assignee branch), add a comment to a ticket
  (`editTicket` `{addComment}`), `requestJoinByCode`.
- **Default-OFF (in catalogue, admin may enable):** `createTicket`, `createTask`,
  `createExpense`, `createInvoice`, `createBill`, `createAsset`, inventory
  creates, operations creates, quality `createDoc`, `requestRfq`, and the other
  manage-gated creates. Consequential or manage-gated; live permission check
  still applies on top.
- **Excluded from Phase 1 entirely** (not in the registry): every `remove*`,
  every approval/review/sign-off/decision, role/permission writes, settings
  writes, `openProject`/`createShift`/`saveSheetLine` (multi-step / cross-seam).

**Known gaps handled here, not worked around silently:**
- **No leave-balance model exists.** Nova approximates "remaining" by summing the
  caller's Approved+Pending `days` from `listVacations`, and *says it is an
  approximation*. Building a real entitlement model is a possible later request,
  not Phase 1.
- **Analytics are pure client-side functions with no route.** v1 read tools return
  the concrete lists; Nova computes simple counts/sums itself. Deep dashboard
  analytics are not a v1 tool.
- **The general ledger is unrouted.** Ledger reads are not v1 tools.

## 4. Security model — invariant 2 by construction

Every tool call executes on the server inside the **asking user's own
`studioContext`** (the same membership + `effectivePermissions` resolution the
UI uses). Nova is handed no ambient studio access of its own; it can only invoke
tools, and each tool re-derives the user's context per call.

- **Read tools tighten the coarse gate.** The research found department GETs are
  gated once by `sectionViewable` (any child `.view`), so the aggregate over-
  shares. Each Nova read tool therefore calls `requirePermission(ctx.access,
  <leafKey>)` *itself* before returning rows — e.g. the invoices tool requires
  `finance.cash.view`, not merely "can view some Finance". Nova is stricter than
  the current screens, never looser.
- **Action tools reuse the self-guarding service.** They call the same
  `requestVacation`/`createExpense`/… the routes call, which already
  `requirePermission` and enforce their invariants (7, caps, overlaps). Nova adds
  nothing that could bypass them.
- **A disabled capability is not built into the toolset at all** for that request,
  so the model cannot call it — the switchboard is enforced server-side, not by
  prompt.
- **Confirm-before-write.** Action tools are two-step: `prepare` validates and
  returns a human-readable preview + a token; `submit` performs the write only
  when given that token, and the UI requires an explicit user click. The model
  cannot submit without the user confirming.
- **No cross-tenant reach.** Tools take no studio id from the model; the studio is
  the one in the request path, resolved to a membership before any tool runs. A
  non-member request never reaches a tool.

## 5. Provider & the chat endpoint

- **`src/platform/nova/client.ts`** — a thin `@anthropic-ai/sdk` wrapper reading
  `ANTHROPIC_API_KEY` from env. When the key is absent it returns a clean
  "Nova isn't configured" result rather than throwing, so the app builds and runs
  without it; live activation is the user adding the key in Vercel.
- **Model:** default `claude-sonnet-5` (good tool-use/latency/cost balance for an
  in-app assistant), overridable via `NOVA_MODEL` env.
- **`POST /api/studios/[slug]/nova`** — `auth: "studio"`, gated on
  `plan.novaEnabled` (403 `nova-off` otherwise). Body: the session transcript
  (client-held) + the new user message. Runs the tool-calling loop:
  1. Build the toolset from the ENABLED ∩ PERMITTED capabilities for this user.
  2. Call the model; on a tool_use, execute the tool in the user's context,
     append the tool_result, loop. Bounded by `NOVA_MAX_TURNS` (e.g. 6) so a
     runaway never loops forever.
  3. Stream assistant text back over the existing SSE bus as it arrives.
- **Streaming:** reuse the app's self-hosted SSE (one connection per tab,
  invariant 14) — Nova tokens ride a per-request channel; the panel subscribes
  for the duration of the answer.

## 6. The `/super → Application → Nova` switchboard

A new console page `src/app/super/(shell)/application/nova/page.js` + a nav entry
in `src/app/super/_components/nav.js`. Groups the capability registry by
department; each row is a switch bound to `REG.novaConfig.enabled[key]`, with the
built-in default shown when unset. Read via `GET /api/super/nova-config`, written
via `PUT` (console-auth), mirroring `catalog-settings`. Kind (read/action) and
the permission key are shown per row so the operator sees what enabling grants.

## 7. Chat UX

A slide-over **Nova panel** in the studio shell (the mascot `AiAssistant` as its
avatar), opened from a shell control, shown only when `plan.novaEnabled`.
Session-only transcript in component state; streaming answers; an action preview
renders as a card with a **Confirm** button that calls `submit`. Reduced-motion
respected; RTL via logical props; `motion/react` stays out of the studio chunk
(the mascot is already fenced to `components/landing` — the studio panel uses a
static or CSS-driven avatar, not the landing animation, to honour Gate A block 5).

## 8. Data model / storage

- **Chat:** nothing persisted (session-only). No new Redis records, no cascade.
- **Switchboard config:** one `REG.novaConfig` JSON value, platform-scoped, edited
  in `/super`. Keys added in `src/platform/db/keys.ts`.
- **Package flag:** `novaHeadEnabled` on the package record (SHIPPED).

## 9. Testing

- Capability registry: every entry names a real exported function and a real
  permission key (a Gate A source-scan, like block 9 for widgets).
- `novaConfig` resolution: enabled ∩ default logic (pure, tested).
- The toolset builder: given a user's access + config, the exposed tools are
  exactly ENABLED ∩ PERMITTED (pure, tested with constructed access sets — proves
  a disabled or unpermitted capability is absent from the toolset).
- Read-tool leaf enforcement: a user with only a sibling `.view` is refused the
  tightened read (proves the coarse-gate tightening).
- Action `prepare`/`submit`: `submit` without a valid prepare token is refused;
  `prepare` surfaces the underlying service's validation refusals.
- Provider absence: the endpoint returns `nova-off`/`not-configured` cleanly with
  no key set (so CI, which has no key, stays green).
- Bundle: the Anthropic SDK is server-only; it must not enter any client chunk.

## 10. What needs the user

- **`ANTHROPIC_API_KEY` in the Vercel env** — the one blocker to Nova functioning
  on live. Everything ships gated behind it; the app builds and the switchboard
  works without it.
- **Which capabilities to switch on** beyond the safe defaults — done in `/super`,
  no code needed.

## 11. Build order (each increment verified + pushed to live)

1. **Package Nova Head switch** — ✅ SHIPPED.
2. **Capability registry + `novaConfig`** — ✅ SHIPPED.
3. **`/super → Application → Nova` switchboard** — ✅ SHIPPED.
4. **Provider client + `/api/.../nova` endpoint + tool-calling loop + toolset
   builder** — ✅ SHIPPED. Went beyond the spec: **multi-provider BYOK** (the user
   brings their own Claude / ChatGPT / Gemini key, set in account settings,
   stored encrypted; the endpoint decrypts theirs and calls their provider). Read
   tools cover all twelve departments.
5. **Action framework** (prepare → confirm → submit) — ✅ SHIPPED, seeded with
   request-leave, mark-read, comment-ticket, advance-my-task. The model only
   prepares; the Confirm click posts to `/nova/act`, which re-gates and runs the
   service under the user.
6. **Chat UX** — ✅ SHIPPED. The Nova-head launcher (static mascot, bigger than
   chat, side-by-side with it), a proactive attention badge, Escape-to-close,
   and action-confirm cards. **Streaming deferred** — answers return whole; a
   streaming pass is a later refinement.

**Phase 1 is functionally complete.** The one live blocker was the API key, now
solved per-user (BYOK): a person sets their key in account settings and Nova
works. Deferred within Phase 1: response streaming, and the remaining action
plugins (report-position needs device geolocation; cancel-leave). Phases 2
(guided help) and 3 (proactive insights) remain out of scope here.
