// THE BLOG, PURELY — what a post is, what survives being saved, and how its
// text is read. No store, no request, no React: the /super editor, the routes
// and the public pages all ask these functions, so the screen that writes a post
// and the page that shows it cannot disagree about what a post may contain.
//
// A POST IS IN ONE LANGUAGE — the owner, 27/09/2026: "based on post, no arabic
// and english for same post." So `locale` is a field of the post rather than a
// pair of fields on it, /en/blog lists the English posts and /ar/blog the
// Arabic ones, and a post has no hreflang alternate because it has no other
// language to point at.
//
// THE BODY IS BLOCKS, NOT HTML. The site's HTML sanitiser (lib/richText) allows
// no headings, links or images, which a post needs; widening a sanitiser other
// pages depend on is the wrong trade. Blocks carry text, never markup, so there
// is nothing to sanitise: the page renders them as React elements. Inside a
// block's text a small, closed markdown subset — **bold**, *italic* and
// [a link](https://…) — is parsed at render, and a link whose target is not
// http(s), mailto or a path on this site is shown as plain text.

export const BLOG_LOCALES = ["en", "ar"] as const;
export type BlogLocale = (typeof BLOG_LOCALES)[number];

// News about the company, what was added to the product, and events attended —
// the three things the owner named the blog for.
export const BLOG_CATEGORIES = ["news", "product", "events"] as const;
export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export const BLOG_STATUSES = ["draft", "published"] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "quote"; text: string; cite: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "image"; src: string; alt: string; caption: string };

export type BlogPost = {
  id: string;
  locale: BlogLocale;
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  cover: string;
  coverAlt: string;
  blocks: BlogBlock[];
  status: BlogStatus;
  /** When it becomes public. A published post dated in the future is scheduled. */
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  author: string;
};

export const LIMITS = {
  title: 140,
  excerpt: 300,
  slug: 80,
  text: 6000,
  blocks: 200,
  items: 40,
  alt: 200,
};

// ONLY OUR OWN UPLOADS. A cover or an image is a path the media route serves
// (`/api/media/<32 hex>`), never an arbitrary URL — a post must not be able to
// make every visitor's browser fetch from somewhere else.
const MEDIA_SRC = /^\/api\/media\/[a-f0-9]{32}$/;
export function isMediaSrc(v: unknown): v is string {
  return typeof v === "string" && MEDIA_SRC.test(v);
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").trim().slice(0, max) : "");
const oneLine = (v: unknown, max: number) => str(v, max).replace(/\s+/g, " ");

// A SLUG IS LETTERS AND DIGITS JOINED BY SINGLE HYPHENS, in any script — an
// Arabic post may have an Arabic address, which is what an Arabic searcher
// types. Lower-cased, so /Hello and /hello are one post.
const SLUG = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;
export function slugify(input: unknown): string {
  return String(input || "")
    .normalize("NFKC")
    .toLowerCase()
    // Arabic diacritics and tatweel are not part of how a word is typed.
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, LIMITS.slug)
    .replace(/-+$/g, "");
}
export function isSlug(v: unknown): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= LIMITS.slug && SLUG.test(v);
}

function cleanBlock(raw: unknown): BlogBlock | null {
  const b = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  switch (b.type) {
    case "p":
    case "h2":
    case "h3": {
      const text = b.type === "p" ? str(b.text, LIMITS.text) : oneLine(b.text, LIMITS.title);
      return text ? { type: b.type, text } : null;
    }
    case "quote": {
      const text = str(b.text, LIMITS.text);
      return text ? { type: "quote", text, cite: oneLine(b.cite, LIMITS.title) } : null;
    }
    case "list": {
      const items = (Array.isArray(b.items) ? b.items : [])
        .map((i) => oneLine(i, LIMITS.text))
        .filter(Boolean)
        .slice(0, LIMITS.items);
      return items.length ? { type: "list", ordered: b.ordered === true, items } : null;
    }
    case "image":
      return isMediaSrc(b.src)
        ? { type: "image", src: b.src, alt: oneLine(b.alt, LIMITS.alt), caption: oneLine(b.caption, LIMITS.alt) }
        : null;
    default:
      return null;
  }
}

