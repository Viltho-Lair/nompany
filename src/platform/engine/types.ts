// WHAT A RECORD TYPE MAY DECLARE, AND WHAT AN INSTANCE MAY HOLD.
//
// P4b IS RUNTIME: a record type is a ROW, so `tsc` cannot see a tenant's shape.
// This file and the Zod schema built from it are the ONLY guard, which is why
// the field kinds below are a CLOSED SET rather than free-form — a schema built
// from arbitrary input is not a guard.
//
// NO IMPORTS, deliberately, and asserted by a test: the type editor refuses
// exactly what the server refuses, with one implementation between them.

export const FIELD_KINDS = [
  "text", "longtext", "number", "money", "date", "boolean",
  "select", "collaborator", "reference",
] as const;
export type FieldKind = (typeof FIELD_KINDS)[number];

export type FieldDecl = {
  key?: unknown;
  label?: unknown;
  kind?: unknown;
  /** `select` only. A select with none is a field nobody can fill in. */
  options?: unknown;
  /** `reference` only — the typeKey this points at. */
  refType?: unknown;
  required?: unknown;
};

export type TransitionDecl = { from?: unknown; to?: unknown };

export type TypeDecl = {
  key?: unknown;
  label?: unknown;
  parentSectionKey?: unknown;
  fields?: unknown;
  columns?: unknown;
  statuses?: unknown;
  transitions?: unknown;
  version?: unknown;
};

const text = (v: unknown) => String(v ?? "");
const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? v : []) as T[];

/**
 * A KEY THAT SURVIVES BOTH A URL AND A PERMISSION. The type key becomes one
 * path segment and the middle of `engine.<typeKey>.<verb>`, so it is
 * constrained to what both accept — lower case, no dots, no spaces.
 */
export const KEY_RE = /^[a-z0-9][a-z0-9-]*$/;
/** A field key becomes a property name on a stored row. */
export const FIELD_KEY_RE = /^[a-z][a-zA-Z0-9_]*$/;

export function fieldProblem(field: FieldDecl): string | null {
  if (!FIELD_KEY_RE.test(text(field?.key))) return "key";
  if (!text(field?.label).trim()) return "label";
  const kind = text(field?.kind);
  if (!(FIELD_KINDS as readonly string[]).includes(kind)) return "kind";
  if (kind === "select" && !list<string>(field?.options).filter((o) => text(o).trim()).length) {
    return "options";
  }
  if (kind === "reference" && !KEY_RE.test(text(field?.refType))) return "reference-target";
  return null;
}

export function typeProblem(
  decl: TypeDecl,
  existing: readonly TypeDecl[],
  editingKey = "",
): string | null {
  const key = text(decl?.key);
  if (!KEY_RE.test(key)) return "key";
  if (!text(decl?.label).trim()) return "label";
  if (!KEY_RE.test(text(decl?.parentSectionKey))) return "parent";

  if (existing.some((t) => text(t.key) === key && text(t.key) !== editingKey)) {
    return "duplicate";
  }

  const fields = list<FieldDecl>(decl?.fields);
  if (!fields.length) return "fields";
  const seen = new Set<string>();
  for (const f of fields) {
    const problem = fieldProblem(f);
    if (problem) return problem;
    if (seen.has(text(f.key))) return "duplicate-field";
    seen.add(text(f.key));
  }

  // A COLUMN NAMING NO FIELD would render an empty list column for ever.
  for (const c of list<string>(decl?.columns)) {
    if (!seen.has(text(c))) return "column";
  }

  const statuses = new Set(list<string>(decl?.statuses).map(text));
  for (const t of list<TransitionDecl>(decl?.transitions)) {
    if (!statuses.has(text(t.from)) || !statuses.has(text(t.to))) return "transition";
  }
  return null;
}

