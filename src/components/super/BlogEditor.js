"use client";

import { useReload } from "@/components/studio2/useReload";
import { useCallback, useMemo, useRef, useState } from "react";
import { Badge, Button, Card, CardBody, CardHead, Empty, Icon, Table } from "@/app/super/_components/ui";
import {
  BLOG_CATEGORIES,
  LIMITS,
  cleanPost,
  isLive,
  publishProblem,
  readingMinutes,
  slugify,
} from "@/shared/blog";

/* THE BLOG, WRITTEN FROM THE CONSOLE (27/09/2026).
   ------------------------------------------------------------------
   A post is in ONE language (the owner: "based on post, no arabic and english
   for same post"), chosen first, and the editor writes in that language's
   direction so an Arabic post is typed right to left.

   THE BODY IS BLOCKS — paragraph, heading, quote, list, image — and inside a
   block's text three marks only: **bold**, *italic*, [a link](https://…). The
   same `cleanPost` and `publishProblem` the server runs are run here, so the
   screen refuses exactly what the store would refuse, before the round trip.

   PUBLISHED WITH A FUTURE DATE IS SCHEDULED: the public site shows a post from
   its date, decided when the page is read. */

const CATEGORY_LABEL = { news: "News", product: "Product", events: "Events" };
const PROBLEM = {
  "title-required": "A published post needs a title.",
  "slug-required": "A published post needs an address (slug).",
  "excerpt-required": "A published post needs a summary; it is what the list and the share card show.",
  "body-required": "A published post needs at least one block of text.",
  "slug-taken": "Another post in this language already has that address.",
  "not-an-image": "Only images can be uploaded (PNG, JPEG, WebP, GIF or AVIF).",
  "too-large": "That file is larger than the upload limit.",
  notfound: "That post no longer exists.",
};
const BLOCK_TYPES = [
  { type: "p", label: "Paragraph" },
  { type: "h2", label: "Heading" },
  { type: "h3", label: "Subheading" },
  { type: "quote", label: "Quote" },
  { type: "list", label: "List" },
  { type: "image", label: "Image" },
];
const FIELD =
  "w-full rounded-lg border border-[var(--ad-border)] bg-[var(--ad-background)] px-3 py-2 text-sm text-[var(--ad-foreground)] outline-none focus:border-[var(--ad-primary)]";
const LABEL = "mb-1.5 block text-xs font-600 text-[var(--ad-muted-foreground)]";

const blank = () => ({
  locale: "en",
  title: "",
  slug: "",
  excerpt: "",
  category: "news",
  cover: "",
  coverAlt: "",
  blocks: [{ type: "p", text: "" }],
  status: "draft",
  publishedAt: "",
});

const fmt = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
};

// <input type="datetime-local"> speaks local time without a zone.
const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function stateOf(post) {
  if (post.status !== "published") return { label: "Draft", tone: "warning" };
  return isLive(post) ? { label: "Live", tone: "success" } : { label: "Scheduled", tone: "info" };
}

async function upload(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/super/blog/upload", { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "upload-failed");
  return data.src;
}

