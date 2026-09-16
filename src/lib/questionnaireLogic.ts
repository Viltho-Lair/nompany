// BRANCHING — a question that decides which question comes next.
//
// THE RESPONDENT NEVER SEES THE LOGIC. They answer a question, and the next
// question is simply the right one; nothing on the screen says "because you
// said X". The author sees all of it, in the builder's Logic panel, which is
// the whole point of the feature: the decision belongs to whoever wrote the
// form, not to whoever is filling it in.
//
// THE RULE LIVES ON THE QUESTION THAT DECIDES, not on the one that is revealed.
// `q.reveals` is a list of { op, value, show } — when this question's answer
// satisfies the operator, the questions named in `show` appear. The inverse
// shape (a `showIf` on the target) was rejected: an author reading a decision
// question would have had no way to see what it leads to without searching
// every other question for a reference back to it, and "what does this branch
// on" is the question they actually ask.
//
// WHICH MAKES "CONDITIONAL" DERIVED, NOT STORED. A question is conditional
// exactly when some rule names it, so deleting the rule makes it unconditional
// again — the safe direction. A stored `hidden: true` would outlive the rule
// that justified it and strand the question where nobody could see it and
// nothing explained why.
//
// Pure: no store, no React, no dictionaries. Both the public flow and the
// console builder read it, so the screen shows exactly what the server records.

/** How a rule compares the deciding question's answer. */
export const RULE_OPS = ["is", "is-not", "includes", "answered", "not-answered"] as const;
export type RuleOp = (typeof RULE_OPS)[number];

/** Human wording for each operator — the builder's dropdown, and nothing else. */
export const RULE_OP_LABELS: Record<RuleOp, string> = {
  "is": "is",
  "is-not": "is not",
  "includes": "includes",
  "answered": "is answered",
  "not-answered": "is not answered",
};

/** Operators that compare against a value; the other two ask only whether anything was said. */
export const opTakesValue = (op: unknown): boolean => op === "is" || op === "is-not" || op === "includes";

export type QuestionnaireRule = {
  op?: RuleOp;
  /** The stored value compared against — `optionValues[i]` where a question has them, not the label. */
  value?: string;
  /** Question ids revealed when the rule fires. */
  show?: string[];
};

export type LogicQuestion = {
  id?: string;
  key?: string;
  type?: string;
  label?: string;
  options?: string[];
  optionValues?: string[];
  reveals?: QuestionnaireRule[];
};

export type LogicPage = { id?: string; title?: string; questions?: LogicQuestion[] };

type Answers = Record<string, unknown> | null | undefined;

// A question binds to `key` when it has one, otherwise to its own id — the same
// rule `fieldOf` states in lib/questionnaire. Restated rather than imported so
// this module stays free of the registration questionnaire's own constants.
const fieldOf = (q: LogicQuestion | null | undefined) => q?.key || q?.id || "";

const asList = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x ?? "")) : String(v ?? "").trim() ? [String(v)] : [];

/** Every question in the form, in order. Pages are a presentation detail to the logic. */
export function allQuestions(pages: LogicPage[] | null | undefined): LogicQuestion[] {
  return (pages || []).flatMap((p) => p?.questions || []);
}

/**
 * Does one rule fire, given what the deciding question was answered with?
 *
 * `is` and `includes` differ only on a multi-select: "is" means that is the
 * whole answer, "includes" means it is among them. On a single answer they
 * agree, which is why an author can reach for either without being wrong.
 */
export function ruleFires(
  rule: QuestionnaireRule | null | undefined,
  source: LogicQuestion | null | undefined,
  answers: Answers,
): boolean {
  if (!rule) return false;
  const list = asList(answers?.[fieldOf(source)]);
  const want = String(rule.value ?? "");
  switch (rule.op) {
    case "answered": return list.length > 0;
    case "not-answered": return list.length === 0;
    case "includes": return list.includes(want);
    case "is-not": return !(list.length === 1 && list[0] === want);
    case "is": return list.length === 1 && list[0] === want;
    // An operator nobody recognises must not silently reveal the world.
    default: return false;
  }
}

