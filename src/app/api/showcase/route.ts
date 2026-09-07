import { listStudios } from "@/modules/main/studios";
import { publicCompanies } from "@/shared/marketing/showcase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* THE FEATURED COMPANIES, PUBLICLY.
   ------------------------------------------------------------------
   PUBLIC AND UNAUTHENTICATED, because a customer list is meant to be
   read by strangers — that is the entire point of publishing one.

   WHAT IT RETURNS IS AN ALLOW-LIST, not a redaction. `publicCompanies`
   builds each row from four named fields; it does not take a studio and
   remove the private parts. The studio record carries the slug, the
   member count, the plan, the currency, every setting the tenant has
   saved and the org chart — a redacting function leaks whichever field
   somebody adds next, and nobody would notice until it was indexed.

   NO SLUG, and that is the one that looks harmless. A slug is a public
   address, so publishing one is not a disclosure — but a customer list
   keyed by address is a roster of tenants to try, and what this page is
   for is the company's name.

   TWO PARTIES HAVE TO AGREE. A studio appears only if it consented in
   its own settings AND we featured it in /super. Neither flag alone
   does anything, and withdrawal is immediate: the feed derives from the
   record on every read, so there is no published copy to go stale.

   IT DEGRADES TO NOTHING. If nobody has consented, this answers an
   empty list and the page that reads it renders nothing at all —
   never a placeholder, never a logo wall of companies that are not
   customers, which says less than no logo wall.
*/
export async function GET() {
  // A CROSS-STUDIO READ, and it is deliberate rather than incidental. Tenant
  // ROWS are fenced by row-level security and reachable only through
  // `withTenant`; the studio REGISTRY is not a tenant table — it is the list of
  // tenants, held at the platform level, and this reads the registry only.
  // Nothing here touches a single tenant's records.
  const studios = await listStudios();
  const companies = publicCompanies(studios);

  return Response.json(
    { companies },
    {
      headers: {
        // A minute of shared caching. The list changes when somebody toggles a
        // flag in /super or withdraws consent, which is rare; a minute is short
        // enough that a withdrawal is honoured almost at once and long enough
        // that a busy home page is not re-reading the registry per visitor.
        "cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
