// WHAT A COUNTRY DEFINITION IS, and how a value typed against one is judged.
//
// A definition is DATA: one JSON file per country under ./countries, naming the
// official values a Studio in that country holds — its tax number, its
// commercial registration, its registered address — with each one's label,
// format and whether it is required. Adding a country is adding a file. Nothing
// in this module or in the resolver beside it knows any country's rules; they
// know how to read a definition, and that is all.
//
// PURE, and imported by the server and the settings screen alike, so the screen
// refuses exactly what the server refuses. No store, no clock.
//
// VALUES ARE THE STUDIO'S; RULES ARE OURS. A definition says what a Saudi VAT
// number looks like; the Owner types their own. Nothing here is pre-filled,
// on the owner's instruction (18/09/2026): "the Owner fills these in from
// scratch".

import { isChecksumName, CHECKSUMS, type ChecksumName } from "./checksums";

// A GROUPING ON THE FORM, NOT A SECTION KEY. Invoicing, not the bare word for
// selling: that word is a retired section key, and the restructure suite
// refuses it as a literal anywhere in source — a name that reads like a section
// and is not one is exactly what that guard exists to catch.
export const DEPARTMENTS = ["company", "finance", "hr", "invoicing", "logistics"] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const REQUIREMENTS = ["mandatory", "conditional", "optional"] as const;
export type Requirement = (typeof REQUIREMENTS)[number];

/**
 * HOW SURE WE ARE OF A FIELD'S FORMAT, carried into the definition from the
 * Phase 1 research so a reader sees it where the rule lives, not only in a
 * document that will drift.
 */
export const SOURCE_STATUSES = ["checked", "earlier", "not-rechecked", "uncertain"] as const;

/**
 * WHEN A FIELD APPLIES AT ALL — the third of the owner's three conditions:
 * a value appears only when the country is selected, the field is filled, AND
 * it applies to this Studio.
 *
 * TWO KINDS, and both are facts the product already holds rather than a new
 * question to ask the Owner:
 *   vatRegistered — the Studio has set a VAT rate. A blank rate already means
 *                   "not registered, no document carries tax" (shared/vat), so
 *                   a registration number beside it would be a contradiction.
 *   sectionOn     — the Studio runs that department. WASL applies only to a
 *                   Studio that operates a fleet, and Logistics & Fleet being
 *                   switched on is how the product knows that.
 */
export type Condition = { vatRegistered: true } | { sectionOn: string };

/**
 * WHAT IS STRIPPED BEFORE A VALUE IS CHECKED AND STORED.
 *   digits  — everything but 0–9 (a CR number typed with spaces or dashes)
 *   compact — spaces and dashes removed, letters upper-cased (GB 123 4567 82)
 *   trim    — whitespace at the ends only (names, addresses, free text)
 */
export const NORMALIZERS = ["digits", "compact", "trim"] as const;
export type Normalizer = (typeof NORMALIZERS)[number];

export type Localised = { en: string; ar: string };

/**
 * WHERE A VALUE BELONGS — the official documents it is printed on. Slices B and
 * C read this so a template can print "every value this country puts on an
 * invoice" without a line of code naming a country: a Saudi invoice gets the
 * Arabic legal name and the national address because SA.json says so, and a
 * US invoice gets neither because US.json does not.
 */
