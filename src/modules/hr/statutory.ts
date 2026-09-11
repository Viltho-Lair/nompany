// STATUTORY PAY, PURELY (tier 6) — social security, end of service, the UAE's
// WPS salary file, and the country presets that fill them.
//
// THE OWNER'S CHOICE (11/09/2026): PRESETS THE STUDIO CONFIRMS. Jordan, Saudi
// Arabia and the UAE ship figures below, each with its source; choosing one
// fills Studio settings → Employment rules, and NOTHING IS USED UNTIL THE
// STUDIO SAVES. The law moves every year — Jordan's SSC ceiling rose to JOD
// 3,733 for 2026, Saudi GOSI's annuity rate for new hires steps up each July —
// so a figure applied straight from code is a figure that goes stale inside a
// customer's payroll without anybody deciding it should.
//
// No imports, no store, no clock: `now` and every amount come in as arguments.

export type SocialSecurity = {
  employeePct: number;
  employerPct: number;
  /** The most of a month's insurable wage contributions are charged on (0 = none). */
  ceiling: number;
  /** Whether a pay record that says nothing is covered. */
  coversEveryone: boolean;
};

export type ResignationStep = { underYears: number; factor: number };

export type EndOfService = {
  /** Years paid at the first rate. */
  firstYears: number;
  /** Months of wage per year of service for those years. */
  firstMonths: number;
  /** Months of wage per year after them. */
  afterMonths: number;
  /** The basic alone, or basic plus recurring allowances. */
  base: "basic" | "wage";
  /** Nothing is due below this much service. */
  minYears: number;
  /** The most months of wage the award can reach (0 = no cap). */
  capMonths: number;
  /** On resignation: below each step's years, the award is multiplied by its factor. */
  resignation: ResignationStep[];
};

export type Wps = {
  /** The MoHRE establishment ID, 13 digits. */
  employerId: string;
  /** The employer's bank routing code, 9 digits. */
  routingCode: string;
  /** Put the salary control record first rather than last (banks differ). */
  scrFirst: boolean;
};

export type StatutoryRules = {
  socialSecurity: SocialSecurity | null;
  endOfService: EndOfService | null;
  wps: Wps | null;
};

export type StatutoryProblem =
  | "ssPct" | "ssCeiling" | "eosRates" | "eosYears" | "eosCap" | "eosResignation"
  | "wpsEmployer" | "wpsRouting";

// ---- the presets ------------------------------------------------------------

export type CountryPreset = {
  code: string;
  asOf: string;
  leave: Record<string, { days: number; afterYears: number; daysAfter: number; carryOver: number }>;
  workingDays: boolean;
} & StatutoryRules;

/**
 * THE SHIPPED FIGURES, researched 11/09/2026 for 2026. Every one is a STARTING
 * VALUE the studio sees and may change before saving.
 *
 * JORDAN — Social Security Corporation: employee 7.5%, employer 14.25%, on the
 * insured wage up to JOD 3,733 a month in 2026 (ssc.gov.jo; PwC tax summaries);
 * everybody working in Jordan, Jordanian or not. Annual leave 14 days, 21 after
 * five years with the employer (Labour Law art. 61). NO END-OF-SERVICE: art. 32
 * grants it only to employees the SSC does not cover.
 *
 * SAUDI ARABIA — GOSI for a Saudi insured before 3 July 2024: employee 9.75%
 * (9% annuities + 0.75% SANED), employer 11.75% (adds 2% occupational hazards),
 * on basic + housing up to SAR 45,000. A Saudi first insured after that date
 * pays 10.75% / 12.75% from July 2026, and a non-Saudi 0% / 2% — both are
 * per-person overrides on the pay record. End of service art. 84: half a month
 * a year for five years, a month a year after, on the wage; art. 85 on
 * resignation: nothing under two years, a third under five, two thirds under
 * ten. Annual leave 21 days, 30 after five years (art. 109).
 *
 * UAE — GPSSA covers EMIRATIS ONLY, so the scheme covers nobody unless a pay
 * record says so: a member first insured from 31 Oct 2023 pays 11%, the employer
 * 12.5%, up to AED 70,000 (Federal Decree-Law 57/2023). Expatriates contribute
 * nothing. End of service (Decree-Law 33/2021 art. 51): 21 days' basic a year
 * for five years, 30 after, from one year's service, capped at two years' wage,
 * no reduction for resignation. Annual leave 30 CALENDAR days (art. 29).
 */
