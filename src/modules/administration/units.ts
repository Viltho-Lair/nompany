// WHAT A STUDIO COUNTS IN.
//
// `UNITS` WAS EIGHT STRINGS IN `modules/inventory/inventory.ts` — pcs, box, m,
// m², kg, L, set, roll — and `createItem` silently replaced anything else with
// the first of them. So a merchant selling cement in bags got "pcs", a steel
// stockist counting tonnes got "pcs", and neither had any way to say otherwise.
// Worse than a refusal: the item saved, looked right, and was wrong.
//
// THE SAME SHAPE AS THE NUMBERING SERIES, deliberately. A unit list is studio
// configuration stored on the studio record beside `currency`, `numbering` and
// the approval chains; the defaults ship with the product and a studio ADDS to
// them rather than replacing them, so nothing an existing item already uses can
// be taken away by an edit.
//
// PURE. No imports, no store — the screen offers exactly what the server
// accepts, and the rules are asserted without a database.

/** What every studio starts with. Copied from the list this replaces. */
export const DEFAULT_UNITS: readonly string[] = Object.freeze([
  "pcs", "box", "m", "m²", "kg", "L", "set", "roll",
]);

// A unit is short and printable: it goes in a table column beside a number and
// on a printed quotation. No commas — a CSV export of items would break the row
// — and no quotes, for the same reason. Internal spaces are fine: "sq ft" and
// "man hour" are units, and the value is trimmed before it gets here, so a
// pasted " kg" is the kg it looks like rather than a refusal.
const UNIT_RE = /^[^,"']{1,12}$/;

export const cleanUnit = (v: unknown): string => String(v ?? "").trim();

/**
 * WHAT IS WRONG WITH THIS LIST, or an empty array.
 *
 * Reasons rather than a boolean, so the screen shows them all at once — the
 * shape `numberingProblems` and `chainProblems` use.
 */
export function unitProblems(units: unknown): string[] {
  const problems: string[] = [];
  const list = Array.isArray(units) ? units : [];
  if (!Array.isArray(units)) return ["units must be a list"];
  if (list.length > 60) problems.push("no more than 60 units");

  const seen = new Set<string>();
  for (const raw of list) {
    const unit = cleanUnit(raw);
    if (!unit) { problems.push("a unit cannot be blank"); continue; }
    if (!UNIT_RE.test(unit)) {
      problems.push(`"${unit}" must be 1-12 characters and contain no comma or quote`);
      continue;
    }
    // CASE-INSENSITIVELY UNIQUE. "Kg" and "kg" in one dropdown is a choice
    // nobody can make correctly, and the two would then divide an item list in
    // half on any grouping.
    const key = unit.toLowerCase();
    if (seen.has(key)) problems.push(`"${unit}" is listed twice`);
    seen.add(key);
  }
  return problems;
}

/** The studio's own additions, cleaned. Defaults are never stored. */
export function cleanUnits(units: unknown): string[] {
  const seen = new Set(DEFAULT_UNITS.map((u) => u.toLowerCase()));
  const out: string[] = [];
  for (const raw of Array.isArray(units) ? units : []) {
    const unit = cleanUnit(raw);
    if (!UNIT_RE.test(unit)) continue;
    const key = unit.toLowerCase();
    // A STUDIO RE-ADDING A DEFAULT IS A NO-OP rather than a duplicate: the
    // screen shows one list, and somebody typing "kg" into it means the kg that
    // is already there.
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(unit);
  }
  return out.slice(0, 60);
}

/**
 * THE LIST IN FORCE — the defaults, then the studio's own.
 *
 * DEFAULTS FIRST AND NEVER REMOVED. A studio that stops using "roll" can leave
 * it alone; taking it out of the list would orphan every item already measured
 * in rolls, and an item whose unit is not offered is an item nobody can edit
 * without changing something they did not mean to.
 */
export function unitsFor(stored: unknown): string[] {
  return [...DEFAULT_UNITS, ...cleanUnits(stored)];
}

/** Is this a unit this studio uses? Case-sensitive, as stored. */
export const isUnit = (unit: unknown, stored: unknown): boolean =>
  unitsFor(stored).includes(cleanUnit(unit));

/**
 * THE EDITOR'S ROWS — every unit in force, saying which are the studio's own.
 *
 * The same shape `numberingView` returns and for the same reason: a screen that
 * cannot tell a shipped default from a choice somebody made presents both as
 * removable, and the person who removes "kg" discovers it is still there.
 */
export function unitsView(stored: unknown): { unit: string; builtin: boolean }[] {
  return [
    ...DEFAULT_UNITS.map((unit) => ({ unit, builtin: true })),
    ...cleanUnits(stored).map((unit) => ({ unit, builtin: false })),
  ];
}
