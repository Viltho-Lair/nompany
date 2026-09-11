// METER READINGS, purely — how far a machine has run. No store, no clock, no
// imports.
//
// A METER IS CUMULATIVE: running hours, kilometres, cycles only ever go up.
// So a reading lower than the last one is refused — it is a typo, or a meter
// that was replaced, and only the person holding it knows which. The second
// case is said out loud (`reset`), and from then on the new meter's reading is
// the one that counts.
//
// Three units, because they are the three that preventive maintenance runs on
// across every trade (MaintainX, UpKeep and Limble all ship exactly these
// families); a studio with a fourth kind of meter records it as cycles.

export const METER_UNITS = ["hours", "km", "cycles"] as const;
export type MeterUnit = (typeof METER_UNITS)[number];

const text = (v: unknown) => String(v ?? "").trim();
export const isMeterUnit = (v: unknown): v is MeterUnit => (METER_UNITS as readonly string[]).includes(text(v));

type ReadingLike = { assetId?: unknown; unit?: unknown; value?: unknown; readAt?: unknown; reset?: unknown; createdAt?: unknown };

/**
 * THE MACHINE'S LATEST READING ON THIS METER — by when it was read, then by
 * when it was written, so two readings typed for the same minute resolve to the
 * one entered last.
 */
export function latestReading<T extends ReadingLike>(readings: readonly T[], assetId: string, unit: string): T | null {
  let best: T | null = null;
  for (const r of readings) {
    if (text(r.assetId) !== assetId || text(r.unit) !== unit) continue;
    if (!best) { best = r; continue; }
    const byRead = text(r.readAt).localeCompare(text(best.readAt));
    if (byRead > 0 || (byRead === 0 && text(r.createdAt) > text(best.createdAt))) best = r;
  }
  return best;
}

/**
 * WHY THIS READING IS REFUSED — or null. `now` is passed in: a reading in the
 * future is a guess at how far the machine will have run.
 */
export function readingProblem(
  r: { unit?: unknown; value?: unknown; readAt?: unknown; reset?: unknown },
  last: ReadingLike | null,
  now: string,
): string | null {
  if (!isMeterUnit(r.unit)) return "reading-unit";
  const value = Number(r.value);
  if (r.value === "" || r.value === null || r.value === undefined || !Number.isFinite(value) || value < 0 || value > 1e9) {
    return "reading-value";
  }
  const at = text(r.readAt);
  if (!at || Number.isNaN(Date.parse(at)) || at > now) return "reading-future";
  // A METER ONLY GOES UP — unless it was replaced, which is said, not assumed.
  if (last && r.reset !== true && value < Number(last.value)) return "reading-back";
  // NOR IS A READING SLOTTED IN BEHIND THE LATEST ONE: a back-dated reading
  // higher than a later one would read as the meter having gone backwards.
  if (last && r.reset !== true && at < text(last.readAt)) return "reading-before";
  return null;
}
