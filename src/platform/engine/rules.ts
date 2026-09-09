// WHAT A REGISTER DOES BY ITSELF.
//
// The blueprint asks the inspection register for "pass/fail and auto-created
// NCRs on failure", and the certification register for "expiry alerts". Neither
// is a screen: both are a CONSEQUENCE — something the studio declared should
// happen, happening without anybody remembering to do it. Without that, thirty-
// one registers are thirty-one tables, and the person who fails a test is also
// the person who has to remember to go and raise the nonconformance.
//
// PURE, AND NO IMPORTS. The same posture `types.ts` takes and for the same
// reason: the decision about whether a rule fires, and what the new record
// should hold, is testable without a database, and the editor that will one day
// let a studio declare a rule must refuse exactly what the server refuses.
//
// ------------------------------------------------------------------------
// ONE TRIGGER AND ONE ACTION, DELIBERATELY
// ------------------------------------------------------------------------
// `when.status` fires on ARRIVAL at a status, and `then.create` makes a record
// in another register. That is the blueprint's own example and the shape that
// pays for itself first.
//
// TIME IS THE OTHER TRIGGER AND IT IS NOT HERE. "Certificates with expiry
// alerts" needs something that runs when nothing happened — a scheduled sweep,
// not a write — so it belongs with `cron/daily-notices` rather than in the write
// path, and it is named here so its absence reads as a decision rather than an
// oversight.

export type RuleDecl = {
  /** What makes it fire. */
  when?: { status?: unknown };
  then?: {
    create?: {
      /** The register to make a record in. */
      typeKey?: unknown;
      /**
       * A `reference` field ON THE NEW RECORD that will hold the id of the
       * record that triggered it. This is what makes the consequence traceable:
       * an NCR that cannot name the test that failed is a nonconformance nobody
       * can connect to anything.
       */
      link?: unknown;
      /** Literal values for the new record — enough to satisfy its required fields. */
      set?: unknown;
      /** Source field key -> target field key. Copied only when the source has a value. */
      carry?: unknown;
    };
  };
};

const text = (v: unknown) => String(v ?? "").trim();
const obj = (v: unknown): Record<string, unknown> =>
  (v && typeof v === "object" && !Array.isArray(v) ? v : {}) as Record<string, unknown>;

type TypeLike = {
  key?: unknown;
  statuses?: unknown;
  fields?: unknown;
  rules?: unknown;
};

const fieldsOf = (t: TypeLike) =>
  (Array.isArray(t?.fields) ? t.fields : []) as { key?: unknown; kind?: unknown; refType?: unknown; required?: unknown }[];

/**
 * WHY THIS RULE CANNOT BE DECLARED, or "".
 *
 * Every one of these is a rule that would fail SILENTLY rather than loudly. A
 * trigger status the type does not have never fires; a target register that does
 * not exist cannot be created in; a link field that is not a `reference`
 * pointing back at this type stores an id nothing will resolve. None of them
 * throws, and all of them look like a rule that simply never runs — which is
 * indistinguishable from a rule nobody has triggered yet.
 *
 * `types` is every type the studio holds, because a rule is a statement about
 * TWO registers and can only be checked against both.
 */
