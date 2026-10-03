// THE WORK IN HAND — every kind of work this studio runs, read the same way
// (./workTypes), on one board. The owner's decision C, 03/10/2026.
//
// NOTHING IS STORED FOR IT. Each lane reads the records where their own
// department files them, through the gate every Main figure goes through
// (`readIfVisible`): a lane whose department is switched off, or whose records
// this reader may not open, is ABSENT — not an empty lane, which would claim
// there is no such work.
//
// ONE SHAPE PER LANE so the screen and the KPIs to come ask one question of all
// of them: how many are open, how many are overdue, what was finished lately,
// and the open ones most in need of a look first.

import { requirePermission } from "@/platform/access";
import { ENG } from "@/platform/db/keys";
import { zRange } from "@/platform/db/store";
import { readEngagement, readEngagementView } from "@/platform/db/engagement";
import { listFlowTemplates } from "@/platform/db/flows";
import { STAGE_REGISTRY } from "@/platform/engagement/registry";
import { switchboard } from "@/lib/dashboardWidgets";
import { dayIn, studioTimezone } from "@/shared/timezone";
import { roundMoney } from "@/shared/money";
import { orderOverdue } from "@/modules/maintenance/model";
import { readIfVisible, type MainContext } from "./main";
import { dealTemplate, runningStages, stagesPresent, visibleStageTypes } from "./engagements";
import { readDeal, readStatus, workTypesRunning, type WorkReading, type WorkTypeKey } from "./workTypes";
import { readMeasures } from "@/platform/db/kpis";
import {
  factsFromJob, factsFromReceipt, factsFromWorkOrder, isItemKind, judgeItem, kpisInForce, periodBounds,
  scorePeriod, targetIn, withTarget,
  type KpiOutcome, type MeasureWords, type Period, type StudioKpiTargets, type WorkFacts, type WorkMeasure,
} from "./workKpis";

/** How many open items a lane lists. The counts are of everything. */
const SHOWN = 6;
/**
 * DEALS ARE SAMPLED: the newest this many. A deal's progress needs its root,
 * its stages and its flow — several reads each — so the board reads a page,
 * as the deals list does, and SAYS it did (`sampled`) rather than presenting a
 * page's count as the studio's.
 */
const DEAL_SAMPLE = 25;
const RECENT_DAYS = 30;

export type WorkItem = {
  id: string;
  ref: string;
  title: string;
  reading: WorkReading;
  /** `YYYY-MM-DD` it is due by, where the record says. */
  dueOn: string;
  overdue: boolean;
  href: string;
  /**
   * THE ITEM'S OWN KPI, where the studio measures one for this kind of work —
   * on-time first, then a reach. Judged by the target in force when it opened.
   */
  kpi?: { outcome: KpiOutcome; name: MeasureWords } | null;
};

/** One period KPI on a lane: "work orders on time this month: 82% (target 90%)". */
export type LaneKpi = {
  id: string;
  name: MeasureWords;
  kind: string;
  per: Period | "";
  value: number | null;
  target: number | null;
  outcome: KpiOutcome;
  n: number;
};

export type WorkLane = {
  type: WorkTypeKey;
  open: number;
  overdue: number;
  /** Finished in the last thirty days. Null where the record keeps no date it finished on. */
  doneRecently: number | null;
  /** How many were read when the counts are of a SAMPLE, not of everything (deals); null otherwise. */
  sampled: number | null;
  items: WorkItem[];
  /** Counter sales only: today's, in the studio's own day and currency. */
  today?: { count: number; value: number; currency: string };
  /** The studio's period KPIs for this kind of work, scored for the current period. */
  kpis: LaneKpi[];
};

/** What the KPI reading needs, read once for the whole board. */
type KpiCtx = { measures: WorkMeasure[]; targets: StudioKpiTargets; asOf: string; today: string; tz: string };

type Row = Record<string, unknown>;
const text = (v: unknown) => String(v ?? "");

/** Overdue first, then the soonest due, then the rest as they came. */
function rank(items: WorkItem[]): WorkItem[] {
  return [...items].sort((a, b) =>
    Number(b.overdue) - Number(a.overdue)
    || (a.dueOn ? 0 : 1) - (b.dueOn ? 0 : 1)
    || a.dueOn.localeCompare(b.dueOn));
}