export const DOCUMENT_KINDS = ["invoice", "quote", "receipt", "contract", "letter", "payslip"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export type OfficialField = {
  /** The resolver key — shared across countries when the concept is the same. */
  key: string;
  department: Department;
  label: Localised;
  hint: Localised;
  required: Requirement;
  appliesWhen?: Condition;
  normalize?: Normalizer;
  /** Any one must match the normalised value. Absent means free text. */
  patterns?: string[];
  checksum?: ChecksumName;
  maxLength?: number;
  /** "date" renders a date picker; absent is a text box. */
  input?: "text" | "date";
  /** The documents this value is printed on. Empty means it is held, not printed. */
  showOn?: DocumentKind[];
  source: { label: string; url?: string; checked?: string; status: (typeof SOURCE_STATUSES)[number] };
};

export type CountryDefinition = {
  code: string;
  name: Localised;
  /** Bumped when a field's rule changes, so a reader can tell two versions apart. */
  version: number;
  /** The day this version was researched. */
  checked: string;
  fields: OfficialField[];
};

const MAX_DEFAULT = 200;

// ---- judging a value ---------------------------------------------------------

export function normalizeValue(field: Pick<OfficialField, "normalize" | "maxLength">, raw: unknown): string {
  const s = String(raw ?? "");
  const cap = field.maxLength || MAX_DEFAULT;
  switch (field.normalize) {
    case "digits": return s.replace(/\D/g, "").slice(0, cap);
    case "compact": return s.replace(/[\s-]/g, "").toUpperCase().slice(0, cap);
    default: return s.trim().replace(/\s+/g, " ").slice(0, cap);
  }
}

export type ValueProblem = "" | "format" | "checksum" | "too-long";

/**
 * WHY A VALUE IS REFUSED, or "" when it is fine. A BLANK VALUE IS FINE: the
 * Owner fills the section in over time, and refusing a save because a
 * mandatory field is still empty would mean it could never be saved at all.
 * "Required" is shown, and missing is shown; neither blocks a save.
 */
export function valueProblem(field: OfficialField, raw: unknown): ValueProblem {
  const s = String(raw ?? "");
  if (!s.trim()) return "";
  if (String(s).trim().length > (field.maxLength || MAX_DEFAULT)) return "too-long";
  const v = normalizeValue(field, s);
  if (field.patterns?.length && !field.patterns.some((p) => new RegExp(p).test(v))) return "format";
  if (field.checksum && !CHECKSUMS[field.checksum](v)) return "checksum";
  return "";
}

// ---- judging a definition ------------------------------------------------------

const KEY = /^[a-z][a-z0-9_]*$/;

/**
 * EVERY WAY A COUNTRY FILE CAN BE WRONG, so a mistake fails the model test
 * rather than reaching the settings screen. The dangerous ones are the silent
 * ones: a pattern that does not compile would refuse every value typed against
 * it, and a checksum nobody implemented would accept every one.
 */
export function definitionProblems(def: unknown): string[] {
  const out: string[] = [];
  const d = def as Partial<CountryDefinition> | null;
  if (!d || typeof d !== "object") return ["not an object"];
  if (!/^[A-Z]{2}$/.test(String(d.code || ""))) out.push("code must be two capital letters");
  if (!d.name?.en || !d.name?.ar) out.push("name needs en and ar");
  if (!(Number(d.version) >= 1)) out.push("version must be 1 or more");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.checked || ""))) out.push("checked must be YYYY-MM-DD");
  if (!Array.isArray(d.fields) || !d.fields.length) return [...out, "fields must be a non-empty list"];

  const seen = new Set<string>();
  for (const f of d.fields) {
    const at = `field ${String(f?.key || "?")}`;
    if (!KEY.test(String(f?.key || ""))) out.push(`${at}: key must be snake_case`);
    if (seen.has(f.key)) out.push(`${at}: duplicate key`);
    seen.add(f.key);
    if (!(DEPARTMENTS as readonly string[]).includes(f.department)) out.push(`${at}: unknown department`);
    if (!(REQUIREMENTS as readonly string[]).includes(f.required)) out.push(`${at}: unknown requirement`);
    if (!f.label?.en || !f.label?.ar) out.push(`${at}: label needs en and ar`);
    if (!f.hint || typeof f.hint.en !== "string" || typeof f.hint.ar !== "string") out.push(`${at}: hint needs en and ar`);
    if (f.normalize && !(NORMALIZERS as readonly string[]).includes(f.normalize)) out.push(`${at}: unknown normalizer`);
    if (f.checksum && !isChecksumName(f.checksum)) out.push(`${at}: unknown checksum ${String(f.checksum)}`);
    for (const p of f.patterns || []) {
      try { new RegExp(p); } catch { out.push(`${at}: pattern does not compile`); }
      if (!p.startsWith("^") || !p.endsWith("$")) out.push(`${at}: pattern must be anchored`);
    }
    if (f.input && f.input !== "text" && f.input !== "date") out.push(`${at}: unknown input`);
    for (const k of f.showOn || []) {
      if (!(DOCUMENT_KINDS as readonly string[]).includes(k)) out.push(`${at}: unknown document ${String(k)}`);
    }
    const w = f.appliesWhen as Record<string, unknown> | undefined;
    if (w && !(w.vatRegistered === true || (typeof w.sectionOn === "string" && w.sectionOn))) {
      out.push(`${at}: unknown appliesWhen`);
    }
    if (!f.source?.label || !(SOURCE_STATUSES as readonly string[]).includes(f.source.status)) {
      out.push(`${at}: source needs a label and a status`);
    }
  }
  return out;
}
