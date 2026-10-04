"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Icon } from "@/components/studio2/icons";
import { panel, microLabel } from "@/components/studio2/ui";
import { mainDict } from "@/shared/studio/main";
import { useStudioLocale as useLocale } from "@/components/studio2/locale";

// FINISH SETTING UP — the first-run checklist (modules/main/firstRun). The
// server sends it only to somebody who can act on it and only while something
// is left, so this draws whatever it is given.
//
// HIDING IS THE VIEWER'S OWN CONVENIENCE, kept in their browser per studio and
// wrapped in try/catch: a private window or blocked storage simply shows the
// list again, which is the safe answer. Nothing is stored on the studio — the
// items tick themselves from what the studio holds.
// Read through useSyncExternalStore: the server and the first browser render
// both answer "hidden" (no storage there), so nothing flashes and hydration
// matches; a Hide in this tab tells the store to read again.
const HIDE_EVENT = "nompany:finish-setup-hidden";
const subscribe = (fn) => { window.addEventListener(HIDE_EVENT, fn); return () => window.removeEventListener(HIDE_EVENT, fn); };

export default function FinishSetup({ slug, items }) {
  const tr = mainDict(useLocale());
  const key = `nompany:finish-setup-hidden:${slug}`;
  const hidden = useSyncExternalStore(
    subscribe,
    () => { try { return window.localStorage.getItem(key) === "1"; } catch { return false; /* storage refused: show it */ } },
    () => true,
  );

  if (!Array.isArray(items) || !items.length || hidden) return null;
  const done = items.filter((i) => i.done).length;

  function hide() {
    try { window.localStorage.setItem(key, "1"); } catch { /* nothing to remember it in */ }
    window.dispatchEvent(new Event(HIDE_EVENT));
  }

  return (
    <section className={panel} aria-labelledby="finish-setup-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p id="finish-setup-title" className={microLabel}>{tr.setupTitle}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{tr.setupLead(done, items.length)}</p>
        </div>
        <button type="button" onClick={hide} className="shrink-0 text-xs font-600 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
          {tr.setupHide}
        </button>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map((item) => {
          const words = tr.setupItems[item.key];
          if (!words) return null;
          return (
            <li key={item.key}>
              <Link href={item.href}
                className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 ${
                  item.done
                    ? "border-emerald-200/70 bg-emerald-50/50 dark:border-emerald-500/20 dark:bg-emerald-500/5"
                    : "border-slate-200/70 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"}`}>
                <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  item.done ? "bg-emerald-500 text-white" : "border border-slate-300 dark:border-white/20"}`} aria-hidden="true">
                  {item.done && <Icon name="checkBold" className="h-3 w-3" />}
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm font-600 ${item.done ? "text-slate-500 line-through dark:text-slate-400" : "text-slate-900 dark:text-white"}`}>{words.title}</span>
                  {!item.done && <span className="block text-xs text-slate-500 dark:text-slate-400">{words.hint}</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
