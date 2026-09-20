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
  /**
   * WHAT THE COUNTRY'S LAW DECIDES FOR EACH DEPARTMENT — slice D. Each part is
   * optional: a country researched for its tax arithmetic alone carries
   * `rules.tax` and nothing else, and a part absent means the product's
   * default, never another country's rule. The shapes are the departments'
   * own; the modules that read them (shared/compliance/rules) own their
   * meaning, and this file checks only that each part is there to read.
   */
  rules?: CountryRules;
  /** EMPTY IS ALLOWED: a country may be defined for its rules before anybody researches its official values. */
  fields: OfficialField[];
};

export type TaxRules = {
  /** What the tax is called on a document in that country. */
  taxName: string;
  /** "document": tax once per rate on the totals; "line": each line rounded on its own. */
  method: "document" | "line";
  /** Whether a consumer price is shown with tax in (how the till reads a shelf price). */
  pricesIncludeTax: boolean;
  /** A language the law requires on the readable document, if any. */
  requiredLanguage?: string;
  checked: string;
  source: string;
};

/** One dated version of the country's employment law (modules/hr/packs/employment). */
export type EmploymentRules = {
  effectiveFrom: string;
  source: string;
  probation: { months: number; maxMonths: number };
  notice: { days: number; afterYears: number; daysAfter: number; maxDays: number; probationDays: number; employeeDays: number };
  contractTypes: string[];
};

/** Starting figures for Employment rules, which the Studio confirms before any are used (modules/hr/statutory). */
export type PayPreset = {
  asOf: string;
  source: string;
  leave: Record<string, { days: number; afterYears: number; daysAfter: number; carryOver: number }>;
  workingDays: boolean;
  socialSecurity: { employeePct: number; employerPct: number; ceiling: number; coversEveryone: boolean } | null;
  endOfService: {
    firstYears: number; firstMonths: number; afterMonths: number; base: "basic" | "wage";
    minYears: number; capMonths: number; resignation: { underYears: number; factor: number }[];
  } | null;
};

/**
 * ZAKAT, where a country levies it (18/09/2026, the Finance plan's step 4):
 * the rate for a Hijri year and the days that year has, so a fiscal year of any
 * other length is prorated — 2.5% over 354 days is about 2.577% for a Gregorian
 * year. The base is computed in modules/finance/zakat; only the figures live here.
 */
export type ZakatRules = {
  rateHijri: number;
  hijriDays: number;
  checked: string;
  source: string;
};

/**
 * E-INVOICING, where a country requires invoices to reach its tax authority
 * (18/09/2026, the Finance plan's step 4 — the framework only). `adapter` names
 * the code that would submit them; none is built yet, and the product says so
 * rather than implying invoices are being sent.
 *   clearance — the authority must accept an invoice before it is valid
 *   reporting — the invoice is valid at once and reported afterwards
 *   mixed     — clearance for business invoices, reporting for consumer ones
 */
export type EInvoiceRules = {
  authority: string;
  system: string;
  mode: "clearance" | "reporting" | "mixed";
  inForce: string;
  adapter: string;
  checked: string;
  source: string;
};

/**
 * A WAGE PROTECTION SYSTEM, where a country runs one — the owner's correction,
 * 20/09/2026: "studios with a set of rules for a specific country should not
 * display information of anything else besides the picked one".
 *
 * WPS is the UAE's scheme, with equivalents elsewhere, and Employment rules
 * offered its form — a 13-digit MoHRE establishment id and a 9-digit UAE
 * routing code — to EVERY studio whatever its country. A Jordanian company was
 * being asked for identifiers issued by a ministry it has never dealt with, and
 * could save them.
 *
 * A POSITIVE DECLARATION, never a default. A country the product has not
 * researched has no scheme HERE, which is the honest reading: an absent block
 * means nobody has written the rule down, and offering another country's form
 * on that basis is exactly the bug this closes. Where a country does run one
 * and it is not declared yet, the block is missing rather than wrong, and
 * `docs/functionality/payroll.md` says which.
 *
 * The digit lengths are the FORMAT CHECK the salary file needs; they were
 * hardcoded in `modules/hr/statutory` as the UAE's and are the country's now.
 */
export type WageProtectionRules = {
  /** What the scheme is called where it runs — "WPS". */
  system: string;
  /** Who runs it — "MoHRE". */
  authority: string;
  /** The official-values key holding the employer's registration with it. */
  employerIdField: string;
  employerIdDigits: number;
  routingDigits: number;
  /** The currency a salary file is paid in; a studio paying in another gets no file. */
  fileCurrency: string;
  checked: string;
  source: string;
};

