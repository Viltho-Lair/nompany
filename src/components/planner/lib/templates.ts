import type { Resource, Task } from '@/components/planner/lib/types';
import { addCalendarDays, snapForward, toISODate } from '@/components/planner/lib/schedule/calendar';
import { DEFAULT_CALENDAR } from '@/components/planner/lib/schedule/calendar';

/* ------------------------------------------------------------------ *
 * Presets.
 *
 * A template is stored as a relative skeleton: every row carries a
 * `ref` (a stable local key), an optional `parentRef`, an offset in
 * working days from the project start, a duration, and links expressed
 * with the same refs. Instantiating one resolves refs to fresh uuids
 * and offsets to real dates, so the same preset works for any start
 * date without any stored absolute dates going stale.
 * ------------------------------------------------------------------ */

export const RESOURCE_POOL: Resource[] = [
  { id: 'r-amara',  name: 'Amara Osei',      initials: 'AO', role: 'Project Lead',     color: '#F06A6A', rate: 95,  capacity: 100 },
  { id: 'r-jonas',  name: 'Jonas Weber',     initials: 'JW', role: 'Engineering Lead', color: '#4573D2', rate: 110, capacity: 80 },
  { id: 'r-priya',  name: 'Priya Nair',      initials: 'PN', role: 'Product Designer', color: '#F2A0C0', rate: 85,  capacity: 100 },
  { id: 'r-diego',  name: 'Diego Marquez',   initials: 'DM', role: 'Backend Engineer', color: '#5DA283', rate: 100, capacity: 100 },
  { id: 'r-lena',   name: 'Lena Fischer',    initials: 'LF', role: 'QA Engineer',      color: '#F1BD6C', rate: 78,  capacity: 60 },
  { id: 'r-tomas',  name: 'Tomas Silva',     initials: 'TS', role: 'DevOps',           color: '#6E7FDB', rate: 105, capacity: 50 },
  { id: 'r-yuki',   name: 'Yuki Tanaka',     initials: 'YT', role: 'Marketing',        color: '#4ECBC4', rate: 82,  capacity: 100 },
  { id: 'r-sara',   name: 'Sara Haddad',     initials: 'SH', role: 'Business Analyst', color: '#A87CE0', rate: 88,  capacity: 100 },
];

export const PHASE_COLORS = [
  '#4573D2', '#F06A6A', '#5DA283', '#F1BD6C',
  '#A87CE0', '#4ECBC4', '#F2A0C0', '#6E7FDB',
];

export interface TemplateRow {
  ref: string;
  parentRef?: string;
  name: string;
  /** working-day offset from project start; ignored when the row has links */
  offset?: number;
  duration?: number;
  unit?: 'days' | 'hours';
  milestone?: boolean;
  assignees?: string[];
  effortHours?: number;
  /** e.g. ['design'] or ['design:FS+2'] */
  after?: string[];
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  accent: string;
  rows: TemplateRow[];
}

