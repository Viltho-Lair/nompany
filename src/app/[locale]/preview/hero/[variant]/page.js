import { notFound } from "next/navigation";
import HeroPreview from "@/components/landing/preview/HeroPreview";

// THE HERO PREVIEW — three variants behind one route, so the winner is chosen
// from the running thing rather than from a description (spec §5).
//
// NOT A PUBLIC PAGE. It ships to production because that is where it gets
// looked at, and it is noindex here, disallowed in robots.js and absent from
// the sitemap. It is deleted, route and shell together, in the commit that
// adopts a winner — scaffolding that outlives the build becomes a page nobody
// meant to publish.
//
// ONE DYNAMIC SEGMENT rather than three routes: the URL names the variant so a
// link can be sent, each variant is genuinely server-rendered — which is the
// constraint being judged — and the per-route bundle budget sees one entry.

const VARIANTS = ["v1", "v2", "v3"];

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return {
    title: "Hero preview",
    robots: { index: false, follow: false },
  };
}

export default async function HeroPreviewPage({ params }) {
  const { locale, variant } = await params;
  // A WRONG VARIANT IS A 404, not a redirect to v1. SEO-PLAN §1.11 is about
  // exactly this: a URL that names nothing should answer like one.
  if (!VARIANTS.includes(variant)) notFound();

  return <HeroPreview locale={locale} variant={variant} />;
}
