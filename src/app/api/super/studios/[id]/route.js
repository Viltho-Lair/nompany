import { route } from "@/platform/http/route";
import { getStudioById, updateStudio } from "@/modules/main/studios";
import { listCatalog } from "@/lib/data/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Which plan a studio is on. Console-only, and the ONLY two fields it may set:
// the studio's name and address belong to its owner, not to us.
export const PUT = route(
  { auth: "super", body: true, name: "super/studios/[id]" },
  async ({ params, body }) => {
    const studio = await getStudioById(params.id);
    if (!studio) return { error: "notfound" };

    const patch = {};
    // Validated against the catalogue rather than trusted: a studio must never
    // end up pointing at a package or tier that does not exist.
    if (typeof body.packageId === "string") {
      const ok = body.packageId === "" || (await listCatalog("packages")).some((p) => p.id === body.packageId);
      if (!ok) return { error: "unknown-package" };
      patch.packageId = body.packageId;
    }
    if (typeof body.tierId === "string") {
      const ok = body.tierId === "" || (await listCatalog("tiers")).some((t) => t.id === body.tierId);
      if (!ok) return { error: "unknown-tier" };
      patch.tierId = body.tierId;
    }
    if (Object.keys(patch).length === 0) return { error: "nothing" };

    const updated = await updateStudio(params.id, patch);
    if (!updated) return { error: "notfound" };
    return {
      ok: true,
      studio: { id: updated.id, packageId: updated.packageId || "", tierId: updated.tierId || "" },
    };
  },
);
