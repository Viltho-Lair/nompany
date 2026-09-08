// BATCHES, EXPIRY, AND THE STATE OF A SERIAL.
//
// TWO WAYS OF SAYING WHICH UNITS, and the product had one and a half of them.
// A SERIAL names one unit; a BATCH names a run of them that share a lot number
// and, usually, a date they stop being usable. Serial-tracked items have been
// half-supported since Inventory was written — `item.serials` is a list of
// strings, and a sheet allocates one — while batches did not exist at all. So a
// studio holding sealant, adhesive, calibration gas, filters, food or anything
// certified could record HOW MANY it held and nothing about WHEN THEY EXPIRE.
//
// THE COST OF THAT IS NOT AN ABSENT COLUMN, it is that expiry cannot be found
// by looking. A studio discovers a drum went out of date when somebody picks it
// up, which is after it has already been counted as stock, valued on a balance
// sheet and promised to a job.
//
// A BATCH IS A LABEL, NOT A QUANTITY, exactly as a bin is. What is left of a
// batch is the sum of the movements naming it — `splitBy` in ./bins, shared
// rather than copied, because two answers to "how much is in each X" would be
// free to disagree about what a movement means. A stored quantity would be a
// second source of truth that drifts the first time a movement is corrected.
//
// PURE. No imports beyond its sibling's split, no store.

import { splitBy, movementDelta } from "./bins";
import type { BinMovement } from "./bins";

export type BatchInput = { itemId?: unknown; lot?: unknown; expiresOn?: unknown; receivedOn?: unknown };
export type Batch = { id: string; itemId: string; lot: string; expiresOn: string; receivedOn: string };

// A lot number is printed on a drum and typed off it. Letters, digits and the
// separators a real lot code uses; no spaces, for the reason a bin code has
// none — a trailing space is a different lot that looks identical.
const LOT_RE = /^[A-Za-z0-9][A-Za-z0-9/._-]{0,23}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const round = (n: number) => Math.round(n * 1000) / 1000;

/** What is wrong with this batch, or an empty array. */
export function batchProblems(
  input: BatchInput,
  { items, existing, selfId = "" }: {
    items: { id: string }[];
    existing: Batch[];
    selfId?: string;
  },
): string[] {
  const problems: string[] = [];
  // NOT TRUNCATED BEFORE IT IS JUDGED — see `binProblems` for the incident that
  // rule comes from.
  const lot = String(input.lot ?? "").trim();
  const itemId = str(input.itemId, 60);
  const expiresOn = str(input.expiresOn, 10);
  const receivedOn = str(input.receivedOn, 10);

  if (!lot) problems.push("a batch needs a lot number");
  else if (!LOT_RE.test(lot)) {
    problems.push(`"${lot}" must be 1-24 characters: letters, digits, and - . _ / only`);
  }

  // A BATCH BELONGS TO ONE ITEM. A lot number is meaningless without the thing
  // it is a lot OF, and "LOT-4" on two different products is two batches.
  if (!itemId) problems.push("a batch needs an item");
  else if (!items.some((i) => i.id === itemId)) problems.push("that item does not exist");

  if (expiresOn && !DAY_RE.test(expiresOn)) problems.push("the expiry date must be a date");
  if (receivedOn && !DAY_RE.test(receivedOn)) problems.push("the received date must be a date");
  // A BATCH THAT EXPIRED BEFORE IT ARRIVED is a typo somebody wants to hear
  // about, not a state to record: it would sort first under FEFO and send a
  // picker to a drum that was never usable.
  if (expiresOn && receivedOn && expiresOn < receivedOn) {
    problems.push("a batch cannot expire before it was received");
  }

  // UNIQUE PER ITEM, not across the studio: two suppliers' lot numbers collide
  // routinely, and forcing global uniqueness would make a studio rename
  // somebody else's printed label.
  const clash = existing.some((b) =>
    b.id !== selfId && b.itemId === itemId && b.lot.toLowerCase() === lot.toLowerCase());
  if (clash) problems.push(`"${lot}" is already a batch of that item`);

  return problems;
}

/** The stored shape. Only called once validation has passed. */
export function cleanBatch(input: BatchInput): Omit<Batch, "id"> {
  return {
    itemId: str(input.itemId, 60),
    lot: str(input.lot, 24),
    // BOTH DATES ARE OPTIONAL. Plenty of stock is batch-tracked for traceability
    // — which drum went to which job — and never expires; requiring a date
    // would make a studio invent one, and an invented expiry is worse than none
    // because everything downstream believes it.
    expiresOn: DAY_RE.test(str(input.expiresOn, 10)) ? str(input.expiresOn, 10) : "",
    receivedOn: DAY_RE.test(str(input.receivedOn, 10)) ? str(input.receivedOn, 10) : "",
  };
}

/** How much of each item is in each batch, and how much is in none. */
export function batchBalances(movements: BinMovement[], knownBatchIds?: Set<string>): {
  byBatch: Record<string, Record<string, number>>;
  untracked: Record<string, number>;
} {
  const { grouped, ungrouped } = splitBy(movements, "batchId", knownBatchIds);
  return { byBatch: grouped, untracked: ungrouped };
}

/** Days from `asOf` until this batch expires. Negative once it has. */
export const daysUntil = (expiresOn: string, asOf: string): number | null => {
  if (!DAY_RE.test(expiresOn) || !DAY_RE.test(asOf)) return null;
  return Math.round((Date.parse(`${expiresOn}T00:00:00Z`) - Date.parse(`${asOf}T00:00:00Z`)) / 86400000);
};

export type BatchRow = Batch & {
  qty: number;
  daysLeft: number | null;
  state: "expired" | "expiring" | "ok" | "no-date" | "empty";
};