export const TEMPLATES: ProjectTemplate[] = [
  {
    id: 'blank',
    name: 'Blank project',
    description: 'Start from an empty grid and build the WBS yourself.',
    category: 'Custom',
    accent: '#8DA0A6',
    rows: [],
  },
  {
    id: 'software',
    name: 'Software delivery',
    description:
      'Discovery through hardening, with a QA gate and a release milestone.',
    category: 'Engineering',
    accent: '#4573D2',
    rows: [
      { ref: 'disc', name: 'Discovery' },
      { ref: 'disc-1', parentRef: 'disc', name: 'Stakeholder interviews', offset: 0, duration: 3, assignees: ['r-sara'], effortHours: 24 },
      { ref: 'disc-2', parentRef: 'disc', name: 'Requirements & acceptance criteria', duration: 4, after: ['disc-1'], assignees: ['r-sara', 'r-amara'], effortHours: 32 },
      { ref: 'disc-3', parentRef: 'disc', name: 'Technical spike', duration: 3, after: ['disc-1:SS+1'], assignees: ['r-jonas'], effortHours: 24 },
      { ref: 'disc-m', parentRef: 'disc', name: 'Scope signed off', milestone: true, after: ['disc-2', 'disc-3'] },

      { ref: 'des', name: 'Design' },
      { ref: 'des-1', parentRef: 'des', name: 'Information architecture', duration: 3, after: ['disc-m'], assignees: ['r-priya'], effortHours: 24 },
      { ref: 'des-2', parentRef: 'des', name: 'High-fidelity screens', duration: 6, after: ['des-1'], assignees: ['r-priya'], effortHours: 48 },
      { ref: 'des-3', parentRef: 'des', name: 'Design system updates', duration: 4, after: ['des-1:SS+2'], assignees: ['r-priya'], effortHours: 28 },

      { ref: 'bld', name: 'Build' },
      { ref: 'bld-1', parentRef: 'bld', name: 'Data model & migrations', duration: 4, after: ['disc-m'], assignees: ['r-diego'], effortHours: 32 },
      { ref: 'bld-2', parentRef: 'bld', name: 'API endpoints', duration: 8, after: ['bld-1'], assignees: ['r-diego', 'r-jonas'], effortHours: 64 },
      { ref: 'bld-3', parentRef: 'bld', name: 'Front-end implementation', duration: 10, after: ['des-2', 'bld-2:SS+3'], assignees: ['r-jonas'], effortHours: 80 },
      { ref: 'bld-4', parentRef: 'bld', name: 'CI/CD pipeline', duration: 3, after: ['bld-1:SS'], assignees: ['r-tomas'], effortHours: 24 },

      { ref: 'qa', name: 'Quality & release' },
      { ref: 'qa-1', parentRef: 'qa', name: 'Test plan', duration: 2, after: ['des-2:SS'], assignees: ['r-lena'], effortHours: 16 },
      { ref: 'qa-2', parentRef: 'qa', name: 'Regression pass', duration: 5, after: ['bld-3', 'qa-1'], assignees: ['r-lena'], effortHours: 40 },
      { ref: 'qa-3', parentRef: 'qa', name: 'Bug fix & hardening', duration: 4, after: ['qa-2:SS+2'], assignees: ['r-jonas', 'r-diego'], effortHours: 40 },
      { ref: 'qa-4', parentRef: 'qa', name: 'Production cutover', duration: 1, after: ['qa-3'], assignees: ['r-tomas'], effortHours: 8 },
      { ref: 'qa-m', parentRef: 'qa', name: 'Go live', milestone: true, after: ['qa-4'] },
    ],
  },
  {
    id: 'construction',
    name: 'Construction / fit-out',
    description:
      'Permit-gated build sequence with procurement lead times and handover.',
    category: 'Capital works',
    accent: '#F1BD6C',
    rows: [
      { ref: 'pre', name: 'Pre-construction' },
      { ref: 'pre-1', parentRef: 'pre', name: 'Site survey', offset: 0, duration: 4, assignees: ['r-sara'], effortHours: 32 },
      { ref: 'pre-2', parentRef: 'pre', name: 'Concept drawings', duration: 8, after: ['pre-1'], assignees: ['r-priya'], effortHours: 64 },
      { ref: 'pre-3', parentRef: 'pre', name: 'Permit submission', duration: 2, after: ['pre-2'], assignees: ['r-amara'], effortHours: 16 },
      { ref: 'pre-4', parentRef: 'pre', name: 'Permit approval window', duration: 15, after: ['pre-3'], effortHours: 0 },
      { ref: 'pre-m', parentRef: 'pre', name: 'Permit granted', milestone: true, after: ['pre-4'] },

      { ref: 'pro', name: 'Procurement' },
      { ref: 'pro-1', parentRef: 'pro', name: 'Tender package', duration: 5, after: ['pre-2'], assignees: ['r-sara'], effortHours: 40 },
      { ref: 'pro-2', parentRef: 'pro', name: 'Contractor selection', duration: 6, after: ['pro-1'], assignees: ['r-amara'], effortHours: 30 },
      { ref: 'pro-3', parentRef: 'pro', name: 'Long-lead material order', duration: 20, after: ['pro-2'], effortHours: 8 },

      { ref: 'con', name: 'Construction' },
      { ref: 'con-1', parentRef: 'con', name: 'Site mobilisation', duration: 3, after: ['pre-m', 'pro-2'], assignees: ['r-tomas'], effortHours: 24 },
      { ref: 'con-2', parentRef: 'con', name: 'Demolition & strip-out', duration: 6, after: ['con-1'], effortHours: 96 },
      { ref: 'con-3', parentRef: 'con', name: 'MEP first fix', duration: 10, after: ['con-2'], effortHours: 160 },
      { ref: 'con-4', parentRef: 'con', name: 'Partitions & ceilings', duration: 8, after: ['con-3:SS+4'], effortHours: 128 },
      { ref: 'con-5', parentRef: 'con', name: 'Second fix & finishes', duration: 9, after: ['con-4', 'pro-3'], effortHours: 144 },

      { ref: 'han', name: 'Commissioning & handover' },
      { ref: 'han-1', parentRef: 'han', name: 'Systems commissioning', duration: 4, after: ['con-5'], assignees: ['r-tomas'], effortHours: 32 },
      { ref: 'han-2', parentRef: 'han', name: 'Snagging', duration: 5, after: ['han-1'], assignees: ['r-lena'], effortHours: 40 },
      { ref: 'han-3', parentRef: 'han', name: 'Client walkthrough', duration: 1, after: ['han-2'], assignees: ['r-amara'], effortHours: 8 },
      { ref: 'han-m', parentRef: 'han', name: 'Practical completion', milestone: true, after: ['han-3'] },
    ],
  },
  {
    id: 'marketing',
    name: 'Campaign launch',
    description:
      'Creative production with a hard launch date and post-launch reporting.',
    category: 'Marketing',
    accent: '#F06A6A',
    rows: [
      { ref: 'str', name: 'Strategy' },
      { ref: 'str-1', parentRef: 'str', name: 'Audience research', offset: 0, duration: 4, assignees: ['r-sara'], effortHours: 32 },
      { ref: 'str-2', parentRef: 'str', name: 'Messaging framework', duration: 3, after: ['str-1'], assignees: ['r-yuki'], effortHours: 24 },
      { ref: 'str-3', parentRef: 'str', name: 'Channel & budget plan', duration: 2, after: ['str-2'], assignees: ['r-yuki', 'r-amara'], effortHours: 16 },

      { ref: 'cre', name: 'Creative production' },
      { ref: 'cre-1', parentRef: 'cre', name: 'Key visual concepts', duration: 5, after: ['str-2'], assignees: ['r-priya'], effortHours: 40 },
      { ref: 'cre-2', parentRef: 'cre', name: 'Localised ad creative', duration: 6, after: ['cre-1'], assignees: ['r-priya'], effortHours: 48 },
      { ref: 'cre-3', parentRef: 'cre', name: 'Landing page build', duration: 5, after: ['cre-1'], assignees: ['r-jonas'], effortHours: 40 },
      { ref: 'cre-4', parentRef: 'cre', name: 'Copy & legal review', duration: 3, after: ['cre-2:SS+2'], assignees: ['r-sara'], effortHours: 18 },

      { ref: 'lau', name: 'Launch' },
      { ref: 'lau-1', parentRef: 'lau', name: 'Media buying setup', duration: 3, after: ['str-3', 'cre-2'], assignees: ['r-yuki'], effortHours: 24 },
      { ref: 'lau-2', parentRef: 'lau', name: 'QA across devices', duration: 2, after: ['cre-3', 'cre-4'], assignees: ['r-lena'], effortHours: 16 },
      { ref: 'lau-m', parentRef: 'lau', name: 'Campaign live', milestone: true, after: ['lau-1', 'lau-2'] },
      { ref: 'lau-3', parentRef: 'lau', name: 'Performance monitoring', duration: 10, after: ['lau-m'], assignees: ['r-yuki'], effortHours: 30 },
      { ref: 'lau-4', parentRef: 'lau', name: 'Results readout', duration: 2, after: ['lau-3'], assignees: ['r-yuki', 'r-amara'], effortHours: 16 },
    ],
  },
  {
    id: 'product',
    name: 'Product launch (GTM)',
    description:
      'Cross-functional launch: readiness workstreams converging on a launch gate.',
    category: 'Product',
    accent: '#A87CE0',
    rows: [
      { ref: 'rea', name: 'Launch readiness' },
      { ref: 'rea-1', parentRef: 'rea', name: 'Positioning & pricing', offset: 0, duration: 5, assignees: ['r-amara'], effortHours: 40 },
      { ref: 'rea-2', parentRef: 'rea', name: 'Beta programme', duration: 12, after: ['rea-1:SS+2'], assignees: ['r-sara'], effortHours: 60 },
      { ref: 'rea-3', parentRef: 'rea', name: 'Pricing system changes', duration: 6, after: ['rea-1'], assignees: ['r-diego'], effortHours: 48 },

      { ref: 'ena', name: 'Enablement' },
      { ref: 'ena-1', parentRef: 'ena', name: 'Sales deck & battlecards', duration: 4, after: ['rea-1'], assignees: ['r-yuki'], effortHours: 32 },
      { ref: 'ena-2', parentRef: 'ena', name: 'Support runbooks', duration: 4, after: ['rea-2:FF+2'], assignees: ['r-lena'], effortHours: 32 },
      { ref: 'ena-3', parentRef: 'ena', name: 'Internal training', duration: 2, after: ['ena-1', 'ena-2'], assignees: ['r-amara'], effortHours: 24 },

      { ref: 'gtm', name: 'Go to market' },
      { ref: 'gtm-1', parentRef: 'gtm', name: 'Press & analyst briefing', duration: 3, after: ['ena-1'], assignees: ['r-yuki'], effortHours: 24 },
      { ref: 'gtm-2', parentRef: 'gtm', name: 'Docs & help centre', duration: 6, after: ['rea-3'], assignees: ['r-sara'], effortHours: 48 },
      { ref: 'gtm-m', parentRef: 'gtm', name: 'Launch gate', milestone: true, after: ['ena-3', 'gtm-1', 'gtm-2', 'rea-2'] },
      { ref: 'gtm-3', parentRef: 'gtm', name: 'Day-1 monitoring', duration: 3, after: ['gtm-m'], assignees: ['r-tomas'], effortHours: 24 },
      { ref: 'gtm-4', parentRef: 'gtm', name: 'Retrospective', duration: 1, after: ['gtm-3'], assignees: ['r-amara'], effortHours: 8 },
    ],
  },
  {
    id: 'sprint',
    name: 'Two-week sprint',
    description:
      'Hour-granular sprint plan - pairs with the Working hours toggle.',
    category: 'Engineering',
    accent: '#5DA283',
    rows: [
      { ref: 'sp', name: 'Sprint 24' },
      { ref: 'sp-1', parentRef: 'sp', name: 'Sprint planning', offset: 0, duration: 4, unit: 'hours', assignees: ['r-amara'], effortHours: 4 },
      { ref: 'sp-2', parentRef: 'sp', name: 'Auth refactor', duration: 20, unit: 'hours', after: ['sp-1'], assignees: ['r-diego'], effortHours: 20 },
      { ref: 'sp-3', parentRef: 'sp', name: 'Settings screen', duration: 16, unit: 'hours', after: ['sp-1'], assignees: ['r-jonas'], effortHours: 16 },
      { ref: 'sp-4', parentRef: 'sp', name: 'Empty states polish', duration: 6, unit: 'hours', after: ['sp-3'], assignees: ['r-priya'], effortHours: 6 },
      { ref: 'sp-5', parentRef: 'sp', name: 'Code review', duration: 4, unit: 'hours', after: ['sp-2', 'sp-3'], assignees: ['r-jonas'], effortHours: 4 },
      { ref: 'sp-6', parentRef: 'sp', name: 'QA sweep', duration: 8, unit: 'hours', after: ['sp-5'], assignees: ['r-lena'], effortHours: 8 },
      { ref: 'sp-m', parentRef: 'sp', name: 'Sprint review', milestone: true, after: ['sp-6', 'sp-4'] },
    ],
  },
];

