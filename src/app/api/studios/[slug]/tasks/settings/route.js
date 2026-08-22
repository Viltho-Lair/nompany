import { route } from "@/platform/http/route";
import { tasksContext, saveTasksSettings } from "@/lib/tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Task settings — who holds each authority. Its own route because the parent
// already uses PUT for editing a task; appointing someone here routes the
// matching tasks to them immediately, existing ones included.
export const PUT = route(
  { auth: "studio", context: tasksContext, body: true, name: "tasks/settings" },
  async (g) => {
    if (!g.canManage || !g.canManageSettings) return { error: "read-only" };
    return saveTasksSettings(g, g.body);
  },
);
