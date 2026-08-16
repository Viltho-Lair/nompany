import { tasksGuard, saveTasksSettings } from "@/lib/tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Task settings — who holds each authority. Its own route because the parent
// already uses PUT for editing a task; appointing someone here routes the
// matching tasks to them immediately, existing ones included.
export async function PUT(request, ctx) {
  const g = await tasksGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  if (!g.canManageSettings) return Response.json({ error: "read-only" }, { status: 403 });

  const result = await saveTasksSettings(g, await request.json().catch(() => ({})));
  if (result.error) {
    // A refusal is not a malformed request. 403 so a client can tell "you may
    // not" from "you sent nonsense" — they need different handling.
    const status = result.error === "forbidden" ? 403 : result.error === "unknown-permission" ? 500 : 400;
    return Response.json({ error: result.error }, { status });
  }
  return Response.json(result);
}
