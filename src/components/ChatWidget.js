"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CHAT_TOPICS, chatText } from "@/lib/chatConstants";
import { isWithinWorkingHours } from "@/lib/operations";
import { downloadTranscript } from "@/lib/chatPdf";
import { track } from "@/lib/track";

const STORE = "mta_chat";
const input = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white dark:placeholder:text-slate-500";
function fmtTime(v) { try { return new Date(v).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } }

// Floating website chat widget. Follows the site's theme (light/dark) and
// language (en/ar, RTL). Visitor picks Sales/Support, gives contact details,
// then chats live with a studio agent (~1s polling). Ephemeral — End Chat
// downloads a PDF transcript and closes.
export default function ChatWidget({ locale = "en", schedule = null }) {
  const T = chatText(locale);
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState("topic"); // topic | form | chat
  const [topic, setTopic] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "" });
  const [session, setSession] = useState(null); // { roomId, token }
  const [room, setRoom] = useState({ status: "waiting", agent: null, messages: [] });
  const [events, setEvents] = useState([]); // client-side system lines (e.g. "X joined")
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const threadRef = useRef(null);
  const pollRef = useRef(null);
  const joinedRef = useRef(false);

  // Uses the configured working hours (falls back to the default KSA week).
  const outsideHours = useMemo(() => !isWithinWorkingHours(schedule || {}), [schedule]);

  // Restore an in-progress chat on load.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORE);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s?.roomId && s?.token) { setSession({ roomId: s.roomId, token: s.token }); setTopic(s.topic || ""); if (s.visitor) setForm(s.visitor); setStage("chat"); }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const poll = useCallback(async (s) => {
    if (!s) return;
    try {
      const res = await fetch(`/api/chat/room/${s.roomId}?token=${encodeURIComponent(s.token)}`, { cache: "no-store" });
      if (res.status === 404) { setRoom((r) => ({ ...r, status: "gone" })); return; }
      if (res.ok) {
        const data = await res.json();
        // Announce the agent joining, once.
        if (data.agent?.label && !joinedRef.current) {
          joinedRef.current = true;
          setEvents((e) => [...e, { system: true, text: T.joined(data.agent.label), at: new Date().toISOString() }]);
        }
        setRoom(data);
      }
    } catch { /* ignore */ }
  }, [T]);

  useEffect(() => {
    if (stage !== "chat" || !session) return;
    poll(session);
    pollRef.current = setInterval(() => poll(session), 1500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [stage, session, poll]);

  const thread = useMemo(
    () => [...(room.messages || []).map((m) => ({ ...m })), ...events].sort((a, b) => (a.at || "").localeCompare(b.at || "")),
    [room.messages, events]
  );
  useEffect(() => { if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight; }, [thread.length]);

  async function start() {
    setError("");
    const { name, email, phone, company } = form;
    if (!name.trim() || !email.trim() || !phone.trim() || !company.trim()) return setError(T.allRequired);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError(T.invalidEmail);
    setBusy(true);
    try {
      const preset = T.topics[topic]?.preset || "";
      const res = await fetch("/api/chat/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, visitor: form, preset }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start chat.");
      const s = { roomId: data.roomId, token: data.token };
      joinedRef.current = false; setEvents([]);
      setSession(s); setStage("chat");
      sessionStorage.setItem(STORE, JSON.stringify({ ...s, topic, visitor: form }));
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function send() {
    const t = text.trim();
    if (!t || !session) return;
    setText("");
    try {
      await fetch(`/api/chat/room/${session.roomId}/message`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: t, token: session.token }) });
      await poll(session);
    } catch { setError("Could not send."); }
  }

  async function endChat() {
    if (!session) { reset(); return; }
    setBusy(true);
    try {
      await downloadTranscript({ topic, visitor: form, agentLabel: room.agent?.label, messages: room.messages, createdAt: room.createdAt });
      await fetch(`/api/chat/room/${session.roomId}/end`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: session.token }) });
    } catch { /* still reset */ }
    finally { setBusy(false); reset(); }
  }

  function reset() {
    if (pollRef.current) clearInterval(pollRef.current);
    joinedRef.current = false;
    sessionStorage.removeItem(STORE);
    setSession(null); setRoom({ status: "waiting", agent: null, messages: [] }); setEvents([]);
    setForm({ name: "", email: "", phone: "", company: "" }); setTopic(""); setStage("topic"); setText(""); setError("");
  }

  const ended = room.status === "ended" || room.status === "gone";
  const subtitle = stage === "chat"
    ? (room.agent?.label ? T.connected(room.agent.label) : ended ? T.chatEnded : T.connecting)
    : T.help;

  return (
    <div className="fixed bottom-5 end-5 z-[100] flex flex-col items-end gap-3 print:hidden">
      {open && (
        <div className="flex h-[30rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#20202c]">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 bg-brand-800 px-4 py-3 text-white">
            <div className="min-w-0">
              <p className="font-display text-sm font-700">{T.title}</p>
              <p className="truncate text-[11px] text-white/70">{subtitle}</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Minimize" className="rounded-full p-1 text-white/80 hover:bg-white/10">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
            </button>
          </div>

          {/* Out-of-hours notice */}
          {outsideHours && (
            <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-[11px] text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 7v5l3 2" /></svg>
              <span>{T.outsideHours}</span>
            </div>
          )}

          {/* Body */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {stage === "topic" && (
              <div className="space-y-3 p-4">
                <p className="text-sm text-slate-600 dark:text-slate-300">{T.help}</p>
                {CHAT_TOPICS.map((t) => (
                  <button key={t.key} onClick={() => { setTopic(t.key); setStage("form"); setError(""); track("chat_topic", { topic: t.key }); }}
                    className="flex w-full items-start gap-3 rounded-xl border border-slate-200 p-3 text-start transition-colors hover:border-brand-400 hover:bg-brand-500/5 dark:border-white/15 dark:hover:border-brand-500/50">
                    <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                    <span>
                      <span className="block text-sm font-700 text-slate-800 dark:text-slate-100">{T.topics[t.key].label}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">{T.topics[t.key].blurb}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {stage === "form" && (
              <div className="space-y-3 p-4">
                <button onClick={() => setStage("topic")} className="text-xs font-600 text-brand-700 hover:underline dark:text-brand-300">{T.back}</button>
                <p className="text-sm text-slate-600 dark:text-slate-300">{T.detailsIntro(T.topics[topic]?.label || "")}</p>
                {["name", "company", "email", "phone"].map((f) => (
                  <input key={f} className={input} placeholder={T.fields[f]}
                    type={f === "email" ? "email" : f === "phone" ? "tel" : "text"} value={form[f]} onChange={(e) => setForm((s) => ({ ...s, [f]: e.target.value }))} />
                ))}
                {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
                <button onClick={start} disabled={busy} className="w-full rounded-full bg-brand-700 px-4 py-2.5 text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60">{busy ? T.starting : T.start}</button>
              </div>
            )}

            {stage === "chat" && (
              <div ref={threadRef} className="space-y-2.5 p-4">
                {thread.map((m, i) => {
                  if (m.system) return <p key={i} className="py-1 text-center text-[11px] font-600 text-slate-500 dark:text-slate-400">{m.text}</p>;
                  const mine = m.from === "visitor";
                  return (
                    <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${mine ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-slate-100"}`}>
                        <p className="whitespace-pre-wrap break-words">{m.text}</p>
                        <p className={`mt-0.5 text-[10px] ${mine ? "text-white/70" : "text-slate-400"}`}>{fmtTime(m.at)}</p>
                      </div>
                    </div>
                  );
                })}
                {!room.agent && !ended && (
                  <div className="flex items-center justify-center gap-2 py-3 text-xs text-slate-500 dark:text-slate-400">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" /></svg>
                    {T.waiting}
                  </div>
                )}
                {ended && <p className="text-center text-xs text-slate-400">{T.ended}</p>}
              </div>
            )}
          </div>

          {/* Footer */}
          {stage === "chat" && (
            <div className="border-t border-slate-100 p-2.5 dark:border-white/10">
              {!ended ? (
                <>
                  <div className="flex items-end gap-2">
                    <textarea rows={1} className={`${input} resize-none py-2`} placeholder={T.typeMsg} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
                    <button onClick={send} disabled={!text.trim()} aria-label="Send" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white hover:bg-brand-950 disabled:opacity-50">
                      <svg viewBox="0 0 24 24" className="h-4 w-4 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h16M13 6l6 6-6 6" /></svg>
                    </button>
                  </div>
                  <button onClick={endChat} disabled={busy} className="mt-2 w-full text-center text-[11px] font-600 text-red-600 hover:underline disabled:opacity-60 dark:text-red-400">{T.endDownload}</button>
                </>
              ) : (
                <button onClick={endChat} className="w-full rounded-full bg-brand-700 px-4 py-2 text-sm font-600 text-white hover:bg-brand-950">{T.downloadClose}</button>
              )}
            </div>
          )}
        </div>
      )}

      <button onClick={() => { if (!open) track("chat_open"); setOpen((o) => !o); }} aria-label="Chat with us"
        className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-white shadow-xl transition-transform hover:scale-105 hover:bg-brand-950">
        {open ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        )}
      </button>
    </div>
  );
}