export type CountryRules = {
  tax?: TaxRules;
  employment?: EmploymentRules[];
  payPreset?: PayPreset;
  wageProtection?: WageProtectionRules;
  zakat?: ZakatRules;
  einvoice?: EInvoiceRules;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** What is wrong with a country's rules, beside its fields. */
function rulesProblems(rules: unknown): string[] {
  if (rules === undefined) return [];
  const r = rules as CountryRules | null;
  if (!r || typeof r !== "object") return ["rules must be an object"];
  const out: string[] = [];
  if (r.tax) {
    if (!r.tax.taxName) out.push("rules.tax: taxName is required");
    if (r.tax.method !== "document" && r.tax.method !== "line") out.push("rules.tax: method must be document or line");
    if (typeof r.tax.pricesIncludeTax !== "boolean") out.push("rules.tax: pricesIncludeTax must be true or false");
    if (!DATE.test(String(r.tax.checked || ""))) out.push("rules.tax: checked must be YYYY-MM-DD");
    if (!r.tax.source) out.push("rules.tax: source is required");
  }
  if (r.employment !== undefined) {
    if (!Array.isArray(r.employment) || !r.employment.length) out.push("rules.employment must be a non-empty list");
    const days = new Set<string>();
    for (const e of Array.isArray(r.employment) ? r.employment : []) {
      if (!DATE.test(String(e?.effectiveFrom || ""))) out.push("rules.employment: effectiveFrom must be YYYY-MM-DD");
      if (days.has(e?.effectiveFrom)) out.push(`rules.employment: two versions from ${e.effectiveFrom}`);
      days.add(e?.effectiveFrom);
      if (!e?.source) out.push("rules.employment: source is required");
      if (!e?.probation || !e?.notice) out.push("rules.employment: probation and notice are required");
      if (!Array.isArray(e?.contractTypes) || !e.contractTypes.length) out.push("rules.employment: contractTypes must be a non-empty list");
    }
  }
  if (r.zakat) {
    if (!(r.zakat.rateHijri > 0 && r.zakat.rateHijri < 100)) out.push("rules.zakat: rateHijri must be a percentage above 0");
    if (!(r.zakat.hijriDays > 0)) out.push("rules.zakat: hijriDays must be above 0");
    if (!DATE.test(String(r.zakat.checked || ""))) out.push("rules.zakat: checked must be YYYY-MM-DD");
    if (!r.zakat.source) out.push("rules.zakat: source is required");
  }
  if (r.einvoice) {
    if (!r.einvoice.authority || !r.einvoice.system || !r.einvoice.adapter) out.push("rules.einvoice: authority, system and adapter are required");
    if (!["clearance", "reporting", "mixed"].includes(r.einvoice.mode)) out.push("rules.einvoice: mode must be clearance, reporting or mixed");
    if (!DATE.test(String(r.einvoice.inForce || "")) || !DATE.test(String(r.einvoice.checked || ""))) out.push("rules.einvoice: inForce and checked must be YYYY-MM-DD");
    if (!r.einvoice.source) out.push("rules.einvoice: source is required");
  }
  if (r.payPreset) {
    if (!r.payPreset.asOf || !r.payPreset.source) out.push("rules.payPreset: asOf and source are required");
    if (!r.payPreset.leave || typeof r.payPreset.leave !== "object") out.push("rules.payPreset: leave is required");
  }
  if (r.wageProtection) {
    const w = r.wageProtection;
    if (!w.system || !w.authority) out.push("rules.wageProtection: system and authority are required");
    // THE EMPLOYER ID IS AN OFFICIAL VALUE, so the field it names must exist in
    // this country's own list — a scheme pointing at a key nobody can fill asks
    // for an identifier with nowhere to type it.
    if (!w.employerIdField) out.push("rules.wageProtection: employerIdField is required");
    if (!(w.employerIdDigits > 0) || !(w.routingDigits > 0)) {
      out.push("rules.wageProtection: employerIdDigits and routingDigits must be above 0");
    }
    if (!w.fileCurrency) out.push("rules.wageProtection: fileCurrency is required");
    if (!DATE.test(String(w.checked || ""))) out.push("rules.wageProtection: checked must be YYYY-MM-DD");
    if (!w.source) out.push("rules.wageProtection: source is required");
  }
  return out;
}

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
  out.push(...rulesProblems(d.rules));
  if (!Array.isArray(d.fields)) return [...out, "fields must be a list"];
  // A country with neither fields nor rules is a file that says nothing.
  if (!d.fields.length && !d.rules) return [...out, "a definition needs fields, rules, or both"];

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
  // THE WAGE PROTECTION SCHEME'S EMPLOYER ID MUST BE A FIELD OF THIS COUNTRY,
  // checked here rather than in `rulesProblems` because only this function has
  // the field list. A scheme naming a key nobody can fill asks a studio for an
  // identifier with nowhere to type it — and asking for it under the wrong
  // country is the whole defect this block exists to prevent.
  const wps = (d.rules as CountryRules | undefined)?.wageProtection;
  if (wps?.employerIdField && !seen.has(wps.employerIdField)) {
    out.push(`rules.wageProtection: employerIdField ${wps.employerIdField} is not a field of this country`);
  }
  return out;
}
