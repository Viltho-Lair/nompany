// HOW MANY SEATS A PACKAGE HOLDS — pure, so the server that enforces it and the
// console that shows "used / limit" read one rule (24/09/2026, the owner: every
// package's limit enforced at every door, and /super shows used / limit).
//
// A SEAT IS THE OWNER PLUS EVERYONE WHO JOINED — every row of a studio's member
// list. The seats a studio PAID for (its subscription's `seats`) win over what
// the package allows; this is the package's own outer edge.

type PackageLike = { type?: unknown; categories?: unknown; maxEmployees?: unknown } | null | undefined;

/**
 * A COMPOUND PACKAGE'S CEILING IS ITS LARGEST BAND. Its form has no
 * package-level maximum — the bands carry the ranges — so reading
 * `maxEmployees` alone answered 0, "no limit", and a studio on Small or Medium
 * could seat anybody. A band with no upper limit keeps the package unlimited.
 * Null when the package is not compound.
 */
export function compoundCeiling(pkg: PackageLike): number | null {
  const bands = Array.isArray(pkg?.categories) ? (pkg.categories as { maxEmployees?: unknown }[]) : [];
  if (pkg?.type !== "compound" || !bands.length) return null;
  const tops = bands.map((b) => Number(b?.maxEmployees) || 0);
  return tops.some((t) => t <= 0) ? 0 : Math.max(...tops);
}

/** The package's seat ceiling; 0 means no limit. Anything unreadable is 0, never NaN. */
export function packageCeiling(pkg: PackageLike): number {
  const compound = compoundCeiling(pkg);
  if (compound !== null) return compound;
  const n = Number(pkg?.maxEmployees);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** The limit that bites: the seats paid for, else the package's ceiling. 0 means no limit. */
export function seatLimit(paidSeats: unknown, pkg: PackageLike): number {
  const seats = Math.trunc(Number(paidSeats) || 0);
  return seats > 0 ? seats : packageCeiling(pkg);
}
