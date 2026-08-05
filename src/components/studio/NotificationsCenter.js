"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/studio/icons";
import { useLivePoll } from "@/lib/useLivePoll";
import { KIND_ICON, KIND_LABEL, NOTIFICATION_KINDS } from "@/lib/notifications";

const card = "rounded-geex border border-slate-200/70 bg-white shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]";
const btnGhost = "inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";

function fmtRelative(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  try { return new Date(iso).toLocaleDateString("en-GB"); } catch { return ""; }
}

export default function NotificationsCenter() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all"); // "all" | "unread"
  const [kind, setKind] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const data = res.ok ? await res.json() : { items: [], unread: 0 };
      setItems(Array.isArray(data.items) ? data.items : []);
      setUnread(Number(data.unread) || 0);
    } finally { if (!silent) setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useLivePoll(() => load(true), 20000);

  async function markRead(ids) {
    await fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ids === "all" ? { all: true } : { ids }) }).catch(() => {});
    await load(true);
  }

  const filtered = useMemo(() => items.filter((n) => (tab === "unread" ? !n.read : true) && (kind ? n.kind === kind : true)), [items, tab, kind]);
  const kindsPresent = useMemo(() => NOTIFICATION_KINDS.filter((k) => items.some((n) => n.kind === k.key)), [items]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {unread > 0 ? <><span className="font-700 text-slate-700 dark:text-slate-200">{unread}</span> unread</> : "You're all caught up."}
        </p>
        <div className="flex items-center gap-2">
          <Link href="/studio/notifications/settings" className={btnGhost}><Icon name="gear" className="h-4 w-4" /> Settings</Link>
          <button onClick={() => markRead("all")} disabled={unread === 0} className="inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2 text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-50"><Icon name="checkDouble" className="h-4 w-4" /> Mark all as read</button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full border border-slate-200 p-1 dark:border-white/15">
          {[["all", "All"], ["unread", "Unread"]].map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)} className={`rounded-full px-4 py-1.5 text-sm font-600 transition-colors ${tab === v ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"}`}>{l}</button>
          ))}
        </div>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-brand-500 focus:outline-none dark:border-white/15 dark:bg-[#191921] dark:text-slate-100">
          <option value="">All types</option>
          {kindsPresent.map((k) => (<option key={k.key} value={k.key}>{k.label}</option>))}
        </select>
      </div>

      <div className={`${card} overflow-hidden`}>
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">{items.length === 0 ? "No notifications yet." : "Nothing matches this filter."}</div>
        ) : (
          <ul className="divide-y divide-slate-50 dark:divide-white/5">
            {filtered.map((it) => {
              const isUnread = !it.read;
              return (
                <li key={it.id} className={`flex items-start gap-3 px-5 py-4 ${isUnread ? "bg-brand-500/[0.04] dark:bg-brand-500/[0.06]" : ""}`}>
                  <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isUnread ? "bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400" : "bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500"}`}>
                    <Icon name={KIND_ICON[it.kind] || "dot"} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${isUnread ? "font-600 text-slate-800 dark:text-slate-100" : "text-slate-600 dark:text-slate-300"}`}>{it.label}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{KIND_LABEL[it.kind] || it.kind} · {fmtRelative(it.createdAt)} · {it.actorUserId || "System"}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {isUnread && <button onClick={() => markRead([it.id])} title="Mark as read" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-white/10 dark:hover:text-brand-400"><Icon name="check" className="h-4 w-4" /></button>}
                    {it.href && <Link href={it.href} onClick={() => markRead([it.id])} title="Open" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-700 hover:bg-brand-500/10 dark:text-brand-300"><Icon name="arrowRight" className="h-4 w-4" /></Link>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
