// NOVA'S HELP DESK, stored — the support queue and what support taught back.
//
// Platform data (REG.*): the queue is nompany's, not any studio's, and a
// question must survive the studio that asked it being deleted — support still
// owes somebody an answer, or at least a record that they asked.

import { readArr, editArr, getJSON, editJSON } from "@/platform/db/store";
import { REG, makeId } from "@/platform/db/keys";
import type { HelpAlias } from "@/lib/nova/help/search";

// NEWEST FIRST, CAPPED. One document holding the whole queue is the same shape
// the console's notifications take; a thousand questions is months of a busy
// product, and anything older has long since been answered by email.
const MAX_QUESTIONS = 1000;
const MAX_ALIASES = 2000;

export type HelpQuestionStatus = "open" | "answered" | "closed";

export type HelpQuestion = {
  id: string;
  askedAt: string;
  question: string;
  /** Where they were: the screen, and the topics they clicked through first. */
  view: string;
  path: string[];
  locale: string;
  /** What Nova offered before they gave up — id and the question as they saw it. */
  offered: { id: string; q: string }[];
  studio: { id: string; slug: string; name: string };
  asker: { userId: string; collaboratorId: string; name: string; email: string };
  /** Whether the copy to support@ actually went. */
  emailed: boolean;
  status: HelpQuestionStatus;
  reply?: string;
  repliedAt?: string;
  repliedBy?: string;
  /** The entry support linked this wording to, if it taught Nova. */
  taughtEntryId?: string;
};

export async function listHelpQuestions(): Promise<HelpQuestion[]> {
  return readArr<HelpQuestion>(REG.novaHelpQuestions);
}

export async function addHelpQuestion(
  q: Omit<HelpQuestion, "id" | "askedAt" | "status" | "emailed">,
): Promise<HelpQuestion> {
  // Minted OUTSIDE the closure: editArr may run it once per CAS retry, and an
  // id minted inside would be whichever round won (catalog.ts says why).
  const row: HelpQuestion = { ...q, id: makeId("nhq"), askedAt: new Date().toISOString(), status: "open", emailed: false };
  await editArr<HelpQuestion>(REG.novaHelpQuestions, (rows) => ({
    next: [row, ...rows].slice(0, MAX_QUESTIONS),
  }));
  return row;
}

/** Patch one question under compare-and-set; a FUNCTION patch (invariant 8). */
export async function updateHelpQuestion(id: string, patch: (q: HelpQuestion) => HelpQuestion) {
  return editArr<HelpQuestion, HelpQuestion | null>(REG.novaHelpQuestions, (rows) => {
    const i = rows.findIndex((r) => r.id === id);
    if (i < 0) return { next: rows, result: null };
    const next = rows.slice();
    next[i] = patch(next[i]);
    return { next, result: next[i] };
  });
}

/* ── Taught phrasings ───────────────────────────────────────────────────── */

type StoredAliases = { stamp: string; list: (HelpAlias & { at: string; by: string })[] };

/**
 * The phrasings, and a STAMP that moves whenever they do — the help search
 * rebuilds its index only when the stamp it built from is not this one.
 */
export async function getHelpAliases(): Promise<{ stamp: string; list: HelpAlias[] }> {
  const s = await getJSON<StoredAliases>(REG.novaHelpAliases);
  return { stamp: s?.stamp || "", list: (s?.list || []).map(({ entryId, phrase }) => ({ entryId, phrase })) };
}

export async function addHelpAlias(entryId: string, phrase: string, by: string) {
  const clean = String(phrase || "").trim().slice(0, 300);
  if (!entryId || !clean) return;
  await editJSON<StoredAliases>(REG.novaHelpAliases, (cur) => {
    const list = (cur?.list || []).filter((a) => !(a.entryId === entryId && a.phrase === clean));
    return {
      next: {
        stamp: makeId("st"),
        list: [{ entryId, phrase: clean, at: new Date().toISOString(), by }, ...list].slice(0, MAX_ALIASES),
      },
    };
  });
}
