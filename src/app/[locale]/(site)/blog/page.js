import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import { PageHero } from "@/components/landing/site/PageHero";
import { BlogIndex } from "@/components/landing/site/pages/blog/BlogIndex";
import { livePosts } from "@/lib/data/blog";
import { fmtDate } from "@/lib/format";
import { breadcrumbLd, buildMetadata, urlFor } from "@/lib/seo";
import { readingMinutes } from "@/shared/blog";
import { getDict, isLocale } from "@/shared/i18n";
import { blogCopy } from "@/shared/marketing/blog";

// nompany's blog, in the reader's language (27/09/2026). A post is in ONE
// language, so /en/blog lists the English posts and /ar/blog the Arabic ones.
// The posts come through the public minute cache; whether each is live is
// decided against the clock at read time, so a scheduled post appears on time.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildMetadata({ locale, path: "/blog" });
}

export default async function BlogPage({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const tr = blogCopy(locale);
  const posts = (await livePosts(locale)).map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    category: p.category,
    cover: p.cover,
    coverAlt: p.coverAlt,
    publishedAt: p.publishedAt,
    date: fmtDate(p.publishedAt),
    // Resolved here: the phrase is a function of the count (Arabic agrees
    // with its number), and a function cannot cross to a client component.
    readTime: tr.minutes(readingMinutes(p.blocks)),
  }));
  const { minutes: _minutes, ...strings } = tr;
  const dict = getDict(locale);

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: dict.nav.home, url: urlFor(locale) },
          { name: tr.title, url: urlFor(locale, "/blog") },
        ])}
      />
      <PageHero title={tr.title} lead={tr.lead} />
      <BlogIndex posts={posts} tr={strings} />
    </>
  );
}
