import { currentSuperAdmin } from "@/lib/superAuth";
import { getStudioById, updateStudio } from "@/lib/data/studios";
import { listCatalog } from "@/lib/data/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Which plan a studio is on. Console-only, and the ONLY two fields it may set:
// the studio's name and address belong to its owner, not to us.
export async function PUT(request, ctx) {
  const admin = await currentSuperAdmin();
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  let body = {};
  try { body = await request.json(); } catch { body = {}; }

  const studio = await getStudioById(id);
  if (!studio) return Response.json({ error: "notfound" }, { status: 404 });

  const patch = {};
  // Validated against the catalogue rather than trusted: a studio must never
  // end up pointing at a package or tier that does not exist.
  if (typeof body.packageId === "string") {
    const ok = body.packageId === "" || (await listCatalog("packages")).some((p) => p.id === body.packageId);
    if (!ok) return Response.json({ error: "unknown-package" }, { status: 400 });
    patch.packageId = body.packageId;
  }
  if (typeof body.tierId === "string") {
    const ok = body.tierId === "" || (await listCatalog("tiers")).some((t) => t.id === body.tierId);
    if (!ok) return Response.json({ error: "unknown-tier" }, { status: 400 });
    patch.tierId = body.tierId;
  }
  if (Object.keys(patch).length === 0) return Response.json({ error: "nothing" }, { status: 400 });

  const updated = await updateStudio(id, patch);
  return updated
    ? Response.json({ ok: true, studio: { id: updated.id, packageId: updated.packageId || "", tierId: updated.tierId || "" } })
    : Response.json({ error: "notfound" }, { status: 404 });
}
