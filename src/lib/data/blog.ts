// THE BLOG'S STORE — nompany's own posts, written from /super, read by the
// public site. Platform content, not tenant data: it lives beside careers under
// `g:site:*` (SITE.collection("blog")), belongs to no studio and sits outside
// every cascade. One array of posts under one key: the owner writes a post
// every so often, so the array stays small, and one key keeps "is this slug
// taken" answerable inside the same compare-and-set that writes the post.
//
// Every write is `editArr` (invariant 8). Ids and timestamps are minted OUTSIDE
// the closure, because the closure may run once per CAS retry and an id minted
// inside it would be whichever round happened to win.

import { editArr, readArr } from "@/platform/db/store";
import type { Row } from "@/platform/db/store";
import { ID, SITE } from "@/platform/db/keys";
import { byPublished, cleanPost, isLive, publishProblem, type BlogPost } from "@/shared/blog";
import { publicCached } from "./publicSettings";

const KEY = SITE.collection("blog");

type Result = { post: BlogPost } | { error: string };

function slugTaken(rows: Row[], locale: string, slug: string, exceptId = "") {
  return rows.some((r) => r.id !== exceptId && r.locale === locale && r.slug === slug);
}

/** Every post, drafts included, newest first — the console's list. */
export async function listPosts(): Promise<BlogPost[]> {
  const rows = (await readArr(KEY)) as unknown as BlogPost[];
  return rows.slice().sort((a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0));
}

export async function getPost(id: string): Promise<BlogPost | null> {
  const rows = (await readArr(KEY)) as unknown as BlogPost[];
  return rows.find((r) => r.id === id) || null;
}

export async function createPost(input: unknown, author: string): Promise<Result> {
  const clean = cleanPost(input);
  const problem = publishProblem(clean);
  if (problem) return { error: problem };
  const id = ID.post();
  const now = new Date().toISOString();
  return editArr(KEY, (rows: Row[]) => {
    if (clean.slug && slugTaken(rows, clean.locale, clean.slug)) return { next: rows, result: { error: "slug-taken" } as Result };
    const post: BlogPost = {
      ...clean,
      // Publishing without a date means "now"; a draft keeps whatever was set.
      publishedAt: clean.publishedAt || (clean.status === "published" ? now : ""),
      id,
      createdAt: now,
      updatedAt: now,
      author: String(author || ""),
    };
    return { next: [post as unknown as Row, ...rows], result: { post } as Result };
  }) as Promise<Result>;
}

export async function updatePost(id: string, input: unknown): Promise<Result> {
  const clean = cleanPost(input);
  const problem = publishProblem(clean);
  if (problem) return { error: problem };
  const now = new Date().toISOString();
  return editArr(KEY, (rows: Row[]) => {
    const i = rows.findIndex((r) => r.id === id);
    if (i < 0) return { next: rows, result: { error: "notfound" } as Result };
    if (clean.slug && slugTaken(rows, clean.locale, clean.slug, id)) return { next: rows, result: { error: "slug-taken" } as Result };
    const prev = rows[i] as unknown as BlogPost;
    const post: BlogPost = {
      ...prev,
      ...clean,
      publishedAt: clean.publishedAt || (clean.status === "published" ? prev.publishedAt || now : ""),
      updatedAt: now,
    };
    const next = rows.slice();
    next[i] = post as unknown as Row;
    return { next, result: { post } as Result };
  }) as Promise<Result>;
}

/**
 * Delete one post. Its cover and images stay in media storage: another post may
 * use the same upload, and a media object nobody links to costs a few bytes,
 * while a deleted one somebody still links to is a broken page.
 */
export async function deletePost(id: string): Promise<boolean> {
  return editArr(KEY, (rows: Row[]) => {
    const next = rows.filter((r) => r.id !== id);
    return { next, result: next.length !== rows.length };
  }) as Promise<boolean>;
}

// ---- public reads ------------------------------------------------------------

// Through the public minute cache, for the reason every public read goes through
// it: a publish in /super shows within a minute, which is short enough that
// nobody wonders whether the save worked, and a page view does not cost a
// database round trip. Whether a post is live is decided at READ time against
// the clock, not inside the cache, so a scheduled post appears on its minute.
const allPosts = publicCached(async () => (await readArr(KEY)) as unknown as BlogPost[], "blog-posts");

/** The live posts in one language, newest first. */
export async function livePosts(locale: string): Promise<BlogPost[]> {
  const now = Date.now();
  return (await allPosts()).filter((p) => p.locale === locale && isLive(p, now)).sort(byPublished);
}

/** One live post by its address, or null. */
export async function livePost(locale: string, slug: string): Promise<BlogPost | null> {
  const want = decodeURIComponent(slug).normalize("NFKC").toLowerCase();
  return (await livePosts(locale)).find((p) => p.slug === want) || null;
}
