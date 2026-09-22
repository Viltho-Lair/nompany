// A SCALE ANSWER MEANS SOMETHING; A TALLY THROWS THAT AWAY (22/09/2026).
//
// THE GAP THIS CLOSES. `nps`, `rating` and `opinion-scale` have been question
// types since the questionnaire was built, and `summariseResponses` counted
// them exactly as it counts a multiple-choice: one bar per distinct answer,
// **sorted by how often each came up**. So an NPS question drew eleven bars
// with "9" above "2" because more people said 9, which is unreadable as a
// scale; nothing computed a Net Promoter Score at all; and "how did we do out
// of five" had no average anywhere in the product. The type declared its
// meaning and the summary discarded it — the same class of defect as a field
// that is written and never read.
//
// PURE, AND IN `lib` RATHER THAN IN MARKETING, because both surfaces that
// summarise answers reach it: the studio's own Marketing forms and nompany's
// `/super` questionnaires. One arithmetic, or the two drift.

/** The three types whose answers are points on a scale rather than choices. */
export const SCALE_TYPES = new Set(["nps", "rating", "opinion-scale"]);

/**
 * WHAT A SCALE RUNS FROM AND TO.
 *
 * TAKEN FROM THE TYPE, because that is where it is decided: `cleanDefinition`
 * clamps a question to 0–10 for NPS and 1–5 for the other two, so the type is
 * the authority and a question's own bounds are the exception. A question that
 * carries them is honoured, which is what keeps this correct if a studio is
 * ever offered a 1–7 scale.
 */
export function scaleBounds(type: string, q?: { min?: unknown; max?: unknown } | null): { min: number; max: number } {
  const [lo, hi] = type === "nps" ? [0, 10] : [1, 5];
  const min = Number(q?.min);
  const max = Number(q?.max);
  return {
    min: Number.isFinite(min) ? min : lo,
    max: Number.isFinite(max) && Number(max) > (Number.isFinite(min) ? min : lo) ? max : hi,
  };
}

/** Only the answers that are actually numbers. A blank is not a nought. */
export function numbersIn(values: readonly string[]): number[] {
  const out: number[] = [];
  for (const v of values) {
    const n = Number(v);
    if (String(v).trim() !== "" && Number.isFinite(n)) out.push(n);
  }
  return out;
}

/**
 * THE MEAN OF A SCALE, or NULL when nobody answered.
 *
 * NULL RATHER THAN NOUGHT, the house rule, and here it is not pedantry: on a
 * 1–5 rating an average of 0 is OUTSIDE the scale, so a defaulted zero would
 * render as a bar shorter than the worst possible answer and read as a
 * catastrophe rather than as silence.
 */
export function averageOf(values: readonly string[]): number | null {
  const ns = numbersIn(values);
  if (!ns.length) return null;
  return Math.round((ns.reduce((s, n) => s + n, 0) / ns.length) * 100) / 100;
}

/**
 * NET PROMOTER SCORE. The standard bands: 0–6 detractors, 7–8 passives, 9–10
 * promoters, and the score is the percentage of promoters less the percentage
 * of detractors — so it runs from −100 to +100 and the passives count only by
 * diluting both shares.
 */
export const NPS_BANDS = { detractor: [0, 6], passive: [7, 8], promoter: [9, 10] } as const;

export type NpsSummary = {
  answered: number;
  promoters: number;
  passives: number;
  detractors: number;
  /** −100 to +100, or NULL when nobody answered. */
  score: number | null;
};

/**
 * NPS FROM THE ANSWERS GIVEN.
 *
 * `score` IS NULL WITH NO ANSWERS AND A REAL 0 WITH SOME, and the difference
 * matters more here than anywhere else in this product: a real zero means the
 * promoters and the detractors cancelled exactly — a genuine, reportable
 * result — while a defaulted zero would say a form nobody has answered is
 * performing averagely.
 *
 * AN OUT-OF-RANGE ANSWER IS COUNTED AS WHAT IT IS. A stored 11 or −1 cannot be
 * produced by the public page, which clamps, but a CSV import or a form whose
 * bounds were edited after the fact can leave one — so it falls into the band
 * it borders rather than being dropped, because a response silently missing
 * from a total is how a figure stops adding up.
 */
export function npsOf(values: readonly string[]): NpsSummary {
  const ns = numbersIn(values);
  let promoters = 0;
  let passives = 0;
  let detractors = 0;
  for (const n of ns) {
    if (n >= NPS_BANDS.promoter[0]) promoters += 1;
    else if (n >= NPS_BANDS.passive[0]) passives += 1;
    else detractors += 1;
  }
  const answered = ns.length;
  return {
    answered,
    promoters,
    passives,
    detractors,
    score: answered ? Math.round(((promoters - detractors) / answered) * 100) : null,
  };
}

/** Which band one answer falls in — for colouring a bar, and for the screen to name it. */
export function npsBand(value: unknown): "promoter" | "passive" | "detractor" | "" {
  const n = Number(value);
  if (String(value ?? "").trim() === "" || !Number.isFinite(n)) return "";
  if (n >= NPS_BANDS.promoter[0]) return "promoter";
  if (n >= NPS_BANDS.passive[0]) return "passive";
  return "detractor";
}

/**
 * EVERY POINT ON THE SCALE, IN ORDER, INCLUDING THE ONES NOBODY PICKED.
 *
 * THE GAPS ARE THE SHAPE. A rating where nobody chose 3 is a different finding
 * from one where 3 was never offered, and a tally list that simply omits the
 * unpicked value draws a four-bar chart of a five-point scale — which reads as
 * though the scale itself were smaller. Counting every point from min to max is
 * what makes two questions' charts comparable at a glance.
 *
 * AND AN ANSWER OUTSIDE THE BOUNDS STILL APPEARS, after the scale, because it
 * exists in the data and a chart that hides it disagrees with `answered`.
 */
export function scalePoints(
  values: readonly string[],
  bounds: { min: number; max: number },
): { value: string; count: number; inScale: boolean }[] {
  const counts = new Map<number, number>();
  for (const n of numbersIn(values)) counts.set(n, (counts.get(n) || 0) + 1);

  const out: { value: string; count: number; inScale: boolean }[] = [];
  // A scale is small by construction (0–10 at the widest). The guard is for a
  // question whose bounds were edited to something absurd, not for the honest
  // case: without it a min of 0 and a max of a million is a million-row answer.
  const span = Math.min(bounds.max - bounds.min, 100);
  for (let n = bounds.min; n <= bounds.min + span; n += 1) {
    out.push({ value: String(n), count: counts.get(n) || 0, inScale: true });
    counts.delete(n);
  }
  for (const [n, count] of [...counts].sort((a, b) => a[0] - b[0])) {
    out.push({ value: String(n), count, inScale: false });
  }
  return out;
}
