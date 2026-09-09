// THE STUDIO'S STANDARD COST CODES — the list every project's breakdown starts
// from.
//
// THE GAP THIS CLOSES. `projects.costs` gave a project a breakdown, and every
// project invented its own: one job called it "Earthworks", the next "Earth
// Works", a third "EW". Nothing was wrong with any single project — each read
// correctly on its own screen — and the studio still could not ask what it
// spends on earthworks, because the question compares codes ACROSS projects and
// no two projects agreed on what a code was called.
//
// A LIBRARY CODE IS COPIED, NEVER REFERENCED. A project cost code holds the
// code STRING, not the library row's id: the BOQ rate rule, for the BOQ rate's
// reason — editing the library must not silently re-price a budget somebody
// approved, and deleting a library row must not break a project that has been
// running for a year. What the library buys is agreement on the vocabulary, not
// ownership of it.
//
// WHICH IS WHY THE FORMAT IS STRICT. Matching is by string, so a trailing space
// or a stray case difference does not produce an error — it produces TWO codes
// that look identical in every list and never add up. The one thing a shared
// vocabulary cannot survive is two spellings of one word.
//
// PURE. No imports, no store — the screen refuses exactly what the server
// refuses, and every rule here is asserted without a database.

export type LibraryCode = {
  id?: unknown;
  code?: unknown;
  name?: unknown;
  /** The studio's own grouping. Free text, offered from what is already used. */
  group?: unknown;
  notes?: unknown;
  /**
   * RETIRED, NOT DELETED. A code that has been used on fifty projects stops
   * being offered on new ones and stays readable on the old ones — deleting it
   * would make the history unreadable to answer a question about the future.
   */
  archived?: unknown;
  sortOrder?: unknown;
};

/** Only what a project's cost row has to expose for the drift report. */
export type ProjectCodeUse = {
  code?: unknown;
  projectId?: unknown;
};

const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/**
 * A CODE IS A HANDLE, not a sentence. Letters, digits, dot, hyphen, slash and
 * underscore — enough for "05.10", "CIV-100" and "PLANT/HIRE", which is how
 * every standard breakdown this product has met writes them.
 *
 * NO SPACES, and that is the rule doing the work. A code is matched across
 * projects as a string; "PLANT " and "PLANT" would be two rows in every report,
 * identical on screen, adding up to nothing. Refusing the space is the only
 * point at which anybody can see the problem.
 */
const CODE_RE = /^[A-Za-z0-9._/-]{1,24}$/;

/** The comparison every reader uses. Case-insensitive: "EW" and "ew" are one. */
export const sameCode = (a: unknown, b: unknown): boolean =>
  String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

/**
 * WHAT IS WRONG WITH THIS ROW, or an empty array.
 *
 * Reasons rather than a boolean, so the screen shows them all at once — the
 * shape `unitProblems`, `numberingProblems` and `chainProblems` use.
 *
 * `others` is the rest of the library, so uniqueness is asked here rather than
 * in the service: an edit that collides with a sibling is the same defect as a
 * create that does, and one function answering both is one place to be right.
 */
export function libraryProblems(row: unknown, others: readonly LibraryCode[] = []): string[] {
  const problems: string[] = [];
  const body = (row ?? {}) as LibraryCode;

  // VALIDATED BEFORE IT IS CAPPED, not after. Reading a 40-character window of
  // a value the writer will store as 24 would call a 30-character code legal
  // and then silently truncate it — the defect `binProblems` shipped with.
  const code = text(body.code, 40);
  if (!code) problems.push("a cost code needs a code");
  else if (!CODE_RE.test(code)) {
    problems.push(`"${code}" must be 1-24 characters of letters, digits, . - / or _ with no spaces`);
  }

  // A CODE WITHOUT A NAME IS A CODE NOBODY CAN CHOOSE. The whole point of a
  // library is that the person budgeting a job recognises the line; "05.10" on
  // its own is recognisable to whoever wrote it and to nobody else.
  if (!text(body.name, 160)) problems.push("a cost code needs a name");

  const id = text(body.id, 60);
  if (code && others.some((o) => text(o.id, 60) !== id && sameCode(o.code, code))) {
    problems.push(`"${code}" is already in the library`);
  }
  return problems;
}

