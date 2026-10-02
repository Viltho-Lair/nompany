// SEALED BOXES AND LOOSE PIECES — the owner, 02/10/2026.
//
// An item counted in pieces (./categoryPrices) has ONE on-hand figure: 37. That
// figure cannot say whether it is a sealed box and seventeen loose, or
// thirty-seven loose — and the difference is whether "a box" can be sold at
// all. So the count is split in two: SEALED boxes, and LOOSE pieces.
//
// IT IS READ FROM THE LEDGER, NOT KEPT BESIDE IT. On-hand is the sum of the
// movements and never a number anybody stores (inventory.ts, `balances`); a
// second stored count would be free to disagree with the first. Each movement
// may say how it changed the loose pieces (`loose`, signed); the split is the
// movements folded in the order they happened.
//
// A MOVEMENT THAT DOES NOT SAY is read by one rule, so every writer that
// predates this — a receipt, an adjustment, a delivery note, a return — needs
// no change:
//   - stock COMING IN arrives as whole boxes, and what does not fill a box is
//     loose (100 in, at 20 to the box, is five sealed; 47 is two and seven);
//   - stock GOING OUT leaves as whole boxes, and the remainder comes off the
//     loose pieces — opening a box when there are not enough.
// Only the till says otherwise, because only the till knows which was sold: a
// box sold takes a SEALED box, and a piece sold takes a loose one first and
// opens a box when none is left.
//
// THE SPLIT IS ALWAYS MADE TO ADD UP. sealed × per + loose is the ledger's
// on-hand, whatever the movements said: a quantity changed on the item, or a
// movement written before the item was counted this way, is absorbed by moving
// the difference into the loose pieces rather than reported as a contradiction.
//
// PURE. No store, no clock.

export type SplitMovement = { kind: string; qty: number; at?: string; loose?: number };

/** Sealed BOXES and loose PIECES. sealed × per + loose is the on-hand. */
export type Split = { sealed: number; loose: number };

const round3 = (n: number) => Math.round(n * 1000) / 1000;
/** The same sign `balances` applies: out is negative, an adjustment carries its own. */
const signed = (m: SplitMovement) => (m.kind === "out" ? -Math.abs(m.qty) : m.kind === "adjust" ? m.qty : Math.abs(m.qty));
const mod = (n: number, per: number) => round3(n - Math.floor(n / per) * per);

/** Loose pieces made consistent with a total: never below nought, never above it, and the rest whole boxes. */
function settle(total: number, loose: number, per: number): number {
  const t = Math.max(0, total);
  const l = Math.min(Math.max(0, loose), t);
  return round3(l + mod(t - l, per));
}

/**
 * ONE ITEM's sealed boxes and loose pieces, from its own movements. `per` is
 * how many pieces a box holds (`piecesPerItem`); at 1 there are no boxes and
 * everything is loose.
 */
export function splitOf(movements: readonly SplitMovement[], per: number): Split {
  const ordered = [...movements].sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")));
  let total = 0;
  let loose = 0;
  for (const m of ordered) {
    const d = signed(m);
    total = round3(total + d);
    if (!(per > 1)) continue;
    if (typeof m.loose === "number" && Number.isFinite(m.loose)) loose = round3(loose + m.loose);
    else if (d > 0) loose = round3(loose + mod(d, per));
    else if (d < 0) {
      // WHOLE BOXES FIRST, the remainder from the loose pieces — a box is
      // opened when they do not cover it.
      const rest = mod(-d, per);
      loose = rest <= loose ? round3(loose - rest) : round3(loose + per - rest);
    }
    loose = settle(total, loose, per);
  }
  if (!(per > 1)) return { sealed: 0, loose: Math.max(0, total) };
  loose = settle(total, loose, per);
  return { sealed: Math.round((Math.max(0, total) - loose) / per), loose };
}

/**
 * WHAT A SALE DOES TO THE SPLIT: `boxes` sold whole, `pieces` sold loose.
 *
 * A box needs a SEALED box — twenty loose pieces are not one. A piece comes off
 * the loose ones first, and a sealed box is opened only when they run out.
 * `loose` is the change to write on the sale's movement; `opened` is how many
 * boxes the sale opened.
 */
export function saleSplit(
  have: Split, per: number, boxes: number, pieces: number,
): { ok: true; loose: number; opened: number } | { ok: false; sealed: number } {
  if (boxes > have.sealed) return { ok: false, sealed: have.sealed };
  if (pieces <= have.loose) return { ok: true, loose: round3(-pieces), opened: 0 };
  const opened = Math.ceil(round3(pieces - have.loose) / per);
  return { ok: true, loose: round3(opened * per - pieces), opened };
}

// ---- taking stock off, or putting it on, by hand -------------------------------
//
// AN ADJUSTMENT SAYS WHICH IT MEANS (the owner, 02/10/2026): three damaged
// pieces off the loose ones, a crushed box off the sealed ones, or a box opened
// on the shelf. Left to the rule for a silent movement, twenty damaged LOOSE
// pieces would be read as a sealed box gone.

/** Why stock was taken off or put on by hand. "" is an ordinary correction. */
export const ADJUST_CAUSES = ["count", "damaged", "expired", "lost"] as const;
export type AdjustCause = (typeof ADJUST_CAUSES)[number];

/** Which part of the count an adjustment touches; "open" moves sealed boxes to loose pieces. */
export const ADJUST_PARTS = ["loose", "sealed", "open"] as const;
export type AdjustPart = (typeof ADJUST_PARTS)[number];

export type AdjustSplit =
  | { ok: true; qty: number; loose: number }
  | { ok: false; problem: "no-sealed" | "no-loose" | "not-whole"; have: number };

/**
 * WHAT AN ADJUSTMENT WRITES. `amount` is signed: PIECES for the loose part,
 * BOXES for the sealed part, and boxes to open for "open". `qty` is what the
 * ledger moves by, in pieces; `loose` is what the loose pieces change by.
 */
export function adjustSplit(have: Split, per: number, part: AdjustPart, amount: number): AdjustSplit {
  if (part === "open") {
    if (!Number.isInteger(amount) || amount <= 0) return { ok: false, problem: "not-whole", have: have.sealed };
    if (amount > have.sealed) return { ok: false, problem: "no-sealed", have: have.sealed };
    return { ok: true, qty: 0, loose: round3(amount * per) };
  }
  if (part === "sealed") {
    if (!Number.isInteger(amount)) return { ok: false, problem: "not-whole", have: have.sealed };
    if (amount < 0 && -amount > have.sealed) return { ok: false, problem: "no-sealed", have: have.sealed };
    return { ok: true, qty: round3(amount * per), loose: 0 };
  }
  if (amount < 0 && -amount > have.loose) return { ok: false, problem: "no-loose", have: have.loose };
  return { ok: true, qty: round3(amount), loose: round3(amount) };
}
