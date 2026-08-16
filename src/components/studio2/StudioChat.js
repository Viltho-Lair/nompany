"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/studio2/icons";
import { downloadTranscript } from "@/lib/chatTranscript";
import {
  ROOM_POLL_MS, SUPPORT_LABEL, NOMPANY, ENDED, GONE, WAITING, fmtTime,
} from "@/lib/chatConstants";

// LIVE CHAT WITH NOMPANY — the floating widget, and the only place in the
// product where a studio can reach us in the moment.
//
// WHERE IT IS: inside StudioFrame, so it rides along with every studio screen
// and appears NOWHERE else. The account hub and the public site do not render
// the studio chrome, so neither can grow a chat button by accident.
//
// WHO GETS IT: every package except Free. The caller passes `enabled` and this
// returns null without it — but that is presentation only. /api/chat/start
// re-checks the plan, because a hidden button is not a permission.
//
// WHAT IT KEEPS: the room id, in localStorage, so a reload (or a second tab)
// walks back into the same conversation. Not the messages — those live in the
// room until it expires, and nowhere after that.

const STORE_PREFIX = "nompany.chat.";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 " +
  "focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 " +
  "dark:border-white/15 dark:bg-[#191921] dark:text-white dark:placeholder:text-slate-500";

// What the disabled button says on hover. One sentence, in the words the
// person needs: what happened, and when it stops being true.
const EXHAUSTED_MESSAGE = "You have consumed all tickets for this month.";

