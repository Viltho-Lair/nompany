import { buildPricing } from "@/modules/marketing/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// What the public pricing page needs, in one call: the band prices out of
// Packages, the yearly discount, today's rates, and the currency to open with.
//
// PUBLIC on purpose — it is a price list, which is the most public thing a
// company owns. Nothing here identifies anybody, and only packages marked
// public are read.
//
// THE PAYLOAD IS BUILT IN `modules/marketing/pricing`, not here, because the
// pricing PAGE renders the same thing on the server so the figures reach the
// HTML. Two builders would be two price lists free to disagree.
export async function GET(request: Request) {
  return Response.json(
    await buildPricing(request.headers.get("x-vercel-ip-country")),
  );
}
