import { getDict } from "@/lib/i18n";
import { buildMetadata, breadcrumbLd, urlFor } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildMetadata({ locale, path: "/team" });
}

// The old Team page read from the `employees` collection (live HR records). For
// nompany that is not appropriate — those are a customer's operational data.
// This page is now code-driven and shows a placeholder until nompany's own team
// content exists. TODO(phase 6): wire to nompany-owned team data.
export default async function TeamPage({ params }) {
  const { locale } = await params;
  const dict = getDict(locale);

  const breadcrumb = breadcrumbLd([
    { name: dict.nav.home, url: urlFor(locale, "") },
    { name: dict.team.title, url: urlFor(locale, "/team") },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />
      <section className="border-b border-steel-400/15 bg-white dark:border-white/10 dark:bg-steel-900">
        <div className="container-page pb-12 pt-36 sm:pt-44">
          <p className="font-display text-xs font-700 uppercase tracking-[0.3em] text-brand-500 dark:text-brand-300">{dict.common.brand}</p>
          <h1 className="mt-4 font-display text-5xl font-800 leading-[1.02] tracking-tight text-brand-950 dark:text-white sm:text-7xl">
            {dict.team.title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-steel-600 dark:text-slate-300">{dict.team.lead}</p>
        </div>
      </section>
      <section className="container-page py-20 sm:py-28">
        <div className="mx-auto max-w-2xl rounded-geex border border-steel-200 bg-steel-50 p-10 text-center dark:border-white/10 dark:bg-steel-800">
          <p className="text-lg leading-relaxed text-steel-700 dark:text-slate-200">{dict.team.about}</p>
          <p className="mt-4 font-display text-sm font-600 uppercase tracking-[0.14em] text-brand-600 dark:text-brand-300">{dict.team.comingSoon}</p>
        </div>
      </section>
    </>
  );
}
