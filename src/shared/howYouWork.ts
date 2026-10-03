// HOW YOU WORK — the registration's middle step, the agreed order's step 3
// (03/10/2026). It replaces one yes/no question PER DEPARTMENT — seventeen of
// them — with four questions about how the company works, each of which is a
// KIND OF WORK (modules/main/workTypes): a counter is counter sales, customers'
// sites are field jobs, looking after equipment is work orders, delivering
// projects is the project side of a deal. Answered, they decide the departments
// those kinds of work need; the next step shows every department, still
// switchable, so nothing the four questions do not cover is out of reach.
//
// PRE-ANSWERED FROM THE SPECIALISM: a question is "yes" when the industry's
// profile already runs its department, so most owners only confirm.
//
// PURE, NO IMPORTS — the screen and the tests read the same rules. The server
// needs nothing new: the answers become the department list it already takes
// (`sections.roots`) and checks (`resolveSectionChoice`).

export const WORK_QUESTION_KEYS = ["counter", "projects", "site", "upkeep"] as const;
export type WorkQuestionKey = (typeof WORK_QUESTION_KEYS)[number];

/** The departments each answer switches on (yes) or off (no). */
export const WORK_QUESTION_SECTIONS: Readonly<Record<WorkQuestionKey, readonly string[]>> = {
  counter: ["pos"],
  projects: ["projects"],
  site: ["field-service"],
  upkeep: ["maintenance"],
};

export type WorkAnswers = Partial<Record<WorkQuestionKey, boolean>>;

/**
 * THE QUESTIONS WORTH ASKING: those whose department the create screen can
 * offer at all. A department held back as still being built (/super →
 * Sections) is not in `askable`, and a question about it would be a promise the
 * product cannot keep.
 */
export function questionsAsked(askable: Iterable<string>): WorkQuestionKey[] {
  const can = new Set(askable);
  return WORK_QUESTION_KEYS.filter((k) => WORK_QUESTION_SECTIONS[k].some((s) => can.has(s)));
}

/** The answers a set of departments implies: yes where it already runs the question's department. */
export function answersFor(roots: Iterable<string>, asked: readonly WorkQuestionKey[]): WorkAnswers {
  const on = new Set(roots);
  return Object.fromEntries(asked.map((k) => [k, WORK_QUESTION_SECTIONS[k].some((s) => on.has(s))])) as WorkAnswers;
}

/**
 * THE DEPARTMENTS AFTER THE ANSWERS: the suggestion, with each answered
 * question's departments added (yes) or taken away (no). Only departments in
 * `askable` are ever added — never one the screen cannot offer.
 */
export function applyAnswers(base: Iterable<string>, answers: WorkAnswers, askable: Iterable<string>): Set<string> {
  const can = new Set(askable);
  const out = new Set(base);
  for (const k of WORK_QUESTION_KEYS) {
    const a = answers[k];
    if (a === undefined) continue;
    for (const s of WORK_QUESTION_SECTIONS[k]) {
      if (a && can.has(s)) out.add(s);
      if (!a) out.delete(s);
    }
  }
  return out;
}
