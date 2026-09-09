// THE STORE HALF OF `./apiKeys` — issuing, listing and revoking.
//
// GUARDED BY `administration.settings.*`, not by a right of its own. A key is
// studio-wide configuration in the same sense the approval chains and the
// numbering series are, and minting one is already bounded by the thing that
// actually matters: invariant 5, which stops anybody giving a key rights they
// do not hold themselves. A separate `administration.apiKeys` right would gate
// the register without gating the power, since the power is the creator's own.
//
// THE CRYPTO IS NOT HERE. `platform/auth/apiKeys` mints, digests and resolves,
// because that is an authentication path and authentication paths live beside
// the session and the password where a reviewer can find them all at once.

import { requirePermission } from "@/platform/access";
import { makeId } from "@/platform/db/keys";
import {
  mintKey, readKeys, storeKey, revokeKey, type StoredKey,
} from "@/platform/auth/apiKeys";
import { keyProblems, cleanKey, keyView } from "./apiKeys";
import type { MasterContext } from "./types";

const today = () => new Date().toISOString().slice(0, 10);

/** The register. Digests and keys never appear in it — see `keyView`. */
export async function listApiKeys(ctx: MasterContext) {
  const denied = requirePermission(ctx.access, "administration.settings.view");
  if (denied) return denied;

  return {
    keys: keyView(await readKeys(ctx.studio.id), today()),
    canManage: !requirePermission(ctx.access, "administration.settings.edit"),
    // WHAT THE CREATOR MAY GRANT, which is exactly what they hold. Served
    // rather than derived on the client because `has` is the authority on a
    // PermissionSet and iterating one drops every engine right — so the SCREEN
    // is handed a list and the SERVER still refuses on `has`.
    grantable: [...ctx.access].sort(),
  };
}

/**
 * ISSUE ONE. The only moment the key exists outside the caller's hands.
 *
 * IT IS IN THE RESPONSE AND NOWHERE ELSE — not in the audit log, not in the
 * register, not in a second read. A studio that loses it issues another; a
 * product that could show it again would leak every key the day the wrong
 * person opened the screen.
 */
export async function issueApiKey(ctx: MasterContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "administration.settings.edit");
  if (denied) return denied;

  const existing = await readKeys(ctx.studio.id);
  // INVARIANT 5 IS ASKED HERE, through `has` rather than through a list, so an
  // engine right the creator holds is grantable and one they do not is not.
  const problems = keyProblems(body, existing, (p) => ctx.access.has(p as never));
  if (problems.length) return { error: "refused", detail: problems.join("; ") };

  const { key, digest, prefix } = mintKey();
  const clean = cleanKey(body);
  const row: StoredKey = {
    id: makeId("key"),
    name: clean.name,
    prefix,
    digest,
    scopes: clean.scopes,
    // THE KEY ACTS AS ITS CREATOR (invariant 6), which is what makes its reach
    // narrow when they are demoted and vanish when they leave the studio.
    collaboratorId: ctx.collaborator.id,
    createdAt: new Date().toISOString(),
    lastUsedAt: "",
    revokedAt: "",
    expiresAt: clean.expiresAt,
  };
  await storeKey(ctx.studio.id, row);

  return { key, row: keyView([row], today())[0] };
}

/**
 * REVOKE ONE.
 *
 * NOT DELETE. The row stays, marked revoked, because a key that vanishes takes
 * with it the only record of what it could reach and when it was last used —
 * which is precisely what somebody investigating a leak needs.
 *
 * ANY HOLDER OF `administration.settings.edit` MAY REVOKE ANY KEY, including
 * one somebody else minted with rights they themselves lack. Revoking is the
 * safe direction: invariant 5 governs GRANTING, and a rule that stopped an
 * administrator killing a leaked key because they could not have created it
 * would be the rule working exactly backwards.
 */
export async function revokeApiKey(ctx: MasterContext, id: string) {
  const denied = requirePermission(ctx.access, "administration.settings.edit");
  if (denied) return denied;

  const gone = await revokeKey(ctx.studio.id, id);
  return gone ? { ok: true } : { error: "notfound" };
}
