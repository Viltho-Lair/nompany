// WHAT PEOPLE SAID, COUNTED. Pure — given the responses and the form they
// answered, it returns one block per question with its answers tallied.
//
// THE FORM IS THE SPINE, THE RESPONSES ARE NOT. Walking the answers and
// grouping by whatever keys turn up would report a question nobody answered as
// absent rather than as answered by nobody — and "0 of 40 picked this" is the
// finding, while a missing row is a gap in the screen. So every question in the
// definition gets a block whether or not anything landed in it.
//
// AND A QUESTION THE FORM NO LONGER ASKS STILL GETS ONE. Each response carries
// `asked` — the questions as they were put — so an answer to a question since
// deleted is reported under the label it was given at the time, marked
// `retired`. Dropping those would quietly shrink the totals of every historical
// question the moment somebody tidied the form, which is the behaviour the cost
// roll-up refuses for the same reason: a report that punishes housekeeping.

import type { AnswerValue } from "@/lib/questionnaire";
import type { LogicPage, LogicQuestion } from "@/lib/questionnaireLogic";
import { allQuestions } from "@/lib/questionnaireLogic";

type ResponseLike = {
  answers?: Record<string, AnswerValue>;
  asked?: { field: string; label: string; type: string }[];
};

/** One counted choice. `value` is what was stored; `label` is what it was called. */
export type Tally = { value: string; label: string; count: number };

export type FieldSummary = {
  field: string;
  label: string;
  type: string;
  /** How many responses said anything at all here. */
  answered: number;
  /** How many were shown the question and left it — or were never shown it at all. */
  skipped: number;
  /** Commonest first. Empty for free text, which is not a choice. */
  tallies: Tally[];
  /** Free-text replies, newest response first, for the types that have no choices. */
  texts: string[];
  /** True when the live form no longer asks this — the answers predate its removal. */
  retired: boolean;
};

// Types whose answers are prose rather than choices. Listing them is how the
// screen knows to print replies instead of a bar chart; a tally of two hundred
// distinct sentences is not a finding.
const TEXT_TYPES = new Set(["short-text", "long-text", "email", "phone", "address", "website", "contact", "signature", "date", "number"]);

const MAX_TEXTS = 500;

const fieldOf = (q: LogicQuestion) => q.key || q.id || "";

// A stored value against the label the author gave it. A question with
// `optionValues` stores "create" and shows "Create a studio", so a summary that
// printed the stored token would be unreadable to the person who wrote the
// form; one that printed only the label could not be matched back to the data.
function labelsOf(q: LogicQuestion | null | undefined): Map<string, string> {
  const map = new Map<string, string>();
  const options = q?.options || [];
  const values = q?.optionValues;
  options.forEach((option, i) => {
    const value = String(Array.isArray(values) ? values[i] ?? option : option);
    map.set(value, String(option));
  });
  return map;
}

const asList = (v: AnswerValue | undefined): string[] => {
  if (Array.isArray(v)) return v.map((x) => String(x ?? "")).filter((x) => x.trim());
  if (v === undefined || v === null) return [];
  const s = String(v);
  return s.trim() ? [s] : [];
};

/**
 * One block per question, in the form's own order, with the retired ones after.
 *
 * `total` is every response, so `answered + skipped` is the same number on
 * every block and the two can be read against each other. A question hidden by
 * branching counts as skipped, which is the truth from the analysis's side: the
 * reply is absent, and why it is absent is the branching rule, not this file.
 */