export const COUNTRY_PRESETS: Record<string, CountryPreset> = {
  JO: {
    code: "JO", asOf: "2026",
    leave: { Annual: { days: 14, afterYears: 5, daysAfter: 21, carryOver: 0 } },
    workingDays: true,
    socialSecurity: { employeePct: 7.5, employerPct: 14.25, ceiling: 3733, coversEveryone: true },
    endOfService: null,
    wps: null,
  },
  SA: {
    code: "SA", asOf: "2026",
    leave: { Annual: { days: 21, afterYears: 5, daysAfter: 30, carryOver: 0 } },
    workingDays: true,
    socialSecurity: { employeePct: 9.75, employerPct: 11.75, ceiling: 45000, coversEveryone: true },
    endOfService: {
      firstYears: 5, firstMonths: 0.5, afterMonths: 1, base: "wage", minYears: 0, capMonths: 0,
      resignation: [{ underYears: 2, factor: 0 }, { underYears: 5, factor: 1 / 3 }, { underYears: 10, factor: 2 / 3 }],
    },
    wps: null,
  },
  AE: {
    code: "AE", asOf: "2026",
    leave: { Annual: { days: 30, afterYears: 0, daysAfter: 0, carryOver: 0 } },
    workingDays: false,
    socialSecurity: { employeePct: 11, employerPct: 12.5, ceiling: 70000, coversEveryone: false },
    endOfService: {
      firstYears: 5, firstMonths: 0.7, afterMonths: 1, base: "basic", minYears: 1, capMonths: 24, resignation: [],
    },
    wps: null,
  },
};

export function presetFor(countryCode: unknown): CountryPreset | null {
  return COUNTRY_PRESETS[String(countryCode || "").toUpperCase()] || null;
}

// ---- reading and checking the rules ---------------------------------------------

const blank = (v: unknown) => v === undefined || v === null || String(v).trim() === "";
const n = (v: unknown) => (blank(v) ? 0 : Number(v));
const ok = (v: unknown, max: number) => blank(v) || (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= max);
const obj = (v: unknown) => (v && typeof v === "object" ? v as Record<string, unknown> : null);

function sections(v: unknown) {
  const r = obj(v) || {};
  const ss = obj(r.socialSecurity);
  const eos = obj(r.endOfService);
  const wps = obj(r.wps);
  return {
    // A SECTION WITH ITS DEFINING FIGURES BLANK IS ABSENT, not an error: that is
    // how a studio says "we have no such scheme".
    ss: ss && (!blank(ss.employeePct) || !blank(ss.employerPct)) ? ss : null,
    eos: eos && (!blank(eos.firstMonths) || !blank(eos.afterMonths)) ? eos : null,
    wps: wps && (!blank(wps.employerId) || !blank(wps.routingCode)) ? wps : null,
  };
}

/** Why a submitted set of statutory rules cannot be stored, as codes for the screen to word. */
export function statutoryProblems(v: unknown): StatutoryProblem[] {
  const { ss, eos, wps } = sections(v);
  const out: StatutoryProblem[] = [];
  if (ss) {
    if (!ok(ss.employeePct, 100) || !ok(ss.employerPct, 100)) out.push("ssPct");
    if (!ok(ss.ceiling, 1e9)) out.push("ssCeiling");
  }
  if (eos) {
    if (!ok(eos.firstMonths, 12) || !ok(eos.afterMonths, 12) || !(n(eos.firstMonths) > 0 || n(eos.afterMonths) > 0)) out.push("eosRates");
    if (!ok(eos.firstYears, 60) || !ok(eos.minYears, 60)) out.push("eosYears");
    if (!ok(eos.capMonths, 600)) out.push("eosCap");
    const steps = Array.isArray(eos.resignation) ? eos.resignation : [];
    let last = 0;
    for (const s of steps) {
      const o = obj(s) || {};
      const under = Number(o.underYears);
      const factor = Number(o.factor);
      // Ascending, each a real number of years, each a share from none to all.
      if (!(under > last) || !(factor >= 0 && factor <= 1)) { out.push("eosResignation"); break; }
      last = under;
    }
  }
  if (wps) {
    if (!/^\d{13}$/.test(String(wps.employerId ?? "").trim())) out.push("wpsEmployer");
    if (!/^\d{9}$/.test(String(wps.routingCode ?? "").trim())) out.push("wpsRouting");
  }
  return out;
}

