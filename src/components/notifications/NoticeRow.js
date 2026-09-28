"use client";

import Link from "next/link";
import { Icon } from "@/components/studio2/icons";
import { ago } from "@/lib/format";
import { renderNotice } from "@/modules/administration/notices";
import { kindOf } from "@/shared/notificationKinds";
import { inboxDict } from "@/shared/studio/inbox";

// ONE NOTICE, AS THE BELL AND THE NOTIFICATION PAGE BOTH DRAW IT — one
// component, so the two can never show the same notice two ways.
//
// THE ICON SAYS WHAT KIND OF THING IT IS (shared/notificationKinds) and the
// colour says how much it matters (the producer's `tone`). Every row used to
// wear the same bell, so an approval waiting on you and a stock item running
// low were told apart only by reading them.
//
// THE WORDS ARE CHOSEN HERE, not by whatever produced the row: `renderNotice`
// renders the reader's language and the studio's own wording, and falls back
// to the stored sentence for rows written before templates existed and for
// `system` notices, which have no fixed sentence to translate.

const TONE = {
  primary: "bg-brand-500/10 text-brand-600 dark:text-brand-400",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  danger: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export default function NoticeRow({ slug, locale = "en", notice: n, templates, onOpen, actions = null }) {
  const ti = inboxDict(locale);
  const words = renderNotice(n, locale, templates);
  const unread = n.anyUnread ?? !n.readAt;
  const count = n.count || 1;

  const body = (
    <>
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TONE[n.tone] || TONE.primary}`}>
        <Icon name={kindOf(n.type).icon} className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-600 text-slate-800 dark:text-slate-100">
          {words.title}
          {count > 1 && (
            <span className="ms-2 rounded-full bg-slate-100 px-1.5 py-0.5 align-middle text-[10px] font-600 text-slate-500 dark:bg-white/10 dark:text-slate-300">
              {ti.times(count)}
            </span>
          )}
        </span>
        {words.body && <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{words.body}</span>}
        <span className="mt-1 block text-[11px] text-slate-400 dark:text-slate-500">{ago(n.at)}</span>
      </span>
      {unread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />}
    </>
  );
  const cls = "flex min-w-0 flex-1 gap-3 px-4 py-3 text-start hover:bg-slate-50 dark:hover:bg-white/5";

  // Stored hrefs are studio-relative, so the address is built here from the
  // slug this tab is actually on — a studio that gets renamed does not strand
  // its own old notifications.
  return (
    // THE UNREAD TINT IS THE WHOLE ROW'S, actions included — on the link alone
    // it stopped short of the page's Mark read / Archive buttons.
    <div className={`flex items-stretch ${unread ? "bg-brand-500/[.04]" : ""}`}>
      {n.href ? (
        <Link href={`/${slug}/${n.href}`} className={cls} onClick={onOpen}>{body}</Link>
      ) : (
        // A BUTTON, NOT A DIV. It does something — it clears itself — so it has
        // to be reachable from the keyboard like every other control here.
        <button type="button" className={cls} onClick={onOpen}>{body}</button>
      )}
      {actions}
    </div>
  );
}
