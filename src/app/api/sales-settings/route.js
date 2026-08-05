import { getSettings, updateSettings } from "@/lib/db";
import { requireSection, requireManage, forbidden } from "@/lib/session";
import { SALES_LIVE_COLUMNS } from "@/lib/liveColumns";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sales → Settings. For now this holds a single shared setting: the Sales Live
// View column selection (one config applied to everyone). Gated by the
// sales-settings section so Sales can manage it without full Company-Info access.
// Reserved position always available for the project permit contact.
const RESERVED_POSITIONS = ["For Permits"];
const cleanList = (arr, cap = 60, max = 60) => (Array.isArray(arr)
  ? [...new Set(arr.map((s) => String(s).trim()).filter(Boolean).map((s) => s.slice(0, cap)))].slice(0, max)
  : []);

export async function GET() {
  const actor = await requireSection("sales-settings");
  if (!actor) return forbidden();
  const s = await getSettings();
  return Response.json({
    salesLiveColumns: Array.isArray(s.salesLiveColumns) ? s.salesLiveColumns : null,
    salesContactPositions: Array.isArray(s.salesContactPositions) ? s.salesContactPositions : [],
    salesCities: Array.isArray(s.salesCities) ? s.salesCities : [],
  });
}

export async function PUT(request) {
  const actor = await requireManage("sales-settings");
  if (!actor) return forbidden();
  const body = await request.json().catch(() => ({}));
  const patch = {};
  if ("salesLiveColumns" in body) {
    const valid = new Set(SALES_LIVE_COLUMNS.map((c) => c.key));
    patch.salesLiveColumns = Array.isArray(body.salesLiveColumns)
      ? [...new Set(body.salesLiveColumns.map(String).filter((k) => valid.has(k)))]
      : [];
  }
  if ("salesContactPositions" in body) {
    // Always keep the reserved "For Permits" position available.
    patch.salesContactPositions = [...new Set([...cleanList(body.salesContactPositions), ...RESERVED_POSITIONS])];
  }
  if ("salesCities" in body) patch.salesCities = cleanList(body.salesCities);
  const updated = await updateSettings(patch);
  logActivity({ actor, verb: "updated", sectionKey: "sales-settings", entityType: "settings", entityId: "settings", label: "Sales settings updated", href: "/studio/sales/settings" }).catch(() => {});
  return Response.json({
    salesLiveColumns: Array.isArray(updated.salesLiveColumns) ? updated.salesLiveColumns : [],
    salesContactPositions: Array.isArray(updated.salesContactPositions) ? updated.salesContactPositions : [],
    salesCities: Array.isArray(updated.salesCities) ? updated.salesCities : [],
  });
}
