# The blog

nompany's own posts on the public site (the owner, 27/09/2026): company news, what was
added to the product, and events attended. Written in the console at `/super/blog`, read at
`/en/blog` and `/ar/blog`.

## A post is in one language

The owner's rule: "based on post, no arabic and english for same post." A post's `locale` is
a field of the post. `/en/blog` lists the English posts and `/ar/blog` the Arabic ones; a
post lives at exactly one address, `/<locale>/blog/<slug>`, with a canonical link and no
hreflang alternate, because it has no other language to point at. An Arabic post may have an
Arabic slug (letters and digits in any script, joined by single hyphens; diacritics and
tatweel are stripped).

## What a post is (`src/shared/blog.ts`, pure)

Title, slug, summary (the list and the share card), category (`news`, `product`, `events`),
a cover image with its description, a body, draft or published, and a publish date.

- **The body is blocks, not HTML**: paragraph, heading, subheading, quote (with who said it),
  list (bulleted or numbered), image (with description and caption). Inside text, three marks
  only: `**bold**`, `*italic*`, `[text](url)`. The page renders blocks as React elements —
  nothing is injected as HTML — and a link whose target is not `http(s)`, `mailto` or a path
  on this site is shown as plain text.
- **Pictures are our own uploads only.** A cover or image must be an `/api/media/<id>` path;
  anything else is dropped on save.
- **`cleanPost` is a whitelist**, run by the editor before sending and by the store before
  writing, so the screen refuses exactly what the store would.
- **Publishing needs** a title, an address, a summary and at least one block
  (`publishProblem`). A draft may be incomplete.
- **Scheduled**: published with a future date. Whether a post is live is decided against the
  clock when the page is read (`isLive`), so it appears on its minute.

## Storage and routes

- One array under `SITE.collection("blog")` (`g:site:blog`), platform content outside every
  cascade, beside careers. Every write is compare-and-set; the slug's uniqueness per language
  is checked inside the same write (`slug-taken`). Ids are `ID.post()` (`pst_…`).
- `GET/POST /api/super/blog`, `GET/PUT/DELETE /api/super/blog/<id>`,
  `POST /api/super/blog/upload` (images only, stored public through `putMedia`). All
  `auth: "super"`.
- The public pages read through the public minute cache (`livePosts`, `livePost`), so a publish
  shows within a minute.

## On the site

The list: the newest post leads, wide, then cards; category pills filter on the client (every
post is in the server HTML). A post: category, date, reading time (Arabic agrees with its
number), title, summary, the cover, the body at a reading measure, and up to three more posts.
SEO: metadata from the post (title, summary, cover as the share image, `article` times),
BlogPosting and breadcrumb JSON-LD, and each live post in the sitemap dated by its last edit.
A draft, a scheduled post and a slug nobody wrote all answer 404.

**Where a reader finds it** (29/09/2026): Blog is in the top menu and the footer, and the home
page shows the three newest posts in the reader's language under "From the blog", with the
blog's own card (`LatestPosts`, reading `livePostCards`, which the blog list shares). The strip
is absent — not an empty box — when that language has no live post, and a failed read hides the
strip rather than the home page. Until then the only way in was the footer, so a published post
looked, from the home page, as if it did not exist.

Tests: `tests/blog-model.mjs`.

## Not built yet

- Deleting a post leaves its cover and images in media storage (another post may use them).
- No preview of a draft on the site itself; the console shows the fields, not the page.
- No tags, search, pagination or RSS feed; the list shows every live post.
- A publish does not clear the public cache: a post shows within a minute or two (the first
  load after the minute can still serve the old list), not on the next load.
- No per-post author name on the page; posts are signed by nompany.
