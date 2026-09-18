// THE EMPLOYMENT HALF OF A COUNTRY PACK — probation, notice and which kinds of
// contract a country actually recognises. Pure data with an effective date, read
// by `lifecycle.ts` and by nothing that knows Postgres exists.
//
// WHY THIS IS NOT A THIRD SHAPE OF `COUNTRY_PRESETS`. `statutory.ts` holds the
// PAY half — social security, end of service, the WPS file — as a single
// figure per country with an `asOf` STRING that nothing reads. That was correct
// while the only consumer was a settings screen the studio confirms by hand:
// nothing is used until the studio saves, so a stale figure is a bad default
// rather than a wrong answer.
//
// EMPLOYMENT RULES ARE NOT CONFIRMED BY HAND. A probation end and a notice
// period are computed FROM a contract, months or years after it was signed, and
// the answer has to be the rule that was in force on the contract's own start
// date — not the one in force today. A single current figure cannot say that,
// and the day a country changes its notice period, every historical contract
// silently re-dates. So an entry here is effective-dated and `packFor` takes the
// date it is being asked about.
//
// A LAW CHANGE IS A NEW ENTRY, NEVER AN EDIT. Saudi Arabia has two: the 2005
// rule and the 19/02/2025 amendments, which split notice by who ends the
// contract. That second entry was a data change rather than a migration, which
// is exactly what the dated shape was for. Add the new rule with its own
// `effectiveFrom` and leave the old one — anything dated under it keeps
// answering by it.
//
// EVERY FIGURE CITES ITS ARTICLE. A rate nobody can check is a rate nobody can
// correct, and `docs/functionality/lifecycle.md` says plainly that three
// countries is not the world.

/**
 * HOW LONG NOTICE IS, in the same vocabulary the leave rules already use
 * (`days` / `afterYears` / `daysAfter`) so a reader meets one shape twice
 * rather than two shapes once.
 *
 * `afterYears: 0` means there is no tenure step and `daysAfter` is ignored.
 * `maxDays: 0` means the law names no ceiling.
 */
export type NoticeRule = {
  days: number;
  afterYears: number;
  daysAfter: number;
  maxDays: number;
  /** During probation, where a country shortens it. 0 = the same as `days`. */
  probationDays: number;
  /**
   * WHAT AN EMPLOYEE WHO RESIGNS OWES, where the law makes it differ from what
   * an employer who terminates owes. 0 = the same as `days`, both ways.
   *
   * NOTICE HAS A DIRECTION IN SOME COUNTRIES, and a single figure cannot say
   * so. Saudi Arabia split it on 19/02/2025 — 60 days when the employer ends an
   * indefinite contract, 30 when the employee does — and the pack held one 60,
   * so a resigning employee's settlement claimed thirty days of unserved notice
   * they never owed. `days` stays the EMPLOYER's figure because that is the one
   * a contract is written with; this is the employee's side of the same rule.
   */
  employeeDays: number;
};

export type ProbationRule = {
  /** What a contract gets when nobody says otherwise. */
  months: number;
  /** The most the law allows, which is what `contractProblems` refuses past. */
  maxMonths: number;
};

export type EmploymentPack = {
  country: string;
  /** In force FROM this day. The pack answering a date is the latest one at or before it. */
  effectiveFrom: string;
  /** The law, so the next reader can check the figure rather than trust it. */
  source: string;
  probation: ProbationRule;
  notice: NoticeRule;
  /**
   * THE KINDS OF CONTRACT THIS COUNTRY RECOGNISES, and they genuinely differ:
   * the UAE abolished the unlimited contract outright (Decree-Law 33/2021 art.
   * 8 — every contract is fixed-term), so "Permanent" is absent there and a
   * screen in an Emirati studio must not offer it. A country pack that only
   * ever held numbers could not say this.
   */
  contractTypes: readonly string[];
};

/**
 * EVERY CONTRACT TYPE THE PRODUCT KNOWS. A pack names a subset; nothing outside
 * this list is accepted, so a typo in a pack fails the model test rather than
 * reaching a dropdown.
 */
export const CONTRACT_TYPES = [
  "Permanent", "Fixed term", "Part time", "Casual", "Internship", "Secondment",
] as const;

export type ContractType = (typeof CONTRACT_TYPES)[number];

