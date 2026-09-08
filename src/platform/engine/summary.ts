// A SECTION'S REGISTERS, SUMMARISED — the shape behind every engine dashboard.
//
// SEVEN SECTIONS CARRY A "Dashboard ⬜" IN THE PROGRAMME, and five of them are
// sections whose whole content is engine registers: Manufacturing, Assets,
// Quality & HSE, Field Operations, Logistics. Writing five dashboards would be
// five places to forget a register; this is one function, and a register added
// under a section appears in that section's summary with nobody remembering to.
//
// PURE, AND THAT IS THE POINT. No imports, no store, no clock read: the caller
// hands in the types, the rows and `asOf`. So the screen and the server compute
// the identical figures from the identical inputs, and the arithmetic can be
// asserted without a database — the rule every module's pure half follows.

/** What a summary needs from a record type. Structural, so a stored row fits. */
export type SummaryType = {
  key: string;
  label: string;
  statuses: readonly string[];
  /** The declared moves. What makes an ending derivable rather than guessed. */
  transitions?: readonly { from: string; to: string }[];
  fields?: readonly { key: string; label: string; kind: string }[];
};

/** What it needs from a record. Also structural. */
export type SummaryRecord = {
  id: string;
  typeKey: string;
  reference?: string;
  status?: string;
  values?: Record<string, unknown>;
  updatedAt?: string;
};

export type StatusCount = { status: string; count: number };

export type Overdue = {
  id: string;
  typeKey: string;
  reference: string;
  status: string;
  /** Which declared date field is past, and its value. */
  field: string;
  label: string;
  date: string;
  daysLate: number;
};

export type RegisterSummary = {
  typeKey: string;
  label: string;
  total: number;
  /** Every DECLARED status, in the type's own order, including the empty ones. */
  byStatus: StatusCount[];
  /** Rows in a status the type declares last — see `openOf` for why not "closed". */
  open: number;
  overdue: number;
};

export type SectionSummary = {
  registers: RegisterSummary[];
  /** The soonest-overdue rows across every register, worst first. */
  attention: Overdue[];
  asOf: string;
  /** Totals across the section, so a heading needs no second pass. */
  total: number;
  totalOverdue: number;
};

// WHAT A DEADLINE IS CALLED. Matched case-insensitively against a field's KEY,
// so `dueBy`, `dueOn`, `nextDue`, `expiresOn`, `validTo`, `endsOn`,
// `promisedOn`, `inspectionEndsOn` and `deadline` are all chased, and
// `completedOn`, `raisedOn`, `lastDone` and `validFrom` are not.
const DEADLINE_RE = /(due|expir|validto|deadline|endson|promised|nextdue)/i;

