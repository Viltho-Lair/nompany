// WHERE A FORM TAKES SOMEBODY, given what they have said so far — pure, and
// read by BOTH sides: the public page walks it to decide what to draw next, and
// the server walks it again at submit to decide what it was fair to ask for.
// One walker, so a form cannot refuse an answer to a question it never showed.
//
// TWO KINDS OF BRANCH, AND THEY ANSWER DIFFERENT QUESTIONS.
//
//  - `reveals` (lib/questionnaireLogic, unchanged) shows or hides a question
//    ON THE PAGE somebody is already looking at. It is the fine-grained one:
//    "if you said Other, tell us what".
//  - A JUMP moves between pages: the page's own `next`, and per-answer
//    overrides on a choice question. It is the coarse one: "if you are an
//    existing customer, skip the company details".
//
// The jump is new; the reveal was here first and neither replaces the other. A
// form that uses neither walks its pages in the order they were written, which
// is what every form built before this did.
//
// THE WALK STOPS WHEN A PAGE COMES ROUND AGAIN. An author may legitimately send
// somebody back (Google Forms allows it and so does this), but the answers are
// FIXED by the time the server walks them, so the same page would resolve the
// same jump for ever. Stopping on the repeat terminates, and what it terminates
// on is the truth about this submission: the last pass over that page is the
// one whose answers were sent.
import {
  gridField, isGrid, isFile, canJump, takesAnswer, SUBMIT,
  type FormPage, type FormQuestion,
} from "./formsModel";
import { visibleQuestions } from "@/lib/questionnaireLogic";

type Answers = Record<string, unknown>;

/** The questions this page asks right now — `reveals` applied. */
export function askedOn(page: FormPage, pages: readonly FormPage[], answers: Answers): FormQuestion[] {
  return visibleQuestions(page as never, pages as never, answers) as unknown as FormQuestion[];
}

/**
 * The page after this one: the first jump an answer satisfies, then the page's
 * own `next`, then the one written after it. `SUBMIT` ends the form, and so
 * does falling off the end.
 *
 * A jump only counts when the question that carries it was actually ASKED —
 * a hidden question's answer is somebody else's branch, not this one's.
 */
export function nextPageId(page: FormPage, pages: readonly FormPage[], answers: Answers): string {
  for (const q of askedOn(page, pages, answers)) {
    if (!canJump(q) || !q.jumps?.length) continue;
    const said = String(answers[q.id] ?? "").trim();
    if (!said) continue;
    const jump = q.jumps.find((j) => j.value === said);
    if (jump) return jump.to;
  }
  if (page.next) return page.next;
  const i = pages.findIndex((p) => p.id === page.id);
  return pages[i + 1]?.id || SUBMIT;
}

/**
 * EVERY PAGE THIS PERSON HAS BEEN THROUGH, in the order they saw them, ending
 * where they are now or at the end of the form. `complete` is false while the
 * walk is still waiting on an answer that decides where to go next — which is
 * how the page knows to draw Next rather than Submit.
 */
export function walk(pages: readonly FormPage[], answers: Answers): { path: FormPage[]; complete: boolean } {
  const path: FormPage[] = [];
  const seen = new Set<string>();
  let id = pages[0]?.id || "";
  while (id && id !== SUBMIT && !seen.has(id)) {
    const page = pages.find((p) => p.id === id);
    if (!page) break;
    seen.add(id);
    path.push(page);
    id = nextPageId(page, pages, answers);
  }
  return { path, complete: id === SUBMIT || !id || seen.has(id) };
}

/** Is this the last page of the walk — i.e. does answering it finish the form? */
export function isLastPage(page: FormPage, pages: readonly FormPage[], answers: Answers): boolean {
  const to = nextPageId(page, pages, answers);
  return to === SUBMIT || !to || !pages.some((p) => p.id === to);
}

/**
 * The questions somebody was actually asked, across the whole walk. This is
 * what `answerProblem` judges, and what the response records as `asked`.
 */
export function askedQuestions(pages: readonly FormPage[], answers: Answers): FormQuestion[] {
  return walk(pages, answers).path.flatMap((p) => askedOn(p, pages, answers));
}

/**
 * THE ANSWER KEYS A QUESTION OWNS. One for almost everything; one per ROW for a
 * grid. Nothing else in the product needs to know a grid is special, because
 * this is the only place that expands it.
 */
export function fieldsOf(q: FormQuestion): string[] {
  if (isGrid(q.type)) return (q.rows || []).map((_row, i) => gridField(q.id, i));
  return [q.id];
}

/**
 * ONLY WHAT WAS ASKED IS KEPT. Answering a branch, going back and changing the
 * answer above it leaves the branch's replies behind; recording those would put
 * an answer to a question this person was never shown into the analysis — and,
 * worse, into a lead somebody then rings about. Applied at SUBMIT, never on the
 * way through, so going back and forward does not destroy what was typed.
 */
export function prune(pages: readonly FormPage[], answers: Answers, asked: readonly FormQuestion[]): Answers {
  const keep = new Set(asked.filter((q) => takesAnswer(q.type)).flatMap(fieldsOf));
  const out: Answers = {};
  for (const [k, v] of Object.entries(answers || {})) if (keep.has(k)) out[k] = v;
  return out;
}

/**
 * THE FORM AS A REPORT READS IT. `lib/questionnaireSummary` walks a definition
 * and tallies one block per question, which is exactly right for fourteen of
 * the types and wrong for two: a grid holds several answers under keys that
 * match no question, and a file holds ids no tally can mean anything about.
 *
 * So the grid is expanded into the questions it really is — one per row, keyed
 * where the answers actually are, offering the grid's columns as its choices —
 * and the summary needs to know nothing about grids at all.
 */
export function pagesForReport(pages: readonly FormPage[]): FormPage[] {
  return pages.map((p) => ({
    ...p,
    questions: p.questions.flatMap((q) => (isGrid(q.type)
      ? (q.rows || []).map((row, i) => ({
        ...q,
        id: gridField(q.id, i),
        label: `${q.label || q.id} — ${row}`,
        options: q.columns || [],
        type: q.type === "grid-multi" ? "multiple-choice" : "dropdown",
      }))
      : [q])),
  }));
}

/**
 * THE QUESTIONS AS THEY WERE PUT, recorded on the response so a reply survives
 * the form being reworded (the questionnaire's own rule). A grid is written
 * down as its rows, matching `pagesForReport` exactly — the report and the
 * record have to agree about what a question IS, or every grid row reads as a
 * question the form no longer asks.
 */
export function askedRecord(asked: readonly FormQuestion[]): { field: string; label: string; type: string }[] {
  const out: { field: string; label: string; type: string }[] = [];
  for (const q of asked) {
    if (!takesAnswer(q.type)) continue;
    if (isGrid(q.type)) {
      (q.rows || []).forEach((row, i) => out.push({
        field: gridField(q.id, i), label: `${q.label || q.id} — ${row}`,
        type: q.type === "grid-multi" ? "multiple-choice" : "dropdown",
      }));
      continue;
    }
    out.push({ field: q.id, label: q.label, type: q.type });
  }
  return out;
}

/** Every file question's id, for the screens that resolve the media behind them. */
export const fileQuestionIds = (pages: readonly FormPage[]) =>
  pages.flatMap((p) => p.questions).filter((q) => isFile(q.type)).map((q) => q.id);
