import { currentUser } from "@/platform/auth/identity";
import { studioContext } from "@/lib/studios";
import {
  readFlows, writeFlowTemplate, dropFlowTemplate, writeIndustry, dropIndustry,
} from "@/modules/studioFlows";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A STUDIO'S FLOW TEMPLATES AND INDUSTRIES (Law 2, "flow templates as data").
//
// HAND-ROLLED AUTH RATHER THAN route(), and that is not this file lagging
// behind the wrapper. route() builds a moduleContext, which needs a root
// SECTION — and "administration-settings" is in NO_SCREEN_YET: it is declared
// in SECTION_DEFS for ordering only and is never planted as a row, so every
// request here would answer "no-section". The sibling settings routes are
// hand-rolled for exactly this reason, and this one matches them deliberately.
//
// PERMISSION IS ENFORCED IN THE SERVICE, not here — every studioFlows function
// calls requirePermission before touching anything. This layer decides HTTP
// shape and nothing else.

type Params = { params: Promise<Record<string, string>> };

const status = (error: string) =>
  error === "notfound" ? 404 : error === "unauthorized" ? 401 : 403;

async function open(ctx: Params) {
  const user = await currentUser();
  if (!user) return { fail: Response.json({ error: "unauthorized" }, { status: 401 }) };
  const { slug } = await ctx.params;
  const context = await studioContext(user, slug);
  if (context.error) {
    return { fail: Response.json({ error: context.error }, { status: status(context.error) }) };
  }
  return { ctx: { studioId: context.studio.id, access: context.access } };
}

export async function GET(_request: Request, params: Params) {
  const { fail, ctx } = await open(params);
  if (fail) return fail;
  const result = await readFlows(ctx);
  if ("error" in result) return Response.json({ error: result.error }, { status: status(result.error) });
  return Response.json(result);
}

/**
 * Save one template, or one industry.
 *
 * ONE VERB, TWO SUBJECTS, chosen by which key the body carries. They share a
 * route because they are one screen and one right, and because an industry is
 * validated against THIS studio's templates — the two are not independently
 * editable in any meaningful sense.
 *
 * A REFUSAL IS 400 AND CARRIES ITS REASON. flows.ts refuses a template that
 * could not work, in words about the edit ("statusChain names 'project', which
 * it does not use"). Reducing that to a bare code here would throw away the
 * only thing that makes validating on write better than discovering the problem
 * later on somebody else's blank screen.
 */
export async function PUT(request: Request, params: Params) {
  const { fail, ctx } = await open(params);
  if (fail) return fail;

  let raw: Record<string, unknown> = {};
  try { raw = await request.json(); } catch { raw = {}; }

  const subject = raw.template ? "template" : raw.industry ? "industry" : "";
  if (!subject) return Response.json({ error: "subject" }, { status: 400 });

  const result = subject === "template"
    ? await writeFlowTemplate(ctx, raw.template as Record<string, unknown>)
    : await writeIndustry(ctx, raw.industry as Record<string, unknown>);

  if ("error" in result) {
    return result.error === "refused"
      ? Response.json(result, { status: 400 })
      : Response.json({ error: result.error }, { status: status(result.error) });
  }
  return Response.json(result);
}

/**
 * Drop a studio's override of a template or an industry.
 *
 * THE TARGET IS A QUERY PARAM, not a body. A DELETE body is legal and widely
 * mishandled — proxies and fetch implementations differ on whether it survives
 * — and the thing being deleted here is a single id, which is what a query
 * string is for.
 *
 * DELETING IS REVERTING when a seed exists underneath, and that is the same
 * operation rather than two: see deleteFlowTemplate. `existed: false` means
 * there was no override to drop, which is a no-op and not an error — a
 * built-in nobody edited is already in the state the caller asked for.
 */
export async function DELETE(request: Request, params: Params) {
  const { fail, ctx } = await open(params);
  if (fail) return fail;

  const url = new URL(request.url);
  const templateId = url.searchParams.get("template") || "";
  const industryKey = url.searchParams.get("industry") || "";
  if (!templateId && !industryKey) return Response.json({ error: "subject" }, { status: 400 });

  const result = templateId
    ? await dropFlowTemplate(ctx, templateId)
    : await dropIndustry(ctx, industryKey);

  if ("error" in result) return Response.json({ error: result.error }, { status: status(result.error) });
  return Response.json(result);
}
