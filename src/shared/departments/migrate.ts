// WHAT THE DEPARTMENTS MIGRATION WOULD DO, decided without a store.
//
// The mapping used to live inside scripts/migrate/departments.mjs, interleaved
// with the reads, the writes and the console output — which meant the only way
// to find out what it would do was to run it against a database, and the only
// way to be sure it was idempotent was to run it twice and squint. A migration
// is the one kind of code that gets run once, against live data, by somebody who
// cannot undo it; deciding what it does is exactly the part that should be
// assertable on a laptop with no connection.
//
// So the CLI reads, calls this, and writes. This decides.
//
// THE ONE RULE THAT MATTERS: it re-points people whose `departmentId` still
// holds a SECTION KEY, and it does nothing else. It does not place the
// unplaced, does not merge, does not rename, and does not map anybody onto the
// starter chart for their trade — noticing that a construction studio's
// "projects" people probably belong in Site Execution would be a guess the
// studio cannot see happening and cannot undo.

/** Only the fields the plan reads. The stored rows carry more. */
export type MigratableDepartment = { id: string; name?: string; sectionKeys?: string[] };
export type MigratablePerson = { id: string; departmentId?: string };

export type DepartmentMigrationPlan = {
  /** Legacy values with no department to land on. One row each, in first-seen order. */
  create: { key: string; name: string; sectionKeys: string[] }[];
  /** Legacy value → the id of an existing department that already covers it. */
  reuse: Record<string, string>;
  /** Ids of the people whose departmentId is one of those legacy values. */
  moving: string[];
};

/**
 * Plan the migration for ONE studio.
 *
 * `sectionNames` is the studio's own section list as `{ key: name }`, so a
 * department created here is named after the section people were filed under —
 * "CRM & Sales", not "crm-sales". A studio that renamed its sections gets its
 * own words, which is the point of reading them rather than restating them.
 *
 * IDEMPOTENT BY CONSTRUCTION, not by a flag: the legacy set is defined as the
 * values that are NOT department ids, so once a person has been re-pointed they
 * cannot appear in it again. Re-running plans nothing. That is asserted rather
 * than asserted-in-a-comment — see tests/departments-model.mjs.
 */
export function departmentMigrationPlan({
  people,
  departments,
  sectionNames,
}: {
  people: readonly MigratablePerson[];
  departments: readonly MigratableDepartment[];
  sectionNames: Readonly<Record<string, string>>;
}): DepartmentMigrationPlan {
  const isDepartment = new Set(departments.map((d) => d.id));

  // BLANK IS LEFT BLANK. An unplaced person stays unplaced: filing them
  // somewhere would be this script inventing an org chart fact nobody stated.
  const legacy: string[] = [];
  const seen = new Set<string>();
  for (const person of people) {
    const value = String(person.departmentId || "");
    if (!value || isDepartment.has(value) || seen.has(value)) continue;
    seen.add(value);
    legacy.push(value);
  }

  const create: DepartmentMigrationPlan["create"] = [];
  const reuse: Record<string, string> = {};

  for (const key of legacy) {
    // A value with no matching section is not necessarily corrupt — a section
    // can be renamed or removed — so it is carried through under its own name
    // rather than dropped. Visible and fixable beats silently vanished.
    const name = sectionNames[key] || key;
    // REUSE ONLY ON AN EXACT NAME MATCH, and never on the section link.
    //
    // This matched `sectionKeys.includes(key)` too, and that was a silent
    // mis-filing waiting to happen. FIVE seeded departments claim "crm-sales"
    // across the starter charts — Sales & Marketing, Business Development,
    // Retail Operations, Wholesale & Key Accounts, Customer Service — so on any
    // studio whose register had been seeded before this ran, everybody filed
    // under CRM & Sales would have been absorbed into whichever of those
    // happened to be found first. A contractor's sales team would silently
    // become Business Development. Nobody asked for that, nobody could see it
    // happen, and undoing it needs a record of where people were that the
    // migration has just overwritten.
    //
    // And seeding first is the DEFAULT ORDER now, not an edge case: the register
    // seeds lazily the first time anybody opens HR, which happens long before
    // anyone thinks to run a migration.
    //
    // The name match is what makes it idempotent, and it is enough on its own: a
    // half-run leaves a department named exactly after the section, so the
    // resumed run finds it. A department the studio named something else is a
    // department the studio meant something else by.
    const already = departments.find((d) => (d.name || "") === name);
    if (already) { reuse[key] = already.id; continue; }
    create.push({ key, name, sectionKeys: sectionNames[key] ? [key] : [] });
  }

  const affected = new Set(legacy);
  const moving = people
    .filter((p) => affected.has(String(p.departmentId || "")))
    .map((p) => p.id);

  return { create, reuse, moving };
}

/** Whether a plan would change anything at all — the CLI's "skip this studio" test. */
export const planIsEmpty = (plan: DepartmentMigrationPlan): boolean =>
  plan.create.length === 0 && Object.keys(plan.reuse).length === 0 && plan.moving.length === 0;
