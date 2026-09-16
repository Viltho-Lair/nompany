// BARCODES AND PACK SIZES — what a scanner reads, and how many units it means.
//
// AN ITEM WAS ONLY EVER COUNTED IN ONE UNIT. A shop sells the same thing by the
// piece and by the box, and a pharmacy by the tablet, the strip and the box — so
// "one of these" depends on which barcode was scanned. A PACK is a named
// multiple of the item's own unit ("Box" = 30), and it may carry its own
// barcode and its own price (a box is usually cheaper per unit than thirty
// singles). Stock is still counted in the item's unit: a pack is a way of
// selling it, never a second stock level.
//
// A BARCODE IS UNIQUE ACROSS THE STUDIO, item and packs together. Two items
// answering to one code is a till that picks whichever it finds first, which is
// worse than refusing the second one at the moment somebody types it.
//
// PURE. No store, no clock — the screen and the server clean and refuse the
// same way.

export type Pack = {
  /** What the shop calls it — "Box", "Strip", "Carton". */
  name: string;
  /** How many of the item's own unit one pack holds. Always more than one. */
  qty: number;
  barcode?: string;
  /** What ONE PACK sells for, when it is not simply qty × the unit price. */
  sellPrice?: number;
};

export type Barcoded = { id: string; name?: string; barcode?: string; packs?: Pack[]; sellPrice?: number };

// Printed codes are digits, but shops also label things themselves; letters,
// digits and the separators a label printer uses. No spaces — a trailing space
// is a different code that looks identical.
const CODE_RE = /^[A-Za-z0-9][A-Za-z0-9._\-/]{2,63}$/;
const MAX_PACKS = 10;

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const three = (n: number) => Math.round(n * 1000) / 1000;
const four = (n: number) => Math.round(n * 10000) / 10000;

/** A barcode as stored — trimmed — or "" for none. Judged by `barcodeProblems`. */
export function cleanBarcode(v: unknown): string {
  return String(v ?? "").trim();
}

/** The packs as stored: named, more than one unit each, at most ten. */
export function cleanPacks(list: unknown): Pack[] {
  return (Array.isArray(list) ? list : [])
    .slice(0, MAX_PACKS)
    .map((raw) => {
      const p = (raw || {}) as Record<string, unknown>;
      const price = Number(p.sellPrice);
      const barcode = cleanBarcode(p.barcode);
      return {
        name: str(p.name, 40),
        qty: three(Number(p.qty) || 0),
        ...(barcode ? { barcode } : {}),
        // A typed price keeps the finest place any currency uses (shared/money's
        // rule for a price as typed).
        ...(Number.isFinite(price) && price > 0 ? { sellPrice: four(price) } : {}),
      };
    })
    .filter((p) => p.name || p.qty || p.barcode);
}

/** Every code an item answers to, the item's own first. */
export function codesOf(item: Pick<Barcoded, "barcode" | "packs">): string[] {
  return [item.barcode || "", ...(item.packs || []).map((p) => p.barcode || "")].filter(Boolean);
}

/** What is wrong with this item's codes and packs, or an empty array. */
export function barcodeProblems(
  input: { barcode?: unknown; packs?: unknown },
  { items, selfId = "" }: { items: Barcoded[]; selfId?: string },
): string[] {
  const problems: string[] = [];
  const barcode = cleanBarcode(input.barcode);
  const packs = cleanPacks(input.packs);

  const mine = [barcode, ...packs.map((p) => p.barcode || "")].filter(Boolean);
  for (const code of mine) {
    if (!CODE_RE.test(code)) problems.push(`"${code}" must be 3-64 characters: letters, digits and - . _ / only`);
  }
  // NOT TWICE ON ONE ITEM, where a scan could not tell the box from the piece.
  const seen = new Set<string>();
  for (const code of mine) {
    const k = code.toLowerCase();
    if (seen.has(k)) problems.push(`"${code}" is used twice on this item`);
    seen.add(k);
  }
  // NOT ON ANOTHER ITEM, case-insensitively.
  for (const other of items) {
    if (other.id === selfId) continue;
    const theirs = new Set(codesOf(other).map((c) => c.toLowerCase()));
    for (const code of mine) {
      if (theirs.has(code.toLowerCase())) problems.push(`"${code}" already belongs to ${other.name || "another item"}`);
    }
  }
  for (const p of packs) {
    if (!p.name) problems.push("a pack needs a name");
    if (!(p.qty > 1)) problems.push(`"${p.name || "a pack"}" must hold more than one unit`);
  }
  return problems;
}

export type ScanHit = {
  itemId: string;
  /** The pack scanned, or null for the item's own unit. */
  pack: Pack | null;
  /** Units of the item this one scan is. */
  qty: number;
  /**
   * WHAT ONE SCAN SELLS FOR, before tax: the pack's own price when it has one,
   * else qty × the item's price. Null when the item has no price at all, which a
   * till must ask for rather than sell at nothing.
   */
  price: number | null;
};

/** What a scanned code means, or null when nothing in the studio carries it. */
export function findByBarcode(items: Barcoded[], code: unknown): ScanHit | null {
  const wanted = cleanBarcode(code).toLowerCase();
  if (!wanted) return null;
  for (const item of items) {
    const unit = Number(item.sellPrice) > 0 ? Number(item.sellPrice) : null;
    if ((item.barcode || "").toLowerCase() === wanted) {
      return { itemId: item.id, pack: null, qty: 1, price: unit };
    }
    for (const pack of item.packs || []) {
      if ((pack.barcode || "").toLowerCase() === wanted) {
        const price = pack.sellPrice && pack.sellPrice > 0 ? pack.sellPrice
          : unit !== null ? four(unit * pack.qty) : null;
        return { itemId: item.id, pack, qty: pack.qty, price };
      }
    }
  }
  return null;
}
