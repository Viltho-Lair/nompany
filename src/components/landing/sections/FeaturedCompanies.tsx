import { listStudios } from "@/modules/main/studios";
import { publicCompanies } from "@/shared/marketing/showcase";
import { homeCopy } from "@/shared/marketing/home";

/* ==================================================================
   THE COMPANIES THAT AGREED TO BE NAMED.

   IT DEGRADES TO NOTHING, and that is the whole of its design. If no
   studio has both consented and been featured, this renders `null` —
   not an empty band, not a heading over blank space, and above all not
   placeholder logos. The site carried four invented customer names
   until August; a logo wall of companies that are not customers says
   less than no logo wall, and it is the specific lie this rebuild
   exists to remove.

   A SERVER COMPONENT, so it reads directly rather than fetching. The
   public endpoint at /api/showcase exists for callers that are not this
   page; using it here would mean the home page waited on an HTTP round
   trip to its own process, and the names would arrive after the HTML.

   IT SHOWS A NAME AND A SECTOR, never a slug. A customer list keyed by
   address is a roster of tenants to try — see the note on
   `toPublicCompany`, which is an allow-list rather than a redaction so
   a field added to the studio record stays private by default.
================================================================== */

export async function FeaturedCompanies({ locale }: { locale: string }) {
  const companies = publicCompanies(await listStudios());
  if (companies.length === 0) return null;

  const tr = homeCopy(locale);
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
      <h2 className="text-center text-xs tracking-[0.16em] text-fg-dim uppercase">
        {tr.customersTitle}
      </h2>
      <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
        {companies.map((c) => (
          <li key={c.name} className="flex items-center gap-3">
            {c.logo ? (
              /* A STORED DATA URI OR AN UPLOADED FILE, so next/image would only
                 get in the way — it cannot optimise what it cannot fetch at
                 build time, and a tenant's logo is neither fixed nor ours. */
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.logo} alt="" className="h-8 w-auto max-w-[9rem] object-contain opacity-80" />
            ) : null}
            <span className="text-sm font-medium text-fg-muted">{c.name}</span>
            {c.sector ? <span className="text-xs text-fg-dim">{c.sector}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
