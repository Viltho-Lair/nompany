// FINISH SETTING UP — the first-run checklist on the front door (04/10/2026).
// The agreed order's step 3 kept registration short on purpose: "Not asked at
// registration: … KPIs … Those belong in a first-run checklist inside the
// studio." This is that checklist.
//
// DERIVED, NEVER STORED. Each item is read off what the studio already holds —
// a country and a currency, a logo, a second person, a KPI target — so it ticks
// itself the moment the thing is done, wherever it was done, and there is no
// "completed" flag free to disagree with the studio. Hiding it early is the
// viewer's own convenience, kept in their browser.
//
// PURE — the Main route reads it, a test holds it.

export const FIRST_RUN_KEYS = ["company", "logo", "team", "kpis"] as const;
export type FirstRunKey = (typeof FIRST_RUN_KEYS)[number];

export type FirstRunItem = { key: FirstRunKey; done: boolean; href: string };

type StudioLike = { country?: unknown; currency?: unknown; logo?: unknown; kpiTargets?: unknown };

const has = (v: unknown) => String(v ?? "").trim() !== "";

/**
 * Is any target set right now — a measure, or a deal flow's step, whose latest
 * version has a number. Both shapes are dated version lists; a measure's number
 * is `value`, a step's is `days` (./flowSteps).
 */
export function anyTarget(targets: unknown): boolean {
  if (!targets || typeof targets !== "object") return false;
  return Object.values(targets as Record<string, unknown>).some((versions) => {
    if (!Array.isArray(versions) || !versions.length) return false;
    const last = versions[versions.length - 1] as { value?: unknown; days?: unknown };
    const n = last?.value ?? last?.days;
    return n !== null && n !== undefined;
  });
}

/**
 * THE CHECKLIST, in the order a new owner would do it. `people` is how many
 * people are in the studio, the owner included. `flows` is the studio's own
 * deal flows: a target set on a flow's step counts (05/10/2026), because that
 * is where a deal's targets are set now.
 */
export function firstRunChecklist(
  studio: StudioLike, people: number, slug: string,
  flows: readonly { targets?: unknown }[] = [],
): FirstRunItem[] {
  const settings = `/${slug}/administration-settings`;
  return [
    { key: "company", done: has(studio.country) && has(studio.currency), href: settings },
    { key: "logo", done: has(studio.logo), href: settings },
    { key: "team", done: people > 1, href: `/${slug}/administration-members` },
    { key: "kpis", done: anyTarget(studio.kpiTargets) || flows.some((fl) => anyTarget(fl.targets)), href: `${settings}#kpis` },
  ];
}

/** Nothing left to do — the front door stops showing the checklist. */
export const firstRunDone = (items: readonly FirstRunItem[]) => items.every((i) => i.done);
