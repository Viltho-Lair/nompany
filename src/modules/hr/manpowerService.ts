// THE STORE HALF OF `./manpower`.
//
// NO PERMISSION KEY OF ITS OWN. A plan is a statement about the studio's own
// headcount, which is what `hr.employees` already opens — and reading it needs
// the ROLES too, so a right that let somebody plan without seeing who holds
// what would be a right that shows a gap and hides its cause.
//
// PROJECTS ARE READ, NEVER WRITTEN, and the section is FOREIGN: a studio that
// has not opened Projects can still plan its headcount, it simply has no
// project to hang a line on — which is why an unknown project id is refused
// rather than silently accepted.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { listCollaborators } from "@/platform/auth/collaborators";
import { listRoles } from "@/modules/people/roles";
import { manpowerProblems, cleanManpower, manpowerGaps, shortDays } from "./manpower";
import type { ManpowerPlan } from "./manpower";
import type { HrContext } from "./types";

const Plans = repo<ManpowerPlan>("manpowerPlans");
const Projects = repo<{ id: string; title?: string; number?: string }>("projects");

const scope = (ctx: HrContext) => ({ studio: ctx.studio, section: ctx.employeesSection });
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

async function projectsOf(ctx: HrContext) {
  const section = ctx.projectsListSection ?? null;
  if (!section) return [];
  return Projects.find({ studio: ctx.studio, section });
}

/** The plan, the gap on a chosen day, and where the shortfalls begin. */
export async function manpowerPlan(ctx: HrContext, { day, to }: { day: string; to: string }) {
  const denied = requirePermission(ctx.access, "hr.employees.view");
  if (denied) return denied;

  const [plans, roles, people, projects] = await Promise.all([
    Plans.find(scope(ctx)),
    listRoles(ctx.studio.id),
    listCollaborators(ctx.studio.id),
    projectsOf(ctx),
  ]);

  const staff = people.map((c) => ({
    roleIds: Array.isArray((c as { roleIds?: unknown }).roleIds)
      ? ((c as { roleIds: unknown[] }).roleIds.map(String))
      : [],
  }));
  const projectName = Object.fromEntries(projects.map((p) => [p.id, `${p.number || ""} ${p.title || ""}`.trim()]));

  return {
    day,
    plans: plans.map((p) => ({
      ...p,
      roleName: roles.find((r) => r.id === p.roleId)?.name || "(removed role)",
      projectName: projectName[p.projectId] || "(removed project)",
    })),
    gaps: manpowerGaps(plans, roles, staff, day).map((g) => ({
      ...g,
      projects: g.projects.map((p) => ({ ...p, name: projectName[p.projectId] || "(removed project)" })),
    })),
    // WHEN A SHORTFALL STARTS, not just that one exists today: "we are short
    // from the 3rd of March" is the sentence somebody can act on.
    upcoming: shortDays(plans, roles, staff, { from: day, to }),
    roles: roles.map((r) => ({ id: r.id, name: r.name || "" })),
    projects: projects.map((p) => ({ id: p.id, label: projectName[p.id] })),
    canManage: !requirePermission(ctx.access, "hr.employees.edit"),
  };
}

export async function savePlanLine(ctx: HrContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "hr.employees.edit");
  if (denied) return denied;

  const problems = manpowerProblems(body);
  if (problems.length) return { error: "refused", detail: problems.join("; ") };

  const clean = cleanManpower(body);
  // THE PROJECT AND THE ROLE ARE CHECKED AT THE WRITE, unlike a cost code on a
  // bill — and the difference is what the reader can do about it. A deleted
  // cost code is reported as `uncoded` and the money is still real; a plan line
  // against a project that never existed is a typo with no reading at all.
  const [roles, projects] = await Promise.all([listRoles(ctx.studio.id), projectsOf(ctx)]);
  if (!roles.some((r) => r.id === clean.roleId)) return { error: "role" };
  if (!projects.some((p) => p.id === clean.projectId)) return { error: "project" };

  const id = String(body?.id ?? "").trim();
  if (id) {
    const updated = await Plans.update(scope(ctx), id, clean);
    return updated ? { plan: updated } : { error: "notfound" };
  }
  return { plan: await Plans.create(scope(ctx), clean) };
}

/**
 * REMOVE A LINE. It cascades nothing: a plan line is an input to arithmetic,
 * and the demand it produced simply stops being produced.
 */
export async function removePlanLine(ctx: HrContext, id: string) {
  const denied = requirePermission(ctx.access, "hr.employees.edit");
  if (denied) return denied;
  const rows = await Plans.find(scope(ctx));
  if (!rows.some((p) => p.id === id)) return { error: "notfound" };
  await Plans.remove(scope(ctx), id);
  return { ok: true };
}

/** Today, or the day the caller asked for. */
export const dayOrToday = (asked: string) =>
  (DAY_RE.test(asked) ? asked : new Date().toISOString().slice(0, 10));
