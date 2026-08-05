import EditorialHeader from "@/components/public/EditorialHeader";
import Reveal from "@/components/Reveal";
import { getCollection } from "@/lib/db";
import { getDict, field } from "@/lib/i18n";
import { buildMetadata, breadcrumbLd, urlFor } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildMetadata({ locale, path: "/gallery" });
}

export default async function GalleryPage({ params }) {
  const { locale } = await params;
  const dict = getDict(locale);
  const images = (await getCollection("galleryImages")).filter((g) => g.visible !== false);

  const breadcrumb = breadcrumbLd([
    { name: dict.nav.home, url: urlFor(locale, "") },
    { name: dict.gallery.title, url: urlFor(locale, "/gallery") },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />
      <EditorialHeader eyebrow={dict.common.brand} title={dict.gallery.title} lead={dict.gallery.lead} />
      <section className="container-page py-14 sm:py-16">
        {images.length === 0 ? (
          <p className="text-center text-steel-500 dark:text-slate-400">{dict.gallery.empty}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {images.map((img, i) => {
              const caption = field(img, "title", locale);
              return (
                <Reveal key={img.id} delay={i * 40}>
                  <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100 dark:bg-white/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.image}
                      alt={caption || ""}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {caption && (
                      <span className="absolute bottom-3 start-3 z-10 rounded-full bg-black/45 px-3 py-1 text-xs font-500 text-white backdrop-blur">
                        {caption}
                      </span>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
