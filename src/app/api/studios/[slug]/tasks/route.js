import { route } from "@/lib/route";
import {
  tasksContext, listTasks, createTask, updateTask, decideTask, removeTask,
  taskProjects, assignablePeople, summarise,
  TASK_STATUSES, TASK_PRIORITIES,
  TASK_AUTHORITIES, TASK_TYPE_AUTHORITIES, TASK_TYPE_LABELS,
} from "@/lib/tasks";
import { can } from "@/platform/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: tasksContext, body: true, name: "tasks" };

// One read for the whole board.
export const GET = route({ ...spec, body: false }, async (g) => {
  const [tasks, people, projects] = await Promise.all([listTasks(g), assignablePeople(g), taskProjects(g)]);
  return {
    canManage: g.canManage,
    // DELETE IS ITS OWN RIGHT, and `canManage` is true for anybody holding any
    // write on the board — so offering the Delete button off canManage showed
    // it to every Member and Team Lead and refused every press.
    canDelete: can(g.access, "tasks.board.delete"),
    // Whether this viewer may turn an approved quotation into a project from
    // here. It is a PROJECTS right, so the board asks for it rather than
    // assuming that whoever approves also opens.
    canOpenProject: can(g.access, "projects.list.create"),
    canManageSettings: g.canManageSettings,
    taskAssignees: g.taskAssignees,
    authorities: TASK_AUTHORITIES,
    typeAuthorities: TASK_TYPE_AUTHORITIES,
    nav: g.nav,
    me: { collaboratorId: g.collaborator.id },
    tasks, people, projects,
    summary: summarise(tasks, g.collaborator.id),
    vocabulary: { statuses: TASK_STATUSES, priorities: TASK_PRIORITIES, typeLabels: TASK_TYPE_LABELS },
  };
});

// Creating and assigning work is running the board — Manage only.
export const POST = route(spec, async (g) => {
  if (!g.canManage) return { error: "read-only" };

  const result = await createTask(g, g.body);
  if (result.error) return result;
  return { status: 201, body: { ok: true, task: result.task } };
});

// NOT gated on Manage: the assignee may move their own task along and tick its
// checklist. Anything beyond that is refused inside the service, per field —
// which is why a `forbidden-field` refusal carries the fields it means.
export const PUT = route(spec, async (g) => {
  if (!g.body.id) return { error: "missing" };

  // Deciding a typed task is its own act, gated on holding the authority rather
  // than on running the board — that is the point of appointing people. A
  // `cooldown` refusal is a 429 carrying waitMs, not a 403: it is temporary, and
  // a client should treat the two completely differently.
  if (g.body.authority !== undefined) {
    const decided = await decideTask(g, g.body.id, g.body);
    if (decided.error) return decided;
    return { ok: true, task: decided.task };
  }

  // A typed task is a decision, not a to-do: refusing to edit one is a rule
  // about the RECORD, not about the caller, so `typed-immutable` is a 409. The
  // shared table had it at 403 until this route was converted and disagreed.
  const result = await updateTask(g, g.body.id, g.body);
  if (result.error) return result;
  return { ok: true, task: result.task };
});

export const DELETE = route(spec, async (g) => {
  if (!g.canManage) return { error: "read-only" };
  if (!g.body.id) return { error: "missing" };

  const result = await removeTask(g, g.body.id);
  if (result.error) return result;
  return { ok: true };
});
