import {
  tasksGuard, listTasks, createTask, updateTask, decideTask, removeTask,
  taskProjects, assignablePeople, summarise,
  TASK_STATUSES, TASK_PRIORITIES,
  TASK_AUTHORITIES, TASK_TYPE_AUTHORITIES, TASK_TYPE_LABELS,
} from "@/lib/tasks";
import { can } from "@/lib/access";

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
  });
}

// Creating and assigning work is running the board — Manage only.
export async function POST(request, ctx) {
  const g = await tasksGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const result = await createTask(g, await body(request));
  if (result.error) {
    // A refusal is not a malformed request. 403 so a client can tell "you may
    // not" from "you sent nonsense" — they need different handling.
    const status = result.error === "forbidden" ? 403 : result.error === "unknown-permission" ? 500 : 400;
    return Response.json({ error: result.error }, { status });
  }
  return Response.json({ ok: true, task: result.task }, { status: 201 });
}

// NOT gated on Manage: the assignee may move their own task along and tick its
// checklist. Anything beyond that is refused inside the service, per field.
export async function PUT(request, ctx) {
  const g = await tasksGuard(ctx.params);
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });

  // Deciding a typed task is its own act, gated on holding the authority rather
  // than on running the board — that is the point of appointing people.
  if (b.authority !== undefined) {
    const decided = await decideTask(g, b.id, b);
    if (decided.error) {
      const status = decided.error === "notfound" ? 404
        : decided.error === "not-yours" ? 403
        : decided.error === "cooldown" ? 429 : 400;
      return Response.json({ error: decided.error, waitMs: decided.waitMs }, { status });
    }
    return Response.json({ ok: true, task: decided.task });
  }

  const result = await updateTask(g, b.id, b);
  if (result.error) {
    // A typed task is a decision, not a to-do: refusing to edit one is a rule
    // about the record, not about the caller, so it is a 409 rather than a 403.
    const status = result.error === "notfound" ? 404
      : result.error === "typed-immutable" ? 409
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
  if (result.error) {
    return Response.json({ error: result.error },
      { status: result.error === "typed-immutable" ? 409 : result.error === "forbidden" ? 403 : 404 });
  }
  return Response.json({ ok: true });
}
