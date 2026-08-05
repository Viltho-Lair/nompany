import { getCollection } from "@/lib/db";
import { getDict, field } from "@/lib/i18n";
import { buildMetadata, breadcrumbLd, urlFor } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import ProjectsExplorer from "@/components/public/ProjectsExplorer";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildMetadata({ locale, path: "/projects" });
}

export default async function ProjectsPage({ params }) {
  const { locale } = await params;
  const dict = getDict(locale);
  const [projects, services] = await Promise.all([
    getCollection("projects"),
    getCollection("services"),
  ]);
  const servicesById = Object.fromEntries(services.map((s) => [s.id, field(s, "title", locale)]));

  const breadcrumb = breadcrumbLd([
    { name: dict.nav.home, url: urlFor(locale, "") },
    { name: dict.projects.title, url: urlFor(locale, "/projects") },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />
      {/* Editorial page header */}
      <section className="border-b border-steel-400/15 bg-white dark:border-white/10 dark:bg-[#0b1633]">
        <div className="container-page pb-12 pt-36 sm:pt-44">
          <p className="font-display text-xs font-700 uppercase tracking-[0.3em] text-brand-500 dark:text-brand-300">{dict.common.brand}</p>
          <h1 className="mt-4 font-display text-5xl font-800 uppercase leading-[1.02] tracking-tight text-brand-950 dark:text-white sm:text-7xl">
            {dict.projects.title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-steel-700 dark:text-slate-300">{dict.projects.lead}</p>
        </div>
      </section>

      <ProjectsExplorer locale={locale} dict={dict} projects={projects} servicesById={servicesById} />
    </>
  );
}