export default function BlogEditor() {
  const [posts, setPosts] = useState(null);
  const [editing, setEditing] = useState(null); // null = list; "new" or an id
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/super/blog", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "load-failed");
      setPosts(data.posts || []);
      setLoadError("");
    } catch (e) {
      setLoadError(String(e.message || e));
      setPosts([]);
    }
  }, []);
  useReload(load);

  if (editing) {
    const post = editing === "new" ? null : (posts || []).find((p) => p.id === editing) || null;
    return (
      <PostForm
        key={editing}
        post={post}
        onClose={() => setEditing(null)}
        onSaved={(saved) => {
          setPosts((cur) => [saved, ...(cur || []).filter((p) => p.id !== saved.id)]);
          setEditing(saved.id);
        }}
        onDeleted={(id) => {
          setPosts((cur) => (cur || []).filter((p) => p.id !== id));
          setEditing(null);
        }}
      />
    );
  }

  return (
    <Card>
      <CardHead
        title="Posts"
        sub="News, what was added to the product, and events attended. Each post is in one language."
        action={
          <Button onClick={() => setEditing("new")}>
            <Icon name="plus" className="h-4 w-4" /> New post
          </Button>
        }
      />
      <CardBody full>
        {loadError ? <p className="px-6 py-4 text-sm text-[var(--ad-destructive-ink)]">Could not load posts ({loadError}).</p> : null}
        {posts === null ? (
          <p className="px-6 py-10 text-sm text-[var(--ad-muted-foreground)]">Loading posts…</p>
        ) : posts.length === 0 ? (
          <Empty icon="book" title="No posts yet" sub="Write the first one; it stays a draft until you publish it." action={<Button onClick={() => setEditing("new")}>New post</Button>} />
        ) : (
          <Table head={["Title", "Language", "Category", "State", "Publishes", "Updated", { label: "", align: "end" }]} caption="Blog posts">
            {posts.map((p) => {
              const s = stateOf(p);
              return (
                <tr key={p.id}>
                  <td className="max-w-[28rem]">
                    <button type="button" onClick={() => setEditing(p.id)} className="truncate text-start font-600 hover:underline" dir={p.locale === "ar" ? "rtl" : "ltr"}>
                      {p.title || "Untitled"}
                    </button>
                  </td>
                  <td>{p.locale === "ar" ? "Arabic" : "English"}</td>
                  <td>{CATEGORY_LABEL[p.category] || p.category}</td>
                  <td>
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </td>
                  <td>{fmt(p.publishedAt)}</td>
                  <td>{fmt(p.updatedAt)}</td>
                  <td className="text-end">
                    {isLive(p) ? (
                      <a href={`/${p.locale}/blog/${encodeURIComponent(p.slug)}`} target="_blank" rel="noreferrer" className="text-sm text-[var(--ad-primary)] hover:underline">
                        View
                      </a>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </CardBody>
    </Card>
  );
}

function PostForm({ post, onClose, onSaved, onDeleted }) {
  const [draft, setDraft] = useState(() => (post ? { ...blank(), ...post } : blank()));
  const [slugTouched, setSlugTouched] = useState(Boolean(post?.slug));
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState(null);
  const rtl = draft.locale === "ar";
  const dir = rtl ? "rtl" : "ltr";

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const setBlock = (i, patch) => setDraft((d) => ({ ...d, blocks: d.blocks.map((b, k) => (k === i ? { ...b, ...patch } : b)) }));
  const moveBlock = (i, by) =>
    setDraft((d) => {
      const j = i + by;
      if (j < 0 || j >= d.blocks.length) return d;
      const blocks = d.blocks.slice();
      [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
      return { ...d, blocks };
    });
  const removeBlock = (i) => setDraft((d) => ({ ...d, blocks: d.blocks.filter((_, k) => k !== i) }));
  const addBlock = (type) =>
    setDraft((d) => ({
      ...d,
      blocks: [
        ...d.blocks,
        type === "list"
          ? { type, ordered: false, items: [""] }
          : type === "image"
            ? { type, src: "", alt: "", caption: "" }
            : type === "quote"
              ? { type, text: "", cite: "" }
              : { type, text: "" },
      ],
    }));

  const minutes = useMemo(() => readingMinutes(cleanPost(draft).blocks), [draft]);

  async function save(status) {
    const body = { ...draft, status, slug: draft.slug || slugify(draft.title) };
    const problem = publishProblem(cleanPost(body));
    if (problem) {
      setMessage({ tone: "error", text: PROBLEM[problem] || problem });
      return;
    }
    setBusy(status);
    setMessage(null);
    try {
      const res = await fetch(post ? `/api/super/blog/${post.id}` : "/api/super/blog", {
        method: post ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "save-failed");
      setDraft({ ...blank(), ...data.post });
      setSlugTouched(true);
      const s = stateOf(data.post);
      setMessage({ tone: "ok", text: s.label === "Draft" ? "Saved as a draft." : s.label === "Scheduled" ? `Scheduled for ${fmt(data.post.publishedAt)}.` : "Published. It shows on the site within a minute." });
      onSaved(data.post);
    } catch (e) {
      const code = String(e.message || e);
      setMessage({ tone: "error", text: PROBLEM[code] || `Could not save (${code}).` });
    } finally {
      setBusy("");
    }
  }

  async function remove() {
    if (!post) return onClose();
    if (!window.confirm(`Delete "${post.title || "this post"}"? This cannot be undone.`)) return;
    setBusy("delete");
    try {
      const res = await fetch(`/api/super/blog/${post.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete-failed");
      onDeleted(post.id);
    } catch (e) {
      setMessage({ tone: "error", text: `Could not delete (${String(e.message || e)}).` });
      setBusy("");
    }
  }

  const live = post && isLive(post);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHead
          title={post ? "Edit post" : "New post"}
          sub={`${cleanPost(draft).blocks.length} blocks · about ${minutes} min read`}
          action={
            <Button variant="ghost" onClick={onClose}>
              <Icon name="arrowLeft" className="h-4 w-4" /> All posts
            </Button>
          }
        />
        <CardBody className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className={LABEL}>Language</span>
              <div className="inline-flex rounded-lg border border-[var(--ad-border)] p-0.5">
                {[
                  ["en", "English"],
                  ["ar", "العربية"],
                ].map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => set({ locale: code })}
                    aria-pressed={draft.locale === code}
                    className={`rounded-md px-4 py-1.5 text-sm ${draft.locale === code ? "bg-[var(--ad-foreground)] text-[var(--ad-background)]" : "text-[var(--ad-muted-foreground)]"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className={LABEL}>Category</span>
              <div className="inline-flex rounded-lg border border-[var(--ad-border)] p-0.5" role="group" aria-label="Category">
                {BLOG_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set({ category: c })}
                    aria-pressed={draft.category === c}
                    className={`rounded-md px-4 py-1.5 text-sm ${draft.category === c ? "bg-[var(--ad-foreground)] text-[var(--ad-background)]" : "text-[var(--ad-muted-foreground)]"}`}
                  >
                    {CATEGORY_LABEL[c]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="block">
            <span className={LABEL}>Title</span>
            <input
              dir={dir}
              value={draft.title}
              maxLength={LIMITS.title}
              onChange={(e) => set({ title: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })}
              className={`${FIELD} text-base font-600`}
            />
          </label>

          <label className="block">
            <span className={LABEL}>Address</span>
            <div className="flex items-center gap-2 text-sm text-[var(--ad-muted-foreground)]" dir="ltr">
              <span className="shrink-0">/{draft.locale}/blog/</span>
              <input
                dir={dir}
                value={draft.slug}
                maxLength={LIMITS.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set({ slug: e.target.value });
                }}
                onBlur={() => set({ slug: slugify(draft.slug) })}
                className={FIELD}
              />
            </div>
          </label>

          <label className="block">
            <span className={LABEL}>Summary — shown in the list and on the share card</span>
            <textarea dir={dir} rows={2} value={draft.excerpt} maxLength={LIMITS.excerpt} onChange={(e) => set({ excerpt: e.target.value })} className={FIELD} />
          </label>

          <div>
            <span className={LABEL}>Body</span>
            <p className="mb-3 text-xs text-[var(--ad-muted-foreground)]">
              Inside text: <code>**bold**</code>, <code>*italic*</code>, <code>[link text](https://…)</code>. Links may go to the web, an email address, or a page on this site.
            </p>
            <div className="space-y-3">
              {draft.blocks.map((b, i) => (
                <BlockEditor
                  key={i}
                  block={b}
                  dir={dir}
                  first={i === 0}
                  last={i === draft.blocks.length - 1}
                  onChange={(patch) => setBlock(i, patch)}
                  onUp={() => moveBlock(i, -1)}
                  onDown={() => moveBlock(i, 1)}
                  onRemove={() => removeBlock(i)}
                  onError={(text) => setMessage({ tone: "error", text })}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {BLOCK_TYPES.map((t) => (
                <Button key={t.type} variant="outline" size="sm" onClick={() => addBlock(t.type)}>
                  <Icon name="plus" className="h-3.5 w-3.5" /> {t.label}
                </Button>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHead title="Publish" sub={post ? `State: ${stateOf(draft).label}` : "Not saved yet"} />
          <CardBody className="space-y-4">
            <label className="block">
              <span className={LABEL}>Publish date — leave empty for “now”; a future date schedules it</span>
              <input
                type="datetime-local"
                value={toLocalInput(draft.publishedAt)}
                onChange={(e) => set({ publishedAt: e.target.value ? new Date(e.target.value).toISOString() : "" })}
                className={FIELD}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => save("published")} disabled={Boolean(busy)}>
                {busy === "published" ? "Publishing…" : draft.status === "published" ? "Update" : "Publish"}
              </Button>
              <Button variant="outline" onClick={() => save("draft")} disabled={Boolean(busy)}>
                {busy === "draft" ? "Saving…" : draft.status === "published" ? "Unpublish" : "Save draft"}
              </Button>
            </div>
            {message ? (
              <p role="status" className={`text-sm ${message.tone === "error" ? "text-[var(--ad-destructive-ink)]" : "text-[var(--ad-success-ink)]"}`}>
                {message.text}
              </p>
            ) : null}
            {live ? (
              <a href={`/${post.locale}/blog/${encodeURIComponent(post.slug)}`} target="_blank" rel="noreferrer" className="block text-sm text-[var(--ad-primary)] hover:underline">
                View on the site
              </a>
            ) : null}
            {post ? (
              <Button variant="destructive" size="sm" onClick={remove} disabled={Boolean(busy)}>
                {busy === "delete" ? "Deleting…" : "Delete post"}
              </Button>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHead title="Cover image" sub="Shown on the list, at the top of the post and on the share card" />
          <CardBody className="space-y-3">
            <ImagePicker src={draft.cover} onChange={(src) => set({ cover: src })} onError={(text) => setMessage({ tone: "error", text })} />
            <label className="block">
              <span className={LABEL}>Describe the picture (for people who cannot see it)</span>
              <input dir={dir} value={draft.coverAlt} maxLength={LIMITS.alt} onChange={(e) => set({ coverAlt: e.target.value })} className={FIELD} />
            </label>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function BlockEditor({ block, dir, first, last, onChange, onUp, onDown, onRemove, onError }) {
  const label = BLOCK_TYPES.find((t) => t.type === block.type)?.label || block.type;
  return (
    <div className="rounded-lg border border-[var(--ad-border)] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-600 text-[var(--ad-muted-foreground)]">{label}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onUp} disabled={first} aria-label="Move up">
            <Icon name="arrowUp" className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDown} disabled={last} aria-label="Move down">
            <Icon name="arrowDown" className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onRemove} aria-label="Remove block">
            <Icon name="trash" className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {block.type === "p" ? (
        <textarea dir={dir} rows={4} value={block.text} onChange={(e) => onChange({ text: e.target.value })} className={FIELD} />
      ) : block.type === "h2" || block.type === "h3" ? (
        <input dir={dir} value={block.text} onChange={(e) => onChange({ text: e.target.value })} className={`${FIELD} font-600`} />
      ) : block.type === "quote" ? (
        <div className="space-y-2">
          <textarea dir={dir} rows={2} value={block.text} onChange={(e) => onChange({ text: e.target.value })} className={FIELD} />
          <input dir={dir} placeholder="Who said it (optional)" value={block.cite} onChange={(e) => onChange({ cite: e.target.value })} className={FIELD} />
        </div>
      ) : block.type === "list" ? (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-[var(--ad-muted-foreground)]">
            <input type="checkbox" checked={block.ordered} onChange={(e) => onChange({ ordered: e.target.checked })} /> Numbered
          </label>
          <textarea
            dir={dir}
            rows={Math.max(3, block.items.length + 1)}
            value={block.items.join("\n")}
            onChange={(e) => onChange({ items: e.target.value.split("\n") })}
            className={FIELD}
          />
          <p className="text-xs text-[var(--ad-muted-foreground)]">One item per line.</p>
        </div>
      ) : block.type === "image" ? (
        <div className="space-y-2">
          <ImagePicker src={block.src} onChange={(src) => onChange({ src })} onError={onError} />
          <input dir={dir} placeholder="Describe the picture" value={block.alt} onChange={(e) => onChange({ alt: e.target.value })} className={FIELD} />
          <input dir={dir} placeholder="Caption (optional)" value={block.caption} onChange={(e) => onChange({ caption: e.target.value })} className={FIELD} />
        </div>
      ) : null}
    </div>
  );
}

function ImagePicker({ src, onChange, onError }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      onChange(await upload(file));
    } catch (err) {
      const code = String(err.message || err);
      onError(PROBLEM[code] || `Upload failed (${code}).`);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- our own media path, any size
        <img src={src} alt="" className="aspect-[16/9] w-full rounded-lg border border-[var(--ad-border)] object-cover" />
      ) : (
        <div className="grid aspect-[16/9] w-full place-items-center rounded-lg border border-dashed border-[var(--ad-border)] text-xs text-[var(--ad-muted-foreground)]">
          No image
        </div>
      )}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? "Uploading…" : src ? "Replace" : "Upload image"}
        </Button>
        {src ? (
          <Button variant="ghost" size="sm" onClick={() => onChange("")}>
            Remove
          </Button>
        ) : null}
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" className="hidden" onChange={pick} />
    </div>
  );
}
