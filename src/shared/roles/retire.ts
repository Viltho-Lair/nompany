// WHAT RETIRING THE FOUR GENERIC ROLES WOULD DO, decided without a store.
//
// The same shape, and the same argument, as shared/departments/migrate.ts: a
// migration is the one kind of code that gets run once, against live data, by
// somebody who cannot undo it — so the part that DECIDES belongs where it can
// be asserted on a laptop with no connection. The CLI reads, calls this, and
// deletes.
//
// It was worth doing twice for a concrete reason. The departments dry run
// reported "0 studios" against a namespace that turned out to hold none, and a
// dry run that exercises nothing is indistinguishable from one that passes.
// This function can be shown the awkward cases directly.
//
// THE RULE: a studio whose four are unheld is cleared; a studio where anybody
// still holds one is REFUSED WHOLE, and left working. Not partially cleared —
// removing the three nobody holds and leaving the fourth would be a studio in a
// state nobody chose, halfway between two role models.

/** Only the fields the plan reads. */
export type RetirableRole = { id: string; name?: string };
export type RoleHolder = { id: string; roleIds?: string[] };

/** The four, by id. Admin is deliberately absent and is never touched. */
export const RETIRED_ROLE_IDS = Object.freeze([
  "role_manager", "role_lead", "role_member", "role_viewer",
]);

export type RetirePlan = {
  /** Rows that would be deleted. Empty when the studio is refused. */
  remove: RetirableRole[];
  /** Role id → how many people hold it. Non-empty means refused. */
  holders: Record<string, number>;
  /** True when somebody still holds one, so nothing is written for this studio. */
  refused: boolean;
};

/**
 * Plan the retirement for ONE studio.
 *
 * ADMIN IS NEVER IN `remove`, whatever it is called. It is matched by id rather
 * than by name for the same reason the four are: a studio can rename a starter
 * role, and a rename must not decide whether it is deleted.
 */
export function retirePlan({
  roles,
  people,
}: {
  roles: readonly RetirableRole[];
  people: readonly RoleHolder[];
}): RetirePlan {
  const present = roles.filter((r) => RETIRED_ROLE_IDS.includes(r.id));

  const holders: Record<string, number> = {};
  for (const role of present) {
    const n = people.filter((p) => (p.roleIds || []).includes(role.id)).length;
    if (n) holders[role.id] = n;
  }

  const refused = Object.keys(holders).length > 0;
  // REFUSED MEANS NOTHING IS REMOVED, not "remove the ones that are free".
  // A studio left holding Manager and nothing else is halfway between two role
  // models, and nobody asked for that state.
  return { remove: refused ? [] : present, holders, refused };
}

/** Whether this studio needs the migration run at all. */
export const nothingToRetire = (plan: RetirePlan): boolean =>
  plan.remove.length === 0 && !plan.refused;