let counter = 0;
export function newId(prefix = 't'): string {
  counter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${counter}-${rand}`;
}

/** Parse "ref", "ref:FS", "ref:SS+2", "ref:FF-1" */
function parseLink(token: string): {
  ref: string;
  type: 'FS' | 'SS' | 'FF' | 'SF';
  lag: number;
} {
  const [ref, spec] = token.split(':');
  if (!spec) return { ref, type: 'FS', lag: 0 };
  const match = /^(FS|SS|FF|SF)?([+-]\d+(?:\.\d+)?)?$/.exec(spec.trim());
  return {
    ref,
    type: (match?.[1] as 'FS' | 'SS' | 'FF' | 'SF') ?? 'FS',
    lag: match?.[2] ? Number(match[2]) : 0,
  };
}

/**
 * Turn a template into real tasks anchored at `startDate`.
 * Rows with `after` links get a placeholder start; the engine overwrites
 * it on the first pass.
 */
export function instantiateTemplate(
  template: ProjectTemplate,
  startDate: Date,
): Task[] {
  const cal = DEFAULT_CALENDAR;
  const anchor = snapForward(startDate, cal);
  const idByRef = new Map<string, string>();
  for (const row of template.rows) idByRef.set(row.ref, newId());

  let colorCursor = 0;
  const colorByRoot = new Map<string, string>();

  return template.rows.map((row) => {
    const id = idByRef.get(row.ref)!;
    const parentId = row.parentRef ? idByRef.get(row.parentRef) ?? null : null;

    const rootRef = row.parentRef ?? row.ref;
    if (!colorByRoot.has(rootRef)) {
      colorByRoot.set(rootRef, PHASE_COLORS[colorCursor % PHASE_COLORS.length]);
      colorCursor += 1;
    }

    const dependencies = (row.after ?? []).flatMap((token) => {
      const { ref, type, lag } = parseLink(token);
      const predecessorId = idByRef.get(ref);
      return predecessorId ? [{ predecessorId, type, lag }] : [];
    });

    const start = addCalendarDays(anchor, row.offset ?? 0);

    return {
      id,
      parentId,
      name: row.name,
      notes: '',
      assigneeIds: row.assignees ?? [],
      start: start.toISOString(),
      end: start.toISOString(),
      duration: row.milestone ? 0 : row.duration ?? 1,
      durationUnit: row.unit ?? 'days',
      dependencies,
      status: 'not_started' as const,
      percentComplete: 0,
      priority: 'medium' as const,
      scheduleMode: 'auto' as const,
      milestone: Boolean(row.milestone),
      collapsed: false,
      effortHours: row.effortHours ?? 0,
      phaseColor: colorByRoot.get(rootRef),
    } satisfies Task;
  });
}

/** A single empty row, used by "Add task" and by the blank preset. */
export function blankTask(overrides: Partial<Task> = {}): Task {
  const start = snapForward(new Date(), DEFAULT_CALENDAR);
  return {
    id: newId(),
    parentId: null,
    name: 'New task',
    notes: '',
    assigneeIds: [],
    start: start.toISOString(),
    end: start.toISOString(),
    duration: 1,
    durationUnit: 'days',
    dependencies: [],
    status: 'not_started',
    percentComplete: 0,
    priority: 'medium',
    scheduleMode: 'auto',
    milestone: false,
    collapsed: false,
    effortHours: 8,
    phaseColor: PHASE_COLORS[0],
    ...overrides,
  };
}

export { toISODate };
