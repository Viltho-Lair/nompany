// THE HOUSE MOTION CURVES, in one place for both surfaces.
//
// These began as `components/landing/lib/motion.js`, where they were tuples fed
// to `motion/react`. Wave 4 animates the studio too, and the studio must NOT
// ship that library — `motion/react` is ~30 KB gzipped and today it is confined
// entirely to `components/landing/**`, which is why the studio's chunk does not
// carry it. So the curves live here as values, the landing keeps feeding them to
// its library, and the studio feeds the same numbers to CSS and to
// requestAnimationFrame. One definition, two consumers, no new dependency.

/** A cubic-bezier control pair, `[x1, y1, x2, y2]`. */
export type Bezier = readonly [number, number, number, number];

/** Expressive deceleration — the house curve for entrances. */
export const EASE_OUT_EXPO: Bezier = [0.16, 1, 0.3, 1];
/** Symmetric curve for loops and state swaps. */
export const EASE_SOFT: Bezier = [0.65, 0, 0.35, 1];

/** The same curve as a CSS value, for a transition rather than a script. */
export const css = (b: Bezier) => `cubic-bezier(${b.join(", ")})`;

/**
 * Sample a cubic bezier at time `t`.
 *
 * `motion/react` does this internally; a hand-driven animation has to do it
 * itself or it eases linearly, which reads as mechanical next to anything on
 * the same page that does not. Newton-Raphson on x to recover the parameter,
 * then evaluate y — five iterations is well inside a pixel at any duration a
 * person would sit through, and the fallback bisection covers the flat spots
 * where the derivative vanishes and Newton stalls.
 */
export function sample([x1, y1, x2, y2]: Bezier, t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;

  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const fx = (u: number) => ((ax * u + bx) * u + cx) * u;
  const dfx = (u: number) => (3 * ax * u + 2 * bx) * u + cx;

  let u = t;
  for (let i = 0; i < 5; i++) {
    const err = fx(u) - t;
    if (Math.abs(err) < 1e-6) return ((ay * u + by) * u + cy) * u;
    const d = dfx(u);
    if (Math.abs(d) < 1e-6) break;
    u -= err / d;
  }

  let lo = 0;
  let hi = 1;
  u = t;
  for (let i = 0; i < 20; i++) {
    const v = fx(u);
    if (Math.abs(v - t) < 1e-6) break;
    if (v > t) hi = u;
    else lo = u;
    u = (lo + hi) / 2;
  }
  return ((ay * u + by) * u + cy) * u;
}

/**
 * Does this visitor want motion suppressed?
 *
 * Read at the moment the animation would start rather than stored, because the
 * OS setting can change while the tab is open — and because reading it during
 * render would differ between the server (no `matchMedia`) and the browser,
 * which is a hydration mismatch.
 */
export const reduced = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
