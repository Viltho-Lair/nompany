import { getSiteSettings } from "@/lib/data/site";
import { getDict } from "@/lib/i18n";
import { localBusinessLd, buildMetadata } from "@/lib/seo";
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
  const s = await getSiteSettings();

  // nompany marketing home is driven entirely by code (dict), NOT by the shared
  // ERP collections. The old "Trusted by" logos (salesClients) and testimonials
  // (reviews) are intentionally not fetched here — they are live operational
  // data. TODO(phase 6): wire these to nompany-owned content when it exists.
  return (
    <>
      <JsonLd data={localBusinessLd(s, locale)} />
      <EditorialHome locale={locale} dict={dict} />
    </>
  );
}
