// Preset date windows for the dashboard FilterBar, fiscal-aware. Half-open
// [start, end): end is exclusive so "this month" and "next month" never overlap.
// asOf is injected for testability; fiscalStartMonth is 1..12 (1 = January).
// All math is UTC so a bucket boundary never shifts with the host timezone.
export type Preset = "month" | "quarter" | "year";
export function presetRange(preset: Preset, asOf: string, fiscalStartMonth = 1): { start: string; end: string } {
  const d = new Date(`${asOf}T00:00:00Z`);
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  if (preset === "month") {
    return { start: iso(Date.UTC(y, m, 1)), end: iso(Date.UTC(y, m + 1, 1)) };
  }
  if (preset === "quarter") {
    const q = Math.floor(m / 3) * 3;
    return { start: iso(Date.UTC(y, q, 1)), end: iso(Date.UTC(y, q + 3, 1)) };
  }
  // year (fiscal): step back to the most recent fiscalStart on or before asOf
  const fs = fiscalStartMonth - 1;
  const startYear = m >= fs ? y : y - 1;
  return { start: iso(Date.UTC(startYear, fs, 1)), end: iso(Date.UTC(startYear + 1, fs, 1)) };
}
