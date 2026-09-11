// RIGHTS CATCH UP BY THEMSELVES — the owner's rule, 12/09/2026: "if ANY update
// takes place it is for the whole ERP, we do not update single studios or one by
// one studios."
//
// THE PROBLEM THIS SOLVES. `STARTER_ROLES` seeds only into an EMPTY list
// (`listRoles`), so a right added to the product reached no role that already
// existed. Every time, the answer was a script — `grant-administration.mjs`,
// `grant-permits.mjs`, `grant-maintenance.mjs` — run per studio, by hand, if
// anybody remembered. The owner never chose that; sections stopped needing it on
// 11/09/2026 (`plantMissingSections`), and this is the same move for rights.
//
// WHAT A CATCH-UP IS ALLOWED TO SAY, and it is deliberately narrow: a role that
// ALREADY HOLDS one right gains another, verb for verb. Nothing here can invent
// access for a role that held none — whoever kept the old register keeps the new
// one, and nobody else is widened. That is the exact rule the three scripts
// applied, written down where the product can run it rather than a person.
//
// FOUR PROPERTIES, each of which is a way this could go wrong:
//
//   ONCE PER ROLE. A role is marked when it is asked, whether or not it gained
//   anything, so the read is free afterwards (no write, no announcement).
//
//   A REMOVAL STICKS. Marked means asked, so a right an administrator takes off
//   a role afterwards is not handed back on the next read. Without that, this
//   file would be a permission change nobody could undo.
//
//   A NEW ROLE IS BORN MARKED. Somebody creating a role today ticks exactly what
//   they mean; adding to it tomorrow because of an entry dated yesterday would
//   be this file overruling a person.
//
//   THE WILDCARD IS SKIPPED. Admin holds everything by construction; writing a
//   list onto it would be the one thing its emptiness exists to avoid.
//
// PURE — no store, no studio. `listRoles` applies it inside one compare-and-set.

export type PermissionCatchUp = {
  /** Dated and never reused: it is stored on every role it has been asked of. */
  readonly id: string;
  /** Why this exists, for whoever reads it in a year. */
  readonly note: string;
  /** The area (or engine key) a role must ALREADY hold, verb for verb. */
  readonly from: string;
  /** What it gains, at the same verbs. */
  readonly to: readonly string[];
  readonly verbs?: readonly string[];
};

const DEFAULT_VERBS = ["view", "create", "edit", "delete"] as const;

/**
 * ADD AN ENTRY WHEN A RIGHT SHIPS THAT AN EXISTING ROLE SHOULD HAVE. Never edit
 * one that has shipped: its id is stored on every role already asked, so a
 * changed entry would reach nobody — a new id is how a second thought travels.
 */
export const PERMISSION_CATCH_UPS: readonly PermissionCatchUp[] = [
  {
    id: "maintenance-2026-09-12",
    // The Maintenance section (11/09/2026) took over what the engine's
    // `maintenance` register under Assets did. Whoever kept that register is who
    // takes the fault reports, dispatches the work and plans the calendar; every
    // other role is untouched. This is `grant-maintenance.mjs` as a rule rather
    // than a script somebody has to remember to run in every studio.
    note: "The Assets maintenance register became the Maintenance section",
    from: "engine.maintenance",
    to: ["maintenance.requests", "maintenance.orders", "maintenance.plans"],
  },
];

/** Every id, for stamping a role that is created from now on. */
export const CATCH_UP_IDS: readonly string[] = PERMISSION_CATCH_UPS.map((c) => c.id);

type RoleLike = {
  readonly wildcard?: boolean;
  readonly permissions?: readonly string[];
  readonly catchUps?: readonly string[];
};

/**
 * WHAT THIS ROLE GAINS AND WHAT IT IS MARKED WITH — or null when there is
 * nothing to do, which is the common case and the reason a read costs no write.
 */
export function catchUpFor(role: RoleLike): { permissions: string[]; catchUps: string[] } | null {
  // The wildcard already holds everything, including rights that do not exist
  // yet — it is the one role a new capability reaches without anybody deciding.
  if (role?.wildcard) return null;
  const asked = new Set(role?.catchUps || []);
  const pending = PERMISSION_CATCH_UPS.filter((c) => !asked.has(c.id));
  if (!pending.length) return null;

  const held = new Set(role?.permissions || []);
  const gained: string[] = [];
  for (const c of pending) {
    for (const verb of c.verbs || DEFAULT_VERBS) {
      if (!held.has(`${c.from}.${verb}`)) continue;
      for (const area of c.to) {
        const key = `${area}.${verb}`;
        if (!held.has(key) && !gained.includes(key)) gained.push(key);
      }
    }
  }
  return {
    permissions: [...(role?.permissions || []), ...gained],
    catchUps: [...(role?.catchUps || []), ...pending.map((c) => c.id)],
  };
}
