// A SIGNABLE — anything two named people put their names to before it is issued.
//
// This started life inside lib/quality.js, moving a controlled document's
// revision along author → reviewer → approver. It comes out here because a
// generated document — a quotation, a delivery note, a training record — goes
// through exactly the same ladder, and those live in their own module rather
// than in Quality. Two copies of a state machine is two copies that agree until
// the first time either changes.
//
// WHAT IS GENERIC is the part that must never differ: which moves are legal from
// which state, which right each one needs, that a signature carries a name and a
// role and a moment, and that nobody signs both halves of the same thing.
//
// WHAT IS NOT GENERIC is what a move MEANS. Publishing a procedure supersedes
// its predecessor and tells the people who work to it; publishing a delivery
// note does neither. Those consequences stay with the module that owns the
// record, handed in as `after`.

import { requirePermission } from "@/lib/access";

export const SIGNATURE_SLOTS = { review: "review", approve: "approval" };
export const SIGNATURE_ROLES = { review: "Reviewed by", approval: "Approved by" };

// A signature graphic may only ever be something we already hold. The same
// shape putMedia hands back, checked here rather than trusted from the request.
const MEDIA_URL = /^\/api\/media\/[a-f0-9]{32}$/i;
const text = (v, max) => String(v ?? "").trim().slice(0, max);

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
export async function moveSignable(spec, action, body = {}) {
  const move = spec.transitions?.[action];
  if (!move) return { error: "unknown-action" };

  const denied = requirePermission(spec.access, move.permission);
  if (denied) return denied;

  const row = spec.row;
  if (!row) return { error: "no-revision" };
  if (!move.from.includes(row.state)) return { error: "wrong-state", state: row.state };

  // NOBODY SIGNS BOTH HALVES. Review and approval are two rights precisely so
  // they can be two people, and something carrying one person's name in both
  // slots has been reviewed by nobody. It belongs here rather than in the
  // permission model, because holding both rights is legitimate and using both
  // on one record is not.
  if (action === "approve" && row.review?.byCollaboratorId === spec.actor?.id) {
    return { error: "same-signer" };
  }

  const now = new Date().toISOString();
  const patch = { state: move.to, updatedAt: now };

  const slot = SIGNATURE_SLOTS[action];
  if (slot) {
    patch[slot] = {
      byCollaboratorId: spec.actor?.id || "",
      byAlias: spec.actor?.alias || "",
      role: SIGNATURE_ROLES[slot],
      at: now,
      note: text(body?.note, 400),
      // Optional, and optional on purpose: a signature is a name, a role and a
      // moment. The graphic is decoration on top of that record, so a signature
      // without one is not a lesser signature.
      signatureUrl: MEDIA_URL.test(String(body?.signatureUrl || "")) ? body.signatureUrl : "",
    };
  }

  if (action === "reject") {
    patch.rejection = {
      byCollaboratorId: spec.actor?.id || "", byAlias: spec.actor?.alias || "",
      at: now, note: text(body?.note, 400),
    };
  }

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
export function availableMoves(transitions, state, holds) {
  return Object.entries(transitions || {})
    .filter(([, move]) => move.from.includes(state) && holds(move.permission))
    .map(([action, move]) => ({ action, label: move.label }));
}
