import { defaultLocale, type Locale } from "../locale";

// THE STUDIO MANUAL — what each department is for, written for the person doing
// the job rather than the person building it.
//
// IT IS PRODUCT COPY, not tenant content. Every studio sees the same manual, it
// ships with the deploy, and no script has to run for an existing studio to get
// it. A company's own procedures are a different thing and would need a
// collection, a right and an editor; this is the software explaining itself.
//
// `docs/functionality/*.md` IS THE OTHER AUDIENCE, and the two must not drift.
// Those files tell a developer why the code is shaped as it is — the invariants,
// the refusals, the defects each rule guards. This tells somebody with a spanner
// what to press and what the product will refuse. WHEN BEHAVIOUR CHANGES, BOTH
// MOVE IN THE SAME COMMIT; a manual describing last month's product is worse
// than no manual, because somebody acts on it.
//
// One module per surface and nothing may enumerate them — see ./shell's header.
//
// AND SOME CHAPTERS ARE NOT WRITTEN HERE AT ALL (27/09/2026). A department in
// `MANUAL_FROM_HELP` (lib/nova/help/manual) is written ONCE, as Nova's help
// entries, and its chapter is composed from them on the server — Finance first.
// Do not add a hand-written article for such a department: tests/help-model.mjs
// refuses it, because the two would be two copies free to disagree. Moving a
// department over means deleting its article here in the same commit.

/** A paragraph, a plain list, or a numbered sequence somebody follows in order. */
//
// `h` is a sub-heading with an anchor of its own. It exists for the chapters
// COMPOSED FROM NOVA'S HELP ENTRIES (lib/nova/help/manual), where each question
// is one — and its id is the entry's id, so Nova's "Read in documentation"
// lands on the paragraph its answer came from.
export type ManualBlock =
  | { kind: "p"; text: string }
  | { kind: "h"; id: string; text: string }
  | { kind: "list"; items: readonly string[] }
  | { kind: "steps"; items: readonly string[] };

export type ManualSection = {
  /** Stable across locales — it is the anchor the contents list links to. */
  id: string;
  heading: string;
  blocks: readonly ManualBlock[];
};

export type ManualArticle = {
  /** The section key it documents, so an article can be found from a screen later. */
  key: string;
  title: string;
  summary: string;
  sections: readonly ManualSection[];
};

type Strings = {
  contents: string;
  /** Heads the list of articles, once the page carries more than one. */
  departments: string;
  /** Shown when an article names a rule the product enforces rather than a step. */
  articles: readonly ManualArticle[];
};

const en: Strings = {
  contents: "On this page",
  departments: "Departments",
  // NO HAND-WRITTEN CHAPTER IS LEFT (27/09/2026). Every chapter the manual
  // had — CRM & Sales, Quotations, Maintenance — is composed now from Nova's
  // help entries (lib/nova/help/manual, MANUAL_FROM_HELP), and a new department
  // joins there, not here. The list stays, empty, as the seam a chapter that
  // genuinely cannot be help entries would use; tests/help-model.mjs refuses
  // one for a department that is also composed.
  articles: [],
};

const ar: Strings = {
  contents: "في هذه الصفحة",
  departments: "الأقسام",
  articles: [],
};

const manual = { en, ar };

export function manualDict(locale: string): Strings {
  return manual[locale as Locale] || manual[defaultLocale];
}
