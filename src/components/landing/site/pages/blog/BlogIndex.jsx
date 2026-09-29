"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useMotionTemplate, useMotionValue } from "motion/react";
import { Forward } from "@/components/landing/site/Chrome";
import { useSite } from "@/components/landing/site/locale";
import { CELL_IN, focusTransition, useInViewReveal } from "@/components/landing/site/primitives";

/**
 * THE BLOG'S LIST, in the reader's language. The newest post leads, wide; the
 * rest follow as cards. The category pills filter on the client — every post is
 * already in the server HTML, so a crawler reads them all and the filter only
 * hides what the reader asked not to see.
 *
 * Posts arrive as plain props from the server (title, summary, date, reading
 * time already phrased, cover), so nothing here reads the store.
 */
export function BlogIndex({ posts, tr }) {
  const { locale } = useSite();
  const [cat, setCat] = useState("all");
  const cats = ["all", ...Object.keys(tr.categories)].filter((c) => c === "all" || posts.some((p) => p.category === c));
  const shown = cat === "all" ? posts : posts.filter((p) => p.category === cat);
  const [lead, ...rest] = shown;
  const pills = useInViewReveal(0.1);

  if (posts.length === 0) {
    return (
      <section className="px-6 pb-40 md:px-10">
        <div className="mx-auto max-w-[1280px] rounded-3xl bg-white/[0.025] p-10 text-[17px] text-white/60 ring-1 ring-inset ring-white/[0.07]">{tr.empty}</div>
      </section>
    );
  }

  return (
    <section className="px-6 pb-40 md:px-10">
      <div className="mx-auto max-w-[1280px]">
        {cats.length > 2 ? (
          <motion.div {...pills} role="group" aria-label={tr.filterLabel} className="mb-10 flex flex-wrap gap-2">
            {cats.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={cat === c}
                onClick={() => setCat(c)}
                className={`rounded-full px-4 py-2 text-[14px] transition-colors duration-200 ${
                  cat === c ? "bg-[#ececf1] text-[#0b0b10]" : "bg-white/[0.05] text-white/65 ring-1 ring-inset ring-white/10 hover:text-white"
                }`}
              >
                {c === "all" ? tr.all : tr.categories[c]}
              </button>
            ))}
          </motion.div>
        ) : null}

        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={cat}
            initial={{ opacity: 0, filter: "blur(8px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(8px)", transition: { duration: 0.15 } }}
            transition={focusTransition(0)}
          >
            {shown.length === 0 ? (
              <p className="rounded-3xl bg-white/[0.025] p-10 text-white/60 ring-1 ring-inset ring-white/[0.07]">{tr.emptyCategory}</p>
            ) : (
              <>
                <PostCard post={lead} tr={tr} locale={locale} i={0} wide />
                {rest.length ? (
                  <ul className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {rest.map((p, k) => (
                      <li key={p.id}>
                        <PostCard post={p} tr={tr} locale={locale} i={k + 1} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

/**
 * One post as a card. Exported for the home page's "From the blog", which sits
 * under its own h2 and so asks for an h3 (`Heading`).
 */
export function PostCard({ post, tr, locale, i, wide = false, Heading = "h2" }) {
  const reveal = useInViewReveal(Math.min(i, 5) * 0.07, CELL_IN, 0.2);
  const mx = useMotionValue(-600);
  const my = useMotionValue(-600);
  const edge = useMotionTemplate`radial-gradient(280px circle at ${mx}px ${my}px, rgba(214,208,255,0.55), transparent 70%)`;
  const href = `/${locale}/blog/${encodeURIComponent(post.slug)}`;

  return (
    <motion.article
      {...reveal}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(e.clientX - r.left);
        my.set(e.clientY - r.top);
      }}
      onPointerLeave={() => {
        mx.set(-600);
        my.set(-600);
      }}
      className={`group relative isolate h-full overflow-hidden rounded-3xl bg-white/[0.025] ring-1 ring-inset ring-white/[0.07] ${wide ? "md:grid md:grid-cols-2" : ""}`}
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 rounded-3xl p-px"
        style={{ background: edge, WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" }}
      />
      <div className={`relative overflow-hidden bg-[#0e0e16] ${wide ? "aspect-[16/10] md:aspect-auto md:min-h-[360px]" : "aspect-[16/10]"}`}>
        {post.cover ? (
          <Image
            src={post.cover}
            alt={post.coverAlt}
            fill
            priority={wide}
            sizes={wide ? "(min-width: 768px) 640px, 100vw" : "(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw"}
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.03]"
          />
        ) : (
          <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(90% 90% at 20% 10%, rgba(139,124,255,0.35), rgba(12,12,20,1) 75%)" }} />
        )}
      </div>
      <div className={`flex flex-col p-7 ${wide ? "md:justify-center md:p-10" : ""}`}>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-white/45">
          <span className="rounded-full bg-[#8b7cff]/15 px-2.5 py-0.5 text-[#c9c2ff]">{tr.categories[post.category]}</span>
          <time dateTime={post.publishedAt}>{post.date}</time>
          <span>{post.readTime}</span>
        </p>
        <Heading className={`mt-4 font-medium leading-snug tracking-[-0.02em] rtl:tracking-normal ${wide ? "text-[1.8rem] md:text-[2.4rem] md:leading-[1.1]" : "text-[1.3rem]"}`}>
          <Link href={href} className="after:absolute after:inset-0 after:z-20 focus-visible:outline-none">
            {post.title}
          </Link>
        </Heading>
        <p className={`mt-3 leading-relaxed text-white/60 ${wide ? "text-[16px]" : "line-clamp-3 text-[15px]"}`}>{post.excerpt}</p>
        <span className="mt-6 inline-flex items-center gap-2 text-[14px] text-[#c9c2ff] group-hover:text-white">
          {tr.read}
          <Forward size={14} />
        </span>
      </div>
    </motion.article>
  );
}