export function summariseResponses(
  responses: ResponseLike[] | null | undefined,
  pages: LogicPage[] | null | undefined,
): { total: number; fields: FieldSummary[] } {
  const rows = Array.isArray(responses) ? responses : [];
  const live = allQuestions(pages);
  const liveFields = new Set(live.map(fieldOf).filter(Boolean));

  // Retired questions, found in what was asked rather than in what is asked
  // now. First label wins — responses come newest first, so the retired
  // question is named the last way it was worded rather than the first.
  const retired = new Map<string, { label: string; type: string }>();
  for (const r of rows) {
    for (const a of r.asked || []) {
      const field = String(a?.field || "");
      if (!field || liveFields.has(field) || retired.has(field)) continue;
      retired.set(field, { label: String(a?.label || ""), type: String(a?.type || "") });
    }
  }
  // An answer whose question is in neither list — the form was edited before
  // `asked` existed, or the field was never a question at all (packageKey).
  // Reported rather than dropped: an uncounted column is how a finding is lost.
  for (const r of rows) {
    for (const field of Object.keys(r.answers || {})) {
      if (!liveFields.has(field) && !retired.has(field)) retired.set(field, { label: "", type: "" });
    }
  }

  const blocks: { field: string; label: string; type: string; q: LogicQuestion | null; retired: boolean }[] = [
    ...live.map((q) => ({ field: fieldOf(q), label: String(q.label || ""), type: String(q.type || ""), q, retired: false })),
    ...[...retired].map(([field, meta]) => ({ field, label: meta.label, type: meta.type, q: null, retired: true })),
  ].filter((b) => b.field);

  const fields = blocks.map(({ field, label, type, q, retired: isRetired }) => {
    const labels = labelsOf(q);
    const counts = new Map<string, number>();
    const texts: string[] = [];
    let answered = 0;

    for (const r of rows) {
      const given = asList(r.answers?.[field]);
      if (!given.length) continue;
      answered += 1;
      if (TEXT_TYPES.has(type)) {
        if (texts.length < MAX_TEXTS) texts.push(given.join(", "));
        continue;
      }
      // A multi-select counts once per pick, so the tallies sum to more than
      // `answered` — which is correct and is why the two are reported apart.
      for (const value of given) counts.set(value, (counts.get(value) || 0) + 1);
    }

    const tallies = [...counts]
      .map(([value, count]) => ({ value, label: labels.get(value) || value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

    return {
      field,
      // A retired question whose label nothing recorded is named by its field,
      // which is at least something an author can search the form for.
      label: label || field,
      type,
      answered,
      skipped: rows.length - answered,
      tallies,
      texts,
      retired: isRetired,
    };
  });

  return { total: rows.length, fields };
}

// ---- export ----------------------------------------------------------------

type ExportRow = ResponseLike & { email?: string; createdAt?: string; updatedAt?: string };

// RFC 4180: quote everything, double the quotes inside. Quoting unconditionally
// rather than only when a comma appears — a rule with an exception is a rule
// somebody's answer will find the exception to, and the file is read by a
// spreadsheet, not by a person counting characters.
const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/**
 * THE ANSWERS AS A TABLE, which is what "for analysis" actually means most of
 * the time: the summary screen answers the questions somebody already thought
 * to ask, and the export is for the ones they have not.
 *
 * The columns are the form's questions in the author's order, then anything
 * only older responses carry — the same spine, and the same refusal to drop a
 * retired question, as the summary above. A row that answered nothing at a
 * column leaves it empty rather than absent, so every row has the same width.
 */
export function responsesToCsv(
  responses: ExportRow[] | null | undefined,
  pages: LogicPage[] | null | undefined,
): string {
  const rows = Array.isArray(responses) ? responses : [];
  const { fields } = summariseResponses(rows, pages);
  const header = ["Answered at", "Email", ...fields.map((f) => (f.retired ? `${f.label} (retired)` : f.label))];
  const lines = [header.map(cell).join(",")];
  for (const r of rows) {
    lines.push([
      cell(r.updatedAt || r.createdAt || ""),
      cell(r.email || ""),
      ...fields.map((f) => {
        const v = r.answers?.[f.field];
        // A multi-select is one cell, semicolon-separated: a column per
        // possible pick would change width whenever somebody added a choice.
        return cell(Array.isArray(v) ? v.join("; ") : v ?? "");
      }),
    ].join(","));
  }
  // A trailing newline, so appending to the file or piping it into anything
  // does not glue two rows together.
  return `${lines.join("\n")}\n`;
}