/** The ids every rule in the form points at — i.e. the questions that are conditional. */
export function conditionalIds(pages: LogicPage[] | null | undefined): Set<string> {
  const out = new Set<string>();
  for (const q of allQuestions(pages)) {
    for (const r of q.reveals || []) for (const id of r.show || []) if (id) out.add(String(id));
  }
  return out;
}

/**
 * WHICH QUESTIONS ARE ON SCREEN, as a fixed point rather than one pass.
 *
 * A revealed question may itself decide something, so A leads to B leads to C
 * has to work; and a rule on a question that is NOT on screen must not fire, or
 * hiding a branch would leave its consequences behind. Starting from the
 * unconditional questions and only ever adding, the set can only grow, so it
 * settles in at most one round per question — and a cycle (A reveals B, B
 * reveals A) settles with neither visible, which `logicProblems` reports to the
 * author rather than spinning here.
 */
export function visibleIds(pages: LogicPage[] | null | undefined, answers: Answers): Set<string> {
  const questions = allQuestions(pages);
  const conditional = conditionalIds(pages);
  const visible = new Set<string>();
  for (const q of questions) if (q.id && !conditional.has(String(q.id))) visible.add(String(q.id));

  for (let round = 0; round <= questions.length; round += 1) {
    let grew = false;
    for (const q of questions) {
      if (!q.id || !visible.has(String(q.id))) continue;   // a hidden question decides nothing
      for (const rule of q.reveals || []) {
        if (!ruleFires(rule, q, answers)) continue;
        for (const id of rule.show || []) {
          if (id && !visible.has(String(id))) { visible.add(String(id)); grew = true; }
        }
      }
    }
    if (!grew) break;
  }
  return visible;
}

/** The questions of one page that are on screen right now, in the author's order. */
export function visibleQuestions(
  page: LogicPage | null | undefined,
  pages: LogicPage[] | null | undefined,
  answers: Answers,
): LogicQuestion[] {
  const visible = visibleIds(pages, answers);
  return (page?.questions || []).filter((q) => q.id && visible.has(String(q.id)));
}

/**
 * The pages worth showing. A page whose every question is hidden is SKIPPED
 * rather than shown empty — the branch the author drew leads past it, and a
 * blank page with a Next button is the logic leaking onto the screen.
 *
 * A page with no questions at all is kept: that is a statement or a title the
 * author put there on purpose, not a branch that collapsed.
 */
export function visiblePages(
  pages: LogicPage[] | null | undefined,
  answers: Answers,
): LogicPage[] {
  const visible = visibleIds(pages, answers);
  return (pages || []).filter((p) => {
    const qs = p?.questions || [];
    return qs.length === 0 || qs.some((q) => q.id && visible.has(String(q.id)));
  });
}

/**
 * The answers to questions that are actually on screen.
 *
 * Answering a branch and then changing the answer above it leaves the branch's
 * answers behind, and recording those would put a reply to a question this
 * person was not asked into the analysis. Applied at SUBMIT rather than on
 * every keystroke, so going back, looking, and coming forward again does not
 * destroy what was typed.
 *
 * Fields belonging to no question — the packageKey the pricing page carries in,
 * and anything else the caller adds — are kept: pruning is about questions, and
 * a field with no question attached was never conditional.
 */
export function prunedAnswers(
  pages: LogicPage[] | null | undefined,
  answers: Record<string, unknown>,
): Record<string, unknown> {
  const questions = allQuestions(pages);
  const visible = visibleIds(pages, answers);
  const hidden = new Set(
    questions.filter((q) => q.id && !visible.has(String(q.id))).map((q) => fieldOf(q)).filter(Boolean),
  );
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(answers || {})) if (!hidden.has(k)) out[k] = v;
  return out;
}