/** What a studio's statutory rules say, tolerant of anything stored. */
export function statutoryRulesOf(studio: unknown): StatutoryRules {
  return parse((studio as { employmentRules?: unknown } | null | undefined)?.employmentRules);
}

function parse(v: unknown): StatutoryRules {
  const { ss, eos, wps } = sections(v);
  return {
    socialSecurity: ss && ok(ss.employeePct, 100) && ok(ss.employerPct, 100) ? {
      employeePct: n(ss.employeePct), employerPct: n(ss.employerPct),
      ceiling: ok(ss.ceiling, 1e9) ? n(ss.ceiling) : 0,
      coversEveryone: ss.coversEveryone !== false,
    } : null,
    endOfService: eos && (n(eos.firstMonths) > 0 || n(eos.afterMonths) > 0) ? {
      firstYears: n(eos.firstYears), firstMonths: n(eos.firstMonths), afterMonths: n(eos.afterMonths),
      base: eos.base === "basic" ? "basic" : "wage",
      minYears: n(eos.minYears), capMonths: n(eos.capMonths),
      resignation: (Array.isArray(eos.resignation) ? eos.resignation : [])
        .map((s) => obj(s) || {})
        .map((s) => ({ underYears: Number(s.underYears) || 0, factor: Math.max(0, Math.min(1, Number(s.factor) || 0)) }))
        .filter((s) => s.underYears > 0)
        .sort((a, b) => a.underYears - b.underYears),
    } : null,
    wps: wps ? {
      employerId: String(wps.employerId ?? "").trim(),
      routingCode: String(wps.routingCode ?? "").trim(),
      scrFirst: wps.scrFirst === true,
    } : null,
  };
}

export function cleanStatutory(v: unknown): { rules: StatutoryRules } | { problems: StatutoryProblem[] } {
  const problems = statutoryProblems(v);
  return problems.length ? { problems } : { rules: parse(v) };
}

// ---- end of service -------------------------------------------------------------

/**
 * SERVICE IN YEARS, BY THE CALENDAR: whole months plus the odd days over thirty.
 * Three years to the day is exactly 3, which a days-divided-by-365 figure never
 * is — and "exactly the award the law describes" is what a reader checks.
 */
export function serviceYearsBetween(from: string, to: string): number {
  if (!from || !to || to <= from) return 0;
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  let months = (y2 - y1) * 12 + (m2 - m1);
  let days = d2 - d1;
  if (days < 0) {
    months -= 1;
    days += new Date(Date.UTC(y2, m2 - 1, 0)).getUTCDate();
  }
  return Math.max(0, (months + days / 30) / 12);
}

const cents = (x: number) => Math.round(x * 100) / 100;

/**
 * WHAT SOMEBODY WOULD BE OWED on leaving on `asOf`. The first `firstYears` at
 * `firstMonths` a year, the rest at `afterMonths`, capped, then reduced on
 * resignation by the first step whose years the service falls under.
 */
export function endOfService(rule: EndOfService, input: {
  dateOfJoin: string; asOf: string; basic: number; wage: number; reason: "termination" | "resignation";
}) {
  const years = serviceYearsBetween(input.dateOfJoin, input.asOf);
  const monthly = rule.base === "basic" ? input.basic : input.wage;
  if (!input.dateOfJoin || years < rule.minYears) return { years, months: 0, factor: 1, amount: 0 };
  let months = Math.min(years, rule.firstYears) * rule.firstMonths
    + Math.max(0, years - rule.firstYears) * rule.afterMonths;
  if (rule.capMonths > 0) months = Math.min(months, rule.capMonths);
  const step = input.reason === "resignation" ? rule.resignation.find((s) => years < s.underYears) : undefined;
  const factor = step ? step.factor : 1;
  return { years: cents(years), months: cents(months), factor, amount: cents(months * monthly * factor) };
}

