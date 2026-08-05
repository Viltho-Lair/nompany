"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/studio/icons";
import { useLivePoll } from "@/lib/useLivePoll";
import { TOPIC_LABEL } from "@/lib/chatConstants";
import { downloadTranscript } from "@/lib/chatPdf";
import { confirmDialog } from "@/lib/appDialog";

const card = "rounded-geex border border-slate-200/70 bg-white shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]";
const input = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white";
const topicBadge = { sales: "bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300", support: "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" };
function fmtTime(v) { try { return new Date(v).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } }

export default function LiveChat() {
  const [lists, setLists] = useState({ waiting: [], mine: [], topics: [] });
  const [activeId, setActiveId] = useState(null);
  const [room, setRoom] = useState(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const threadRef = useRef(null);

  const loadLists = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/rooms", { cache: "no-store" });
      if (res.ok) setLists(await res.json());
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { loadLists(); }, [loadLists]);
  useLivePoll(loadLists, 2500);

  const loadRoom = useCallback(async () => {
    if (!activeId) { setRoom(null); return; }
    try {
      const res = await fetch(`/api/chat/room/${activeId}`, { cache: "no-store" });
      if (res.status === 404) { setRoom((r) => (r ? { ...r, status: "gone" } : r)); return; }
      if (res.ok) setRoom(await res.json());
    } catch { /* ignore */ }
  }, [activeId]);
  useEffect(() => { loadRoom(); }, [loadRoom]);
  useLivePoll(() => { if (activeId) loadRoom(); }, 1500);

  useEffect(() => { if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight; }, [room?.messages?.length]);

  async function accept(id) {
    setError("");
    try {
      const res = await fetch(`/api/chat/room/${id}/accept`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.taken) { setError(`Already taken by ${data.agent || "another user"}.`); await loadLists(); return; }
      if (!res.ok) throw new Error(data.error || "Could not accept.");
      setActiveId(id); await loadLists(); await loadRoom();
    } catch (e) { setError(e.message); }
  }

  async function send() {
    const t = text.trim();
    if (!t || !activeId) return;
    setText("");
    try {
      await fetch(`/api/chat/room/${activeId}/message`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: t }) });
      await loadRoom();
    } catch { setError("Could not send."); }
  }

  async function endChat() {
    if (!activeId || !room) return;
    if (!(await confirmDialog({ title: "End chat", message: "End this chat? A PDF transcript will download and the chat is closed (not stored).", confirmLabel: "End & download" }))) return;
    setBusy(true);
    try {
      await downloadTranscript({ topic: room.topic, visitor: room.visitor, agentLabel: room.agent?.label, messages: room.messages, createdAt: room.createdAt });
      await fetch(`/api/chat/room/${activeId}/end`, { method: "POST" });
      setActiveId(null); setRoom(null); await loadLists();
    } catch (e) { setError(e.message || "Could not end chat."); }
    finally { setBusy(false); }
  }

  const ended = room?.status === "ended" || room?.status === "gone";
  const listRow = (r, mode) => (
    <button key={r.id} onClick={() => (mode === "mine" ? setActiveId(r.id) : accept(r.id))}
      className={`flex w-full items-start gap-3 border-b border-slate-50 p-3 text-start transition-colors last:border-0 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5 ${activeId === r.id ? "bg-brand-500/5" : ""}`}>
      <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-700 ${topicBadge[r.topic] || ""}`}>{r.topic === "sales" ? "Sales" : "Support"}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-600 text-slate-800 dark:text-slate-100">{r.visitor?.name || "Visitor"}{r.visitor?.company ? ` · ${r.visitor.company}` : ""}</span>
        <span className="block truncate text-xs text-slate-400">{r.lastText || "New chat"}</span>
      </span>
      {mode === "waiting" && <span className="shrink-0 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-600 text-white">Accept</span>}
    </button>
  );

  return (
    <div className="-mb-8 flex h-[calc(100vh-8rem)] min-h-[520px] gap-4">
      {/* Left: queues */}
      <div className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto">
        <div className={card}>
          <p className="border-b border-slate-100 px-3 py-2.5 text-xs font-700 uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-slate-400">Waiting {lists.waiting.length > 0 && <span className="ms-1 rounded-full bg-red-500 px-1.5 text-[10px] text-white">{lists.waiting.length}</span>}</p>
          {lists.waiting.length === 0 ? <p className="p-4 text-center text-xs text-slate-400">No waiting chats.</p> : lists.waiting.map((r) => listRow(r, "waiting"))}
        </div>
        <div className={card}>
          <p className="border-b border-slate-100 px-3 py-2.5 text-xs font-700 uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-slate-400">My chats</p>
          {lists.mine.length === 0 ? <p className="p-4 text-center text-xs text-slate-400">No active chats.</p> : lists.mine.map((r) => listRow(r, "mine"))}
        </div>
      </div>

      {/* Right: conversation */}
      <div className={`${card} flex min-w-0 flex-1 flex-col`}>
        {!room ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Select a chat, or accept a waiting one.</div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-white/10">
              <div className="min-w-0">
                <p className="truncate font-display text-base font-700 text-slate-900 dark:text-white">{room.visitor?.name || "Visitor"} <span className={`ms-1 rounded-full px-2 py-0.5 align-middle text-[10px] font-700 ${topicBadge[room.topic] || ""}`}>{TOPIC_LABEL[room.topic]}</span></p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{[room.visitor?.company, room.visitor?.email, room.visitor?.phone].filter(Boolean).join(" · ")}</p>
              </div>
              <button onClick={endChat} disabled={busy} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-red-300 px-4 py-2 text-sm font-600 text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"><Icon name="close" className="h-4 w-4" /> End &amp; download</button>
            </div>
            {error && <p className="px-5 pt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
            <div ref={threadRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
              {(room.messages || []).map((m, i) => {
                const agent = m.from === "agent";
                return (
                  <div key={i} className={`flex ${agent ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${agent ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-slate-100"}`}>
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      <p className={`mt-0.5 text-[10px] ${agent ? "text-white/70" : "text-slate-400"}`}>{fmtTime(m.at)}</p>
                    </div>
                  </div>
                );
              })}
              {ended && <p className="pt-2 text-center text-xs text-slate-400">This chat has ended.</p>}
            </div>
            {!ended && (
              <div className="flex items-end gap-2 border-t border-slate-100 p-3 dark:border-white/10">
                <textarea rows={1} className={`${input} resize-none`} placeholder="Type a reply…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
                <button onClick={send} disabled={!text.trim()} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2.5 text-sm font-600 text-white hover:bg-brand-950 disabled:opacity-50"><Icon name="arrowRight" className="h-4 w-4" /></button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