/**
 * WHETHER A MOVE IS DECLARED. Unlike a hand-built register the chain is data,
 * so this is the whole of the rule — there is no second opinion in a service.
 *
 * TWO REFUSALS, AND THEY ARE WORTH DIFFERENT STATUSES.
 *
 * AN UNKNOWN VALUE IS STALE; AN UNKNOWN PAIR IS A DIFFERENT ASK. That is the
 * whole of the split, and it is stated carefully because the first version of
 * this comment rested it on the wrong thing: "the list is a ROW, so the likeliest
 * cause is a screen holding a declaration the studio has since edited". That is
 * true of BOTH refusals — a studio that deletes a TRANSITION while keeping both
 * statuses leaves exactly the same stale screen, and that one answers 400. The
 * declaration being a row is why this file exists at all; it does not separate
 * these two.
 *
 * `wrong-state` (409) is a status the type does not declare AT ALL — a VALUE
 * that has ceased to exist. Re-reading the type is the entire repair, because
 * the value the caller used is gone from it: "the request was fine, the world
 * has moved on", which is what `wrong-state` means in
 * `platform/http/httpStatus.ts`, where it already stands for the signable
 * transition table refusing a move. It is deliberately not `status`, which eight
 * modules use for "you sent a status value we do not recognise" and which is
 * correctly 400 there: in those the list is CODE, so a bad value is the caller's
 * own mistake with nothing to re-read.
 *
 * `not-allowed` STAYS 400. Both statuses ARE declared and the move between them
 * is not — Issued back to Draft, when no transition says so. No refresh makes an
 * undeclared move legal: the declaration as it stands is what refuses, so the
 * caller is not behind the world, they are asking for something else and have to
 * ask for something else again.
 */
export function transitionProblem(decl: TypeDecl, from: unknown, to: unknown): string | null {
  const statuses = new Set(list<string>(decl?.statuses).map(text));
  if (!statuses.has(text(to))) return "wrong-state";
  const allowed = list<TransitionDecl>(decl?.transitions)
    .some((t) => text(t.from) === text(from) && text(t.to) === text(to));
  return allowed ? null : "not-allowed";
}

/**
 * ONE STORED VALUE, READ THROUGH ITS DECLARATION.
 *
 * NULL RATHER THAN NOUGHT for a number nobody filled in: nought is a real
 * answer and an empty field is not, and a list column showing 0 for both is the
 * bug this product has fixed a dozen times elsewhere.
 */
export function coerceValue(field: FieldDecl, raw: unknown): unknown {
  switch (text(field?.kind)) {
    case "number":
    case "money": {
      if (raw === "" || raw === null || raw === undefined) return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    }
    case "boolean":
      return raw === true || raw === "true" || raw === "yes" || raw === 1;
    case "date":
      return text(raw).slice(0, 10);
    default:
      return text(raw);
  }
}

/**
 * A STORED ROW READ THROUGH THE TYPE AS IT IS NOW.
 *
 * A FIELD REMOVED FROM THE TYPE IS NOT RETURNED AND NOT DELETED. It stays in
 * the store because it is the only record of what the row said when somebody
 * signed it; it stops being rendered because the type no longer declares it.
 * That is what makes a version change harmless — the reader coerces, exactly as
 * `normalizeTask` and `planProgress` already do at their own boundaries.
 */
export function coerceRecord(
  decl: TypeDecl,
  stored: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of list<FieldDecl>(decl?.fields)) {
    out[text(f.key)] = coerceValue(f, (stored || {})[text(f.key)]);
  }
  return out;
}

/**
 * WHAT A WRITE PUTS IN `values`: the incoming body read through the
 * declaration, LAID OVER what is already stored rather than replacing it.
 *
 * THE OTHER HALF OF THE RULE ABOVE, and without it that rule is only half
 * true. `coerceRecord` stops RENDERING a field the type no longer declares;
 * this is what stops the next EDIT from deleting it. A read that hides a value
 * and a write that rebuilds `values` from the current declaration agree on
 * every row right up until the type loses a field — and then the read is right
 * and the write silently destroys the value, which is the only record of what
 * the row said when somebody signed it. An edit is the one operation that can
 * do that.
 *
 * IT IS NOT A SHAPE THAT CANNOT ARRIVE. A built-in type's fields change by
 * DEPLOY, so version 1's rows are in the store the moment version 2 ships, and
 * the first edit after it is where they would go. This is the store half of
 * what the reader already honours: absent from the render, present in the
 * store.
 *
 * DECLARED FIELDS STILL COME WHOLLY FROM THE BODY — an edit REPLACES every
 * field the type declares, so omitting one clears it rather than leaving the
 * old value standing. Only keys the declaration no longer names are carried
 * through, and nothing here can invent one: `coerceRecord` writes exactly the
 * declared keys, so a body naming a field the type never had is dropped on the
 * way in exactly as it always was.
 *
 * A CREATE PASSES NO STORED VALUES and gets the declaration's own keys and
 * nothing else, which is what it got before this existed.
 */
export function mergeRecord(
  decl: TypeDecl,
  stored: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  return { ...(stored || {}), ...coerceRecord(decl, incoming) };
}
