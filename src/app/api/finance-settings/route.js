import { getSettings, updateSettings } from "@/lib/db";
import { requireSection, requireManage, forbidden } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Finance → Settings. Currently holds the Cash "Category" dropdown options,
// stored in settings.cashCategories. View gated by the finance-settings section;
// saving requires manage.
export async function GET() {
  const actor = await requireSection("finance-settings");
  if (!actor) return forbidden();
  const settings = await getSettings();
  return Response.json({ categories: Array.isArray(settings.cashCategories) ? settings.cashCategories : [] });
}

export async function PUT(request) {
  const actor = await requireManage("finance-settings");
  if (!actor) return forbidden();
  const body = await request.json().catch(() => ({}));
  const categories = Array.isArray(body.categories)
    ? [...new Set(body.categories.map((c) => String(c || "").trim()).filter(Boolean))].slice(0, 100)
    : [];
  await updateSettings({ cashCategories: categories });
  return Response.json({ categories });
}
