// A SIGNABLE — anything two named people put their names to before it is issued.
//
// This started life inside modules/quality/quality.js, moving a controlled document's
// revision along author → reviewer → approver. It comes out here because a
// generated document — a quotation, a delivery note, a training record — goes
// through exactly the same ladder, and those live in their own module rather
// than in Quality. Two copies of a state machine is two copies that agree until
// the first time either changes.
//
// WHAT IS GENERIC is the part that must never differ: which moves are legal from
// which state, and which right each one needs. THE SIGNATURES themselves — the
// review and the approval, and that nobody signs both halves — are the
// Approvals page's since 19/09/2026 (the `document-revision` type, with
// `distinctSigners`); what is left here is the roles a signature is recorded
// under, which the revision still stores.
//
// WHAT IS NOT GENERIC is what a move MEANS. Publishing a procedure supersedes
// its predecessor and tells the people who work to it; publishing a delivery
// note does neither. Those consequences stay with the module that owns the
// record, handed in as `after`.

import { requirePermission } from "@/platform/access";
import type { PermissionKey, PermissionSet } from "@/platform/access";

// The role a signature slot is recorded under, as the revision stores it.
export const SIGNATURE_ROLES: Record<string, string | undefined> = { review: "Reviewed by", approval: "Approved by" };

const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/**
 * Move one signable along its ladder.
 *
 * @param {object} spec
 *   access      — the caller's permission set, for requirePermission
 *   actor       — { id, alias }
 *   transitions — the table: { action: { from[], to, permission, label } }
 *   row         — the signable as it currently stands
 *   apply       — (patch) => the updated row, or null
 *   after       — optional (action, patch, now) => void, for what the move MEANS
 *   audit       — optional (entry) => void
 *   notify      — optional (state) => void, told where it now sits
 */
/**
 * ONE TRANSITION on a signable — who may make it, what it moves from, and what
 * it moves to. `permission` is a catalogue key; `from` is the states it is
 * legal out of, which is what makes an out-of-order move a refusal rather than
 * a silent overwrite.
 */
export type Transition = {
  permission: string;
  from: readonly string[];
  to: string;
  label?: string;
};

/** What a caller hands `moveSignable`: the row, who is acting, and the ladder. */
export type SignableSpec = {
  access: PermissionSet;
  actor?: { id?: string; alias?: string };
  transitions: Record<string, Transition>;
  row: Record<string, unknown> | null | undefined;
  auditPrefix?: string;
  apply: (patch: Record<string, unknown>) => Promise<unknown>;
  after?: (moved: string, patch: Record<string, unknown>, now: string) => Promise<unknown> | unknown;
  audit?: (entry: Record<string, unknown>) => Promise<unknown> | unknown;
  /** Told where it now sits. A workflow that waits silently waits forever. */
  notify?: (state: string) => Promise<unknown> | unknown;
};

export async function moveSignable(
  spec: SignableSpec,
  action: string,
  body: Record<string, unknown> = {},
) {
  const move = spec.transitions?.[action];
  if (!move) return { error: "unknown-action" };

  const denied = requirePermission(spec.access, move.permission as PermissionKey);
  if (denied) return denied;

  const row = spec.row;
  if (!row) return { error: "no-revision" };
  if (!move.from.includes(String(row.state))) return { error: "wrong-state", state: row.state };

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { state: move.to, updatedAt: now };

  const updated = await spec.apply(patch);
  if (!updated) return { error: "notfound" };

  // What the move MEANS, which only the owning module knows.
  if (spec.after) await spec.after(action, patch, now);

  if (spec.audit) {
    await spec.audit({
      action: `${spec.auditPrefix || "revision"}.${action}`,
      note: text(body?.note, 200),
      state: move.to,
    });
  }

  // Tell whoever it now sits with. A workflow that waits silently is a workflow
  // that waits forever.
  if (spec.notify) await spec.notify(move.to);

  return { row: { ...row, ...patch } };
}

// Which moves this person could make right now. Read by the screen so a button
// is only ever drawn where pressing it would succeed — and computed from the
// same table the move above enforces, so the two cannot disagree.
export function availableMoves(
  transitions: Record<string, Transition> | null | undefined,
  state: string,
  holds: (permission: string) => boolean,
) {
  return Object.entries(transitions || {})
    .filter(([, move]) => move.from.includes(state) && holds(move.permission))
    .map(([action, move]) => ({ action, label: move.label }));
}
