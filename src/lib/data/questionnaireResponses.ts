// QUESTIONNAIRE RESPONSES — what people actually answered, which is the whole
// reason a questionnaire exists.
//
// THIS DID NOT EXIST. The definitions registry beside this file says "Answers
// are NOT here... a person's answers still live at u:<UserID>:questionnaire",
// and that was true and was not enough: those answers are a 1:1 document
// belonging to the person, keyed by nothing that says WHICH form they answered,
// holding only the six fields the registration questionnaire happened to start
// with. Nothing could ask "what did people say to question 3", which is the
// only question a questionnaire is for. The console's Responses column read
// `responses || "-"` off a counter no code has ever incremented.
//
// So a response is its own record, filed under the questionnaire it answers.
// The per-user document stays exactly where it is — it is what the onboarding
// gate reads, and it is the person's copy of their own answers — and this is
// the ANALYSIS copy, which outlives the account: deleting a user removes their
// response (see cascade.ts), but deleting their answers must never have meant
// deleting the form, and it still does not.

import { readArr, editArr } from "@/platform/db/store";
import { ID, Q } from "@/platform/db/keys";
import { cleanAnswers } from "@/lib/questionnaire";
import type { AnswerValue } from "@/lib/questionnaire";

const now = () => new Date().toISOString();
const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/**
 * ONE QUESTION, AS IT WAS ASKED. Stored on the response, not looked up on the
 * definition, and that redundancy is deliberate.
 *
 * A form is edited: questions are reworded, deleted, and given different
 * choices. Read back against today's definition, last month's answers become a
 * column of values under a label that no longer matches, or under no label at
 * all. Fifty bytes a question buys a response that can still be read after the
 * form has moved on, which is the difference between an archive and a pile.
 */
export type AskedQuestion = { field: string; label: string; type: string };

export type QuestionnaireResponse = {
  id: string;
  questionnaireId: string;
  /** Who answered. Blank is legal — a future public form need not be signed in. */
  userId: string;
  email: string;
  answers: Record<string, AnswerValue>;
  asked: AskedQuestion[];
  /** The definition's `updatedAt` when this was answered — has the form moved since? */
  definitionUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
};

const MAX_ASKED = 200;

function cleanAsked(input: unknown): AskedQuestion[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, MAX_ASKED).flatMap((q) => {
    const row = (q || {}) as Record<string, unknown>;
    const field = str(row.field, 80);
    return field ? [{ field, label: str(row.label, 300), type: str(row.type, 40) }] : [];
  });
}

export async function listResponses(questionnaireId: string): Promise<QuestionnaireResponse[]> {
  if (!questionnaireId) return [];
  return readArr<QuestionnaireResponse>(Q.responses(questionnaireId));
}

/**
 * Record one person's answers to one form.
 *
 * AN UPSERT ON `userId`, NOT AN APPEND, and that mirrors the per-user document
 * this sits beside: a person has one answer to a form, and re-answering
 * replaces it rather than accumulating. Appending would let one person's second
 * pass through the survey count twice in every total, which is the one thing an
 * analysis screen must not do. An unsigned response (no userId) always appends,
 * because there is nothing to match it to.
 *
 * NO COUNTER IS TOUCHED. The definition's response count is derived from these
 * rows when somebody asks for it — see the head of questionnaires.ts — so this
 * write is the whole of the write, and there is no second one to be half-done.
 */
export async function recordResponse(
  { questionnaireId, userId = "", email = "", answers, asked, definitionUpdatedAt = "" }: {
    questionnaireId: string;
    userId?: string;
    email?: string;
    answers: unknown;
    asked?: unknown;
    definitionUpdatedAt?: string;
  },
): Promise<QuestionnaireResponse | null> {
  if (!questionnaireId) return null;
  // Captured outside the closure — editArr may run it once per compare-and-set
  // retry, and a timestamp read inside would depend on how contended the write
  // was. Same reason updateQuestionnaireDef hoists its own.
  const stamp = now();
  const id = ID.response();
  const clean = cleanAnswers(answers);
  const askedRows = cleanAsked(asked);
  const who = str(userId, 60);

  return editArr<QuestionnaireResponse, QuestionnaireResponse>(
    Q.responses(questionnaireId),
    (rows) => {
      const existing = who ? rows.find((r) => r.userId === who) : null;
      const next: QuestionnaireResponse = {
        id: existing?.id || id,
        questionnaireId,
        userId: who,
        email: str(email, 200),
        answers: clean,
        asked: askedRows,
        definitionUpdatedAt: str(definitionUpdatedAt, 40),
        createdAt: existing?.createdAt || stamp,
        updatedAt: stamp,
      };
      return {
        next: existing ? rows.map((r) => (r.id === existing.id ? next : r)) : [next, ...rows],
        result: next,
      };
    },
  );
}

/** Deleting a form takes its answers with it — nothing else can reach them afterwards. */
export async function deleteResponsesFor(questionnaireId: string): Promise<void> {
  if (!questionnaireId) return;
  await editArr<QuestionnaireResponse, void>(Q.responses(questionnaireId), () => ({ next: [] }));
}