/** The stored shape, cleaned. Never called without `libraryProblems` passing. */
export function cleanLibraryCode(row: unknown): {
  code: string; name: string; group: string; notes: string;
  archived: boolean; sortOrder: number;
} {
  const body = (row ?? {}) as LibraryCode;
  const order = Number(body.sortOrder);
  return {
    code: text(body.code, 24),
    name: text(body.name, 160),
    group: text(body.group, 80),
    notes: text(body.notes, 1000),
    archived: Boolean(body.archived),
    sortOrder: Number.isFinite(order) ? Math.trunc(order) : 0,
  };
}

/**
 * THE GROUPS ALREADY IN USE, in the order the library first meets them.
 *
 * The picker offers these rather than a list this product invented, because a
 * cost breakdown's top level is the studio's own vocabulary — a contractor's
 * "Preliminaries" and a manufacturer's "Overhead recovery" are the same slot
 * and share no word. Derived rather than stored so it cannot go stale: rename
 * every row in a group and the group is renamed.
 */
export function libraryGroups(rows: readonly LibraryCode[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of rows) {
    const group = text(row.group, 80);
    if (!group) continue;
    const key = group.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(group);
  }
  return out;
}

/**
 * THE LIBRARY, IN THE ORDER A HUMAN READS IT: by group as first met, then by
 * `sortOrder`, then by code. Ungrouped rows come last rather than first — they
 * are the ones nobody has filed yet.
 */
export function libraryView(rows: readonly LibraryCode[]): LibraryCode[] {
  const groups = libraryGroups(rows);
  const rank = (row: LibraryCode) => {
    const group = text(row.group, 80).toLowerCase();
    if (!group) return groups.length;
    const at = groups.findIndex((g) => g.toLowerCase() === group);
    return at < 0 ? groups.length : at;
  };
  return [...rows].sort((a, b) =>
    rank(a) - rank(b)
    || (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0)
    || text(a.code, 24).localeCompare(text(b.code, 24)));
}

/** What a new project may be offered: everything still in use, in order. */
export const offerable = (rows: readonly LibraryCode[]): LibraryCode[] =>
  libraryView(rows).filter((r) => !r.archived);

export type Drift = {
  /** A code projects use that the library has never heard of, commonest first. */
  offStandard: { code: string; projects: number }[];
  /** A library code no project has taken. Not a fault — a candidate to retire. */
  unused: string[];
  /** How many distinct project codes were read, so the screen can say "of N". */
  inUse: number;
};

/**
 * WHERE THE PROJECTS HAVE DRIFTED FROM THE LIBRARY.
 *
 * THIS IS THE REPORT THE LIBRARY EXISTS FOR, and it is deliberately not a
 * refusal. Nothing stops a project inventing a code — a job genuinely meets
 * costs nobody anticipated, and a budget that could not name one would be
 * falsified rather than standardised. What the studio needs is to SEE it, so a
 * code appearing on six projects can be adopted and a typo on one can be fixed.
 *
 * COUNTED BY PROJECT, not by row: the same code on forty lines of one job is
 * one project's decision, and ranking by rows would put a detailed project's
 * private code above one that six projects independently reached for.
 *
 * AN ARCHIVED LIBRARY CODE STILL COUNTS AS KNOWN. A project that has been
 * running since before the code was retired has not drifted from anything.
 */
export function codeDrift(
  library: readonly LibraryCode[], used: readonly ProjectCodeUse[],
): Drift {
  const known = new Set(library.map((r) => text(r.code, 24).toLowerCase()).filter(Boolean));

  const projectsPerCode = new Map<string, { code: string; projects: Set<string> }>();
  for (const row of used) {
    const code = text(row.code, 24);
    if (!code) continue;
    const key = code.toLowerCase();
    const entry = projectsPerCode.get(key) || { code, projects: new Set<string>() };
    entry.projects.add(text(row.projectId, 60));
    projectsPerCode.set(key, entry);
  }

  const offStandard = [...projectsPerCode.entries()]
    .filter(([key]) => !known.has(key))
    .map(([, v]) => ({ code: v.code, projects: v.projects.size }))
    .sort((a, b) => b.projects - a.projects || a.code.localeCompare(b.code));

  const unused = library
    // A CODE ALREADY RETIRED IS NOT A CANDIDATE TO RETIRE. It is out of the
    // picker; listing it here would be an action nobody can take.
    .filter((r) => !r.archived)
    .filter((r) => {
      const key = text(r.code, 24).toLowerCase();
      return key && !projectsPerCode.has(key);
    })
    .map((r) => text(r.code, 24));

  return { offStandard, unused, inUse: projectsPerCode.size };
}
