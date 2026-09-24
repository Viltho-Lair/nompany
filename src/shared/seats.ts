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

/**
 * THE BAND A STUDIO IS ON, when its package has bands and it names one of them
 * (24/09/2026, the owner: a studio on a compound package is on a specific band,
 * not on the package as a whole). Null when there is no such band — no band
 * chosen yet, or one the package no longer has.
 */
export function bandOf(pkg: PackageLike, categoryId: unknown): { id: string; label: string; maxEmployees: number } | null {
  const id = String(categoryId || "");
  if (!id || pkg?.type !== "compound" || !Array.isArray(pkg?.categories)) return null;
  const band = (pkg.categories as { id?: unknown; label?: unknown; minEmployees?: unknown; maxEmployees?: unknown }[])
    .find((b) => String(b?.id) === id);
  if (!band) return null;
  const max = Number(band.maxEmployees) || 0;
  return { id, label: String(band.label || `${Number(band.minEmployees) || 0}–${max}`), maxEmployees: max };
}

/**
 * THE LIMIT THAT BITES, most specific first: the seats a subscription paid for
 * (a manual override on top), then the studio's BAND, then the package's own
 * ceiling. 0 means no limit.
 *
 * A COMPOUND STUDIO WITH NO BAND keeps the package's largest band — what every
 * such studio had before bands were stored. Nothing is guessed for it; the
 * console shows it has none until somebody picks one.
 */
export function seatLimit(paidSeats: unknown, pkg: PackageLike, categoryId: unknown = ""): number {
  const seats = Math.trunc(Number(paidSeats) || 0);
  if (seats > 0) return seats;
  const band = bandOf(pkg, categoryId);
  if (band) return band.maxEmployees;
  return packageCeiling(pkg);
}