function lane(type: WorkTypeKey, items: WorkItem[], doneRecently: number | null, sampled: number | null = null): WorkLane {
  const open = items.filter((i) => i.reading.state === "open");
  return {
    type,
    open: open.length,
    overdue: open.filter((i) => i.overdue).length,
    doneRecently,
    sampled,
    items: rank(open).slice(0, SHOWN),
    kpis: [],
  };
}

/**
 * AN ITEM'S OWN MARK: the first per-item measure the studio has a target for,
 * on-time before reach, in force when the item opened. Null when none is.
 */
function itemKpi(k: KpiCtx, facts: WorkFacts): WorkItem["kpi"] {
  const inForce = kpisInForce(k.measures, k.targets, facts.type, "", facts.openedAt).filter((x) => isItemKind(x.kind));
  const pick = inForce.find((x) => x.kind === "onTime") || inForce[0];
  if (!pick) return null;
  const judged = judgeItem(pick, facts, k.asOf);
  return judged ? { outcome: judged.outcome, name: pick.name } : null;
}

/**
 * THE LANE'S PERIOD KPIs, each scored over its own current period on the
 * studio's calendar, against the target in force NOW — the moment of scoring,
 * capped at the period's end. Read at the period's START instead (the first
 * version, found on screen 03/10/2026), a target set mid-month stayed invisible
 * until next month and a daily one until tomorrow. A finished period is scored
 * at the target in force when it ended, so changing a number later never
 * re-scores it. A share is counted against its item measure's target at the
 * same moment — for the built-ins that is an on-time measure, which has no
 * number to differ.
 */
function laneKpis(k: KpiCtx, type: WorkTypeKey, facts: readonly WorkFacts[]): LaneKpi[] {
  const out: LaneKpi[] = [];
  for (const m of k.measures) {
    if (!m.active || m.workType !== type || isItemKind(m.kind) || !m.per) continue;
    const { from, to } = periodBounds(m.per, k.today, k.tz);
    const at = k.asOf < to ? k.asOf : to;
    const n = targetIn(k.targets[m.id], "", at);
    if (n === null) continue;
    const itemKpis: Record<string, ReturnType<typeof withTarget>> = {};
    const of = m.of ? k.measures.find((x) => x.id === m.of) : null;
    if (of) {
      const ofN = targetIn(k.targets[of.id], "", at);
      itemKpis[of.id] = withTarget(of, ofN === null ? 1 : ofN);
    }
    const score = scorePeriod(withTarget(m, n), facts, from, to, k.asOf, itemKpis);
    out.push({ id: m.id, name: m.name, kind: m.kind, per: m.per, ...score });
  }
  return out;
}

const since = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

async function jobsLane(ctx: MainContext, today: string, slug: string, k: KpiCtx): Promise<WorkLane | null> {
  const rows = await readIfVisible<Row>(ctx, "field-service-schedule", "field-service", "jobs");
  if (!rows) return null;
  const facts = rows.map(factsFromJob);
  const items = rows.map((j, i): WorkItem => {
    const reading = readStatus("job", j.status);
    const dueOn = text(j.scheduledEnd || j.scheduledStart).slice(0, 10);
    return {
      id: text(j.id), ref: text(j.number), title: text(j.title), reading, dueOn,
      // A job is late when its window has closed and it is still open.
      overdue: reading.state === "open" && Boolean(dueOn) && dueOn < today,
      href: `/${slug}/field-service-schedule`,
      kpi: itemKpi(k, facts[i]),
    };
  });
  const cut = since(RECENT_DAYS);
  const done = rows.filter((j) => readStatus("job", j.status).state === "done" && text(j.completedAt) >= cut).length;
  return { ...lane("job", items, done), kpis: laneKpis(k, "job", facts) };
}

async function workOrdersLane(ctx: MainContext, today: string, slug: string, k: KpiCtx): Promise<WorkLane | null> {
  const rows = await readIfVisible<Row>(ctx, "maintenance-orders", "maintenance", "workOrders");
  if (!rows) return null;
  const facts = rows.map(factsFromWorkOrder);
  const items = rows.map((o, i): WorkItem => ({
    id: text(o.id), ref: text(o.reference), title: text(o.title),
    reading: readStatus("workOrder", o.status),
    dueOn: text(o.dueOn),
    // Maintenance's own rule, not a second one: on hold still counts.
    overdue: orderOverdue(o, today),
    href: `/${slug}/maintenance-orders`,
    kpi: itemKpi(k, facts[i]),
  }));
  const cut = since(RECENT_DAYS);
  const done = rows.filter((o) => readStatus("workOrder", o.status).state === "done" && text(o.completedAt || o.closedAt) >= cut).length;
  return { ...lane("workOrder", items, done), kpis: laneKpis(k, "workOrder", facts) };
}

