import { route } from "@/platform/http/route";
import { getDocument } from "@/lib/data/customerBilling";
import { invoiceHtml } from "@/lib/billing/invoiceHtml";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ONE OF THIS STUDIO'S INVOICES OR CREDIT NOTES FROM NOMPANY, as a printable
// page. OWNER ONLY, like the rest of billing, and open whatever the ladder
// says (shared/subscription's ALWAYS_OPEN): a closed studio's owner still
// needs their invoices.
const spec = { auth: "studio", name: "studio/billing/documents/[number]", keys: false } as const;

type Owned = { studio: { id: string }; collaborator: { role?: unknown }; params: Record<string, string> };

export const GET = route(spec, async (c) => {
  const ctx = c as unknown as Owned;
  if (ctx.collaborator?.role !== "owner") return { error: "owner-only" };
  const doc = await getDocument(ctx.studio.id, decodeURIComponent(ctx.params.number));
  if (!doc) return { error: "notfound" };
  return new Response(invoiceHtml(doc), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
});