// ---- the UAE salary information file ----------------------------------------------

type SifLine = { collaboratorId: string; alias: string; net: number; unpaidDays?: number };
type SifAccount = { iban: string; agentId: string; labourCardId: string };

/**
 * THE .SIF A UAE BANK TAKES THROUGH WPS: one EDR per employee and one SCR, comma
 * separated, no header. The layout is the Central Bank's (EDR: labour-card ID,
 * agent routing code, account, pay start and end, days, fixed income, variable
 * income, unpaid-leave days; SCR: employer ID, routing code, date, time,
 * salary month, record count, total, currency, reference).
 *
 * THE NET IS SENT AS FIXED INCOME and variable as nought: the file must add up
 * to exactly what is transferred, and this product does not split pay into
 * fixed and variable.
 *
 * WHETHER THE SCR COMES FIRST OR LAST differs between the published guides, so
 * it is the studio's setting (last by default) — check it with the salary bank.
 *
 * AN EMPLOYEE WITH NO LABOUR-CARD ID, NO ROUTING CODE OR NO ACCOUNT IS LEFT OUT
 * AND NAMED, the bank file's rule: a malformed record fails the whole file at
 * the bank, which would fail everybody's pay for one person's missing detail.
 * The time is the UAE's own (UTC+4).
 */
export function sifFile(input: {
  wps: Wps | null; currency: string; period: string; lines: readonly SifLine[];
  accountOf: (collaboratorId: string) => SifAccount | null; now: Date;
}): { error: "sif-currency" | "sif-employer" | "period" | "sif-empty" } | { filename: string; text: string; missing: SifLine[] } {
  const { wps, period } = input;
  if (String(input.currency || "").toUpperCase() !== "AED") return { error: "sif-currency" };
  if (!wps || !/^\d{13}$/.test(wps.employerId) || !/^\d{9}$/.test(wps.routingCode)) return { error: "sif-employer" };
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return { error: "period" };

  const [y, m] = period.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const start = `${period}-01`;
  const end = `${period}-${String(last).padStart(2, "0")}`;

  const edrs: string[] = [];
  const missing: SifLine[] = [];
  let total = 0;
  for (const line of input.lines) {
    const a = input.accountOf(line.collaboratorId);
    if (!a || !/^\d{14}$/.test(a.labourCardId) || !/^\d{9}$/.test(a.agentId) || !a.iban || !(line.net > 0)) {
      missing.push(line);
      continue;
    }
    total += line.net;
    edrs.push(["EDR", a.labourCardId, a.agentId, a.iban, start, end, String(last),
      line.net.toFixed(2), "0.00", String(Math.max(0, Math.round(line.unpaidDays || 0)))].join(","));
  }
  if (!edrs.length) return { error: "sif-empty" };

  const local = new Date(input.now.getTime() + 4 * 3600 * 1000);
  const pad = (x: number) => String(x).padStart(2, "0");
  const date = local.toISOString().slice(0, 10);
  const hh = pad(local.getUTCHours());
  const mm = pad(local.getUTCMinutes());
  const ss = pad(local.getUTCSeconds());
  const scr = ["SCR", wps.employerId, wps.routingCode, date, `${hh}${mm}`, `${pad(m)}${y}`,
    String(edrs.length), cents(total).toFixed(2), "AED", ""].join(",");

  const rows = wps.scrFirst ? [scr, ...edrs] : [...edrs, scr];
  return {
    filename: `${wps.employerId}${date.slice(2, 4)}${date.slice(5, 7)}${date.slice(8, 10)}${hh}${mm}${ss}.SIF`,
    text: `${rows.join("\r\n")}\r\n`,
    missing,
  };
}
