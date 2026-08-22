import { route } from "@/platform/http/route";
import { salesContext, ticketQuotation } from "@/modules/sales/sales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ONE quotation, for the Sales-side viewer.
//
// READ ONLY, and deliberately not a second door into Technical: it answers only
// for a quotation raised against a Sales ticket, and it has no POST, PUT or
// DELETE. Everything that writes a quotation lives under /technical, so a Sales
// user who can open this document still cannot touch it.
//
// Gated on seeing SALES rather than Technical, for the reason the RFQ column is:
// what became of their own ticket is the ticket's story, not a window into
// somebody else's section.
export const GET = route(
  { auth: "studio", context: salesContext, name: "sales/quotations" },
  async ({ request, ...sales }) => {
    if (!sales.canViewTickets) return { error: "forbidden" };

    const id = new URL(request.url).searchParams.get("id") || "";
    const result = await ticketQuotation(sales, id);
    if (result.error) return result;

    return {
      quotation: result.quotation,
      ticket: result.ticket,
      isLatest: result.isLatest,
      // The money the document is written in, so the viewer shows every figure
      // beside what it is in rather than leaving it to be guessed.
      currency: sales.studio.currency || "",
    };
  },
);
