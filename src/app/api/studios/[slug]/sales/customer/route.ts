import { route, refused } from "@/platform/http/route";
import { salesContext } from "@/modules/sales/sales";
import { customerProfile } from "@/modules/sales/customer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ONE CUSTOMER, WHOLE — the client and everything hanging off them that this
// reader is entitled to see.
//
// READ ONLY, and that is the design rather than a first instalment. Every
// record on this page already has a door that writes it: a deal is edited
// through /sales/tickets, a contract through /sales/contracts, a variation
// through /sales/change-orders. A write here would be a second door onto records
// that already have one, and two doors onto a record are two sets of rules free
// to disagree — the pipeline's own route makes the same call for the same
// reason. The client's own fields are edited through /sales/clients.
//
// `name` is the SECTION KEY this serves, so the audit trail reads by section:
// the page resolves through crm-sales-clients and is governed by
// `crmSales.clients.view`, which `customerProfile` asks for before it reads a
// single row.
export const GET = route(
  { auth: "studio", context: salesContext, name: "crm-sales-clients" },
  async ({ request, ...sales }) => {
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!id) return { error: "missing" };

    const result = await customerProfile(sales, id);
    if (refused(result)) return result;
    return { ok: true, ...result };
  },
);
