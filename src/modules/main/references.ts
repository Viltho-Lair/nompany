// HUMAN-READABLE REFERENCES — INV-0007, PO-0012, PRJ-0003, ACME-001.
//
// One implementation, because there is one rule and it is easy to get wrong.
// Six collections were numbering themselves with `rows.length + 1`, which is
// COUNTING, not NUMBERING, and the two only agree while nothing is ever
// deleted and nobody ever creates two at once:
//
//   • delete a draft invoice and the next one reuses its number
//   • two people raise a purchase order in the same second, both read the same
//     length, and both get PO-0004
//
// A reference is what somebody quotes back at you — a client holding INV-0007
// and a supplier holding INV-0007 is a real problem, not a cosmetic one. So the
// next one is DERIVED FROM THE HIGHEST ALREADY ISSUED rather than from how many
// exist, and the final loop steps past anything that still collides, including
// a reference typed in by hand.
//
// This lived in modules/sales/sales.js, which meant Technical imported its numbering from
// Sales. It belongs to neither.

import { S } from "@/platform/db/keys";
import { bumpCounter } from "@/platform/db/store";
import type { Row } from "@/platform/db/store";

// THE HIGHEST NUMBER ALREADY ISSUED UNDER A PREFIX, read off the rows in hand.
// Used as the floor the counter is seeded from the first time a studio asks.
export function highestIssued(rows: Row[], field: string, prefix: string) {
  const head = `${prefix}-`.toUpperCase();
  let highest = 0;
  for (const row of rows || []) {
    const value = String(row?.[field] || "").toUpperCase();
    if (!value.startsWith(head)) continue;
    const n = Number.parseInt(value.slice(head.length), 10);
    if (Number.isFinite(n) && n > highest) highest = n;
  }
  return highest;
}

// THE NEXT REFERENCE, AND THE ONE CALLERS SHOULD USE.
//
// Derived from a TALLY rather than from the rows, because the rows are the one
// thing that cannot answer this. nextUniqueRef below takes the highest that
// still exists, so deleting the newest invoice makes it go backwards and the
// next create reissues a number a client is already holding — which is the
// difference between a gap in a sequence (harmless) and two documents sharing
// a reference (not).
//
// The floor comes from the rows the caller already read, so a studio with
// history seeds itself on first use and nothing has to be migrated.
export async function nextReference(
  studioId: string,
  { rows, field, prefix, pad = 4, startAt = 1 }: {
    rows: Row[];
    field: string;
    prefix: string;
    pad?: number;
    startAt?: number;
  },
) {
  const floor = Math.max(highestIssued(rows, field, prefix), Math.max(0, startAt - 1));
  const n = await bumpCounter(S.counters(studioId), prefix.toUpperCase(), floor);
  const taken = new Set((rows || []).map((r: Row) => String(r?.[field] || "").toUpperCase()));
  // The tally cannot collide with itself; it can still collide with a reference
  // somebody typed in by hand, so step past those.
  let candidate = `${prefix}-${String(n).padStart(pad, "0")}`;
  let extra = n;
  while (taken.has(candidate.toUpperCase())) {
    extra += 1;
    candidate = `${prefix}-${String(extra).padStart(pad, "0")}`;
  }
  return candidate;
}

// The original, kept for the two callers that number against a set nothing ever
// deletes from — a sales ticket cannot be deleted (the area has no delete verb)
// and neither can a quotation's number be reissued, because convertRfq reuses
// the prior one deliberately. Anything with a delete path must use
// nextReference instead.
export function nextUniqueRef(rows: Row[], field: string, prefix: string, pad = 3, startAt = 0) {
  const taken = new Set((rows || []).map((r: Row) => String(r?.[field] || "").toUpperCase()));
  const head = `${prefix}-`.toUpperCase();
  let highest = startAt - 1;
  for (const raw of taken) {
    const value = String(raw ?? "");
    if (!value.startsWith(head)) continue;
    const n = Number.parseInt(value.slice(head.length), 10);
    if (Number.isFinite(n) && n > highest) highest = n;
  }
  let n = Math.max(highest + 1, startAt, 1);
  let candidate = `${prefix}-${String(n).padStart(pad, "0")}`;
  while (taken.has(candidate.toUpperCase())) {
    n += 1;
    candidate = `${prefix}-${String(n).padStart(pad, "0")}`;
  }
  return candidate;
}
