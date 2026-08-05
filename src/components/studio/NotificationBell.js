"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/studio/icons";
import { KIND_ICON } from "@/lib/notifications";

const REFRESH_MS = 20000;

function fmtRelative(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Personal notification bell. Shows only YOUR notifications (assigned to /
// awaiting you), with a real unread count and server-side read state. Polls
// every REFRESH_MS (pauses while the tab is hidden).
export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const timerRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setUnread(Number(data.unread) || 0);
    } catch {
      /* notifications are non-critical; fail silently */
    }
  }, []);

  useEffect(() => {
    load();
    const start = () => { if (!timerRef.current) timerRef.current = setInterval(load, REFRESH_MS); };
    const stop = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    start();
    return () => { document.removeEventListener("visibilitychange", onVis); stop(); };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function markRead(ids) {
    try {
      await fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ids === "all" ? { all: true } : { ids }) });
      await load();
    } catch { /* ignore */ }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--geex-surface)] text-slate-500 shadow-geex-sm transition-colors hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-300"
        aria-label="Notifications"
      >
        <Icon name="bell" className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -end-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-700 text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 z-40 mt-2 w-96 overflow-hidden rounded-geex border border-slate-200/70 bg-white shadow-xl dark:border-white/10 dark:bg-[#191921]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/10">
            <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">Notifications</h3>
            <button
              type="button"
              onClick={() => markRead("all")}
              disabled={unread === 0}
              className="text-[11px] font-600 text-brand-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline dark:text-brand-400 dark:disabled:text-slate-600"
            >
              Mark all as read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-400">You&apos;re all caught up.</p>
            ) : (
              <ul className="divide-y divide-slate-50 dark:divide-white/5">
                {items.map((it) => {
                  const isUnread = !it.read;
                  return (
                    <li key={it.id} className={`relative flex items-start gap-3 px-4 py-3 ${isUnread ? "bg-brand-500/[0.04] dark:bg-brand-500/[0.06]" : ""}`}>
                      {isUnread && <span className="absolute start-2 top-2 h-2 w-2 animate-pulse rounded-full bg-red-500" title="Unread" />}
                      <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${isUnread ? "bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400" : "bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500"}`}>
                        <Icon name={KIND_ICON[it.kind] || "dot"} className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${isUnread ? "font-600 text-slate-800 dark:text-slate-100" : "font-500 text-slate-500 dark:text-slate-400"}`}>{it.label}</p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-400">{fmtRelative(it.createdAt)} · {it.actorUserId || "System"}</span>
                          <div className="flex shrink-0 items-center gap-1">
                            {isUnread && (
                              <button type="button" onClick={() => markRead([it.id])} title="Mark as read" className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-white/10 dark:hover:text-brand-400">
                                <Icon name="check" className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {it.href && (
                              <Link href={it.href} onClick={() => { markRead([it.id]); setOpen(false); }} title="Go to" className="inline-flex h-6 w-6 items-center justify-center rounded-md text-brand-600 hover:bg-brand-500/10 dark:text-brand-400">
                                <Icon name="arrowRight" className="h-4 w-4" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <Link href="/studio/notifications" onClick={() => setOpen(false)} className="block border-t border-slate-100 px-4 py-2.5 text-center text-xs font-600 text-brand-700 hover:bg-brand-500/5 dark:border-white/10 dark:text-brand-300">
            Open Notifications Center
          </Link>
        </div>
      )}
    </div>
  );
}
