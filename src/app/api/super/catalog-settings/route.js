import { currentSuperAdmin } from "@/lib/superAuth";
import { getCatalogSettings, saveCatalogSettings } from "@/lib/data/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Settings that qualify the whole price list rather than any one package.
// Separate from /catalog/[kind] because this is ONE object, not a collection —
// giving it a fake id so it could ride the item routes would be pretending.
export async function GET() {
  const admin = await currentSuperAdmin();
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json({ settings: await getCatalogSettings() });
}

export async function PUT(request) {
  const admin = await currentSuperAdmin();
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  return Response.json({ ok: true, settings: await saveCatalogSettings(body) });
}
