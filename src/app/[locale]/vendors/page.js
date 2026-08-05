import EditorialHeader from "@/components/public/EditorialHeader";
import Reveal from "@/components/Reveal";
import { getCollection } from "@/lib/db";
import { getDict } from "@/lib/i18n";
import { buildMetadata, breadcrumbLd, urlFor } from "@/lib/seo";
import { showcaseVendors } from "@/lib/showcase";
import JsonLd from "@/components/JsonLd";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildMetadata({ locale, path: "/vendors" });
}

export default async function VendorsPage({ params }) {
  const { locale } = await params;
  const dict = getDict(locale);
  // Vendors now come from the Inventory vendors collection.
  const vendors = showcaseVendors(await getCollection("inventoryVendors"));

  const breadcrumb = breadcrumbLd([
    { name: dict.nav.home, url: urlFor(locale, "") },
    { name: dict.vendors.title, url: urlFor(locale, "/vendors") },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />
      <EditorialHeader eyebrow={dict.common.brand} title={dict.vendors.title} lead={dict.vendors.lead} />
      <section className="container-page py-14 sm:py-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((v, i) => (
            <Reveal key={v.id} delay={i * 45}>
              <div className="flex h-full items-center justify-between gap-4 rounded-2xl border border-steel-400/15 bg-white p-6 transition-all hover:border-brand-500/40 hover:shadow-[0_30px_60px_-35px_rgba(3,31,93,0.5)] dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-center gap-4">
                  {v.image || v.logo ? (
                    <span className="logo-tile flex h-36 w-36 items-center justify-center overflow-hidden rounded-xl p-1.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={v.image || v.logo} alt={v.name} className="max-h-full w-auto object-contain" />
                    </span>
                  ) : (
                    <span className="inline-flex h-36 w-36 items-center justify-center rounded-xl bg-brand-950/5 font-display text-5xl font-700 text-brand-700 dark:bg-white/10 dark:text-brand-500">
                      {v.name.charAt(0)}
                    </span>
                  )}
                  <span className="font-display text-lg font-600 text-brand-950 dark:text-white">{v.name}</span>
                </div>
                {v.url && (
                  <a
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${dict.vendors.visit}: ${v.name}`}
                    className="text-steel-400 transition-colors hover:text-brand-700"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 17L17 7M9 7h8v8" />
                    </svg>
                  </a>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
