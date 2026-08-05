import { getSettings, getCollection } from "@/lib/db";
import { getDict } from "@/lib/i18n";
import { buildMetadata, localBusinessLd } from "@/lib/seo";
import { showcaseClients } from "@/lib/showcase";
import JsonLd from "@/components/JsonLd";
import EditorialHome from "@/components/experience/EditorialHome";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildMetadata({ locale, path: "" });
}

export default async function HomePage({ params }) {
  const { locale } = await params;
  const dict = getDict(locale);
  const s = await getSettings();
  const services = await getCollection("services");
  // Homepage shows up to 4 "Featured on home" projects; falls back to the first
  // 4 from the ordered list when nothing is flagged, so nothing goes blank.
  const allProjects = await getCollection("projects");
  const featured = allProjects.filter((p) => p.homeFeatured).slice(0, 4);
  const projects = featured.length > 0 ? featured : allProjects.slice(0, 4);
  const clients = showcaseClients(await getCollection("salesClients"));
  const galleryImages = (await getCollection("galleryImages")).filter((g) => g.visible !== false);
  const reviews = (await getCollection("reviews")).filter((r) => r.status === "approved");

  return (
    <>
      <JsonLd data={localBusinessLd(s, locale)} />
      <EditorialHome
        locale={locale}
        dict={dict}
        settings={s}
        services={services}
        projects={projects}
        clients={clients}
        galleryImages={galleryImages}
        reviews={reviews}
      />
    </>
  );
}
