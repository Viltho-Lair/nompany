"use client";

import { useEffect, useRef, useState } from "react";

// NOVA, in the studio. A floating launcher and a slide-over chat, shown only
// when the studio's package includes the assistant. Memory is session-only: the
// transcript lives in component state and is sent with each turn, so a refresh
// starts fresh and nothing is stored server-side.
//
// LIBRARY-FREE. The landing mascot draws on motion/react, which the studio chunk
// is fenced from (Gate A). Nova's avatar here is a small static mark and the
// panel slides with a CSS transition — same presence, no library.

const EXAMPLES = [
  "Which invoices are overdue?",
  "What's my remaining leave?",
  "Summarise our finances",
  "What's on my task board?",
];

function NovaMark({ className = "h-5 w-5" }) {
  // A four-point star — a nova. currentColor so it takes the button's ink.
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2c.4 3.9 2.1 5.6 6 6-3.9.4-5.6 2.1-6 6-.4-3.9-2.1-5.6-6-6 3.9-.4 5.6-2.1 6-6z" />
    </svg>
  );
}

export default function NovaLauncher({ slug, enabled = false }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);   // { role: "user"|"assistant", content }
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  if (!enabled) return null;

  async function send(text) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    const prior = messages;
    setMessages([...prior, { role: "user", content: q }]);
    setInput(""); setBusy(true); setNote("");
    try {
      const res = await fetch(`/api/studios/${slug}/nova`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: prior, message: q }),
      });
      if (res.status === 503) { setNote("Nova isn't switched on yet — it still needs setting up."); setBusy(false); return; }
      if (res.status === 403) { setNote("Nova isn't part of this studio's plan."); setBusy(false); return; }
      const data = res.ok ? await res.json().catch(() => null) : null;
      setMessages((m) => [...m, { role: "assistant", content: data?.answer || "Something went wrong — try again." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "I couldn't reach the server. Try again." }]);
    }
    setBusy(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close Nova" : "Ask Nova"}
        aria-expanded={open}
        className="fixed bottom-5 end-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
      >
        <NovaMark className="h-6 w-6" />
      </button>

      {/* Backdrop + panel. Rendered only when open so it costs nothing closed. */}
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Nova">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 end-0 flex w-full max-w-[420px] flex-col bg-white shadow-2xl dark:bg-[#14141b]">
            <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-white/10">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white"><NovaMark /></span>
              <div className="min-w-0">
                <p className="text-sm font-600 text-slate-900 dark:text-white">Nova</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Your studio assistant</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="ms-auto rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </header>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Ask about your studio&apos;s data. Nova only sees what you can.</p>
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLES.map((e) => (
                      <button key={e} type="button" onClick={() => send(e)}
                        className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition-colors hover:border-brand-500 hover:text-brand-600 dark:border-white/15 dark:text-slate-300">
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 text-slate-800 dark:bg-white/5 dark:text-slate-100"}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {busy && <div className="flex justify-start"><div className="rounded-2xl bg-slate-100 px-3.5 py-2 text-sm text-slate-400 dark:bg-white/5">Nova is thinking…</div></div>}
              {note && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{note}</p>}
            </div>

            <form
              className="flex items-end gap-2 border-t border-slate-200 p-3 dark:border-white/10"
              onSubmit={(e) => { e.preventDefault(); send(); }}
            >
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ask Nova…"
                className="max-h-32 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/5 dark:text-white"
              />
              <button type="submit" disabled={busy || !input.trim()}
                className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-500 text-white disabled:opacity-50">
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
