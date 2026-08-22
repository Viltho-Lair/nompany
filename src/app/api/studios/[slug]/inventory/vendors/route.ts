import { route, refused } from "@/platform/http/route";
import { inventoryContext, createVendor, editVendor, removeVendor } from "@/modules/inventory/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: inventoryContext, body: true, name: "inventory/vendors" };
const manageable = (inv: { canManage: boolean }) => (inv.canManage ? null : { error: "read-only" });

export const POST = route(spec, async (inv) => {
  const refusal = manageable(inv);
  if (refusal) return refusal;

  const result = await createVendor(inv, inv.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, vendor: result.vendor } };
});

export const PUT = route(spec, async (inv) => {
  const refusal = manageable(inv);
  if (refusal) return refusal;
  if (!inv.body.id) return { error: "missing" };

  const result = await editVendor(inv, inv.body.id, inv.body);
  if (refused(result)) return result;
  return { ok: true, vendor: result.vendor };
});

export const DELETE = route(spec, async (inv) => {
  const refusal = manageable(inv);
  if (refusal) return refusal;
  if (!inv.body.id) return { error: "missing" };

  const result = await removeVendor(inv, inv.body.id);
  if (refused(result)) return result;
  return { ok: true };
});
