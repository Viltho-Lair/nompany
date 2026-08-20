const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 1000 * 60 * 60 * 24 * 365],
  ["month", 1000 * 60 * 60 * 24 * 30],
  ["day", 1000 * 60 * 60 * 24],
  ["hour", 1000 * 60 * 60],
  ["minute", 1000 * 60],
];

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "3 minutes ago" / "yesterday" style label for a timestamp in ms. */
export function formatRelativeTime(timestamp: number): string {
  const delta = timestamp - Date.now();
  const absolute = Math.abs(delta);

  for (const [unit, ms] of UNITS) {
    if (absolute >= ms) {
      return relative.format(Math.round(delta / ms), unit);
    }
  }
  return "just now";
}

/** Two-letter fallback for avatars when there is no image. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const CURSOR_COLORS = [
  "#E11D48",
  "#DB2777",
  "#9333EA",
  "#4F46E5",
  "#0284C7",
  "#0D9488",
  "#16A34A",
  "#CA8A04",
  "#EA580C",
];

/** Stable per-user colour, derived from the id. */
export function colorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}
