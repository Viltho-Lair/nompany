import { currentUser } from "@/lib/identity";
import { studioContext } from "@/lib/studios";
import { listForCollaborator, markRead } from "@/lib/data/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The bell's starting state, and the place read-state is written.
//
// The stream delivers notifications that arrive WHILE a tab is open; this
// answers "what was already waiting when I got here". Both are needed: a fresh
// page load has streamed nothing yet, and an unread count that only counted
// what happened since the tab opened would reset itself every reload.

async function resolve(request, ctx) {
  const user = await currentUser();
  if (!user) return { error: Response.json({ error: "unauthorized" }, { status: 401 }) };

  const { slug } = await ctx.params;
  const context = await studioContext(user, slug);
  if (context.error) {
    return {
      error: Response.json(
        { error: context.error },
        { status: context.error === "notfound" ? 404 : context.error === "unauthorized" ? 401 : 403 },
      ),
    };
  }
  return context;
}

export async function GET(request, ctx) {
  const context = await resolve(request, ctx);
  if (context.error) return context.error;

  // Scoped to the caller's OWN collaborator row — there is no parameter for
  // whose notifications to read, so there is nothing to tamper with.
  const notifications = await listForCollaborator(context.studio.id, context.collaborator.id);
  return Response.json({
    notifications,
    unread: notifications.filter((n) => !n.readAt).length,
  });
}

// Mark read. Body { ids: [] } or {} for "all mine".
export async function PATCH(request, ctx) {
  const context = await resolve(request, ctx);
  if (context.error) return context.error;

  let ids = [];
  try {
    const body = await request.json();
    ids = Array.isArray(body?.ids) ? body.ids.filter((v) => typeof v === "string") : [];
  } catch {
    // No body, or not JSON — "mark everything of mine read", which is what the
    // bell's own button asks for.
  }

  const changed = await markRead(context.studio.id, context.collaborator.id, ids);
  return Response.json({ ok: true, changed });
}
