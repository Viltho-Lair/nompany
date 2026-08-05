import EditorialHeader from "@/components/public/EditorialHeader";
import Reveal from "@/components/Reveal";
import { getCollection } from "@/lib/db";
import { getDict } from "@/lib/i18n";
import { buildMetadata, breadcrumbLd, urlFor } from "@/lib/seo";
import { showcaseClients } from "@/lib/showcase";
import JsonLd from "@/components/JsonLd";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildMetadata({ locale, path: "/clients" });
}

export default async function ClientsPage({ params }) {
  const { locale } = await params;
  const dict = getDict(locale);
  // Clients now come from the Sales clients collection.
  const clients = showcaseClients(await getCollection("salesClients"));

  const breadcrumb = breadcrumbLd([
    { name: dict.nav.home, url: urlFor(locale, "") },
    { name: dict.clients.title, url: urlFor(locale, "/clients") },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />
      <EditorialHeader eyebrow={dict.common.brand} title={dict.clients.title} lead={dict.clients.lead} />
      <section className="container-page py-14 sm:py-16">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {clients.map((c, i) => (
            <Reveal key={c.id} delay={i * 40}>
              <div className="flex h-28 items-center justify-center rounded-2xl border border-steel-400/15 bg-white p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/40 hover:shadow-[0_24px_50px_-30px_rgba(3,31,93,0.5)] dark:border-white/10 dark:bg-white/[0.03]">
                {c.image || c.logo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={c.image || c.logo} alt={c.name} className="max-h-12 w-auto object-contain" />
                ) : (
                  <span className="font-display text-base font-600 text-brand-950 dark:text-white">{c.name}</span>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