/**
 * What survives being saved — a WHITELIST, so a field the editor does not know
 * about is dropped rather than stored. Returns the post's editable fields; the
 * store adds id, timestamps and author.
 */
export function cleanPost(input: unknown) {
  const b = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const locale: BlogLocale = b.locale === "ar" ? "ar" : "en";
  const title = oneLine(b.title, LIMITS.title);
  const slug = isSlug(b.slug) ? String(b.slug).toLowerCase() : slugify(b.slug || title);
  const category = (BLOG_CATEGORIES as readonly string[]).includes(String(b.category))
    ? (b.category as BlogCategory)
    : "news";
  const status: BlogStatus = b.status === "published" ? "published" : "draft";
  const publishedAt = typeof b.publishedAt === "string" && !Number.isNaN(Date.parse(b.publishedAt))
    ? new Date(b.publishedAt).toISOString()
    : "";
  const blocks = (Array.isArray(b.blocks) ? b.blocks : [])
    .slice(0, LIMITS.blocks)
    .map(cleanBlock)
    .filter((x): x is BlogBlock => x !== null);
  return {
    locale,
    slug,
    title,
    excerpt: oneLine(b.excerpt, LIMITS.excerpt),
    category,
    cover: isMediaSrc(b.cover) ? b.cover : "",
    coverAlt: oneLine(b.coverAlt, LIMITS.alt),
    blocks,
    status,
    publishedAt,
  };
}

/**
 * Why this post cannot be PUBLISHED, or "" if it can. A draft may be incomplete
 * — that is what a draft is for — but a published post needs a title, an
 * address, a summary for the listing and the share card, and a body.
 */
export function publishProblem(p: ReturnType<typeof cleanPost>): string {
  if (p.status !== "published") return "";
  if (!p.title) return "title-required";
  if (!isSlug(p.slug)) return "slug-required";
  if (!p.excerpt) return "excerpt-required";
  if (p.blocks.length === 0) return "body-required";
  return "";
}

/** Public now: published, and its date has come. */
export function isLive(p: Pick<BlogPost, "status" | "publishedAt">, now: number = Date.now()): boolean {
  if (p.status !== "published") return false;
  const at = Date.parse(p.publishedAt);
  return !Number.isNaN(at) && at <= now;
}

/** Newest first, by the date it went (or goes) public. */
export function byPublished(a: Pick<BlogPost, "publishedAt">, b: Pick<BlogPost, "publishedAt">) {
  return (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0);
}

/** Minutes to read, at a steady 200 words a minute, never less than one. */
export function readingMinutes(blocks: BlogBlock[]): number {
  let words = 0;
  for (const b of blocks) {
    const text = b.type === "list" ? b.items.join(" ") : b.type === "image" ? b.caption : b.text;
    words += text.split(/\s+/).filter(Boolean).length;
  }
  return Math.max(1, Math.round(words / 200));
}

// ---- inline text -----------------------------------------------------------

export type Inline =
  | { kind: "text"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "em"; text: string }
  | { kind: "link"; text: string; href: string };

/** A link target a visitor may be sent to: the web, email, or a path here. */
export function safeHref(href: string): string {
  const h = href.trim();
  if (/^https?:\/\/[^\s]+$/i.test(h)) return h;
  if (/^mailto:[^\s@]+@[^\s@]+$/i.test(h)) return h;
  if (/^\/(?!\/)[^\s]*$/.test(h)) return h;
  return "";
}

// One pass, left to right. The FIRST of the three patterns to start earliest
// wins; everything between matches is plain text. Nothing nests, which is the
// point: a closed grammar small enough that its output is obviously safe.
const INLINE = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ kind: "text", text: text.slice(last, at) });
    if (m[1] !== undefined) out.push({ kind: "strong", text: m[1] });
    else if (m[2] !== undefined) out.push({ kind: "em", text: m[2] });
    else {
      const href = safeHref(m[4]);
      out.push(href ? { kind: "link", text: m[3], href } : { kind: "text", text: m[3] });
    }
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

/** The post's text as one plain string, for a description or a search index. */
export function plainText(text: string): string {
  return parseInline(text).map((t) => t.text).join("");
}
