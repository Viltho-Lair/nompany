"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/studio2/icons";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { fmtDate } from "@/lib/format";
// The studio's own dialog shell — backdrop, Escape, scroll lock, focus trap,
// portalled to the body. Imported rather than re-rolled: a second confirmation
// dialog with its own idea of how Escape works is how two screens in one
// product start behaving differently.
import { Dialog, stripeOn, stripeOff } from "@/components/studio2/ui";
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
// Row-scale twins of the two buttons above. The destructive one is FILLED and
// rose while everything else on the screen is an outline — the colour is what
// says "this one does not come back", the same way ending a studio is framed in
// StudioSettings. Never used for lock or unlock: putting a deal's safety back on
// is not a destructive act.
const btnRow = "rounded-full border border-slate-200 px-3 py-1.5 font-display text-xs font-600 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";
const btnDanger = "rounded-full bg-rose-600 px-3 py-1.5 font-display text-xs font-600 text-white transition-colors hover:bg-rose-700 disabled:opacity-60";
const btnDangerLg = "rounded-full bg-rose-600 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-rose-700 disabled:opacity-60";
const alertBox = "rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300";

// "1 RFQ", "3 RFQs". Every label in STAGE_REGISTRY is singular ("Sales ticket",
// "Project sheet", "Fixed asset"), so a trailing s is all any of them needs —
// and a plural map for fourteen regular nouns would be a table to keep in step
// with the registry for no gain.
const plural = (label, n) => (n === 1 ? label : `${label}s`);

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
export default function StudioEngagements({ slug, canLock = false, canDelete = false }) {
  const [list, setList] = useState(null); // { engagements, nextCursor } | null while loading
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);

  const [openId, setOpenId] = useState("");
  const [block, setBlock] = useState(null);
  const [blockLoading, setBlockLoading] = useState(false);
  const [blockError, setBlockError] = useState("");

  // Lock and delete failures report HERE and not through `listError`, which
  // replaces the whole table: a refused unlock must not take the list away with
  // it. Cleared at the start of the next attempt.
  const [actionError, setActionError] = useState("");
  const [lockBusyId, setLockBusyId] = useState("");
  // The row a delete has been ASKED about — null until Delete is pressed. The
  // impact request is made by the dialog when it opens, so a list of 25 rows
  // still costs one request; only a deal somebody actually moved to delete
  // costs a second.
  const [pendingDelete, setPendingDelete] = useState(null);

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

  // ONE ROW, PATCHED IN PLACE. The list already edits itself this way for
  // "Load more", so a lock flip and a delete follow the same path rather than
  // refetching the page and losing the rows that were loaded after it.
  const patchRow = useCallback((id, patch) => {
    setList((prev) => (prev ? { ...prev, engagements: prev.engagements.map((r) => (r.id === id ? { ...r, ...patch } : r)) } : prev));
  }, []);

  const dropRow = useCallback((id, message = "") => {
    setPendingDelete(null);
    setActionError(message);
    setList((prev) => (prev ? { ...prev, engagements: prev.engagements.filter((r) => r.id !== id) } : prev));
  }, []);

  // What the delete path calls when the server proves a deal is locked after
  // all. Locking is the SAFE direction, so this is the one place the screen may
  // set the flag without having asked for it.
  const relock = useCallback((id) => patchRow(id, { locked: true }), [patchRow]);

  // THE SERVER'S ANSWER IS WHAT LANDS IN STATE, never the value we asked for.
  // The lock is an interlock, so a row claiming "Unlocked" while the store said
  // otherwise would be showing a Delete button that can only ever 409 — exactly
  // the failure this screen exists to make impossible. Read the same defensive
  // way the route writes it: anything that is not exactly `false` is locked.
  const toggleLock = useCallback(async (id, locked) => {
    setLockBusyId(id);
    setActionError("");
    const res = await fetch(`/api/studios/${slug}/main/engagements/${id}/lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locked }),
    });
    setLockBusyId("");
    if (!res.ok) {
      setActionError(
        res.status === 403 ? "You are not allowed to lock or unlock deals in this studio."
          : res.status === 404 ? "This engagement no longer exists."
            : "That did not go through. Try again.",
      );
      return;
    }
    const done = await res.json();
    patchRow(id, { locked: done.locked !== false });
  }, [slug, patchRow]);

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
              actionError={actionError}
              loadingMore={loadingMore}
              canLock={canLock}
              canDelete={canDelete}
              lockBusyId={lockBusyId}
              onOpen={openEngagement}
              onLoadMore={loadMore}
              onToggleLock={toggleLock}
              onAskDelete={setPendingDelete}
            />
          )}
      </main>

      {/* Mounted only once a delete has been asked for, so the impact request
          inside it happens then and not a moment earlier. Portalled to the body
          by Dialog, so where it sits in this tree is irrelevant to layout. */}
      {pendingDelete && (
        <ConfirmDelete
          slug={slug}
          row={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onDeleted={dropRow}
          onRelocked={relock}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// THE LIST — ref, client, title, and a badge per stage that exists. The
// badges are where "enter from any stage" becomes visible: a deal that began
// at a quotation simply has no ticket badge (design §8).
function EngagementList({
  list, loading, error, actionError, loadingMore,
  canLock, canDelete, lockBusyId, onOpen, onLoadMore, onToggleLock, onAskDelete,
}) {
  if (error) {
    return <p role="alert" className={alertBox}>{error}</p>;
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
    <div className="space-y-4">
      {/* A refused lock or a fired interlock says so ABOVE the table and leaves
          the table standing — the rows are still true, one action on one of
          them was not. */}
      {actionError && <p role="alert" className={alertBox}>{actionError}</p>}

      <div className={`${panel} overflow-x-auto p-0`}>
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200/70 text-start dark:border-white/10">
              <th scope="col" className="whitespace-nowrap px-4 py-3 text-start text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Ref</th>
              <th scope="col" className="whitespace-nowrap px-4 py-3 text-start text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Client</th>
              <th scope="col" className="px-4 py-3 text-start text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Title</th>
              <th scope="col" className="whitespace-nowrap px-4 py-3 text-start text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Stages</th>
              <th scope="col" className="whitespace-nowrap px-4 py-3 text-start text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Started</th>
              <th scope="col" className="whitespace-nowrap px-4 py-3 text-end text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Lock</th>
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
                // The amber stripe down the start edge is the studio's existing
                // "this one wants attention" mark (ui.js stripeOn, the same one
                // Sales puts on a ticket nobody has answered). An unlocked deal
                // is exactly that: the safety is off and it is meant to be put
                // back, so the state is legible down the whole row rather than
                // only in the chip.
                // `last:border-b-0`, not `last:border-0`: the last row drops its
                // DIVIDER, and a variant utility outranks an unprefixed one in
                // Tailwind's output, so the all-sides version silently zeroed
                // the stripe below — the bottom deal in the list was the one
                // row where being unlocked did not show.
                className={`cursor-pointer border-b border-s-4 border-slate-100 outline-none last:border-b-0 hover:bg-slate-50 focus-visible:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5 dark:focus-visible:bg-white/5 ${row.locked ? stripeOff : stripeOn}`}
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
                <td className="whitespace-nowrap px-4 py-3">
                  {/* The ROW is itself a button — it opens the deal — so every
                      control inside it has to stop the click bubbling, or Unlock
                      also navigates and the confirmation Delete exists to raise
                      opens behind a screen change. Stopped once on the wrapper,
                      which covers both buttons and the gap between them; the
                      keydown too, because a button activated with Enter would
                      otherwise fire the row's own Enter handler as well. */}
                  <div
                    className="flex items-center justify-end gap-2"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <LockChip locked={row.locked} />
                    {/* Two separate rights, so a reader may hold one and not the
                        other; a control nobody holds the right for is not drawn
                        at all rather than drawn to 403. The server checks both
                        again — this only decides what is offered. */}
                    {/* NAMED PER ROW. Twenty-five buttons all reading "Unlock"
                        is a list a screen reader cannot navigate, and the
                        visible label has to stay short — which is exactly what
                        aria-label is for. Same reason the row itself carries
                        one. */}
                    {canLock && (
                      <button
                        type="button"
                        className={btnRow}
                        aria-label={`${row.locked ? "Unlock" : "Lock"} ${row.ref || row.title || "this deal"}`}
                        disabled={lockBusyId === row.id}
                        onClick={() => onToggleLock(row.id, !row.locked)}
                      >
                        {lockBusyId === row.id ? "Saving…" : row.locked ? "Unlock" : "Lock"}
                      </button>
                    )}
                    {canDelete && !row.locked && (
                      <button
                        type="button"
                        className={btnDanger}
                        aria-label={`Delete ${row.ref || row.title || "this deal"}`}
                        onClick={() => onAskDelete(row)}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Icon name="trash" className="h-3.5 w-3.5" />
                          Delete
                        </span>
                      </button>
                    )}
                  </div>
                </td>
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
    </div>
  );
}

// LOCKED IS THE DEFAULT AND THE SAFE STATE, and the chip is what says so —
// rather than leaving it to be inferred from which button happens to be
// showing. A reader holding neither right still gets the sentence that explains
// why this deal cannot be touched, and a reader holding both can see the state
// of twenty-five rows without reading twenty-five buttons.
//
// Amber for unlocked, because unlocked is the temporary, unsafe state and amber
// is what this studio already means by "this needs attention" (URGENCY_BADGE,
// the stripe on an unanswered ticket). Deliberately not brand blue: the accent
// says "ours", not "watch this".
function LockChip({ locked }) {
  return (
    <span
      title={locked ? "Locked. Unlock it before it can be deleted." : "The safety is off — this deal can be deleted."}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-600 ${
        locked
          ? "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300"
          : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
      }`}
    >
      <Icon name={locked ? "lock" : "key"} className="h-3 w-3" />
      {locked ? "Locked" : "Unlocked"}
    </span>
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
        {["w-16", "w-24", "flex-1", "w-32", "w-20", "w-24"].map((w, i) => (
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
          <span className="skel block h-6 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// THE CONFIRMATION, WHICH IS THE POINT AND NOT A FORMALITY.
//
// "Are you sure?" is a question nobody can answer, because it does not say what
// is at stake — and what is at stake here is a whole deal: its tickets, RFQs,
// quotations, project, sheets and invoices go with it. So this asks the server
// FIRST (POST to the engagement itself, read-only, "what would deleting this
// destroy?") and then NAMES it: what dies with the deal, and what stays
// standing because it was created somewhere else and merely points here. The
// second list is the half people are actually unsure about.
//
// THE COUNTS ARE THIS READER'S COUNTS. engagementImpact filters every stage
// through the same permission lens the list does, so a stage they may not see
// is absent rather than shown as zero — nothing in this dialog can name a
// record they could not already open on its own department screen.
//
// Cancel is the easy path on purpose: Escape, the backdrop, the header X and a
// button that reads "Keep this deal", against one destructive button that stays
// disabled until a checkbox has been ticked deliberately.
function ConfirmDelete({ slug, row, onCancel, onDeleted, onRelocked }) {
  const [impact, setImpact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  // No point offering the button any more — the deal was re-locked, or this
  // reader's right went away. Distinct from `error`, which can be transient.
  const [halted, setHalted] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await withMinDelay(fetch(`/api/studios/${slug}/main/engagements/${row.id}`, { method: "POST", cache: "no-store" }));
      if (!alive) return;
      setLoading(false);
      if (!res.ok) {
        setHalted(true);
        setError(res.status === 404
          ? "This engagement no longer exists."
          : "Could not work out what deleting this would affect, so it is not safe to offer the button.");
        return;
      }
      const payload = await res.json();
      if (!alive) return;
      setImpact(payload.impact);
      // RE-LOCKED BETWEEN THE LIST BEING DRAWN AND THIS DIALOG OPENING —
      // another tab, another person. Say so now rather than letting somebody
      // read the whole impact, tick the box and then meet a 409.
      if (payload.impact?.locked) {
        setHalted(true);
        setError("This deal has been locked again. Nothing can be deleted until it is unlocked.");
        onRelocked(row.id);
      }
    })();
    return () => { alive = false; };
  }, [slug, row.id, onRelocked]);

  async function remove() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/studios/${slug}/main/engagements/${row.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) { onDeleted(row.id); return; }

    if (res.status === 409) {
      // THE INTERLOCK FIRED, and it is a legitimate outcome rather than a bug:
      // somebody re-locked this deal while the dialog was open. The row behind
      // is re-synced to what the server just proved — never left claiming
      // "Unlocked" — and the button goes, because it would only 409 again.
      setHalted(true);
      onRelocked(row.id);
      setError("This deal was locked again while you were deciding. Nothing was deleted — unlock it again if you still want it gone.");
      return;
    }
    if (res.status === 404) {
      // Already gone. Dropping the row is the honest result, but it is not a
      // deletion this person performed, so it is said rather than celebrated.
      onDeleted(row.id, "That engagement had already been deleted.");
      return;
    }
    setHalted(res.status === 403);
    setError(res.status === 403
      ? "You are no longer allowed to delete this deal."
      : "That did not go through, and nothing was deleted. Try again.");
  }

  const deletes = impact?.deletes || [];
  const survives = impact?.survives || [];
  const total = deletes.reduce((n, s) => n + (s.count || 0), 0);

  return (
    <Dialog
      title={`Delete ${row.ref || "this deal"}?`}
      description={row.title || row.clientName || "This cannot be undone."}
      width="max-w-[560px]"
      onClose={onCancel}
    >
      {loading ? <ImpactSkeleton /> : (
        <div className="space-y-5">
          {error && <p role="alert" className={alertBox}>{error}</p>}

          {impact && (
            <>
              <section>
                <h4 className="text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Deleting this deal deletes
                </h4>
                {deletes.length ? (
                  <ul className="mt-2 space-y-1.5">
                    {deletes.map((s) => (
                      <li key={s.type} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                        <Icon name={STAGE_ICON[s.type] || "dot"} className="h-4 w-4 shrink-0 text-rose-500" />
                        <span className="num font-700">{s.count}</span>
                        <span>{plural(s.label, s.count)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Nothing — there is no work on this deal yet.
                  </p>
                )}
              </section>

              <section>
                <h4 className="text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  What survives
                </h4>
                {survives.length ? (
                  <ul className="mt-2 space-y-1.5">
                    {survives.map((s) => (
                      <li key={s.type} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                        <Icon name={STAGE_ICON[s.type] || "dot"} className="h-4 w-4 shrink-0 text-emerald-500" />
                        <span className="num font-700">{s.count}</span>
                        <span>{plural(s.label, s.count)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  // An empty `survives` is the common case, not an error state:
                  // most deals own everything on them. Saying so is better than
                  // an empty heading, which reads as something failing to load.
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Nothing was borrowed from elsewhere — everything on this deal was raised on it.
                  </p>
                )}
                {/* THE CLIENT IS NOT A STAGE, so engagementImpact names it in
                    neither list. It is also the first thing anybody worries
                    about losing, so it is stated outright rather than left to
                    be inferred from an absence. */}
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  The client stays. A client belongs to the studio, not to one deal.
                </p>
              </section>

              {!halted && (
                <label className="flex items-start gap-2.5 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                  <input
                    type="checkbox"
                    checked={understood}
                    onChange={(e) => setUnderstood(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-rose-600"
                  />
                  <span>
                    I understand {total ? <><span className="num font-700">{total}</span> record{total === 1 ? "" : "s"}</> : "this deal"} will be
                    permanently deleted, and that this cannot be undone.
                  </span>
                </label>
              )}
            </>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {/* Cancel FIRST in reading order and in the tab order, because it
                is the answer somebody should be able to give without aiming. */}
            <button type="button" className={btnGhost} onClick={onCancel}>Keep this deal</button>
            {!halted && (
              <button
                type="button"
                className={btnDangerLg}
                disabled={!understood || busy || !impact}
                onClick={remove}
              >
                {busy ? "Deleting…" : total ? `Delete the deal and ${total} record${total === 1 ? "" : "s"}` : "Delete this deal"}
              </button>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}

// Shaped like the two lists it stands in for — a heading bar and rows of the
// same height — so the dialog does not resize under the pointer when the
// impact lands, which on a dialog whose other button deletes things is worth
// more than the two lines it costs.
function ImpactSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Working out what deleting this would affect</span>
      {[0, 1].map((s) => (
        <div key={s}>
          <span className="skel skel-text block h-3 w-40" />
          <div className="mt-3 space-y-2">
            {[0, 1].map((i) => <span key={i} className="skel skel-text block h-3 w-52" />)}
          </div>
        </div>
      ))}
      <span className="skel block h-10 w-full rounded-xl" />
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
