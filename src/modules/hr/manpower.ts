// HOW MANY PEOPLE THE WORK NEEDS, AGAINST HOW MANY THERE ARE.
//
// THE PRODUCT KNOWS WHO IT EMPLOYS AND WHAT THEY DO — `roleIds` on every
// collaborator — and it has never known what the work REQUIRES. So "can we take
// this job" was answered by somebody counting names on a whiteboard, and the
// answer arrived after the bid had gone in.
//
// A PLAN IS A DEMAND, NOT AN ASSIGNMENT. It says a project wants four site
// engineers between March and June; it does not say WHICH four, and it
// deliberately cannot. Naming people would make this a roster — which the
// dispatch board already is, per day, for work that exists — and a plan is for
// work that does not exist yet, where the whole point is that nobody is on it.
//
// SUPPLY IS COUNTED FROM ROLES, not from a second list. A person holding the
// Site Engineer role IS a site engineer; a separate "resource pool" would be a
// second answer to what somebody does, free to disagree with the one that
// decides their access.
//
// PURE. No imports, no store, no clock.

export type ManpowerPlan = {
  id: string;
  projectId: string;
  roleId: string;
  needed: number;
  /** `YYYY-MM-DD`, inclusive. */
  fromDay: string;
  toDay: string;
  notes: string;
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** What is wrong with this plan line, or an empty array. */
export function manpowerProblems(input: Record<string, unknown>): string[] {
  const problems: string[] = [];
  if (!str(input.projectId, 60)) problems.push("a plan line belongs to a project");
  // A LINE WITH NO ROLE ASKS FOR "four people", which cannot be compared
  // against anything: supply is counted by role, so a demand with no role is a
  // demand nothing can answer.
  if (!str(input.roleId, 60)) problems.push("say which role is needed");

  const needed = num(input.needed);
  if (!Number.isInteger(needed) || needed < 1) problems.push("a plan needs at least one person");
  if (needed > 999) problems.push("that is more people than a plan line should hold");

  const from = str(input.fromDay, 10);
  const to = str(input.toDay, 10);
  if (!DAY_RE.test(from)) problems.push("a start date is needed");
  if (!DAY_RE.test(to)) problems.push("an end date is needed");
  // A LINE ENDING BEFORE IT STARTS is a typo somebody wants to hear about: it
  // would be demand on no day at all, and would silently never appear.
  if (DAY_RE.test(from) && DAY_RE.test(to) && to < from) {
    problems.push("a plan cannot end before it starts");
  }
  return problems;
}

export function cleanManpower(input: Record<string, unknown>): Omit<ManpowerPlan, "id"> {
  return {
    projectId: str(input.projectId, 60),
    roleId: str(input.roleId, 60),
    needed: Math.max(1, Math.round(num(input.needed))),
    fromDay: str(input.fromDay, 10),
    toDay: str(input.toDay, 10),
    notes: str(input.notes, 300),
  };
}

/** Is this plan line live on this day? */
export const liveOn = (plan: ManpowerPlan, day: string): boolean =>
  DAY_RE.test(day) && plan.fromDay <= day && day <= plan.toDay;

export type RoleGap = {
  roleId: string;
  roleName: string;
  needed: number;
  have: number;
  /** Needed less held. Never negative — see below. */
  short: number;
  /** Held less needed. Never negative, for the same reason. */
  spare: number;
  projects: { projectId: string; needed: number }[];
};

/**
 * WHAT IS NEEDED ON ONE DAY, AGAINST WHO HOLDS THE ROLE.
 *
 * SHORT AND SPARE ARE TWO FIELDS, not one signed number. "We are three site
 * engineers short" and "we have three spare" are different facts that a
 * planner acts on differently — one is a hiring decision and the other a
 * reassignment — and a single signed figure makes a reader parse a minus sign
 * to tell which. The same rule MRP's shortfall follows.
 *
 * SUPPLY IS NOT REDUCED BY OTHER PROJECTS. A person holding a role is counted
 * once against the total demand for it, not allocated to the first project that
 * asks; which of two overlapping jobs gets them is a decision a planner makes,
 * and a model that quietly assigned them would be answering it in silence.
 */
export function manpowerGaps(
  plans: ManpowerPlan[],
  roles: { id: string; name?: string }[],
  people: { roleIds?: string[] }[],
  day: string,
): RoleGap[] {
  const live = plans.filter((p) => liveOn(p, day));
  const roleName = Object.fromEntries(roles.map((r) => [r.id, String(r.name || "")]));

  const supply: Record<string, number> = {};
  for (const person of people) {
    for (const roleId of person.roleIds || []) supply[roleId] = (supply[roleId] || 0) + 1;
  }

  const demand = new Map<string, { needed: number; projects: { projectId: string; needed: number }[] }>();
  for (const plan of live) {
    const row = demand.get(plan.roleId) ?? { needed: 0, projects: [] };
    row.needed += plan.needed;
    row.projects.push({ projectId: plan.projectId, needed: plan.needed });
    demand.set(plan.roleId, row);
  }

  return [...demand.entries()]
    .map(([roleId, row]) => {
      const have = supply[roleId] || 0;
      return {
        roleId,
        // A ROLE THAT HAS BEEN DELETED still has demand written against it, and
        // saying so is more useful than dropping the line: somebody planned for
        // it, and the plan is now pointing at nothing.
        roleName: roleName[roleId] || "(removed role)",
        needed: row.needed,
        have,
        short: Math.max(0, row.needed - have),
        spare: Math.max(0, have - row.needed),
        projects: row.projects,
      };
    })
    .sort((a, b) => b.short - a.short || b.needed - a.needed);
}

/**
 * THE DAYS WHERE A ROLE IS SHORT, across a window.
 *
 * A GAP ON ONE DAY IS NOT A PLANNING PROBLEM; a gap that lasts six weeks is.
 * Scanning day by day is what turns "we are short today" into "we are short
 * from the 3rd of March", which is the sentence somebody can act on — and it is
 * the reason `manpowerGaps` takes a day rather than a range: one honest answer
 * per day, walked, rather than a range collapsed into an average nobody can
 * schedule against.
 */
export function shortDays(
  plans: ManpowerPlan[],
  roles: { id: string; name?: string }[],
  people: { roleIds?: string[] }[],
  { from, to, limit = 120 }: { from: string; to: string; limit?: number },
): { day: string; roleId: string; roleName: string; short: number }[] {
  if (!DAY_RE.test(from) || !DAY_RE.test(to) || to < from) return [];
  const out: { day: string; roleId: string; roleName: string; short: number }[] = [];

  let cursor = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  // CAPPED, and the cap is a real limit rather than a performance one: a
  // four-month horizon is a plan, and a four-year one is a spreadsheet.
  for (let i = 0; cursor <= end && i < limit; i++, cursor += 86400000) {
    const day = new Date(cursor).toISOString().slice(0, 10);
    for (const gap of manpowerGaps(plans, roles, people, day)) {
      if (gap.short > 0) out.push({ day, roleId: gap.roleId, roleName: gap.roleName, short: gap.short });
    }
  }
  return out;
}
