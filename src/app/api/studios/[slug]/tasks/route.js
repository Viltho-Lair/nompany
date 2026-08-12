import {
  tasksGuard, listTasks, createTask, updateTask, removeTask,
  taskProjects, assignablePeople, summarise,
  TASK_STATUSES, TASK_PRIORITIES,
  TASK_AUTHORITIES, TASK_TYPE_AUTHORITIES,
} from "@/lib/tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = async (request) => { try { return await request.json(); } catch { return {}; } };

// One read for the whole board.
export async function GET(request, ctx) {
  const g = await tasksGuard(ctx.params);
  if (g.fail) return g.fail;

  const [tasks, people, projects] = await Promise.all([listTasks(g), assignablePeople(g), taskProjects(g)]);
  return Response.json({
    canManage: g.canManage,
    canManageSettings: g.canManageSettings,
    taskAssignees: g.taskAssignees,
    authorities: TASK_AUTHORITIES,
    typeAuthorities: TASK_TYPE_AUTHORITIES,
    nav: g.nav,
    me: { collaboratorId: g.collaborator.id },
    tasks, people, projects,
    summary: summarise(tasks, g.collaborator.id),
    vocabulary: { statuses: TASK_STATUSES, priorities: TASK_PRIORITIES },
  });
}

// Creating and assigning work is running the board — Manage only.
export async function POST(request, ctx) {
  const g = await tasksGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const result = await createTask(g, await body(request));
  if (result.error) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true, task: result.task }, { status: 201 });
}

// NOT gated on Manage: the assignee may move their own task along and tick its
// checklist. Anything beyond that is refused inside the service, per field.
export async function PUT(request, ctx) {
  const g = await tasksGuard(ctx.params);
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });

  const result = await updateTask(g, b.id, b);
  if (result.error) {
    const status = result.error === "notfound" ? 404
      : result.error === "forbidden" || result.error === "forbidden-field" ? 403 : 400;
    return Response.json({ error: result.error, fields: result.fields }, { status });
  }
  return Response.json({ ok: true, task: result.task });
}

export async function DELETE(request, ctx) {
  const g = await tasksGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });
  const result = await removeTask(g, b.id);
  if (result.error) return Response.json({ error: result.error }, { status: 404 });
  return Response.json({ ok: true });
}
