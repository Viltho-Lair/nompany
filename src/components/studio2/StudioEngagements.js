"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/studio2/icons";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { fmtDate } from "@/lib/format";
// PURE AND READER-INJECTED (its own header comment): nothing in the registry
// touches Redis, so a client component may import it straight — the same
// stage vocabulary the read layer (`src/modules/main/engagements.ts`) filters
// by is the one this screen uses for labels and icons, rather than a second,
// hand-kept copy that could drift from it.
import { STAGE_REGISTRY } from "@/platform/engagement/registry";

// The read layer's own minimum: below this a fetch that finished instantly
// would still flash the skeleton on and off, which reads as a glitch rather
// than as nothing happening. Not a spinner delay — the skeleton is already
// shaped like the content, so the only thing being avoided is the FLASH.
const MIN_SKELETON_MS = 200;

// Icons per stage type. A hand-kept map rather than something derived from
// STAGE_REGISTRY, because the registry does not carry an icon name — Icon()
// falls back to a neutral dot for anything missing here, so a thirteenth
// stage type shows up plainly rather than throwing.
const STAGE_ICON = {
  ticket: "ticket", rfq: "rfp", quotation: "report", project: "blueprint",
  sheet: "sheets", order: "cart", delivery: "box", shipment: "package",
  task: "checkDouble", overtime: "overtime", invoice: "invoice",
  expense: "wallet", bill: "form", asset: "database",
};

const panel = "rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-6 dark:border-white/10";
const h2 = "font-display text-lg font-800 text-slate-900 dark:text-white";
const sub = "mt-1 text-sm text-slate-500 dark:text-slate-400";
const btnGhost = "rounded-full border border-slate-200 px-4 py-2 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";

// Waits at least `ms` before resolving, so a fetch that came back instantly
// still holds the skeleton on screen for one paint's worth of time rather
// than flashing it. The fetch itself is never slowed — this only delays
// FLIPPING the loading flag off.
function withMinDelay(promise, ms = MIN_SKELETON_MS) {
  const started = Date.now();
  return promise.then((value) => {
    const left = ms - (Date.now() - started);
    if (left <= 0) return value;
    return new Promise((resolve) => setTimeout(() => resolve(value), left));
  });
}

