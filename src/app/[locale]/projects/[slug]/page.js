import Link from "next/link";
import { notFound } from "next/navigation";
import { getCollection } from "@/lib/db";
import { getDict, field } from "@/lib/i18n";
import { breadcrumbLd, urlFor } from "@/lib/seo";
import { projectSlug, findBySlug } from "@/lib/slug";
import JsonLd from "@/components/JsonLd";

export const dynamic = "force-dynamic";

async function load(locale, slug) {
  const [projects, services, clients] = await Promise.all([
    getCollection("projects"),
    getCollection("services"),
    getCollection("salesClients"),
  ]);
  const project = findBySlug(projects, slug, projectSlug);
  if (!project) return null;
  const servicesById = Object.fromEntries(services.map((s) => [s.id, field(s, "title", locale)]));
  const categoryLabel = servicesById[project.category] || project.category || "";
  const clientName =
    clients.find((c) => c.id === project.clientId)?.name || project.clientName || "";
  // Next project (wraps) for the closing link.
  const idx = projects.findIndex((p) => p.id === project.id);
  const next = projects.length > 1 ? projects[(idx + 1) % projects.length] : null;
  return { project, categoryLabel, clientName, next };
}

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  const data = await load(locale, slug);
  if (!data) return {};
  const title = field(data.project, "title", locale);
  const description = field(data.project, "desc", locale);
  return { title, description, openGraph: { title, description, images: data.project.image ? [data.project.image] : [] } };
}

export default async function ProjectDetailPage({ params }) {
  const { locale, slug } = await params;
  const dict = getDict(locale);
  const data = await load(locale, slug);
  if (!data) notFound();
  const { project: p, categoryLabel, clientName, next } = data;

  const title = field(p, "title", locale);
  const location = field(p, "location", locale);
  const body = field(p, "desc", locale);
  const heroImg = p.image || (Array.isArray(p.gallery) ? p.gallery[0] : "");
  const gallery = (Array.isArray(p.gallery) ? p.gallery : []).filter((g) => g && g !== p.image);

  const meta = [
    { label: dict.common.metaDate, value: p.year },
    { label: dict.common.metaClient, value: clientName },
    { label: dict.common.metaStatus, value: p.stage },
    { label: dict.common.metaLocation, value: location, href: p.locationUrl || "" },
  ].filter((m) => m.value);

  const breadcrumb = breadcrumbLd([
    { name: dict.nav.home, url: urlFor(locale, "") },
    { name: dict.projects.title, url: urlFor(locale, "/projects") },
    { name: title, url: urlFor(locale, `/projects/${projectSlug(p)}`) },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />

      {/* Hero */}
      <section className="relative flex min-h-[70vh] items-end overflow-hidden bg-brand-950">
        {heroImg ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroImg} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/60 to-brand-950/20" />
          </>
        ) : (
          <span className="absolute inset-0 bg-gradient-to-br from-brand-950 via-brand-700 to-brand-500" />
        )}
        <div className="container-page relative z-10 pb-14 pt-40">
          {categoryLabel && (
            <p className="font-display text-xs font-700 uppercase tracking-[0.24em] text-brand-300">{categoryLabel}</p>
          )}
          <h1 className="mt-4 max-w-4xl font-display text-4xl font-800 uppercase leading-[1.03] tracking-tight text-white sm:text-6xl lg:text-7xl">
            {title}
          </h1>
        </div>
      </section>

      {/* Meta grid */}
      {meta.length > 0 && (
        <section className="border-b border-steel-400/15 bg-white dark:border-white/10 dark:bg-[#0b1633]">
          <div className="container-page grid grid-cols-2 gap-8 py-10 sm:grid-cols-4">
            {meta.map((m) => (
              <div key={m.label}>
                <p className="font-display text-[11px] font-700 uppercase tracking-[0.18em] text-brand-500 dark:text-brand-300">{m.label}</p>
                {m.href ? (
                  <a href={m.href} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 font-display text-base font-600 text-brand-700 hover:underline dark:text-brand-300">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0"><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                    {m.value}
                  </a>
                ) : (
                  <p className="mt-2 font-display text-base font-600 text-brand-950 dark:text-white">{m.value}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Statement + body */}
      <section className="bg-white dark:bg-[#0b1633]">
        <div className="container-page grid gap-10 py-16 sm:py-24 lg:grid-cols-[1fr_1.4fr]">
          <h2 className="font-display text-3xl font-800 uppercase leading-[1.05] tracking-tight text-brand-950 dark:text-white sm:text-4xl">
            {title}
          </h2>
          {body && <p className="text-lg leading-relaxed text-steel-700 dark:text-slate-300">{body}</p>}
        </div>
      </section>

      {/* Gallery */}
      {gallery.length > 0 && (
        <section className="border-t border-steel-400/15 bg-slate-50 dark:border-white/10 dark:bg-[#08122b]">
          <div className="container-page py-16 sm:py-20">
            <div className="grid gap-4 sm:grid-cols-2">
              {gallery.map((url, i) => (
                <div key={i} className={`overflow-hidden rounded-2xl ${i % 3 === 0 ? "sm:col-span-2" : ""}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full max-h-[36rem] w-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Next project */}
      {next && (
        <section className="border-t border-steel-400/15 bg-white dark:border-white/10 dark:bg-[#0b1633]">
          <Link href={`/${locale}/projects/${projectSlug(next)}`} className="group block">
            <div className="container-page flex flex-col gap-2 py-14 sm:py-16">
              <p className="font-display text-xs font-700 uppercase tracking-[0.24em] text-brand-500 dark:text-brand-300">{dict.common.nextProject}</p>
              <div className="flex items-center justify-between gap-6">
                <h2 className="font-display text-3xl font-800 uppercase leading-[1.05] tracking-tight text-brand-950 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-300 sm:text-5xl">
                  {field(next, "title", locale)}
                </h2>
                <svg viewBox="0 0 24 24" className="h-8 w-8 shrink-0 text-brand-500 transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </div>
            </div>
          </Link>
        </section>
      )}
    </>
  );
}