export function ruleProblem(
  rule: RuleDecl,
  type: TypeLike,
  types: readonly TypeLike[],
): string {
  const status = text(rule?.when?.status);
  if (!status) return "rule-trigger";
  const statuses = (Array.isArray(type?.statuses) ? type.statuses : []).map((s) => text(s));
  if (!statuses.includes(status)) return "rule-trigger-status";

  const create = rule?.then?.create;
  if (!create) return "rule-action";

  const targetKey = text(create.typeKey);
  if (!targetKey) return "rule-target";
  // A REGISTER THAT MAKES RECORDS IN ITSELF ON EVERY ARRIVAL is an unbounded
  // loop: the new record arrives at its own first status, which is not the
  // trigger status, so it stops after one — but only by accident of the trigger
  // being a status the create cannot land on. Refused rather than relied upon.
  if (targetKey === text(type?.key)) return "rule-target-self";
  const target = types.find((t) => text(t?.key) === targetKey);
  if (!target) return "rule-target-unknown";

  const link = text(create.link);
  if (link) {
    const field = fieldsOf(target).find((f) => text(f.key) === link);
    if (!field) return "rule-link-unknown";
    if (text(field.kind) !== "reference") return "rule-link-kind";
    if (text(field.refType) !== text(type?.key)) return "rule-link-target";
  }

  const set = obj(create.set);
  const carry = obj(create.carry);
  const targetKeys = new Set(fieldsOf(target).map((f) => text(f.key)));
  for (const k of Object.keys(set)) {
    if (!targetKeys.has(k)) return "rule-set-unknown";
  }
  const sourceKeys = new Set(fieldsOf(type).map((f) => text(f.key)));
  for (const [from, to] of Object.entries(carry)) {
    if (!sourceKeys.has(from)) return "rule-carry-source";
    if (!targetKeys.has(text(to))) return "rule-carry-target";
  }

  // EVERY REQUIRED FIELD OF THE TARGET MUST BE FILLABLE BY THIS RULE. Otherwise
  // the create is refused by `recordProblem` at the moment it fires — which is
  // the worst possible time to find out, because the trigger has already
  // happened and the consequence silently did not.
  //
  // A CARRY IS NOT ENOUGH ON ITS OWN: the source field may be empty on the row
  // that triggers it, so a required target field needs a `set` to fall back on.
  const required = fieldsOf(target).filter((f) => f.required === true).map((f) => text(f.key));
  for (const key of required) {
    if (key === link) continue;
    if (text(set[key])) continue;
    return "rule-required-unfilled";
  }
  return "";
}

/** Every problem across a type's rules, for the editor that will declare them. */
export function ruleProblems(type: TypeLike, types: readonly TypeLike[]): string[] {
  const rules = (Array.isArray(type?.rules) ? type.rules : []) as RuleDecl[];
  return rules.map((r) => ruleProblem(r, type, types)).filter(Boolean);
}

/**
 * THE RULES A MOVE SETS OFF.
 *
 * ON ARRIVAL, NOT ON PRESENCE. `from !== to` is the whole of it: a record edited
 * while it sits at the trigger status must not raise a second consequence, and
 * an inspector correcting the findings on a rejected test would otherwise raise
 * an NCR per keystroke-and-save.
 */
export function rulesFiredBy(type: TypeLike, from: string, to: string): RuleDecl[] {
  if (text(from) === text(to)) return [];
  const rules = (Array.isArray(type?.rules) ? type.rules : []) as RuleDecl[];
  return rules.filter((r) => text(r?.when?.status) && text(r.when!.status) === text(to));
}

/**
 * WHAT THE NEW RECORD HOLDS.
 *
 * `set` first, then `carry` over the top where the source actually has a value.
 * The order is the point: `set` is the fallback that keeps a required field
 * filled when the source's own field is blank, and a carry that overwrote it
 * with "" would produce exactly the refusal `ruleProblem` exists to prevent.
 */
export function newRecordValues(
  rule: RuleDecl,
  source: { id?: unknown; values?: unknown },
): Record<string, unknown> {
  const create = rule?.then?.create || {};
  const out: Record<string, unknown> = { ...obj(create.set) };
  const values = obj(source?.values);
  for (const [from, to] of Object.entries(obj(create.carry))) {
    const v = values[from];
    if (text(v)) out[text(to)] = v;
  }
  const link = text(create.link);
  if (link) out[link] = text(source?.id);
  return out;
}

/**
 * HAS THIS CONSEQUENCE ALREADY HAPPENED?
 *
 * A record can arrive at a status more than once — rejected, reopened, rejected
 * again — and each arrival is a real trigger. But a bounce, a double-submit or a
 * retried write must not leave two NCRs against one test, and the two cases are
 * indistinguishable from inside the write path.
 *
 * So the guard is the LINK: if a record in the target register already points at
 * this source, the consequence exists and is not repeated. It costs the read the
 * resolver already knows how to do, and it fails safe — a rule with no `link`
 * has nothing to check and fires every time, which is why `link` is the field
 * this engine is built around rather than an optional extra.
 */
export function alreadyRaised(
  rule: RuleDecl,
  sourceId: string,
  existing: readonly { values?: unknown }[],
): boolean {
  const link = text(rule?.then?.create?.link);
  if (!link) return false;
  return existing.some((r) => text(obj(r?.values)[link]) === text(sourceId));
}
