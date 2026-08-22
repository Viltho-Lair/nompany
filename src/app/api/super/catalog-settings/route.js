import { route } from "@/platform/http/route";
import { getCatalogSettings, saveCatalogSettings } from "@/lib/data/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Settings that qualify the whole price list rather than any one package.
// Separate from /catalog/[kind] because this is ONE object, not a collection —
// giving it a fake id so it could ride the item routes would be pretending.
const spec = { auth: "super", name: "super/catalog-settings" };

export const GET = route(spec, async () => ({ settings: await getCatalogSettings() }));

export const PUT = route({ ...spec, body: true }, async ({ body }) => ({
  ok: true,
  settings: await saveCatalogSettings(body),
}));
