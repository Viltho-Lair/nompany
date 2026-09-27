// THE SKU A BLANK ITEM IS GIVEN — ITM-0001, ITM-0002, …
//
// A SKU IS A REFERENCE (invariant 10): it is printed on labels, typed into
// purchase orders and quoted back by suppliers. It was numbered from
// `rows.length + 1`, which is COUNTING rather than numbering, so deleting an
// item let the next create hand its SKU to something else, and two people
// registering items in the same second both read the same length and both
// wanted ITM-0012 (the second then refused as a duplicate of a code it had
// been given). The number now comes off the studio's forward-only tally
// (`bumpCounter`, seeded from the highest ITM-number already held), and this
// file is the pure half of that: the shape of the code and which numbers a
// reserved block covers.
//
// PURE. The store half is `nextSkus` in ./inventory.

export const SKU_PREFIX = "ITM";

/** The code for a number: ITM-0007. Four places, more when the studio outgrows them. */
export const skuOf = (n: number): string => `${SKU_PREFIX}-${String(n).padStart(4, "0")}`;

/**
 * WHICH NUMBERS A BLOCK OF `count` COVERS, given the value the first increment
 * returned and the value a second increment of `count - 1` returned.
 *
 * AN IMPORT NEEDS MANY AT ONCE and should not pay one round trip per row, so it
 * steps the tally once (self-seeding, like every reference) and then by
 * `count - 1`. Both are single compare-and-sets, so every number each returns
 * was produced by that increment alone. When nobody else wrote in between,
 * the block is `first..last`; when somebody did, `first` is still ours and so
 * is the run ending at `last` — a gap between them, never a number shared.
 */
export function reservedNumbers(first: number, last: number, count: number): number[] {
  if (!(count > 0)) return [];
  const out = [first];
  for (let n = last - count + 2; n <= last; n++) out.push(n);
  return out;
}
