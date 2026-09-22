// A REVISION CHAIN: a document replaced by a newer one, and the older kept.
//
// EXTRACTED FROM TENDERING, NOT COPIED OUT OF IT (22/09/2026). Bid documents
// have worked this way since the tender pack shipped — Rev A is MARKED as
// replaced and stays, because "what did we price against" has to be answerable
// afterwards — and Marketing's brand assets need exactly the same three rules
// for exactly the same reason: "which logo was on the autumn adverts" is the
// same question about a different file. A second implementation would agree on
// the day it was written and on no other.
//
// `modules/tendering/documents.ts` wraps this and keeps its own refusal tokens,
// so nothing that already reads a tender's documents changed.
//
// PURE, and it imports nothing.

/** Anything with an id that another row may point at as its replacement. */
export type Revisable = {
  id?: string;
  supersededById?: string;
};

const rows = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const text = (v: unknown) => String(v ?? "");

/** Superseded means something replaced it. It is still here, and still read. */
export const isSuperseded = (row: Revisable | null | undefined): boolean =>
  Boolean(row && text(row.supersededById));

export const currentOf = <T extends Revisable>(list: unknown): T[] =>
  rows<T>(list).filter((d) => !isSuperseded(d));

export const supersededOf = <T extends Revisable>(list: unknown): T[] =>
  rows<T>(list).filter((d) => isSuperseded(d));

/**
 * What THIS row replaced, newest first — the history read backwards along the
 * chain.
 *
 * WALKED WITH A SEEN-SET RATHER THAN TRUSTED TO TERMINATE. `supersedeProblem`
 * refuses the moves that would make a loop, but this function is also handed
 * whatever the store holds, and one bad row must not hang a render.
 */
export function chainFor<T extends Revisable>(list: unknown, id: string): T[] {
  const all = rows<T>(list);
  const out: T[] = [];
  const seen = new Set<string>([id]);
  let target = id;
  for (;;) {
    const prior = all.find((d) => text(d.supersededById) === target && !seen.has(text(d.id)));
    if (!prior) return out;
    out.push(prior);
    seen.add(text(prior.id));
    target = text(prior.id);
  }
}

export type SupersedeProblem =
  | "missing" | "self" | "already-superseded" | "superseded-replacement" | "other-parent" | null;

/**
 * Why one row may not be marked as replaced by another.
 *
 * THE REPLACEMENT MUST ITSELF BE CURRENT. That is the rule that makes a chain a
 * chain: revisions run in one direction, and allowing an already-superseded row
 * to replace something is what lets A←B←C←A close into a loop nobody can read.
 * Refusing it means no cycle can be WRITTEN in the first place, rather than
 * being detected afterwards by a walk that has to guess which link to break.
 *
 * `parentOf` IS OPTIONAL AND IS THE ONLY THING THAT WAS EVER DOMAIN-SPECIFIC:
 * a tender's document may only be replaced within its own tender, a campaign's
 * asset within its own campaign. Left out, rows may replace each other freely,
 * which is right for a flat library.
 */
export function supersedeProblem<T extends Revisable>(
  list: unknown,
  id: string,
  replacementId: string,
  parentOf?: (row: T) => string,
): SupersedeProblem {
  const all = rows<T>(list);
  const row = all.find((d) => text(d.id) === id);
  const rep = all.find((d) => text(d.id) === replacementId);
  if (!row || !rep) return "missing";
  if (id === replacementId) return "self";
  if (isSuperseded(row)) return "already-superseded";
  if (isSuperseded(rep)) return "superseded-replacement";
  if (parentOf && parentOf(row) !== parentOf(rep)) return "other-parent";
  return null;
}

/**
 * Why a row may not be deleted.
 *
 * A ROW IN A CHAIN IS THE RECORD, AT EITHER END: deleting the superseded one
 * destroys the history, and deleting its replacement leaves the older one
 * reading as replaced by nothing. A row nothing links to is an upload somebody
 * got wrong, and that one goes.
 */
export function deleteProblem(list: unknown, id: string): "missing" | "in-chain" | null {
  const all = rows<Revisable>(list);
  const row = all.find((d) => text(d.id) === id);
  if (!row) return "missing";
  if (isSuperseded(row)) return "in-chain";
  if (all.some((d) => text(d.supersededById) === id)) return "in-chain";
  return null;
}
