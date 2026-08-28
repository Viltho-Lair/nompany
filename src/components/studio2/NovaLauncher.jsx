"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { miscDict } from "@/shared/studio/misc";
import NovaHead from "@/components/studio2/NovaHead";
import { useFocusTrap } from "@/components/studio2/useFocusTrap";

// NOVA, in the studio. A floating launcher and a slide-over chat, shown only
// when the studio's package includes the assistant. Memory is session-only: the
// transcript lives in component state and is sent with each turn, so a refresh
// starts fresh and nothing is stored server-side.
//
// LIBRARY-FREE. The landing mascot draws on motion/react, which the studio chunk
// is fenced from (Gate A). Nova's avatar here is a small static mark and the
// panel slides with a CSS transition — same presence, no library.

// A FUNCTION OF THE DICTIONARY, not a constant: these are the questions Nova
// offers, and at module scope there is no locale to build them from.
const examplesFor = (tr) => [
  tr.exInvoicesOverdue,
  tr.exRemainingLeave,
  tr.exSummariseFinances,
  tr.exTaskBoard,
];

export default function NovaLauncher({ slug, enabled = false, besideChat = false }) {
  const tr = miscDict(useStudioLocale());
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);   // { role: "user"|"assistant", content }
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [attention, setAttention] = useState(0);
  const [pending, setPending] = useState(null);   // an action awaiting the user's Confirm
  const [announce, setAnnounce] = useState("");    // the settled answer, announced once to screen readers
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const launcherRef = useRef(null);
  const titleId = useId();

  // FEEDBACK BY DEFAULT. Even with the chat shut, Nova wears a badge for what is
  // waiting on this person — their unread notifications, the same ones the bell
  // holds — so the head is a live nudge, not just a launcher. Refreshed on open
  // and every couple of minutes while the shell is up.
  useEffect(() => {
    if (!enabled) return undefined;
    let live = true;
    const load = () => fetch(`/api/studios/${slug}/notifications`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (live && d) setAttention((d.notifications || []).filter((n) => !n.readAt).length); })
      .catch(() => {});
    load();
    const t = setInterval(load, 120000);
    return () => { live = false; clearInterval(t); };
  }, [enabled, slug, open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  // Escape closes the panel — a chat you opened is always one key from closed.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Trap Tab within the panel while it is open. The panel focuses its own input
  // above, so the trap leaves that alone and only confines Tab.
  useFocusTrap(panelRef, open);
  // RETURN FOCUS BY HAND, not through the trap. The launcher UNMOUNTS while the
  // panel is open ({!open && <button>}), so the node the trap captured as the
  // opener is detached by close time and focusing it is a no-op — the re-mounted
  // launcher is a different element. Send focus there on the open→closed edge.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) launcherRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  if (!enabled) return null;

  // Reveal an answer as it "writes" — a typewriter, not true token streaming
  // (the answer is already whole), but the same reading rhythm. Instant under
  // reduced-motion. Appends one assistant message and grows its text.
  function typeOut(text) {
    return new Promise((resolve) => {
      const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (reduced || !text) { setMessages((m) => [...m, { role: "assistant", content: text }]); resolve(); return; }
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      let i = 0;
      const chunk = Math.max(2, Math.round(text.length / 80));
      const tick = () => {
        i = Math.min(text.length, i + chunk);
        const slice = text.slice(0, i);
        setMessages((m) => { const c = m.slice(); c[c.length - 1] = { role: "assistant", content: slice }; return c; });
        if (i < text.length) setTimeout(tick, 16); else resolve();
      };
      tick();
    });
  }

  async function send(text) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    const prior = messages;
    setMessages([...prior, { role: "user", content: q }]);
    setInput(""); setBusy(true); setNote(""); setPending(null);
    try {
      const res = await fetch(`/api/studios/${slug}/nova`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: prior, message: q }),
      });
      if (res.status === 503) {
        const d = await res.json().catch(() => null);
        setNote(d?.help || tr.novaNotSetUp);
        setBusy(false); return;
      }
      if (res.status === 403) { setNote(tr.novaNotInPlan); setBusy(false); return; }
      const data = res.ok ? await res.json().catch(() => null) : null;
      const answer = data?.answer || tr.somethingWentWrong;
      setBusy(false);
      await typeOut(answer);
      setAnnounce(answer);   // announce the settled answer once
      if (data?.pendingAction) setPending(data.pendingAction);
      return;
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: tr.couldntReachServer }]);
    }
    setBusy(false);
  }

  // The Confirm click — the ONLY thing that writes. Runs the prepared action
  // through its own permission-checked service; the model never reaches here.
  async function confirmAction() {
    if (!pending || busy) return;
    const action = pending;
    setPending(null); setBusy(true);
    try {
      const res = await fetch(`/api/studios/${slug}/nova/act`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capKey: action.capKey, fields: action.fields }),
      });
      const data = await res.json().catch(() => null);
      const ok = res.ok && data?.ok;
      const msg = ok ? `Done — ${action.label.toLowerCase()}.` : `That didn't go through${data?.error ? ` (${data.error})` : ""}. Nothing was changed.`;
      setBusy(false);
      await typeOut(msg);
      setAnnounce(msg);
      return;
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: tr.couldntReachServerNoChange }]);
    }
    setBusy(false);
  }

  return (
    <>
      {/* The launcher IS Nova — her head, on a soft halo, larger than the chat
          bubble so the two never read as the same control. When live chat shares
          the corner, Nova steps to its left (end-24 clears the ~48px bubble). */}
      {!open && (
        <button
          ref={launcherRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label={tr.askNova}
          className={`group fixed bottom-4 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-xl ring-1 ring-white/40 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${besideChat ? "end-24" : "end-5"}`}
        >
          <NovaHead className="h-12 w-12 drop-shadow" idle />
          {attention > 0 && (
            <span className="absolute -end-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-700 text-white ring-2 ring-white">
              {attention > 9 ? "9+" : attention}
            </span>
          )}
        </button>
      )}

      {/* Backdrop + panel. Rendered only when open so it costs nothing closed. */}
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <button type="button" aria-label={tr.closeNova} className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div ref={panelRef} className="absolute inset-y-0 end-0 flex w-full max-w-[420px] flex-col bg-white shadow-2xl dark:bg-[#14141b]">
            <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-white/10">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400"><NovaHead className="h-7 w-7" /></span>
              <div className="min-w-0">
                <p id={titleId} className="text-sm font-600 text-slate-900 dark:text-white">{tr.nova}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{tr.studioAssistant}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label={tr.close} className="ms-auto rounded-md p-1.5 text-slate-400 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 dark:hover:bg-white/5">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </header>

            {/* Announces the SETTLED answer once — see the transcript note below. */}
            <div aria-live="polite" aria-atomic="true" className="sr-only">{announce}</div>

            {/* The transcript is NOT a live region: the typewriter grows the
                text character by character, and a live region here would make a
                screen reader stutter through every partial state. The settled
                answer is announced once, above, via `announce`. */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.length === 0 && (
                <div className="space-y-3">
                  {attention > 0 && (
                    <button type="button" onClick={() => send(tr.whatNeedsMyAttention)}
                      className="w-full rounded-xl bg-brand-50 px-3 py-2 text-start text-sm text-brand-700 transition-colors hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-200">
                      You have {attention} notification{attention === 1 ? "" : "s"} waiting — ask me what needs your attention.
                    </button>
                  )}
                  <p className="text-sm text-slate-500 dark:text-slate-400">{tr.novaScope}</p>
                  <div className="flex flex-wrap gap-2">
                    {examplesFor(tr).map((e) => (
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
              {pending && !busy && (
                <div className="rounded-2xl border border-brand-200 bg-brand-50 p-3 dark:border-brand-500/30 dark:bg-brand-500/10">
                  <p className="text-xs font-600 uppercase tracking-wide text-brand-600 dark:text-brand-300">{tr.confirm}</p>
                  <p className="mt-1 text-sm text-slate-800 dark:text-slate-100">{pending.preview}</p>
                  <div className="mt-2.5 flex gap-2">
                    <button type="button" onClick={confirmAction}
                      className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-500 text-white">{tr.confirm}</button>
                    <button type="button" onClick={() => setPending(null)}
                      className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5">{tr.cancel}</button>
                  </div>
                </div>
              )}
              {busy && <div className="flex justify-start"><div className="rounded-2xl bg-slate-100 px-3.5 py-2 text-sm text-slate-400 dark:bg-white/5">{tr.novaThinking}</div></div>}
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
                placeholder={tr.askNova2}
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