// Engagements — the one screen where a deal is a single block: its client and
// title stated once, and each stage shown as present or offered, never as a
// broken field (design §2). Rendered full-screen, OUTSIDE StudioFrame, the
// same shape as the manual and the live views — see the early return in
// studio/[[...segments]]/page.js and design §3 for why this is not a section.
export default function StudioEngagements({ slug }) {
  const [list, setList] = useState(null); // { engagements, nextCursor } | null while loading
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);

  const [openId, setOpenId] = useState("");
  const [block, setBlock] = useState(null);
  const [blockLoading, setBlockLoading] = useState(false);
  const [blockError, setBlockError] = useState("");

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError("");
    const res = await withMinDelay(fetch(`/api/studios/${slug}/main/engagements`, { cache: "no-store" }));
    setListLoading(false);
    if (!res.ok) { setListError("You don't have access to Engagements in this studio."); return; }
    setList(await res.json());
  }, [slug]);

  useEffect(() => { loadList(); }, [loadList]);
  // No "engagements" live channel of its own — the spine dual-writes on the
  // SAME create paths Sales, Technical and Projects already publish on (a
  // ticket, an RFQ, a quotation, a project opening), so watching those three
  // is watching every way an engagement can change today. Same wiring
  // StudioMain's dashboard uses for the same reason.
  useLiveUpdates(slug, "sales", () => { if (!openId) loadList(); });
  useLiveUpdates(slug, "technical", () => { if (!openId) loadList(); });
  useLiveUpdates(slug, "projects", () => { if (!openId) loadList(); });

  const loadMore = useCallback(async () => {
    if (!list?.nextCursor) return;
    setLoadingMore(true);
    const res = await fetch(`/api/studios/${slug}/main/engagements?cursor=${list.nextCursor}`, { cache: "no-store" });
    setLoadingMore(false);
    if (!res.ok) return;
    const more = await res.json();
    setList((prev) => ({ engagements: [...(prev?.engagements || []), ...more.engagements], nextCursor: more.nextCursor }));
  }, [slug, list?.nextCursor]);

  const openEngagement = useCallback(async (id) => {
    setOpenId(id);
    setBlockLoading(true);
    setBlockError("");
    setBlock(null);
    const res = await withMinDelay(fetch(`/api/studios/${slug}/main/engagements/${id}`, { cache: "no-store" }));
    setBlockLoading(false);
    if (!res.ok) {
      setBlockError(res.status === 404 ? "This engagement no longer exists." : "You can no longer see this engagement.");
      return;
    }
    setBlock((await res.json()).engagement);
  }, [slug]);

  const closeEngagement = () => { setOpenId(""); setBlock(null); setBlockError(""); };

  return (
    <div className="min-h-screen bg-[var(--geex-page)] text-slate-700 dark:text-slate-300">
      <header className="sticky top-0 z-20 border-b border-[var(--geex-border)] bg-[var(--geex-page)]">
        <div className="mx-auto flex max-w-[1100px] items-center gap-3 px-5 py-4 sm:px-8">
          <Link
            href={openId ? `/${slug}/engagements` : `/${slug}`}
            onClick={openId ? (e) => { e.preventDefault(); closeEngagement(); } : undefined}
            title={openId ? "Back to Engagements" : "Back to the studio"}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--geex-surface)] text-slate-600 shadow-geex-sm transition-colors hover:text-brand-600 dark:text-slate-300"
          >
            <Icon name="arrowLeft" className="h-[18px] w-[18px] rtl:-scale-x-100" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-800 text-slate-900 dark:text-white sm:text-2xl">
              {openId ? (block?.ref || "Engagement") : "Engagements"}
            </h1>
            <p className="truncate text-xs text-slate-400 dark:text-slate-500">
              {openId ? "One deal, every stage you may see" : (list ? `${list.engagements.length} deal${list.engagements.length === 1 ? "" : "s"}` : "loading")}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-5 py-8 sm:px-8">
        {openId
          ? <EngagementDetail slug={slug} block={block} loading={blockLoading} error={blockError} />
          : (
            <EngagementList
              list={list}
              loading={listLoading}
              error={listError}
              loadingMore={loadingMore}
              onOpen={openEngagement}
              onLoadMore={loadMore}
            />
          )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// THE LIST — ref, client, title, and a badge per stage that exists. The
// badges are where "enter from any stage" becomes visible: a deal that began
// at a quotation simply has no ticket badge (design §8).
function EngagementList({ list, loading, error, loadingMore, onOpen, onLoadMore }) {
  if (error) {
    return (
      <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
        {error}
      </p>
    );
  }

  if (loading && !list) return <ListSkeleton />;

  const rows = list?.engagements || [];
  const hasMore = list?.nextCursor != null;

  // listEngagements takes 25 raw ids off the index and only THEN drops the
  // ones the viewer can see no stage of, so a page can legitimately come
  // back with zero visible rows while more pages remain — e.g. a
  // Finance-only member whose newest 25 deals all happen to have no invoice
  // yet. Zero rows only means "nothing more to fetch" when nextCursor is
  // also null; otherwise it is a page-level result, and "Load more" is the
  // only way to reach the deals that ARE visible further down the index.
  if (rows.length === 0 && !hasMore) {
    return (
      <div className={`${panel} text-center`}>
        <p className="font-display text-base font-700 text-slate-900 dark:text-white">Nothing here yet</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
          A deal appears here the moment it starts anywhere in the studio — a ticket, an RFQ, or a
          quotation raised on its own.
        </p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className={`${panel} text-center`}>
        <p className="font-display text-base font-700 text-slate-900 dark:text-white">No engagements you can see on this page</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
          More deals may be further down the list — this page just did not have any you have access to.
        </p>
        <div className="mt-4">
          <button type="button" className={btnGhost} disabled={loadingMore} onClick={onLoadMore}>
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${panel} overflow-x-auto p-0`}>
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200/70 text-start dark:border-white/10">
            <th scope="col" className="whitespace-nowrap px-4 py-3 text-start text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Ref</th>
            <th scope="col" className="whitespace-nowrap px-4 py-3 text-start text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Client</th>
            <th scope="col" className="px-4 py-3 text-start text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Title</th>
            <th scope="col" className="whitespace-nowrap px-4 py-3 text-start text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Stages</th>
            <th scope="col" className="whitespace-nowrap px-4 py-3 text-start text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Started</th>
            <th scope="col" className="w-10 px-2 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              tabIndex={0}
              role="button"
              aria-label={`Open ${row.title || row.clientName || row.ref}`}
              onClick={() => onOpen(row.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(row.id); } }}
              className="cursor-pointer border-b border-slate-100 outline-none last:border-0 hover:bg-slate-50 focus-visible:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5 dark:focus-visible:bg-white/5"
            >
              <td className="num whitespace-nowrap px-4 py-3 text-slate-900 dark:text-white">{row.ref || "—"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-300">{row.clientName || "—"}</td>
              <td className="max-w-[260px] truncate px-4 py-3 text-slate-700 dark:text-slate-300">{row.title || "—"}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {row.stages.map((type) => <StageBadge key={type} type={type} />)}
                </div>
              </td>
              <td className="num whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">{fmtDate(row.createdAt)}</td>
              <td className="px-2 py-3 text-end">
                <Icon name="chevronRight" className="ms-auto h-4 w-4 text-slate-300 rtl:-scale-x-100 dark:text-slate-600" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {hasMore && (
        <div className="border-t border-slate-100 p-4 text-center dark:border-white/5">
          <button type="button" className={btnGhost} disabled={loadingMore} onClick={onLoadMore}>
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}

function StageBadge({ type }) {
  const label = STAGE_REGISTRY[type]?.label || type;
  return (
    <span
      title={label}
      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-600 text-slate-600 dark:bg-white/5 dark:text-slate-300"
    >
      <Icon name={STAGE_ICON[type] || "dot"} className="h-3 w-3" />
      {label}
    </span>
  );
}

// A skeleton shaped like the table it replaces — same header row, same
// column count, same row height — so the real table lands where this one
// stood rather than shoving the page open (house style: a skeleton reserves
// the box). `.skel` already carries aria-busy's visual cue and stops
// sweeping under prefers-reduced-motion (globals.css); aria-busy is set here
// because that state belongs to the region, not to the utility class.
function ListSkeleton() {
  return (
    <div className={`${panel} overflow-hidden p-0`} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading engagements</span>
      <div className="flex items-center gap-4 border-b border-slate-200/70 px-4 py-3 dark:border-white/10">
        {["w-16", "w-24", "flex-1", "w-32", "w-20"].map((w, i) => (
          <span key={i} className={`skel skel-text block h-3 ${w}`} />
        ))}
      </div>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-slate-100 px-4 py-4 last:border-0 dark:border-white/5">
          <span className="skel skel-text block h-3 w-16" />
          <span className="skel skel-text block h-3 w-24" />
          <span className="skel skel-text block h-3 flex-1" />
          <span className="skel block h-5 w-20 rounded-full" />
          <span className="skel skel-text block h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// THE BLOCK — a context header plus one card per stage. A stage that exists
// shows its reference and one-line summary, linking to that record's own
// department screen (its section, the only place today that carries a
// permalink for it — engagementBlock does not yet emit a per-record `href`,
// see StageCard in modules/main/engagements.ts). A stage that does not exist
// renders as an OPTIONAL NEXT STEP, never as "N/A" or an empty row. A stage
// the viewer may not see is absent entirely — not rendered, not counted, not
// hinted at (design §8, the safety property).
function EngagementDetail({ slug, block, loading, error }) {
  if (error) {
    return (
      <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
        {error}
      </p>
    );
  }

  if (loading || !block) return <DetailSkeleton />;

  const ctx = block.context || {};

  return (
    <div className="space-y-6">
      <section className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className={h2}>{ctx.title || "Untitled deal"}</h2>
            <p className={sub}>{ctx.clientName || "No client on file"}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="num rounded-full bg-slate-100 px-3 py-1 text-xs font-700 text-slate-700 dark:bg-white/5 dark:text-slate-200">
              {block.ref || "—"}
            </span>
            {/* Not StatusPill: the label is derived from whichever stage owns
                it (project stage, ticket status or quotation status — three
                different vocabularies, engagements.ts statusOf()), so there is
                no single `kind` to colour it correctly by. A neutral chip
                names it without implying a colour that might be wrong for
                two of the three sources. */}
            <span className="rounded-full bg-brand-500/10 px-3 py-1 text-xs font-700 text-brand-700 dark:text-brand-300">
              {block.status}
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {(block.cards || []).map((card) => <StageCard key={card.type} slug={slug} card={card} />)}
      </div>
    </div>
  );
}

function StageCard({ slug, card }) {
  const entry = STAGE_REGISTRY[card.type];
  return (
    <div className={panel}>
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400">
          <Icon name={STAGE_ICON[card.type] || "dot"} className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="font-600 text-slate-900 dark:text-white">{card.label}</p>
          {card.present && card.count > 1 && (
            <p className="text-xs text-slate-400 dark:text-slate-500">{card.count} on this deal</p>
          )}
        </div>
      </div>

      {card.present ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            {card.ref && <p className="num truncate text-sm font-700 text-slate-900 dark:text-white">{card.ref}</p>}
            {card.summary && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{card.summary}</p>}
          </div>
          {entry && (
            <Link
              href={`/${slug}/${entry.sectionKey}`}
              className="shrink-0 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-600 text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"
            >
              Open in {entry.label} →
            </Link>
          )}
        </div>
      ) : (
        // OPTIONAL NEXT STEP, not "N/A" and not an empty row — this is the
        // spec's core UX rule (design §8): a stage that has not happened yet
        // reads as an invitation, because it may still.
        <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">
          No {(card.label || "").charAt(0).toLowerCase() + (card.label || "").slice(1)} yet.
        </p>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading engagement</span>
      <div className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="skel skel-text block h-5 w-56" />
            <span className="skel skel-text mt-2 block h-3 w-32" />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="skel block h-6 w-24 rounded-full" />
            <span className="skel block h-6 w-20 rounded-full" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={panel}>
            <div className="flex items-center gap-2.5">
              <span className="skel skel-circle block h-9 w-9 shrink-0" />
              <span className="skel skel-text block h-3 w-24" />
            </div>
            <span className="skel skel-text mt-4 block h-3 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}
