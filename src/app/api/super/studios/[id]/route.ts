import { route } from "@/platform/http/route";
import { getStudioById, updateStudio } from "@/modules/main/studios";
import { listCatalog } from "@/lib/data/catalog";
import { hasConsented } from "@/shared/marketing/showcase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Which plan a studio is on, and whether we feature it. Console-only, and a
// SHORT list of fields on purpose: the studio's name and address belong to its
// owner, not to us.
//
// IT MAY SET `featured`, AND IT MAY NOT SET CONSENT. Featuring a studio makes
// it eligible for the public site; it appears there only if the studio has also
// agreed, in its own settings, and that agreement is not ours to give. The two
// flags have two writers precisely so neither party can publish a company's
// name on its own — see shared/marketing/showcase.
export const PUT = route(
  { auth: "super", body: true, name: "super/studios/[id]" },
  async ({ params, body }) => {
    const studio = await getStudioById(params.id);
    if (!studio) return { error: "notfound" };

    const patch: Record<string, unknown> = {};
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
    // OURS TO SET: whether this studio is eligible to appear publicly, and
    // where in the order. Consent stays the studio's — accepting it here would
    // let the console agree to being named on the tenant's behalf, which is the
    // one thing this pair exists to prevent.
    if (typeof body.featured === "boolean") patch.featured = body.featured;
    if (body.featuredOrder !== undefined) {
      const n = Number(body.featuredOrder);
      // A NUMBER OR NOTHING. An order of NaN sorts unpredictably against the
      // others, which shuffles the public page between requests.
      if (!Number.isFinite(n)) return { error: "bad-order" };
      patch.featuredOrder = n;
    }

    if (Object.keys(patch).length === 0) return { error: "nothing" };

    const updated = await updateStudio(params.id, patch);
    if (!updated) return { error: "notfound" };
    return {
      ok: true,
      studio: {
        id: updated.id,
        packageId: updated.packageId || "",
        tierId: updated.tierId || "",
        featured: Boolean(updated.featured),
        featuredOrder: Number(updated.featuredOrder) || 0,
        // Read back so the console can show WHY a featured studio is still not
        // on the site: it is waiting on the studio's own consent. Asked through
        // the shared predicate rather than by reaching into the field, so the
        // console and the public feed cannot disagree about what consent is.
        hasConsented: hasConsented(updated),
      },
    };
  },
);
