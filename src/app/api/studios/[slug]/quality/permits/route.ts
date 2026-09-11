// THE PERMIT REGISTER, in Quality & HSE (tier 5).
//
// One register, moved by screen: the permits are the ones Field Operations
// always kept, on the `field-service` root, reached here as a foreign section.
// Every write goes through the same services the Schedule screen's Permits tab
// uses, so there is one set of rules for one register however it is reached.
// Each service asks the permit right itself (see `permitDenied`), so this route
// adds no guard of its own.

import { route, refused } from "@/platform/http/route";
import {
  permitsContext, permitsView, permitScope, createPermit, editPermit, movePermit, removePermit,
} from "@/modules/operations/operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: permitsContext, body: true, name: "quality/permits" };

export const GET = route({ ...spec, body: false }, async (ctx) => permitsView(ctx));

export const POST = route(spec, async (ctx) => {
  const scope = permitScope(ctx);
  if ("error" in scope) return scope;
  const result = await createPermit(scope, ctx.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, permit: result.permit } };
});

export const PUT = route(spec, async (ctx) => {
  const scope = permitScope(ctx);
  if ("error" in scope) return scope;
  if (!ctx.body.id) return { error: "missing" };
  const result = await editPermit(scope, String(ctx.body.id), ctx.body);
  if (refused(result)) return result;
  return { ok: true, permit: result.permit };
});

// A MOVE IS ITS OWN VERB — issue, close, cancel — never a field on an edit, the
// same distinction jobs and requisitions draw. The status is narrowed to a
// string here; passing the body where a status belongs is the change-order bug.
export const PATCH = route(spec, async (ctx) => {
  const scope = permitScope(ctx);
  if ("error" in scope) return scope;
  if (!ctx.body.id) return { error: "missing" };
  const result = await movePermit(scope, String(ctx.body.id), String(ctx.body.status ?? ""));
  if (refused(result)) return result;
  return { ok: true, permit: result.permit };
});

export const DELETE = route(spec, async (ctx) => {
  const scope = permitScope(ctx);
  if ("error" in scope) return scope;
  if (!ctx.body.id) return { error: "missing" };
  const result = await removePermit(scope, String(ctx.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
