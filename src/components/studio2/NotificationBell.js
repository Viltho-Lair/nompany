"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/studio2/icons";
import { useLive } from "@/components/studio2/LiveProvider";
import { ago } from "@/lib/format";
import { shellDict } from "@/shared/studio/shell";

// The studio's bell.
//
// Two sources, on purpose. The REST call answers "what was already waiting when
// I arrived" — a fresh page load has streamed nothing yet, and an unread count
// built only from what arrived since the tab opened would reset on every
// reload. The stream then adds whatever comes in while the tab stays open.
//
// It also shows the CONNECTION. There is no polling fallback behind this any
// more, so if the stream cannot be established — a proxy that will not pass
// text/event-stream, an expired session — the boards quietly stop updating.
// Quietly is the problem: someone would keep reading a stale screen believing
// it was current. The dot next to the bell is small, but it is the difference
// between "nothing is happening" and "you are not being told what happens".

const TONE = {
  primary: "bg-brand-500/10 text-brand-600 dark:text-brand-400",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  danger: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export default function NotificationBell({ slug, locale = "en" }) {
  // The bell is part of the header, so it reads from the shell's dictionary
  // rather than owning one — it is the same chrome, in the same language.
  const t = shellDict(locale);
  const live = useLive();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const panel = useRef(null);

  const streamed = live?.notifications;
  const status = live?.status;

  // What was already waiting. Re-fetched when the stream (re)connects, because
  // a reconnect is exactly the moment we may have missed something.
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/studios/${slug}/notifications`, { cache: "no-store" });
      if (!res.ok) return;
      const out = await res.json();
      setRows(Array.isArray(out.notifications) ? out.notifications : []);
      setLoaded(true);
    } catch {
      // Offline or navigating away. The bell keeps whatever it had; the next
      // reconnect tries again.
    }
  }, [slug]);

  useEffect(() => {
    if (status === "live") load();
  }, [status, load]);

  // Merge the streamed arrivals into the fetched list, newest first, without
  // letting a notification appear twice when both sources carry it.
  const merged = [];
  const seen = new Set();
  for (const n of [...(streamed || []), ...rows]) {
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    merged.push(n);
  }
  merged.sort((a, b) => String(b.at).localeCompare(String(a.at)));

  const unread = merged.filter((n) => !n.readAt).length;

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!panel.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("click", close);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("click", close); window.removeEventListener("keydown", onKey); };
  }, [open]);

  // MARK READ, OPTIMISTICALLY, for one notification or for all of them.
  //
  // `ids` empty means "all mine" — the same contract the PATCH route has always
  // had. It took a list from the first day and nothing ever passed one, so
  // clicking a notification opened it and left it unread: the bell rendered a
  // dot beside something the person had plainly just read, and the only way to
  // clear it was the button that clears everything.
  //
  // Optimistic because the count is the whole point of the thing. It goes down
  // on the click rather than after a round trip, and the load() at the end
  // reconciles whatever the server actually did.
  const markRead = useCallback(async (ids) => {
    const at = new Date().toISOString();
    const wanted = ids?.length ? new Set(ids) : null;
    const applied = (prev) => prev.map((n) => (
      n.readAt || (wanted && !wanted.has(n.id)) ? n : { ...n, readAt: at }
    ));

    setRows(applied);
    live?.setNotifications?.(applied);
    try {
      await fetch(`/api/studios/${slug}/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids?.length ? { ids } : {}),
      });
    } catch {
      // The optimistic state stands; the next load() reconciles it.
    }
    load();
  }, [slug, live, load]);

  return (
    <div className="relative" ref={panel} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={unread ? t.notificationsUnread(unread) : t.notifications}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--geex-surface)] text-slate-600 shadow-geex-sm transition-shadow hover:ring-2 hover:ring-brand-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 dark:text-slate-300"
      >
        <Icon name="bell" className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[9px] font-700 text-white ltr:-right-0.5 rtl:-left-0.5">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
        {/* Not live, and not merely reconnecting: the boards are not updating
            and the person looking at them deserves to know. */}
        {status === "offline" && (
          <span
            className="absolute bottom-0 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-[var(--geex-surface)] ltr:right-0 rtl:left-0"
            title={t.offlineTitle}
          />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 z-50 mt-2 w-80 overflow-hidden rounded-geex bg-[var(--geex-surface)] shadow-geex"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/5">
            <span className="text-sm font-700 text-slate-900 dark:text-white">{t.notifications}</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => unread && markRead([])}
                className="text-xs font-600 text-brand-600 hover:underline dark:text-brand-400"
              >
                {t.markAllRead}
              </button>
            )}
          </div>

          {status === "offline" && (
            <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              {t.offlineBanner}
            </p>
          )}

          <ul className="max-h-96 overflow-y-auto">
            {merged.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                {loaded ? t.nothingYet : t.loading}
              </li>
            ) : (
              merged.slice(0, 30).map((n) => {
                const body = (
                  <>
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TONE[n.tone] || TONE.primary}`}
                    >
                      <Icon name="bell" className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-600 text-slate-800 dark:text-slate-100">{n.title}</span>
                      {n.body && (
                        <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{n.body}</span>
                      )}
                      <span className="mt-1 block text-[11px] text-slate-400 dark:text-slate-500">{ago(n.at)}</span>
                    </span>
                    {!n.readAt && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                  </>
                );
                const cls = `flex w-full gap-3 px-4 py-3 text-start hover:bg-slate-50 dark:hover:bg-white/5 ${
                  n.readAt ? "" : "bg-brand-500/[.04]"
                }`;
                // READING ONE IS WHAT MARKS IT READ. Both branches do it: a
                // notification with nowhere to go is still one you have now
                // seen, and leaving it unread means the count outlives the
                // thing it was counting.
                const read = () => { if (!n.readAt) markRead([n.id]); };

                // Stored hrefs are studio-relative, so the address is built here
                // from the slug this tab is actually on — a studio that gets
                // renamed does not strand its own old notifications.
                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link
                        href={`/${slug}/${n.href}`}
                        className={cls}
                        onClick={() => { read(); setOpen(false); }}
                      >
                        {body}
                      </Link>
                    ) : (
                      // A BUTTON, NOT A DIV. It does something now — it clears
                      // itself — so it has to be reachable from the keyboard
                      // like every other control in this list.
                      <button type="button" className={cls} onClick={read}>
                        {body}
                      </button>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
