import {
  websiteGuard, getProfile, saveProfile, listServices, listShowcase, listMessages,
  summarise, MESSAGE_STATUSES,
} from "@/lib/website";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One read for the whole Website screen.
export async function GET(request, ctx) {
  const g = await websiteGuard(ctx.params);
  if (g.fail) return g.fail;

  const [profile, services, showcase, messages] = await Promise.all([
    getProfile(g), listServices(g), listShowcase(g), listMessages(g),
  ]);

  return Response.json({
    canManage: g.canManage,
    nav: g.nav,
    slug: g.studio.slug,
    profile, services, showcase, messages,
    summary: summarise(profile, services, showcase, messages),
    vocabulary: { messageStatuses: MESSAGE_STATUSES },
  });
}

// Save the profile, including the publish switch. Publishing puts a page on the
// public internet, so it is an explicit field — never a side effect of saving.
export async function PUT(request, ctx) {
  const g = await websiteGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;

  let b = {};
  try { b = await request.json(); } catch { b = {}; }

  const result = await saveProfile(g, b);
  if (result.error) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true, profile: result.profile });
}
