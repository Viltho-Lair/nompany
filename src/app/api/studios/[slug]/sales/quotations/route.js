import { currentUser } from "@/lib/identity";
import { salesContext, ticketQuotation } from "@/lib/sales";
import { qualityContext, callPointReady } from "@/lib/quality";

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
export async function GET(request, ctx) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;

  const sales = await salesContext(user, slug);
  if (sales.error) {
    const status = sales.error === "notfound" || sales.error === "no-section" ? 404 : 403;
    return Response.json({ error: sales.error }, { status });
  }
  if (!sales.canViewTickets) return Response.json({ error: "forbidden" }, { status: 403 });

  const id = new URL(request.url).searchParams.get("id") || "";
  const result = await ticketQuotation(sales, id);
  if (result.error) return Response.json({ error: result.error }, { status: 404 });

  // WHETHER THE PRINT BUTTON CAN DO ANYTHING. Resolved here so the button is
  // only drawn where pressing it would succeed — and read through Quality's own
  // context, so somebody with no Quality rights simply never sees it rather
  // than seeing it refuse.
  let print = { ready: false, reason: "unavailable" };
  if (result.isLatest) {
    const quality = await qualityContext(user, slug);
    if (!quality.error) print = await callPointReady(quality, "quotation.print");
    // Only the latest quotation carries one; an earlier revision is the record
    // of what was previously sent, not something to issue a document about.
  } else {
    print = { ready: false, reason: "superseded" };
  }

  return Response.json({
    quotation: result.quotation,
    ticket: result.ticket,
    isLatest: result.isLatest,
    print,
    // The money the document is written in, so the viewer shows every figure
    // beside what it is in rather than leaving it to be guessed.
    currency: sales.studio.currency || "",
  });
}