/**
 * THE SHIPPED PACKS — the same three countries `statutory.ts` researched, so a
 * studio that took a pay preset finds its employment rules already answering.
 *
 * JORDAN — Labour Law No. 8 of 1996. Probation up to three months (art. 35);
 * one month's written notice to end an indefinite contract (art. 23). Both
 * unlimited and fixed-term contracts are ordinary there.
 *
 * SAUDI ARABIA — Labour Law (Royal Decree M/51). Probation ninety days, which
 * the parties may extend in writing to a hundred and eighty (art. 53); sixty
 * days' notice on an indefinite contract for somebody paid monthly, thirty
 * otherwise (art. 75) — sixty is the default here because this product pays
 * monthly.
 *
 * SAUDI ARABIA, FROM 19/02/2025 — the amendments approved 06/08/2024. Notice on
 * an indefinite contract splits by who ends it: SIXTY days from the employer,
 * THIRTY from an employee who resigns. Probation is up to a hundred and eighty
 * days and must be written into the contract. A SECOND ENTRY, not an edit to the
 * first: notice given before that date is judged by the rule then in force, which
 * is the whole reason packs are dated. (King & Spalding's summary, read
 * 18/09/2026; the official text was not.)
 *
 * UAE — Federal Decree-Law 33/2021. Probation up to six months (art. 9), and
 * fourteen days if the EMPLOYER ends it inside probation. Notice is whatever
 * the contract says between thirty and ninety days (art. 43). Every contract is
 * fixed-term (art. 8), which is why "Permanent" is not on the list.
 */
export const EMPLOYMENT_PACKS: readonly EmploymentPack[] = Object.freeze([
  {
    country: "JO",
    effectiveFrom: "1996-06-16",
    source: "Jordan Labour Law No. 8 of 1996, arts. 23 and 35",
    probation: { months: 3, maxMonths: 3 },
    notice: { days: 30, afterYears: 0, daysAfter: 0, maxDays: 0, probationDays: 0, employeeDays: 0 },
    contractTypes: ["Permanent", "Fixed term", "Part time", "Casual", "Internship", "Secondment"],
  },
  {
    country: "SA",
    effectiveFrom: "2005-09-27",
    source: "Saudi Labour Law (Royal Decree M/51), arts. 53 and 75",
    probation: { months: 3, maxMonths: 6 },
    notice: { days: 60, afterYears: 0, daysAfter: 0, maxDays: 0, probationDays: 0, employeeDays: 0 },
    contractTypes: ["Permanent", "Fixed term", "Part time", "Casual", "Internship", "Secondment"],
  },
  {
    country: "SA",
    effectiveFrom: "2025-02-19",
    source: "Saudi Labour Law as amended (in force 19/02/2025), arts. 53 and 75",
    probation: { months: 3, maxMonths: 6 },
    notice: { days: 60, afterYears: 0, daysAfter: 0, maxDays: 0, probationDays: 0, employeeDays: 30 },
    contractTypes: ["Permanent", "Fixed term", "Part time", "Casual", "Internship", "Secondment"],
  },
  {
    country: "AE",
    effectiveFrom: "2022-02-02",
    source: "UAE Federal Decree-Law 33/2021, arts. 8, 9 and 43",
    probation: { months: 6, maxMonths: 6 },
    notice: { days: 30, afterYears: 0, daysAfter: 0, maxDays: 90, probationDays: 14, employeeDays: 0 },
    // NO "Permanent": art. 8 makes every contract fixed-term.
    contractTypes: ["Fixed term", "Part time", "Casual", "Internship", "Secondment"],
  },
]);

/**
 * WHAT EVERY COUNTRY THE PRODUCT HAS NOT RESEARCHED GETS, and it is deliberately
 * not one of the three above. Picking Jordan's rules for Kenya would be a
 * confident wrong answer; this is the shape with the mildest defaults, and the
 * studio's own Employment rules override it.
 *
 * `country: ""` is how a caller tells the two apart: a pack with no country is
 * the fallback, and the screen says the rules are the studio's own rather than a
 * country's.
 */
export const DEFAULT_EMPLOYMENT_PACK: EmploymentPack = Object.freeze({
  country: "",
  effectiveFrom: "1970-01-01",
  source: "No country pack — the studio's own defaults",
  probation: { months: 3, maxMonths: 6 },
  notice: { days: 30, afterYears: 0, daysAfter: 0, maxDays: 0, probationDays: 0, employeeDays: 0 },
  contractTypes: [...CONTRACT_TYPES],
});

/**
 * THE PACK IN FORCE FOR A COUNTRY ON A DAY — the latest entry at or before it,
 * and the fallback where the country is unknown or the day predates every
 * version.
 *
 * `on` IS THE CONTRACT'S OWN DATE, never today's. That is the whole reason this
 * function takes a date at all: asking "what notice does this 2019 contract
 * carry" with today's clock would re-date every contract in the studio the next
 * time a country changed its law.
 */
export function employmentPackFor(country: unknown, on: string): EmploymentPack {
  const code = String(country || "").trim().toUpperCase();
  if (!code) return DEFAULT_EMPLOYMENT_PACK;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(String(on || "")) ? String(on) : "9999-12-31";
  const versions = EMPLOYMENT_PACKS
    .filter((p) => p.country === code && p.effectiveFrom <= day)
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  return versions[versions.length - 1] || DEFAULT_EMPLOYMENT_PACK;
}