/**
 * WHICH QUESTIONS SOME ANSWER COULD REACH — as opposed to `visibleIds`, which
 * says which ones a PARTICULAR answer reaches right now.
 *
 * Every rule counts as if it could fire, because the question is whether the
 * form can ever show this question, not whether today's blank one does. A
 * question missing from this set is unreachable for good: conditional, and
 * revealed only by something itself unreachable — which is where a cycle (A
 * reveals B, B reveals A) lands, with nothing on any screen to say so.
 *
 * Exported because two callers need it and neither should re-derive it:
 * `logicProblems` below, and the registration readiness check, which treats a
 * question that exists but can never be shown as one that is not there.
 */
export function reachableIds(pages: LogicPage[] | null | undefined): Set<string> {
  const questions = allQuestions(pages);
  const byId = new Set(questions.filter((q) => q.id).map((q) => String(q.id)));
  const reachable = visibleIds(pages, {});           // the unconditional core
  for (let round = 0; round <= questions.length; round += 1) {
    let grew = false;
    for (const q of questions) {
      if (!q.id || !reachable.has(String(q.id))) continue;
      for (const rule of q.reveals || []) {
        for (const id of rule.show || []) {
          if (id && byId.has(String(id)) && !reachable.has(String(id))) { reachable.add(String(id)); grew = true; }
        }
      }
    }
    if (!grew) break;
  }
  return reachable;
}

/**
 * WHAT IS WRONG WITH THE LOGIC, in the author's words.
 *
 * Every one of these is a rule that fails SILENTLY at run time: it does not
 * throw, it does not warn, the form simply never shows a question and nobody
 * can tell whether that was the intent. That is the same failure the record
 * engine's `ruleProblem` exists for, and the same answer — refuse it where it
 * is written, in front of the person who can fix it.
 *
 * Returned per question id so the builder can mark the offending question
 * rather than printing a list nobody can trace back.
 */
export function logicProblems(
  pages: LogicPage[] | null | undefined,
): { questionId: string; problem: string }[] {
  const questions = allQuestions(pages);
  const byId = new Map(questions.filter((q) => q.id).map((q) => [String(q.id), q]));
  const problems: { questionId: string; problem: string }[] = [];
  const say = (questionId: string, problem: string) => problems.push({ questionId, problem });

  for (const q of questions) {
    const qid = String(q.id || "");
    for (const rule of q.reveals || []) {
      if (!rule.op || !RULE_OPS.includes(rule.op)) {
        say(qid, "This rule has no condition, so it can never fire.");
        continue;
      }
      const wanted = String(rule.value ?? "").trim();
      if (opTakesValue(rule.op) && !wanted) {
        say(qid, `"${RULE_OP_LABELS[rule.op]}" needs an answer to compare against.`);
      }
      // A value that is not one of the choices can never be given, so the rule
      // is dead. Only checkable where the author wrote the choices — a question
      // bound to a built-in source (industries, countries) has thousands.
      const choices = Array.isArray(q.optionValues) && q.optionValues.length ? q.optionValues : q.options;
      if (opTakesValue(rule.op) && wanted && Array.isArray(choices) && choices.length
        && !choices.map((c) => String(c)).includes(wanted)) {
        say(qid, `"${wanted}" is not one of this question's choices, so the rule can never fire.`);
      }
      if (!(rule.show || []).length) say(qid, "This rule fires but shows nothing.");
      for (const id of rule.show || []) {
        if (String(id) === qid) { say(qid, "A question cannot reveal itself."); continue; }
        if (!byId.has(String(id))) say(qid, "This rule points at a question that no longer exists.");
      }
    }
  }

  // UNREACHABLE: conditional, and not revealed by anything that can itself be
  // reached. A cycle lands here, which is the only report it gets — the fixed
  // point simply leaves both out, with nothing on any screen to say so.
  const reachable = reachableIds(pages);
  for (const q of questions) {
    if (q.id && !reachable.has(String(q.id))) {
      say(String(q.id), "Nothing can reveal this question — check the rule that should, or a loop between two rules.");
    }
  }
  return problems;
}
