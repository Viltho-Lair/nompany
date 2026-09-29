"use client";
import Link from "next/link";
import { Forward } from "./Chrome";
import { useSite } from "./locale";
import { PostCard } from "./pages/blog/BlogIndex";

/**
 * "FROM THE BLOG" ON THE HOME PAGE: the newest posts in the reader's language,
 * drawn with the blog's own card so the two cannot look different.
 *
 * ABSENT WHEN THERE IS NOTHING TO SHOW — never an empty box. A post is in one
 * language, so /ar can have none while /en has three, and a heading over
 * nothing reads as a broken page rather than a young blog.
 *
 * Posts arrive already phrased from the server (`livePostCards`), and `tr` is
 * the blog's copy without its one function, which cannot cross to the client.
 */
export function LatestPosts({ posts, tr }) {
  const { locale } = useSite();
  if (!posts?.length) return null;

  return (
    <section className="mx-auto max-w-[1280px] px-6 py-32 md:px-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 className="text-[2rem] font-medium leading-[1.1] tracking-[-0.035em] md:text-[3.25rem] rtl:tracking-normal">{tr.latestTitle}</h2>
          <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-[#8f8f9c]">{tr.lead}</p>
        </div>
        <Link href={`/${locale}/blog`} className="inline-flex items-center gap-2 text-[14px] text-[#c9c2ff] hover:text-white">
          {tr.back}
          <Forward size={14} />
        </Link>
      </div>
      <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((p, i) => (
          <li key={p.id}>
            <PostCard post={p} tr={tr} locale={locale} i={i} Heading="h3" />
          </li>
        ))}
      </ul>
    </section>
  );
}
