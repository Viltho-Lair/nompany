import Link from "next/link";
import Reveal from "@/components/Reveal";
import ServiceIcon from "@/components/ServiceIcon";
import { getCollection } from "@/lib/db";
import { getDict, field } from "@/lib/i18n";
import { buildMetadata, servicesLd, breadcrumbLd, videoObjectLd, urlFor } from "@/lib/seo";
import { serviceSlug } from "@/lib/slug";
import { youtubeEmbedUrl } from "@/lib/youtube";
import JsonLd from "@/components/JsonLd";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildMetadata({ locale, path: "/services" });
}

export default async function ServicesPage({ params }) {
  const { locale } = await params;
  const dict = getDict(locale);
  const services = await getCollection("services");
  const previousProjects = await getCollection("previousProjects");

  const breadcrumb = breadcrumbLd([
    { name: dict.nav.home, url: urlFor(locale, "") },
    { name: dict.services.title, url: urlFor(locale, "/services") },
  ]);
  const videoLd = previousProjects.map((p) => videoObjectLd(p, locale)).filter(Boolean);

  return (
    <>
      <JsonLd data={[servicesLd(services, locale, urlFor(locale, "/services")), breadcrumb, ...videoLd]} />

      {/* Editorial page header */}
      <section className="border-b border-steel-400/15 bg-white dark:border-white/10 dark:bg-[#0b1633]">
        <div className="container-page pb-12 pt-36 sm:pt-44">
          <p className="font-display text-xs font-700 uppercase tracking-[0.3em] text-brand-500 dark:text-brand-300">{dict.common.brand}</p>
          <h1 className="mt-4 font-display text-5xl font-800 uppercase leading-[1.02] tracking-tight text-brand-950 dark:text-white sm:text-7xl">
            {dict.services.title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-steel-700 dark:text-slate-300">{dict.services.lead}</p>
        </div>
      </section>

      {/* Service cards → detail pages */}
      <section className="container-page py-14 sm:py-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((svc, i) => (
            <Reveal key={svc.id} delay={i * 50}>
              <Link
                href={`/${locale}/services/${serviceSlug(svc)}`}
                className="group flex h-full flex-col rounded-2xl border border-steel-400/15 bg-white p-7 transition-all hover:-translate-y-1 hover:border-brand-500/40 hover:shadow-[0_30px_60px_-35px_rgba(3,31,93,0.5)] dark:border-white/10 dark:bg-white/[0.03]"
              >
                {svc.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={svc.image} alt="" className="h-12 w-12 rounded-xl object-cover" />
                ) : (
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-950/5 text-brand-700 dark:bg-white/10 dark:text-brand-300">
                    <ServiceIcon name={svc.icon} />
                  </div>
                )}
                <h2 className="mt-5 font-display text-xl font-700 uppercase tracking-tight text-brand-950 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-300">
                  {field(svc, "title", locale)}
                </h2>
                <p className="mt-3 line-clamp-4 flex-1 text-sm leading-relaxed text-steel-700 dark:text-slate-300">{field(svc, "desc", locale)}</p>
                <span className="mt-5 inline-flex items-center gap-2 font-display text-xs font-700 uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">
                  {dict.common.readMore}
                  <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Case studies (previous project videos) */}
      {previousProjects.length > 0 && (
        <section className="border-t border-steel-400/15 bg-slate-50 dark:border-white/10 dark:bg-[#08122b]">
          <div className="container-page py-16 sm:py-20">
            <Reveal className="max-w-2xl">
              <p className="font-display text-xs font-700 uppercase tracking-[0.3em] text-brand-500 dark:text-brand-300">{dict.services.previousProjectsEyebrow}</p>
              <h2 className="mt-3 font-display text-3xl font-800 uppercase tracking-tight text-brand-950 dark:text-white sm:text-4xl">{dict.services.previousProjectsTitle}</h2>
              <p className="mt-4 text-lg text-steel-700 dark:text-slate-300">{dict.services.previousProjectsLead}</p>
            </Reveal>
            <div className="mt-12 grid gap-8 sm:grid-cols-2">
              {previousProjects.map((p, i) => {
                const embedUrl = youtubeEmbedUrl(p.youtube_url);
                return (
                  <Reveal key={p.id} delay={i * 70}>
                    <article className="h-full overflow-hidden rounded-2xl border border-steel-400/15 bg-white dark:border-white/10 dark:bg-white/[0.03]">
                      {embedUrl && (
                        <div className="relative w-full overflow-hidden bg-black" style={{ paddingTop: "56.25%" }}>
                          <iframe
                            src={embedUrl}
                            title={field(p, "title", locale)}
                            loading="lazy"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            className="absolute inset-0 h-full w-full"
                          />
                        </div>
                      )}
                      <div className="p-6">
                        <h3 className="font-display text-lg font-700 text-brand-950 dark:text-white">{field(p, "title", locale)}</h3>
                        <p className="mt-3 text-sm leading-relaxed text-steel-700 dark:text-slate-300">{field(p, "desc", locale)}</p>
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
