"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/studio2/icons";
import { useLive } from "@/components/studio2/LiveProvider";
import { useInbox } from "@/components/notifications/InboxProvider";
import NoticeRow from "@/components/notifications/NoticeRow";
import { shellDict } from "@/shared/studio/shell";
import { inboxDict } from "@/shared/studio/inbox";
import { groupNotices } from "@/shared/notificationInbox";

// The studio's bell.
//
// WHAT IT SHOWS IS THE INBOX'S (components/notifications/InboxProvider): the
// first page, the count, the reads. The bell used to fetch and count on its
// own, and so did Nova's dot, on a timer — two answers to one question. The
// full history is the notification page, one link away.
//
// It also shows the CONNECTION. There is no polling fallback behind this any
// more, so if the stream cannot be established — a proxy that will not pass
// text/event-stream, an expired session — the boards quietly stop updating.
// Quietly is the problem: someone would keep reading a stale screen believing
// it was current. The dot next to the bell is small, but it is the difference
// between "nothing is happening" and "you are not being told what happens".

// How many rows the dropdown draws. The page holds the rest.
const SHOWN = 15;

export default function NotificationBell({ slug, locale = "en" }) {
  // The bell is part of the header, so it reads from the shell's dictionary
  // rather than owning one — it is the same chrome, in the same language.
  const tr = shellDict(locale);
  const ti = inboxDict(locale);
  const live = useLive();
  const inbox = useInbox();
  const [open, setOpen] = useState(false);
  const panel = useRef(null);

  const status = live?.status;
  const unread = inbox?.unread || 0;
  // REPEATS COLLAPSE (shared/notificationInbox): the same notice arriving
  // several times in a day is one row with a count, not a wall of copies.
  const groups = groupNotices(inbox?.rows || []).slice(0, SHOWN);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!panel.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("click", close);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("click", close); window.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div className="relative" ref={panel} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={unread ? tr.notificationsUnread(unread) : tr.notifications}
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
            title={tr.offlineTitle}
          />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-geex bg-[var(--geex-surface)] shadow-geex"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/5">
            <span className="text-sm font-700 text-slate-900 dark:text-white">{tr.notifications}</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => inbox?.markRead([])}
                className="text-xs font-600 text-brand-600 hover:underline dark:text-brand-400"
              >
                {tr.markAllRead}
              </button>
            )}
          </div>

          {status === "offline" && (
            <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              {tr.offlineBanner}
            </p>
          )}

          <ul className="max-h-96 overflow-y-auto">
            {groups.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                {inbox?.loaded ? tr.nothingYet : tr.loading}
              </li>
            ) : (
              groups.map((g) => (
                <li key={g.id}>
                  <NoticeRow
                    slug={slug}
                    locale={locale}
                    notice={g}
                    templates={inbox?.templates}
                    onOpen={() => {
                      // READING ONE IS WHAT MARKS IT READ — every copy it
                      // stands for, since the group is one notice to the reader.
                      if (g.anyUnread) inbox?.markRead(g.ids);
                      setOpen(false);
                    }}
                  />
                </li>
              ))
            )}
          </ul>

          <Link
            href={`/${slug}/notifications`}
            onClick={() => setOpen(false)}
            className="block border-t border-slate-100 px-4 py-2.5 text-center text-xs font-600 text-brand-600 hover:bg-slate-50 dark:border-white/5 dark:text-brand-400 dark:hover:bg-white/5"
          >
            {ti.seeAll}
          </Link>
        </div>
      )}
    </div>
  );
}
