import Link from "next/link";
import { notFound } from "next/navigation";
import ServiceIcon from "@/components/ServiceIcon";
import { getCollection } from "@/lib/db";
import { getDict, field } from "@/lib/i18n";
import { breadcrumbLd, urlFor } from "@/lib/seo";
import { serviceSlug, projectSlug, findBySlug } from "@/lib/slug";
import JsonLd from "@/components/JsonLd";

export const dynamic = "force-dynamic";

async function load(locale, slug) {
  const [services, projects] = await Promise.all([
    getCollection("services"),
    getCollection("projects"),
  ]);
  const service = findBySlug(services, slug, serviceSlug);
  if (!service) return null;
  const title = field(service, "title", locale);
  // Related projects link to a service via their `category` field, which stores
  // either the service id or (legacy) its title.
  const related = projects.filter((p) => p.category === service.id || p.category === title);
  return { service, related };
}

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  const data = await load(locale, slug);
  if (!data) return {};
  const title = field(data.service, "title", locale);
  const description = field(data.service, "desc", locale);
  return { title, description };
}

export default async function ServiceDetailPage({ params }) {
  const { locale, slug } = await params;
  const dict = getDict(locale);
  const data = await load(locale, slug);
  if (!data) notFound();
  const { service: svc, related } = data;

  const title = field(svc, "title", locale);
  const body = field(svc, "desc", locale);

  const breadcrumb = breadcrumbLd([
    { name: dict.nav.home, url: urlFor(locale, "") },
    { name: dict.services.title, url: urlFor(locale, "/services") },
    { name: title, url: urlFor(locale, `/services/${serviceSlug(svc)}`) },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />

      {/* Header */}
      <section className="border-b border-steel-400/15 bg-white dark:border-white/10 dark:bg-[#0b1633]">
        <div className="container-page pb-14 pt-36 sm:pt-44">
          <p className="font-display text-xs font-600 uppercase tracking-[0.2em] text-brand-500 dark:text-brand-300">
            <Link href={`/${locale}/services`} className="transition-colors hover:text-brand-700 dark:hover:text-white">{dict.services.title}</Link>
            <span className="mx-2 text-steel-400">/</span>
            <span className="text-steel-500 dark:text-slate-400">{title}</span>
          </p>
          <div className="mt-6 flex items-center gap-5">
            {svc.image ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={svc.image} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
            ) : (
              <div className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-950/5 text-brand-700 dark:bg-white/10 dark:text-brand-300">
                <ServiceIcon name={svc.icon} />
              </div>
            )}
            <h1 className="font-display text-4xl font-800 uppercase leading-[1.03] tracking-tight text-brand-950 dark:text-white sm:text-6xl">
              {title}
            </h1>
          </div>
          {body && <p className="mt-8 max-w-3xl text-lg leading-relaxed text-steel-700 dark:text-slate-300">{body}</p>}
        </div>
      </section>

      {/* Related projects */}
      {related.length > 0 && (
        <section className="bg-white dark:bg-[#0b1633]">
          <div className="container-page py-16 sm:py-20">
            <p className="mb-8 font-display text-xs font-700 uppercase tracking-[0.3em] text-brand-500 dark:text-brand-300">{dict.common.relatedProjects}</p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <Link
                  key={p.id}
                  href={`/${locale}/projects/${projectSlug(p)}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-steel-400/15 bg-white transition-all hover:-translate-y-1 hover:border-brand-500/40 hover:shadow-[0_30px_60px_-35px_rgba(3,31,93,0.5)] dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-brand-950 via-brand-700 to-brand-500">
                    {p.image && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.image} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        <span className="absolute inset-0 bg-gradient-to-t from-brand-950/70 via-transparent to-transparent" />
                      </>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="font-display text-lg font-700 uppercase tracking-tight text-brand-950 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-300">
                      {field(p, "title", locale)}
                    </h3>
                    {field(p, "desc", locale) && (
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-steel-700 dark:text-slate-300">{field(p, "desc", locale)}</p>
                    )}
                    <span className="mt-4 inline-flex items-center gap-2 font-display text-xs font-700 uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">
                      {dict.common.readMore}
                      <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
