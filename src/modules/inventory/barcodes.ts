// BARCODES — what a scanner reads.
//
// ONE CODE PER ITEM, and it is one of the item's own unit. Packs — a box of
// twenty sold under a code of its own — were removed on the owner's
// instruction (17/09/2026): the item's UNIT is what says how it is sold, and a
// studio names its units itself (Administration → Units), so an item sold by
// the box is an item whose unit is the box.
//
// A BARCODE IS UNIQUE ACROSS THE STUDIO. Two items answering to one code is a
// till that picks whichever it finds first, which is worse than refusing the
// second one at the moment somebody types it.
//
// PURE. No store, no clock — the screen and the server clean and refuse the
// same way.

export type Barcoded = { id: string; name?: string; barcode?: string; sellPrice?: number };

// Printed codes are digits, but shops also label things themselves; letters,
// digits and the separators a label printer uses. No spaces — a trailing space
// is a different code that looks identical.
const CODE_RE = /^[A-Za-z0-9][A-Za-z0-9._\-/]{2,63}$/;

/** A barcode as stored — trimmed — or "" for none. Judged by `barcodeProblems`. */
export function cleanBarcode(v: unknown): string {
  return String(v ?? "").trim();
}

/** What is wrong with this item's code, or an empty array. */
export function barcodeProblems(
  input: { barcode?: unknown },
  { items, selfId = "" }: { items: Barcoded[]; selfId?: string },
): string[] {
  const problems: string[] = [];
  const barcode = cleanBarcode(input.barcode);
  if (!barcode) return problems;
  if (!CODE_RE.test(barcode)) problems.push(`"${barcode}" must be 3-64 characters: letters, digits and - . _ / only`);
  // NOT ON ANOTHER ITEM, case-insensitively.
  for (const other of items) {
    if (other.id === selfId) continue;
    if ((other.barcode || "").toLowerCase() === barcode.toLowerCase()) {
      problems.push(`"${barcode}" already belongs to ${other.name || "another item"}`);
    }
  }
  return problems;
}

export type ScanHit = {
  itemId: string;
  /**
   * WHAT ONE SCAN SELLS FOR, before tax: the item's price. Null when the item
   * has none, which a till must ask for rather than sell at nothing.
   */
  price: number | null;
};

/** What a scanned code means, or null when nothing in the studio carries it. */
export function findByBarcode(items: Barcoded[], code: unknown): ScanHit | null {
  const wanted = cleanBarcode(code).toLowerCase();
  if (!wanted) return null;
  const item = items.find((i) => (i.barcode || "").toLowerCase() === wanted);
  if (!item) return null;
  return { itemId: item.id, price: Number(item.sellPrice) > 0 ? Number(item.sellPrice) : null };
}
