"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useInbox } from "@/components/notifications/InboxProvider";
import NoticeRow from "@/components/notifications/NoticeRow";
import { useReload } from "@/components/studio2/useReload";
import { useStudioLocale } from "@/components/studio2/locale";
import { inboxDict } from "@/shared/studio/inbox";
import { NOTICE_CATEGORIES } from "@/shared/notificationKinds";
import { groupNotices } from "@/shared/notificationInbox";

// THE NOTIFICATION CENTRE — /<slug>/notifications.
//
// The bell shows the newest fifteen; this is the whole ninety days, a page at
// a time, filterable by state (inbox, unread, archived) and by category. It
// fetches its OWN pages, because a filtered, paged list is a different
// question from the bell's first page — and after anything it changes it asks
// the inbox to reload, so the bell and the tab title follow at once.
//
// NOT A SECTION, like Engagements: it has no right of its own, because a
// person's notifications are addressed to them and to nobody else. Membership
// is the whole gate, and the route reads by the caller's own collaborator id.

const VIEWS = ["inbox", "unread", "archived"];

export default function StudioNotifications({ slug }) {
  const locale = useStudioLocale();
  const ti = inboxDict(locale);
  const inbox = useInbox();
  const [view, setView] = useState("inbox");
  const [category, setCategory] = useState("");
  const [rows, setRows] = useState([]);
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const query = useCallback((after = "") => {
    const qs = new URLSearchParams({ limit: "30" });
    if (after) qs.set("after", after);
    if (view === "unread") qs.set("unread", "1");
    if (view === "archived") qs.set("archived", "1");
    if (category) qs.set("category", category);
    return `/api/studios/${slug}/notifications?${qs}`;
  }, [slug, view, category]);

  const fetchPage = useCallback(async (after = "") => {
    setBusy(true);
    try {
      const res = await fetch(query(after), { cache: "no-store" });
      if (!res.ok) return;
      const out = await res.json();
      const got = Array.isArray(out.notifications) ? out.notifications : [];
      setRows((prev) => (after ? [...prev, ...got] : got));
      setNext(out.next || "");
      setLoaded(true);
    } catch {
      // Offline: keep what is on screen.
    } finally {
      setBusy(false);
    }
  }, [query]);

  // A new filter starts from the top.
  const firstPage = useCallback(() => fetchPage(""), [fetchPage]);
  useReload(firstPage);

  // A new notice arriving on the stream (the inbox's first page changing)
  // refreshes the top page too, so the centre is as live as the bell — but
  // only while nothing has been paged in, so reading page three is never
  // yanked back to page one.
  const newest = inbox?.rows?.[0]?.id || "";
  const paged = useRef(false);
  useEffect(() => { paged.current = rows.length > 30; }, [rows]);
  const seenNewest = useRef(newest);
  useEffect(() => {
    if (newest === seenNewest.current) return;
    seenNewest.current = newest;
    if (!paged.current) fetchPage("");
  }, [newest, fetchPage]);

  const act = useCallback(async (fn) => {
    await fn();
    await fetchPage("");
  }, [fetchPage]);

  // Opening a notice reads it here at once, as the bell does; the inbox writes
  // it and moves the count.
  const openGroup = useCallback((g) => {
    if (!g.anyUnread) return;
    const at = new Date().toISOString();
    const ids = new Set(g.ids);
    setRows((prev) => prev.map((n) => (ids.has(n.id) && !n.readAt ? { ...n, readAt: at } : n)));
    inbox?.markRead(g.ids);
  }, [inbox]);

  const groups = groupNotices(rows);
  const empty = view === "unread" ? ti.emptyUnread : view === "archived" ? ti.emptyArchived : ti.empty;
  const chip = (on) => `rounded-full px-3 py-1 text-xs font-600 transition-colors ${
    on ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15"
  }`;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-700 text-slate-900 dark:text-white">{ti.title}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{ti.lead}</p>
        </div>
        {view !== "archived" && (inbox?.unread || 0) > 0 && (
          <button
            type="button"
            onClick={() => act(() => inbox.markRead([]))}
            className="rounded-full bg-brand-600 px-4 py-2 text-xs font-600 text-white hover:bg-brand-700"
          >
            {ti.markAllRead}
          </button>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-2" role="tablist">
        {VIEWS.map((v) => (
          <button key={v} type="button" role="tab" aria-selected={view === v} className={chip(view === v)} onClick={() => setView(v)}>
            {ti[v]}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className={chip(!category)} onClick={() => setCategory("")}>{ti.all}</button>
        {NOTICE_CATEGORIES.map((c) => (
          <button key={c} type="button" className={chip(category === c)} onClick={() => setCategory(c)}>
            {ti.categories[c]}
          </button>
        ))}
      </div>

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-geex bg-[var(--geex-surface)] shadow-geex-sm dark:divide-white/5">
        {groups.length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-500">
            {loaded ? empty : ti.loading}
          </li>
        ) : groups.map((g) => (
          <li key={g.id}>
            <NoticeRow
              slug={slug}
              locale={locale}
              notice={g}
              templates={inbox?.templates}
              onOpen={() => openGroup(g)}
              actions={(
                <div className="flex shrink-0 items-center gap-1 pe-3">
                  {g.anyUnread && view !== "archived" && (
                    <button type="button" className="rounded-md px-2 py-1 text-xs font-600 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
                      onClick={() => act(() => inbox.markRead(g.ids))}>
                      {ti.markRead}
                    </button>
                  )}
                  <button type="button" className="rounded-md px-2 py-1 text-xs font-600 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
                    onClick={() => act(() => inbox.setArchived(g.ids, view !== "archived"))}>
                    {view === "archived" ? ti.unarchive : ti.archive}
                  </button>
                </div>
              )}
            />
          </li>
        ))}
      </ul>

      {next && (
        <div className="mt-4 text-center">
          <button type="button" disabled={busy} onClick={() => fetchPage(next)}
            className="rounded-full bg-slate-100 px-4 py-2 text-xs font-600 text-slate-600 hover:bg-slate-200 disabled:opacity-50 dark:bg-white/10 dark:text-slate-300">
            {busy ? ti.loading : ti.loadMore}
          </button>
        </div>
      )}
      <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">{ti.kept}</p>
    </div>
  );
}
