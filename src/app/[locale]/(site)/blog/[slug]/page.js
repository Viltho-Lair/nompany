import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import { PostBody } from "@/components/landing/site/pages/blog/PostBody";
import { livePost, livePosts } from "@/lib/data/blog";
import { fmtDate } from "@/lib/format";
import { SITE_URL, blogPostingLd, breadcrumbLd, urlFor } from "@/lib/seo";
import { readingMinutes } from "@/shared/blog";
import { getDict, isLocale } from "@/shared/i18n";
import { blogCopy } from "@/shared/marketing/blog";

// ONE POST (27/09/2026). A post is in one language, so it lives at exactly one
// address: /<its locale>/blog/<slug>. The same slug under the other locale is
// another post or nothing — never a translation — so the page carries a
// canonical and NO hreflang alternates. A draft, a scheduled post and a slug
// nobody wrote all answer 404, and none of them can be told apart from outside.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  const post = isLocale(locale) ? await livePost(locale, slug) : null;
  if (!post) return { title: blogCopy(locale).title, robots: { index: false } };
  const url = urlFor(locale, `/blog/${encodeURIComponent(post.slug)}`);
  const image = post.cover ? `${SITE_URL}${post.cover}` : urlFor(locale, "/opengraph-image");
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      siteName: "nompany",
      title: post.title,
      description: post.excerpt,
      locale: locale === "ar" ? "ar_AR" : "en_US",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      images: [{ url: image, alt: post.coverAlt || post.title }],
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.excerpt, images: [image] },
  };
}

export default async function PostPage({ params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const post = await livePost(locale, slug);
  if (!post) notFound();
  const tr = blogCopy(locale);
  const dict = getDict(locale);
  const more = (await livePosts(locale)).filter((p) => p.id !== post.id).slice(0, 3);

  return (
    <article className="relative isolate px-6 pb-40 pt-36 md:px-10 md:pt-44">
      <JsonLd
        data={[
          blogPostingLd(post),
          breadcrumbLd([
            { name: dict.nav.home, url: urlFor(locale) },
            { name: tr.title, url: urlFor(locale, "/blog") },
            { name: post.title, url: urlFor(locale, `/blog/${encodeURIComponent(post.slug)}`) },
          ]),
        ]}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px]"
        style={{ background: "radial-gradient(60% 70% at 50% 0%, rgba(139,124,255,0.14), rgba(139,124,255,0) 70%)" }}
      />
      <header className="mx-auto max-w-[760px]">
        <Link href={`/${locale}/blog`} className="text-[14px] text-[#c9c2ff] transition-colors hover:text-white">
          {tr.back}
        </Link>
        <p className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-white/45">
          <span className="rounded-full bg-[#8b7cff]/15 px-2.5 py-0.5 text-[#c9c2ff]">{tr.categories[post.category]}</span>
          <time dateTime={post.publishedAt}>{fmtDate(post.publishedAt)}</time>
          <span>{tr.minutes(readingMinutes(post.blocks))}</span>
        </p>
        <h1 className="mt-5 text-balance text-[2.3rem] font-medium leading-[1.08] tracking-[-0.035em] md:text-[3.4rem] rtl:leading-[1.35] rtl:tracking-normal">
          {post.title}
        </h1>
        <p className="mt-6 text-[18px] leading-relaxed text-[#9a9aa8] md:text-[20px]">{post.excerpt}</p>
      </header>

      {post.cover ? (
        <div className="mx-auto mt-12 max-w-[1040px] rounded-3xl bg-white/[0.035] p-2 ring-1 ring-inset ring-white/10 shadow-[0_50px_120px_-30px_rgba(24,16,80,0.85)]">
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl">
            <Image src={post.cover} alt={post.coverAlt} fill priority sizes="(min-width: 1080px) 1040px, 100vw" className="object-cover" />
          </div>
        </div>
      ) : null}

      <div className="mx-auto mt-14 max-w-[720px]">
        <PostBody blocks={post.blocks} />
      </div>

      {more.length ? (
        <aside className="mx-auto mt-28 max-w-[1280px]">
          <h2 className="text-[15px] text-white/45">{tr.more}</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {more.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/${locale}/blog/${encodeURIComponent(p.slug)}`}
                  className="block h-full rounded-3xl bg-white/[0.025] p-7 ring-1 ring-inset ring-white/[0.07] transition-colors hover:bg-white/[0.05]"
                >
                  <p className="text-[13px] text-white/45">
                    {tr.categories[p.category]} · <time dateTime={p.publishedAt}>{fmtDate(p.publishedAt)}</time>
                  </p>
                  <p className="mt-3 text-[1.15rem] font-medium leading-snug">{p.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </article>
  );
}
