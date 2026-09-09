# API keys — letting a program act inside a studio

A tab on Master data (`/<slug>/administration-master`), stored under
`S.apiKeys(studioId)` with a global digest index at `REG.apiKeyIndex`. **No new
permission key** — the register answers to `administration.settings.*`, and what
actually bounds a key is invariant 5.

## What it is

**A key is a second proof of an identity the product already has, never a second
door.** It resolves to a COLLABORATOR (invariant 6) and the request then runs
the identical path a browser request runs: the same `studioContext`, the same
membership check, the same `effectivePermissions`. Invariants 2, 3 and 4 are
untouched.

What it adds is a **narrowing** of what that person may do through this
particular string.

## The security model

**`effectiveScopes` is the whole of it.** A key's scopes are checked against its
creator's rights when it is minted — invariant 5, nobody grants what they do not
hold — and *that check is worthless on its own, because rights shrink*. Somebody
demoted out of Finance still holds a key minted while they had it. So what a key
may do is the **intersection** of its stored scopes with what its owner may do
**right now**. Revoking a person's role revokes their keys' reach in the same
act, which is the only behaviour an administrator can reason about.

**The narrowing happens inside `studioContext`, where access is resolved once.**
The first version narrowed the access set *after* the module context was built —
`{ ...context, access: scoped }` — and it was wrong in a way that looked right:
`canManage`, `nav`, `manage` and every per-block flag are DERIVED inside the
builder from the access it resolved, so a key holding one HR permission received
a payload computed as if it were the owner. Measured, not reasoned about: the
key saw 91 of 91 nav entries and `canManage: true`. It now sees 3 of 91 and
`canManage: false`.

**The scopes ride the request, in an `AsyncLocalStorage`.** There is no
parameter to thread a credential's scopes through fourteen context builders, and
the alternative — narrowing inside `effectivePermissions` — would be wrong:
`hr.ts` calls it for OTHER collaborators to find who may approve a leave
request, so an API request would silently decide that nobody in the studio may
approve anything. It narrows the CALLER, never a subject.

**Null and empty are different.** No key means "do not narrow"; an empty scope
array means "a key is involved and it may do nothing", which is what a fully
demoted holder's key resolves to. Collapsing them would give that key the full
access of the person it acts as.

**A key authenticates `auth: "studio"` routes only.** It belongs to one studio,
so it can no more authenticate a console request or an account-page request than
a slug can authorise one. Verified: `/api/account/calendar` answers 401.

**The slug must be the key's own studio**, compared against what the slug
resolves to rather than trusting either alone. A key pointed at another studio's
URL fails the way any non-member fails.

**Four failures are indistinguishable**, all 401: unknown key, revoked key,
expired key, wrong studio. And a token that does not resolve is refused rather
than falling through to the cookie — somebody presenting a revoked key while
holding a stale session would otherwise be served as themselves, and the
revocation would appear not to have worked.

## The key itself

**Returned once, stored never.** 32 bytes from `randomBytes`, base64url, behind
an `nk_` prefix so a key found in a log or a paste is recognisable as this
product's — which is what makes automated secret scanning possible. Only a
SHA-256 digest is stored, plus the first nine characters in clear so a register
can name a row.

**SHA-256 and not bcrypt, deliberately.** Bcrypt's work factor exists to slow
guessing of LOW-ENTROPY input — a password somebody chose. A 256-bit random key
cannot be guessed, and per-request bcrypt would put ~100ms of CPU on every API
call to defend against an attack that cannot be mounted. The comparison is
constant-time all the same, because the habit is what protects the day somebody
compares a raw key there.

**A cheap gate comes before any lookup.** A token that is not shaped like one of
ours costs a regex and nothing else — `/api/track` is this codebase's reminder
of what an unbounded read costs when anybody can trigger it.

## The register

**A key needs a name**, because six rows reading `nk_a1b2c3…` is a register in
which the safe act — revoking the one that leaked — cannot be told from the
destructive one.

**A key with no permissions is refused**: a live secret whose only property is
that it can be stolen (invariant 16, with a credential attached).

**Revoke, never delete.** The row stays, marked revoked, because a key that
vanishes takes with it the only record of what it could reach and when it was
last used — precisely what somebody investigating a leak needs. **Any holder of
`administration.settings.edit` may revoke any key**, including one minted with
rights they lack: invariant 5 governs granting, and a rule that stopped an
administrator killing a leaked key would be working exactly backwards.

**Index order is load-bearing.** Issuing writes the register first and the index
second; revoking removes the index first. Both fail toward "the key does not
work" — a 401 and a retry — rather than toward "the key resolves to nothing" or
"a revoked key still opens the door".

**A key expires ON its date, not after it.** "Valid until" that silently means
"valid through" is a day of access nobody agreed to. Expiry is checked at
resolution, so it needs no cron.

**`lastUsedAt` moves at most once an hour.** The register is one document, so a
write per request would compare-and-set the same row on every call — the queue
invariant 9 describes, except it never empties. The cost is that a key used at
10:59 and revoked at 11:00 may read as last used at 10:00; the screen says so.

**No PUT.** Widening a key would be a grant with no record of having been made;
narrowing one silently breaks an integration nobody warned. Issue another and
revoke this one, which leaves both facts in the register.

## Not built yet

- **No webhooks.** This is the inbound half of "Integrations & API" only.
  Nothing calls out to a studio's own endpoint when a record changes.
- **No rate limiting on keys.** A key is bounded by its scopes and nothing else;
  a compromised read key can read as fast as the database answers.
- **No IP allow-list** and no per-key origin restriction.
- **No OpenAPI document or client.** The API is the studio's existing routes,
  which are shaped for the product's own screens rather than for third parties,
  and nothing describes them.
- **No key rotation.** Overlapping validity means issuing a second key and
  revoking the first by hand.
- **Nothing notifies on issue or on first use.** A key minted by a compromised
  session is invisible until somebody reads the register.
- **The audit log records `key:<id>`** as the actor, and no screen surfaces the
  audit log, so tracing a key's activity means reading the store.
- **`grantable` is the creator's whole permission set**, ~200 rows for an owner,
  offered as a searchable checklist. There is no grouping and no preset.