/**
 * THE REGISTER, AND WHAT EACH BATCH IS WORTH WATCHING FOR.
 *
 * `asOf` IS PASSED IN, never read from the clock here. A pure function that
 * asked the time would give a different answer on every call and could not be
 * asserted; the list route reads the clock once and the screen never reads its
 * own — the same rule the tender register follows.
 *
 * A BATCH WITH NOTHING LEFT IS `empty`, NOT `expired`. A drum that went out of
 * date after it had all been used is not a problem anybody has, and colouring
 * it red would bury the ones that are still on a shelf. It stays on the
 * register because "what did we use on that job" has to be answerable after the
 * fact — the same reason a superseded tender document is marked rather than
 * deleted.
 */
export function batchView(
  batches: Batch[],
  movements: BinMovement[],
  asOf: string,
  { expiringWithinDays = 30 }: { expiringWithinDays?: number } = {},
): BatchRow[] {
  const { byBatch } = batchBalances(movements, new Set(batches.map((b) => b.id)));

  return batches
    .map((b) => {
      const qty = round(byBatch[b.id]?.[b.itemId] || 0);
      const daysLeft = daysUntil(b.expiresOn, asOf);
      const state: BatchRow["state"] =
        qty <= 0 ? "empty"
          : daysLeft === null ? "no-date"
            : daysLeft < 0 ? "expired"
              : daysLeft <= expiringWithinDays ? "expiring"
                : "ok";
      return { ...b, qty, daysLeft, state };
    })
    // SOONEST TO EXPIRE FIRST, which is the order somebody acts in. A batch
    // with no date sorts last rather than first: it is not urgent, and putting
    // undated rows at the top would hide every date that matters.
    .sort((a, b) => {
      if (a.state === "empty" && b.state !== "empty") return 1;
      if (b.state === "empty" && a.state !== "empty") return -1;
      if (a.daysLeft === null && b.daysLeft === null) return a.lot.localeCompare(b.lot);
      if (a.daysLeft === null) return 1;
      if (b.daysLeft === null) return -1;
      return a.daysLeft - b.daysLeft;
    });
}

/**
 * WHICH BATCH TO PICK — first expired, first out.
 *
 * FEFO RATHER THAN FIFO, because for anything with a shelf life the oldest
 * usable stock is the one about to stop being usable, and picking by arrival
 * date is what leaves a drum on a shelf until the week after it went off.
 *
 * IT SUGGESTS AND NEVER ENFORCES. A picker standing at a rack has reasons —
 * the FEFO batch is behind three others, or it is reserved — and a system that
 * refused every other batch would be a system people work around by not
 * recording the batch at all, which loses the traceability the feature is for.
 *
 * AN EXPIRED BATCH IS NOT SUGGESTED. It is still on the register and still has
 * a quantity; what it does not have is a claim to being picked next.
 */
export function fefoSuggestion(itemId: string, rows: BatchRow[]): BatchRow | null {
  return rows.find((b) => b.itemId === itemId && b.qty > 0 && b.state !== "expired") || null;
}

/** Everything a studio should look at today, most urgent first. */
export function expiryAlerts(rows: BatchRow[]): BatchRow[] {
  return rows.filter((b) => b.state === "expired" || b.state === "expiring");
}

// ---------------------------------------------------------------------------
// SERIALS
// ---------------------------------------------------------------------------

/**
 * WHAT STATE EACH SERIAL IS IN — a JOIN of what already existed, not new data.
 *
 * `item.serials` has recorded WHICH units are held since Inventory was written,
 * and a project sheet has been able to allocate one for nearly as long. What
 * nothing did was put the two together, so "is this unit spoken for" could only
 * be answered by opening every sheet in the studio. `reservedSerials` on the
 * item list already computes half of it for one screen; this is the whole
 * answer, in one place, so no second screen re-derives it differently.
 *
 * THREE STATES AND NO MORE. `held` (on a shelf, free), `allocated` (promised to
 * a sheet), and `gone` (recorded as held once and no longer in the list). There
 * is deliberately no `scrapped` or `returned`: nothing writes those, and a
 * state the product cannot reach is a state that lies about being supported —
 * the same defect as `closedAt` being declared and written by nothing.
 */
export type SerialState = "held" | "allocated" | "gone";

export function serialStates(
  serials: string[],
  allocated: Set<string>,
  everHeld: string[] = [],
): { serial: string; state: SerialState }[] {
  const now = new Set(serials);
  const rows = serials.map((serial) => ({
    serial,
    state: (allocated.has(serial) ? "allocated" : "held") as SerialState,
  }));
  // A SERIAL THAT WAS HELD AND IS NOT ANY MORE. `everHeld` comes from whatever
  // recorded it earlier — today only the caller's own history, which is why
  // this defaults to empty rather than pretending to know.
  for (const serial of everHeld) {
    if (!now.has(serial)) rows.push({ serial, state: "gone" });
  }
  return rows;
}

/**
 * THE LEDGER AND THE SERIAL LIST DISAGREEING is worth saying out loud.
 *
 * On-hand is summed from movements; the serial list is typed. When a
 * serial-tracked item holds eleven by the ledger and nine serials, somebody
 * moved stock without noting which units — and the gap is the number of units
 * nobody can trace. Reported rather than refused, because the ledger is right
 * about the count and the fix is somebody typing two serials in.
 */
export function serialGap(serials: string[], onHand: number): number {
  return serials.length === 0 ? 0 : round(onHand - serials.length);
}

/** Every movement's contribution, exposed so a caller need not re-derive it. */
export { movementDelta };
