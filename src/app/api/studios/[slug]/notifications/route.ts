import { currentUser } from "@/platform/auth/identity";
import { studioContext } from "@/lib/studios";
import { listForCollaborator, markRead, setArchived, unreadCount } from "@/platform/notify/notifications";
import { NOTICE_CATEGORIES, typesIn } from "@/shared/notificationKinds";
import { cleanTemplates } from "@/modules/administration/notices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The bell's starting state, and the place read-state is written.
//
// The stream delivers notifications that arrive WHILE a tab is open; this
// answers "what was already waiting when I got here". Both are needed: a fresh
// page load has streamed nothing yet, and an unread count that only counted
// what happened since the tab opened would reset itself every reload.

async function resolve(request: Request, ctx: { params: Promise<Record<string, string>> }) {
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

export async function GET(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const context = await resolve(request, ctx);
  if (context.error) return context.error;

  // Scoped to the caller's OWN collaborator row — there is no parameter for
  // whose notifications to read, so there is nothing to tamper with.
  //
  // ONE PAGE, NOT THE LIST. The bell asks for thirty and the notification page
  // pages on with `after`; `unread` is COUNTED rather than derived from the
  // page, because the page is thirty rows and the count is all of them.
  const url = new URL(request.url);
  const category = url.searchParams.get("category") || "";
  const [page, unread] = await Promise.all([
    listForCollaborator(context.studio.id, context.collaborator.id, {
      limit: Number(url.searchParams.get("limit")) || 30,
      after: url.searchParams.get("after") || "",
      unread: url.searchParams.get("unread") === "1",
      archived: url.searchParams.get("archived") === "1",
      // An unknown category is no filter at all rather than an empty list, so
      // a stale link still shows the inbox.
      types: category && NOTICE_CATEGORIES.includes(category as never) ? typesIn(category) : undefined,
    }),
    unreadCount(context.studio.id, context.collaborator.id),
  ]);
  return Response.json({
    notifications: page.rows,
    next: page.next,
    unread,
    // THE STUDIO'S OWN WORDING, so the bell can render each row in the
    // READER'S language rather than the producer's. The words are chosen on
    // display and never stored — the rule statuses and the sales funnel
    // already follow — so this is the studio's overrides and nothing else.
    // Every shipped template is in the client bundle already.
    noticeTemplates: cleanTemplates(
      (context.studio as { noticeTemplates?: unknown }).noticeTemplates),
  });
}

// Body { ids: [], action? }. `action` is "read" (the default — the bell has
// always sent only ids), "archive" or "unarchive". Read with no ids means "all
// mine"; archiving needs ids, because there is no "put everything away".
export async function PATCH(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const context = await resolve(request, ctx);
  if (context.error) return context.error;

  let ids: string[] = [];
  let action = "read";
  try {
    const body = await request.json();
    ids = Array.isArray(body?.ids) ? body.ids.filter((v: unknown) => typeof v === "string").slice(0, 500) : [];
    if (typeof body?.action === "string") action = body.action;
  } catch {
    // No body, or not JSON — "mark everything of mine read", which is what the
    // bell's own button asks for.
  }

  const { studio, collaborator } = context;
  if (action === "archive" || action === "unarchive") {
    if (!ids.length) return Response.json({ error: "no-ids" }, { status: 400 });
    const changed = await setArchived(studio.id, collaborator.id, ids, action === "archive");
    return Response.json({ ok: true, changed });
  }
  if (action !== "read") return Response.json({ error: "bad-action" }, { status: 400 });
  const changed = await markRead(studio.id, collaborator.id, ids);
  return Response.json({ ok: true, changed });
}