async function counterSalesLane(ctx: MainContext, k: KpiCtx): Promise<WorkLane | null> {
  // Filed under the till's old row, worked in Point of Sale → Sales.
  const rows = await readIfVisible<Row>(ctx, "crm-sales-pos", null, "posReceipts", "pos-sales");
  if (!rows) return null;
  const tz = studioTimezone(ctx.studio as { timezone?: unknown });
  const today = dayIn(new Date(), tz);
  const currency = text(ctx.studio.currency);
  // TODAY IS THE STUDIO'S DAY, not the server's (shared/timezone): a shop in
  // Riyadh closing at 23:00 must not see its evening counted as tomorrow.
  const todays = rows.filter((r) => text(r.at) && dayIn(text(r.at), tz) === today);
  // A receipt in another currency is not added to this one's total — adding
  // dirhams to riyals is a number, not a figure.
  const value = todays
    .filter((r) => !currency || !text(r.currency) || text(r.currency) === currency)
    .reduce((sum, r) => sum + Number(r.total || 0), 0);
  const cut = since(RECENT_DAYS);
  return {
    ...lane("counterSale", [], rows.filter((r) => text(r.at) >= cut).length),
    today: { count: todays.length, value: roundMoney(value, currency), currency },
    // Receipts in another currency are left out of the figures, as above.
    kpis: laneKpis(k, "counterSale", rows
      .filter((r) => !currency || !text(r.currency) || text(r.currency) === currency)
      .map(factsFromReceipt)),
  };
}

async function dealsLane(ctx: MainContext, slug: string): Promise<WorkLane | null> {
  if (requirePermission(ctx.access, "engagements.view")) return null;
  const visible = new Set(visibleStageTypes(ctx.access, ctx.sections));
  const ids = await zRange(ENG.index(ctx.studio.id), 0, DEAL_SAMPLE - 1, { rev: true });
  const preload = { templates: await listFlowTemplates(ctx.studio.id), primaryFor: new Map<string, Promise<string>>() };
  const labels = Object.fromEntries(Object.entries(STAGE_REGISTRY).map(([k, v]) => [k, v.label]));

  // IN PARALLEL, not one after another: measured 03/10/2026 in the sandbox, the
  // board took 8.9 seconds reading thirteen deals in turn — several reads each,
  // every one waiting on the last.
  const read = await Promise.all(ids.map(async (id): Promise<WorkItem | null> => {
    const [root, view] = await Promise.all([readEngagement(ctx.studio.id, id), readEngagementView(ctx.studio.id, id)]);
    if (!root || !view) return null;
    const present = new Set(stagesPresent(view));
    // A deal this reader can see no stage of is not theirs to list — the deals
    // list's own rule.
    if (![...present].some((t) => visible.has(t))) return null;
    const template = await dealTemplate(ctx, root, preload);
    const reading = readDeal(runningStages(ctx, template, present), present, labels);
    return {
      id, ref: text(view.ref), title: text(view.context.title), reading,
      dueOn: "", overdue: false,
      href: `/${slug}/engagements/${id}`,
    };
  }));
  const items = read.filter((i): i is WorkItem => Boolean(i));
  return lane("deal", items, null, ids.length === DEAL_SAMPLE ? DEAL_SAMPLE : null);
}

/** Every kind of work this studio runs and this reader may see, in the registry's order. */
export async function workBoard(ctx: MainContext): Promise<WorkLane[]> {
  const slug = text(ctx.studio.slug);
  const tz = studioTimezone(ctx.studio as { timezone?: unknown });
  const today = dayIn(new Date(), tz);
  const running = workTypesRunning(switchboard(ctx.sections));
  const k: KpiCtx = {
    measures: await readMeasures(),
    targets: ((ctx.studio as { kpiTargets?: unknown }).kpiTargets || {}) as StudioKpiTargets,
    asOf: new Date().toISOString(), today, tz,
  };
  const read: Record<WorkTypeKey, () => Promise<WorkLane | null>> = {
    deal: () => dealsLane(ctx, slug),
    job: () => jobsLane(ctx, today, slug, k),
    workOrder: () => workOrdersLane(ctx, today, slug, k),
    counterSale: () => counterSalesLane(ctx, k),
  };
  const lanes = await Promise.all(running.map((t) => read[t]()));
  return lanes.filter((l): l is WorkLane => Boolean(l));
}
