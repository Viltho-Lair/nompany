import { route } from "@/platform/http/route";
import { getDocument } from "@/lib/data/customerBilling";
import { invoiceHtml } from "@/lib/billing/invoiceHtml";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ONE OF NOMPANY'S INVOICES OR CREDIT NOTES, as a printable page, for the
// console. The owner's copy is studios/[slug]/billing/documents/[number]; both
// draw the same page (lib/billing/invoiceHtml).
const spec = { auth: "super", name: "super/billing/[studioId]/documents/[number]" };

export const GET = route(spec, async ({ params }) => {
  const doc = await getDocument(params.studioId, decodeURIComponent(params.number));
  if (!doc) return { error: "notfound" };
  return new Response(invoiceHtml(doc), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
});