const day = (v: unknown): string => {
  const s = String(v ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : "";
};

const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/**
 * IS THIS ROW STILL LIVE?
 *
 * DERIVED FROM THE TRANSITIONS, which is real declared structure rather than a
 * guess: a status is an ENDING when the type declares no move OUT of it. The
 * engine has no `terminal` flag and deliberately never gained one, and it needs
 * none — a register already says where every status can go, and the ones it
 * cannot leave are exactly the ones a row stops at.
 *
 * THIS REPLACED A POSITIONAL HEURISTIC ("an ending is in the last third of the
 * ladder") THAT WAS WRONG ON THE FIRST REGISTER IT MET. Permits declare
 * Requested, Issued, Closed, Cancelled — four statuses, so two thirds is
 * three, so `Closed` counted as OPEN and every closed permit was chased
 * forever. Written down rather than quietly replaced, because the shape of the
 * mistake is the argument for the fix: an ordering convention is a thing a
 * studio can break by typing, and the transitions are a thing the register
 * cannot work without.
 *
 * IT READS CORRECTLY ON THE REGISTERS THAT LOOP. A calibration goes Expired
 * → Valid, so an expired instrument is OPEN — which is right, it is a live
 * problem — while Withdrawn has no way out and is an ending. A candidate who
 * was Hired, Rejected or Withdrawn is done in all three cases, and all three
 * are leaves.
 *
 * NO TRANSITIONS DECLARED MEANS EVERYTHING IS OPEN. That is the truthful
 * answer for a type that has not said: under-reporting "done" is a register
 * that looks busier than it is, where the opposite would silently stop chasing
 * real work.
 */
export const openOf = (
  statuses: readonly string[],
  status: string,
  transitions: readonly { from: string; to: string }[] = [],
): boolean => {
  if (!statuses.length || !transitions.length) return true;
  const s = String(status ?? "");
  // A status the type no longer declares is still somebody's problem: a
  // register must not get quietly shorter because a studio retired a rung.
  if (!statuses.includes(s)) return true;
  return transitions.some((t) => t.from === s);
};

/**
 * SUMMARISE ONE SECTION'S REGISTERS.
 *
 * @param types  - the registers under this section, in the order to show them
 * @param rows   - every record across those registers
 * @param asOf   - the date overdue is measured against, `YYYY-MM-DD`
 * @param limit  - how many attention rows to return
 */
export function summariseSection(
  types: readonly SummaryType[],
  rows: readonly SummaryRecord[],
  asOf: string,
  limit = 8,
): SectionSummary {
  const today = day(asOf);
  const byType = new Map<string, SummaryRecord[]>();
  for (const r of rows) {
    const list = byType.get(r.typeKey);
    if (list) list.push(r); else byType.set(r.typeKey, [r]);
  }

  const attention: Overdue[] = [];
  const registers: RegisterSummary[] = types.map((t) => {
    const mine = byType.get(t.key) || [];
    const counts = new Map<string, number>();
    for (const r of mine) {
      const s = String(r.status ?? "");
      counts.set(s, (counts.get(s) || 0) + 1);
    }

    // EVERY DECLARED STATUS, INCLUDING THE EMPTY ONES, and in the type's own
    // order. A funnel that silently drops its empty rungs cannot show a studio
    // that nothing has reached Completed this month — which is the one thing a
    // status breakdown is read for.
    const byStatus: StatusCount[] = t.statuses.map((s) => ({ status: s, count: counts.get(s) || 0 }));
    // A row in a status the type NO LONGER declares still exists and is still
    // somebody's problem, so it is appended rather than dropped.
    for (const [s, n] of counts) if (!t.statuses.includes(s)) byStatus.push({ status: s, count: n });

    let overdue = 0;
    // A DEADLINE IS A DATE FIELD, BUT NOT EVERY DATE FIELD IS A DEADLINE, and
    // getting that wrong is what a first version of this did: it took the first
    // past `date` field and so reported every issued permit as overdue on its
    // `validFrom` — the day the work was allowed to START.
    //
    // `raisedOn`, `happenedOn`, `acquiredOn`, `installedOn`, `completedOn`,
    // `lastDone`, `deliveredOn` and `madeOn` are all dates in the past by
    // definition. Chasing them would make a dashboard that is wrong about
    // almost every row, and a dashboard that cries wolf is one people learn to
    // scroll past — which costs more than the rows it would have caught.
    //
    // SO IT MATCHES WHAT A DEADLINE IS CALLED rather than listing registers.
    // This is a small vocabulary (due / expires / valid-to / deadline /
    // next / promised / ends), not a list of the twenty-nine types, and it
    // DEGRADES SAFELY: a field it does not recognise is simply not chased,
    // which is a gap somebody notices rather than an alarm they ignore. A
    // per-field `deadline` flag is the real answer and is Phase 3's, alongside
    // the type editor that would let a studio set one.
    const dateFields = (t.fields || []).filter((f) =>
      f.kind === "date" && DEADLINE_RE.test(f.key));
    for (const r of mine) {
      if (!openOf(t.statuses, String(r.status ?? ""), t.transitions)) continue;
      for (const f of dateFields) {
        const d = day(r.values?.[f.key]);
        if (!d || !today || d >= today) continue;
        overdue += 1;
        attention.push({
          id: r.id, typeKey: t.key, reference: String(r.reference || ""),
          status: String(r.status || ""), field: f.key, label: f.label,
          date: d, daysLate: daysBetween(d, today),
        });
        // ONE ROW COUNTS ONCE however many of its dates have passed. A permit
        // whose validTo and whose review date are both behind is one permit to
        // deal with, and counting it twice would make the number a measure of
        // how many date fields a type declares.
        break;
      }
    }

    return {
      typeKey: t.key,
      label: t.label,
      total: mine.length,
      byStatus,
      open: mine.filter((r) => openOf(t.statuses, String(r.status ?? ""), t.transitions)).length,
      overdue,
    };
  });

  attention.sort((a, b) => b.daysLate - a.daysLate || a.reference.localeCompare(b.reference));

  return {
    registers,
    attention: attention.slice(0, Math.max(0, limit)),
    asOf: today,
    total: registers.reduce((n, r) => n + r.total, 0),
    totalOverdue: registers.reduce((n, r) => n + r.overdue, 0),
  };
}
