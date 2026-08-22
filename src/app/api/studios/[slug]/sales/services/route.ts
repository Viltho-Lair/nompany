import { route } from "@/platform/http/route";
import { salesContext, createService, editService, removeService } from "@/modules/sales/sales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The Sales service catalogue, owned by the sales-settings sub-section. Each
// row's id IS the serviceId a ticket stores.
const spec = { auth: "studio", context: salesContext, body: true, name: "sales/services" };

// Managing the catalogue is a Settings right, not a Tickets one.
const allowed = (sales: { canManageSettings: boolean }) => (sales.canManageSettings ? null : { error: "read-only" });

export const POST = route(spec, async (sales) => {
  const refusal = allowed(sales);
  if (refusal) return refusal;
  return createService(sales, sales.body);
});

export const PUT = route(spec, async (sales) => {
  const refusal = allowed(sales);
  if (refusal) return refusal;
  if (!sales.body.id) return { error: "missing" };
  return editService(sales, sales.body.id, sales.body);
});

export const DELETE = route(spec, async (sales) => {
  const refusal = allowed(sales);
  if (refusal) return refusal;
  if (!sales.body.id) return { error: "missing" };
  return removeService(sales, sales.body.id);
});
