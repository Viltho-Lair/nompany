import { route, refused } from "@/platform/http/route";
import { financeContext } from "@/modules/finance/finance";
import {
  groupView, createGroup, addToGroup, removeFromGroup, consolidated,
} from "@/modules/finance/groupService";
import type { FinanceContext } from "@/modules/finance/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A GROUP OF STUDIOS AND ITS CONSOLIDATED BOOKS (modules/finance/groupService).
// Reading needs `finance.reports.view` here and, for the consolidation, in every
// member; grouping is the owner's alone. The signed-in user is passed to the
// service because every member studio is opened as them.
const spec = { auth: "studio", context: financeContext, body: true, name: "finance/group" };

export const GET = route({ ...spec, body: false }, async (c) => {
  const ctx = c as FinanceContext;
  const user = (c as { user?: unknown }).user;
  const view = await groupView(ctx, user);
  if (refused(view)) return view;
  const url = new URL(c.request.url);
  const window = { from: url.searchParams.get("from") || undefined, to: url.searchParams.get("to") || undefined };
  // THE CONSOLIDATION IS ASKED FOR ONLY WHERE THERE IS A GROUP, and a refusal
  // travels beside the group rather than failing the screen: somebody who may
  // not read every member still sees that the group exists.
  const books = view.group ? await consolidated(ctx, user, window) : null;
  return { ok: true, ...view, consolidation: books && !("error" in books && books.error) ? books : null, consolidationError: books && "error" in books ? books.error : null };
});

export const POST = route(spec, async (c) => {
  const ctx = c as FinanceContext;
  const user = (c as { user?: unknown }).user;
  const action = String(c.body?.action ?? "");
  const result = action === "create" ? await createGroup(ctx, user, c.body)
    : action === "add" ? await addToGroup(ctx, user, c.body?.studioId)
      : action === "remove" ? await removeFromGroup(ctx, user, c.body?.studioId)
        : { error: "action" };
  return refused(result) ? result : { ok: true, ...result };
});