export default function StudioChat({ enabled, slug, studioName, userName, unlimited = true, allowed = 0, used = 0, remaining = null, exhausted = false }) {
  const [open, setOpen] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [room, setRoom] = useState(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const threadRef = useRef(null);
  const joinedRef = useRef(false);
  // System lines ("someone joined") are CLIENT-SIDE. They are not part of the
  // conversation and must not end up in the transcript as if somebody said them.
  const [events, setEvents] = useState([]);

  const storeKey = `${STORE_PREFIX}${slug}`;

  // Walk back into a conversation left open in this browser. The id alone
  // authorises nothing — the API binds the room to the signed-in user — so the
  // worst a stale one can do is 404 and clear itself.
  useEffect(() => {
    if (!enabled) return;
    try {
      const saved = window.localStorage.getItem(storeKey);
      if (saved) setRoomId(saved);
    } catch { /* private mode, no resume; the chat still works */ }
  }, [enabled, storeKey]);

  const forget = useCallback(() => {
    try { window.localStorage.removeItem(storeKey); } catch { /* nothing to forget */ }
  }, [storeKey]);

  const remember = useCallback((id) => {
    try { window.localStorage.setItem(storeKey, id); } catch { /* resume is a convenience */ }
  }, [storeKey]);

  const poll = useCallback(async (id) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/chat/room/${id}`, { cache: "no-store" });
      if (res.status === 404) {
        // The TTL elapsed, or it was ended long enough ago. Not an error — it is
        // the system doing exactly what it promises.
        setRoom((cur) => (cur ? { ...cur, status: GONE } : { status: GONE, messages: [] }));
        forget();
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setRoom(data.room);
    } catch {
      // Offline or navigating away. The next tick catches up; a background poll
      // that missed is not worth a message.
    }
  }, [forget]);

  // Polling costs are managed with THREE switches rather than one, because
  // "only poll while open" would mean someone who minimised the widget never
  // learns their chat was answered:
  //
  //  • No room, or a finished one → nothing to ask about, so nothing is asked.
  //  • Minimised → a slow heartbeat, enough to raise the unread dot below.
  //  • Hidden tab → nothing at all, and it catches up the moment it is shown.
  useEffect(() => {
    if (!roomId) return undefined;
    if (room?.status === ENDED || room?.status === GONE) return undefined;

    let alive = true;
    const every = open ? ROOM_POLL_MS : ROOM_POLL_MS * 6;
    const tick = () => { if (alive && !document.hidden) poll(roomId); };
    tick();
    const timer = setInterval(tick, every);
    document.addEventListener("visibilitychange", tick);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [open, roomId, room?.status, poll]);

  // Unread only means "arrived while you weren't looking". Reading the thread
  // is what clears it, so opening the panel sets the mark to whatever is there
  // now rather than to zero.
  const seenRef = useRef(0);
  const [unread, setUnread] = useState(0);
  const inbound = (room?.messages || []).filter((m) => m.from === NOMPANY).length;
  useEffect(() => {
    if (open) {
      seenRef.current = inbound;
      setUnread(0);
    } else {
      setUnread(Math.max(0, inbound - seenRef.current));
    }
  }, [open, inbound]);

  // Announce the join once, the moment somebody picks the chat up.
  useEffect(() => {
    if (room?.agent?.label && !joinedRef.current) {
      joinedRef.current = true;
      setEvents((e) => [...e, { system: true, at: new Date().toISOString(), text: `${room.agent.label} joined the chat` }]);
    }
  }, [room?.agent?.label]);

  const thread = useMemo(() => {
    const messages = (room?.messages || []).map((m) => ({ ...m }));
    return [...messages, ...events].sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")));
  }, [room?.messages, events]);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [thread.length]);

  async function start() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/chat/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error === "plan" ? "Live chat is not part of this studio's package." : "Could not start the chat.");
      joinedRef.current = Boolean(data.room?.agent);
      setEvents([]);
      setRoom(data.room);
      setRoomId(data.room.id);
      remember(data.room.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    const body = text.trim();
    if (!body || !roomId) return;
    setText("");
    try {
      const res = await fetch(`/api/chat/room/${roomId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: body }),
      });
      if (res.ok) {
        const data = await res.json();
        setRoom(data.room);
      } else {
        // Put it back in the box rather than losing what they typed.
        setText(body);
        setError("That didn't send. Try again.");
      }
    } catch {
      setText(body);
      setError("That didn't send. Try again.");
    }
  }

  async function download() {
    await downloadTranscript({
      id: roomId,
      studioName,
      studioSlug: slug,
      userName: room?.userName || userName,
      handledBy: room?.agent?.label || "",
      messages: room?.messages || [],
      createdAt: room?.createdAt,
    });
  }

  async function endChat() {
    if (!roomId) return reset();
    setBusy(true);
    try {
      // Downloaded FIRST. Once the room is ended it has minutes to live, and a
      // failed request afterwards must not be what costs someone their record.
      await download();
      await fetch(`/api/chat/room/${roomId}/end`, { method: "POST" });
    } catch {
      /* end anyway — the room expires on its own regardless */
    } finally {
      setBusy(false);
      reset();
    }
  }

  function reset() {
    forget();
    joinedRef.current = false;
    setRoomId("");
    setRoom(null);
    setEvents([]);
    setText("");
    setError("");
  }

  if (!enabled) return null;

  // Only the START of a conversation costs a ticket, so a chat already open
  // stays usable even once the allowance is gone.
  const spent = exhausted && !open && !room;
  const allowanceHint = unlimited
    ? "Chat with nompany"
    : `Chat with nompany · ${remaining} of ${allowed} left this month`;

  const status = room?.status || "";
  const done = status === ENDED || status === GONE;
  const subtitle = !room
    ? "We usually reply in a few minutes"
    : done
      ? "Chat ended"
      : room.agent?.label
        ? `Connected · ${room.agent.label}`
        : "Waiting for someone to join…";

  return (
    <div className="fixed bottom-5 end-5 z-40 flex flex-col items-end gap-3 print:hidden">
      {open && (
        <div className="flex h-[30rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-geex bg-[var(--geex-surface)] shadow-geex">
          <div className="flex items-center justify-between gap-2 bg-brand-950 px-4 py-3 text-white dark:bg-brand-500/20">
            <div className="min-w-0">
              <p className="font-display text-sm font-700">{SUPPORT_LABEL}</p>
              <p className="truncate text-[11px] text-white/70">{subtitle}</p>
            </div>
            {/* THE COUNT, where the decision is made. Somebody about to start a
                conversation is the person who needs to know how many are left,
                and finding out only when the button goes flat is finding out
                too late. Hidden on an unlimited package: "∞ left" is noise. */}
            {!unlimited && (
              <span
                title={`${used} of ${allowed} used this month`}
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-700 ${
                  remaining === 0 ? "bg-rose-500/25 text-white" : "bg-white/15 text-white/90"
                }`}
              >
                {remaining} / {allowed} left
              </span>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Minimise chat"
              className="rounded-full p-1 text-white/80 hover:bg-white/10"
            >
              <Icon name="chevronDown" className="h-5 w-5" />
            </button>
          </div>

          <div ref={threadRef} className="min-h-0 flex-1 overflow-y-auto">
            {!room ? (
              <div className="space-y-4 p-5">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Start a chat with the nompany team about {studioName}.
                </p>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-white/10 dark:bg-[#191921]">
                  <p className="text-slate-500 dark:text-slate-400">You&apos;ll be shown to us as</p>
                  <p className="mt-1 font-600 text-slate-800 dark:text-slate-100">{userName}</p>
                  <p className="text-slate-500 dark:text-slate-400">{studioName}</p>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Chats aren&apos;t stored. When you&apos;re done you can download the transcript — after that
                  it&apos;s gone from our side too.
                </p>
                {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
                <button
                  type="button"
                  onClick={start}
                  disabled={busy}
                  className="w-full rounded-full bg-brand-700 px-4 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60"
                >
                  {busy ? "Starting…" : "Start chat"}
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 p-4">
                {thread.map((m, i) => {
                  if (m.system) {
                    return (
                      <p key={i} className="py-1 text-center text-[11px] font-600 text-slate-500 dark:text-slate-400">
                        {m.text}
                      </p>
                    );
                  }
                  const mine = m.from !== NOMPANY;
                  return (
                    <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                          mine
                            ? "bg-brand-600 text-white"
                            : "bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-slate-100"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.text}</p>
                        <p className={`mt-0.5 text-[10px] ${mine ? "text-white/70" : "text-slate-400"}`}>{fmtTime(m.at)}</p>
                      </div>
                    </div>
                  );
                })}
                {status === WAITING && (
                  <p className="py-3 text-center text-xs text-slate-500 dark:text-slate-400">
                    Waiting for someone from nompany to join. You can start describing the problem now.
                  </p>
                )}
                {done && <p className="pt-2 text-center text-xs text-slate-400">This chat has ended.</p>}
                {error && <p className="pt-2 text-center text-xs text-rose-600 dark:text-rose-400">{error}</p>}
              </div>
            )}
          </div>

          {room && (
            <div className="border-t border-[var(--geex-border)] p-2.5">
              {!done ? (
                <>
                  <div className="flex items-end gap-2">
                    <textarea
                      rows={1}
                      className={`${inputClass} resize-none py-2`}
                      placeholder="Type a message…"
                      value={text}
                      aria-label="Message"
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                      }}
                    />
                    <button
                      type="button"
                      onClick={send}
                      disabled={!text.trim()}
                      aria-label="Send"
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white hover:bg-brand-950 disabled:opacity-50"
                    >
                      <Icon name="send" className="h-4 w-4 rtl:-scale-x-100" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 px-1">
                    <button
                      type="button"
                      onClick={download}
                      className="inline-flex items-center gap-1.5 text-[11px] font-600 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      <Icon name="download" className="h-3.5 w-3.5" />
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={endChat}
                      disabled={busy}
                      className="text-[11px] font-600 text-rose-600 hover:underline disabled:opacity-60 dark:text-rose-400"
                    >
                      End chat &amp; download
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={download}
                    className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-600 text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"
                  >
                    Download transcript
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="flex-1 rounded-full bg-brand-700 px-4 py-2 text-sm font-600 text-white hover:bg-brand-950"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SPENT, NOT GONE. When the month's allowance runs out the button stays
          where it is and goes flat, with the reason on hover — a button that
          disappears leaves somebody hunting for what they did wrong. An open
          conversation is never cut off: only STARTING one is what costs a
          ticket, so `exhausted` cannot close a chat already in progress. */}
      <button
        type="button"
        onClick={() => { if (!spent) setOpen((o) => !o); }}
        disabled={spent}
        aria-disabled={spent}
        aria-label={
          spent ? EXHAUSTED_MESSAGE
            : open ? "Minimise chat"
            : unread > 0 ? `Chat with nompany, ${unread} new message${unread === 1 ? "" : "s"}` : "Chat with nompany"
        }
        title={spent ? EXHAUSTED_MESSAGE : allowanceHint}
        className={`relative inline-flex h-14 w-14 items-center justify-center rounded-full text-white shadow-geex transition-transform ${
          spent
            ? "cursor-not-allowed bg-slate-400 dark:bg-slate-600"
            : "bg-brand-700 hover:scale-105 hover:bg-brand-950"
        }`}
      >
        <Icon name={open ? "close" : "chat"} className="h-6 w-6" />
        {!open && unread > 0 && (
          <span
            className="absolute -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-700 text-white ring-2 ring-[var(--geex-page)] ltr:-right-0.5 rtl:-left-0.5"
            aria-hidden="true"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </div>
  );
}
