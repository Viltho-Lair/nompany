// THE ROLE CATALOGUE — every job title the research found, per field of work.
//
// SERVER-ONLY, AND THAT IS A SIZE DECISION BEFORE IT IS ANYTHING ELSE. The data
// is a few hundred kilobytes; the client budget is 1634 KB total with a 250 KB
// largest-chunk ceiling, so shipping it would spend a sixth of the whole budget
// on a list the browser needs twenty rows of. Search is a route that returns
// matches. Gate A asserts no client component imports it.
//
// It lives under modules/ rather than shared/ for the same reason: shared/ is
// client-safe by definition and is imported by browser code, so a file placed
// there ships whether or not anybody meant it to.
//
// THE DEPARTMENT IS THE ACCURACY-CRITICAL FIELD. Getting `archetype` wrong
// costs an administrator one correction when the roles are delivered; getting
// `department` wrong hides a role where nobody will look for it. The generator
// holds both mappings as reviewable data and prints a report — see
// scripts/generate/role-library.mjs.

import { isArchetypeId, permissionsFor, type ArchetypeId } from "./archetypes";
import { LIBRARY_DATA } from "./roleLibraryData";

export type LibraryRole = {
  name: string;
  /**
   * Field of work verbatim from FIELDS_OF_WORK, or `"*"` for the universal
   * spine — the back-office roles the research lists once because they are
   * identical in all twenty-five trades. A spine row is stored ONCE and matches
   * every industry; writing it per field doubled the file for no information.
   */
  industry: string;
  /** Department CODE from the industry's starter chart — "EST", "OPS", "FIN". */
  department: string;
  archetype: ArchetypeId;
  /** Seniority tier index, 0 = top administration. Orders the seed. */
  tier: number;
};

export const LIBRARY: readonly LibraryRole[] = LIBRARY_DATA;

/** Whether an entry applies to this field — its own, or the universal spine. */
const appliesTo = (entry: LibraryRole, industry: string) =>
  entry.industry === "*" || !industry || entry.industry === industry;

/**
 * Matches by substring, narrowed to an industry and department when given.
 *
 * CAPPED, ALWAYS. This answers a route, and a search with no term would
 * otherwise return the whole catalogue — which is the one thing the file must
 * never do.
 */
export function searchLibrary(
  q: string,
  { industry = "", department = "", limit = 20 }: { industry?: string; department?: string; limit?: number } = {},
): LibraryRole[] {
  const needle = String(q || "").trim().toLowerCase();
  const out: LibraryRole[] = [];
  for (const entry of LIBRARY) {
    if (!appliesTo(entry, industry)) continue;
    if (department && entry.department !== department) continue;
    if (needle && !entry.name.toLowerCase().includes(needle)) continue;
    out.push(entry);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * The seed for one department: the most senior tiers first, capped.
 *
 * TEN IS A DISPLAY DECISION, not a data one. A field's full list runs to
 * roughly a hundred and ten roles and a studio does not want them all on day
 * one; the rest stay searchable. Ordering by tier means a department arrives
 * with its head and its supervisors rather than ten operatives.
 */
export function starterRolesFor(industry: string, department: string, cap = 10): LibraryRole[] {
  return LIBRARY
    .filter((e) => appliesTo(e, industry) && e.department === department)
    .slice()
    .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name))
    .slice(0, cap);
}

/** One entry by name, within a field and department. */
export const findLibraryRole = (name: string, industry: string, department: string): LibraryRole | null =>
  LIBRARY.find((e) => e.name === name && appliesTo(e, industry) && e.department === department) || null;

/**
 * The permissions a library role arrives with — a COPY of its archetype's.
 *
 * Named here rather than called inline so the copy rule has one home: editing
 * an archetype later must reprice nothing already created, which is the rule a
 * BOQ rate follows and for the same reason.
 */
export const permissionsForLibraryRole = (
  entry: LibraryRole,
  types: ReadonlyArray<{ key: string; parentSectionKey: string }> = [],
): string[] => permissionsFor(entry.archetype, types);

/**
 * WELL-FORMEDNESS. Takes the known industries and each industry's department
 * codes, so this file stays data-only and a test can state what it expects.
 */
export function libraryProblems(
  knownIndustries: readonly string[],
  departmentCodesByIndustry: Readonly<Record<string, readonly string[]>>,
): string[] {
  const problems: string[] = [];
  const industries = new Set(knownIndustries);
  const everyCode = new Set(Object.values(departmentCodesByIndustry).flat());

  for (const e of LIBRARY) {
    if (!e.name) { problems.push(`an entry in "${e.industry}" has no name`); continue; }
    if (!isArchetypeId(e.archetype)) problems.push(`"${e.name}": unknown archetype "${e.archetype}"`);
    if (e.industry === "*") {
      // A spine row names a back-office code that SOME chart has; it is skipped
      // for a field whose chart lacks it rather than being an error.
      if (!everyCode.has(e.department)) {
        problems.push(`spine "${e.name}": department "${e.department}" is in no chart at all`);
      }
      continue;
    }
    if (!industries.has(e.industry)) { problems.push(`"${e.name}": unknown field of work "${e.industry}"`); continue; }
    const codes = departmentCodesByIndustry[e.industry] || [];
    if (!codes.includes(e.department)) {
      problems.push(`"${e.name}": department "${e.department}" is not in ${e.industry}'s chart`);
    }
  }
  return problems;
}
