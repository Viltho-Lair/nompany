import { SECTION_DEFS, isSystemSection } from "@/platform/db/keys";
import { NO_SCREEN_YET } from "@/platform/access/resolve";
import { sectionName } from "@/shared/studio/sections";

// THE DEPARTMENTS THE PRODUCT ACTUALLY HAS, for the marketing site.
//
// DERIVED FROM THE SOFTWARE'S OWN LIST so the public pages cannot drift from it.
// The hero already made that argument and then filtered one predicate short: it
// dropped "main" and kept everything else, which streamed SIXTEEN names past
// every visitor — Tasks, which is a cross-cutting control rather than a
// department, and the four sections in NO_SCREEN_YET, which are declared and
// render nothing. Naming an empty section on a marketing page is the same class
// of claim as a fabricated uptime figure (SEO-PLAN §2.12).
//
// FOUR EXCLUSIONS, EACH FOR ITS OWN REASON — they are not one rule:
//   main          the studio's home surface, not a department.
//   tasks         a control that cuts across departments, not one of them.
//   NO_SCREEN_YET declared, hidden from the product's own sidebar, renders
//                 nothing. A section leaves this list the day its screen ships,
//                 and this page gains it on the same day with no edit here.
//
// CHILDREN ARE NOT DEPARTMENTS EITHER. A visitor is told the product has CRM &
// Sales; Pipeline, Tickets and Quotations are what is inside it, and belong to
// /platform/<section> when those pages are written.
//   administration  system configuration — People, Access, Master data and
//                 Studio settings. Not a department, and since 09/09/2026 not a
//                 section either: `isSystemSection` is the one list that says
//                 so, and reading it here rather than naming the key is what
//                 keeps this page and the product's own sidebar agreeing about
//                 what the software HAS.
const NOT_A_DEPARTMENT = new Set<string>(["main", "tasks"]);

export const LIVE_DEPARTMENT_KEYS: readonly string[] = SECTION_DEFS
  .map((d) => d.key)
  .filter((key) => !NOT_A_DEPARTMENT.has(key))
  .filter((key) => !isSystemSection(key))
  .filter((key) => !(NO_SCREEN_YET as readonly string[]).includes(key));

export type Department = { key: string; name: string };

/**
 * The eleven, named in the reader's language.
 *
 * Names come from `sectionName` — the studio's own dictionary — rather than a
 * second Arabic list here. A marketing page and the product calling the same
 * department two different things is the drift this whole module exists to
 * prevent, and it would be invisible to anyone reading only one of them.
 */
export function liveDepartments(locale: string): Department[] {
  return SECTION_DEFS
    .filter((d) => LIVE_DEPARTMENT_KEYS.includes(d.key))
    .map((d) => ({ key: d.key, name: sectionName(d.key, d.name, locale) }));
}
