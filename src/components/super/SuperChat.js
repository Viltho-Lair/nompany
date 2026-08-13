"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, Avatar, Badge, Icon } from "@/app/super/_components/ui";
import { downloadTranscript } from "@/lib/chatTranscript";
import {
  ROOM_POLL_MS, QUEUE_POLL_MS, NOMPANY, SUPPORT_LABEL, ENDED, GONE, fmtTime,
} from "@/lib/chatConstants";

// THE CONSOLE'S SIDE OF A STUDIO CHAT.
//
// Three piles, and the middle one is the whole design:
//
//   Waiting — highlighted, and NOT openable. A waiting row shows who is asking
//             and which studio they are in, and nothing else: reading a
//             conversation you have not committed to is how a chat ends up
//             half-attended by two people and answered by neither. Accept is
//             both the commitment and the key.
//   Mine    — accepted by this admin. Open, readable, answerable.
//   Others  — held by another admin. Listed so the queue tells the truth about
//             what is in flight, named, and with no way in.
//
// Accept is first-wins server-side (an NX claim), so two admins pressing it at
// the same instant produce one holder and one "already taken by …" — the race
// is settled in Redis, not by whichever poll happened to be luckier.
//
// Nothing here is stored. Download is the only way a conversation outlives its
// TTL, and it builds the PDF in this browser from the thread on screen.

const EMPTY = { waiting: [], mine: [], taken: [] };

export default function SuperChat() {
  const [lists, setLists] = useState(EMPTY);
  const [activeId, setActiveId] = useState("");
  const [room, setRoom] = useState(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const threadRef = useRef(null);

  const loadLists = useCallback(async () => {
    try {
      const res = await fetch("/api/super/chat/rooms", { cache: "no-store" });
      if (res.ok) setLists(await res.json());
    } catch { /* a queue poll that missed is not worth a message */ }
  }, []);

  const loadRoom = useCallback(async (id) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/super/chat/rooms/${id}`, { cache: "no-store" });
      if (res.status === 404) {
        // Expired, or ended long enough ago that the grace window closed.
        setRoom((cur) => (cur ? { ...cur, status: GONE } : cur));
        return;
      }
      if (res.ok) setRoom((await res.json()).room);
    } catch { /* same */ }
  }, []);

  // Two loops at two speeds, both idle while the tab is hidden. The queue is
  // the slow one — a chat that has been waiting four seconds has been waiting
  // four seconds either way — and the open thread is the fast one, because it
  // is the half of the conversation somebody is watching.
  useEffect(() => {
    let alive = true;
    const tick = () => { if (alive && !document.hidden) loadLists(); };
    loadLists();
    const timer = setInterval(tick, QUEUE_POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [loadLists]);

  useEffect(() => {
    if (!activeId) { setRoom(null); return undefined; }
    let alive = true;
    const tick = () => { if (alive && !document.hidden) loadRoom(activeId); };
    loadRoom(activeId);
    const timer = setInterval(tick, ROOM_POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [activeId, loadRoom]);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [room?.messages?.length, activeId]);

  async function accept(id) {
    setError("");
    try {
      const res = await fetch(`/api/super/chat/rooms/${id}/accept`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.taken) {
        setError(`Already taken by ${data.adminLabel || "another admin"}.`);
        await loadLists();
        return;
      }
      if (!res.ok) throw new Error("Could not accept that chat.");
      setRoom(data.room);
      setActiveId(id);
      await loadLists();
    } catch (e) {
      setError(e.message);
    }
  }

  async function send(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeId) return;
    setDraft("");
    try {
      const res = await fetch(`/api/super/chat/rooms/${activeId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("That didn't send.");
      setRoom((await res.json()).room);
    } catch (err) {
      setDraft(text);            // never lose what was typed
      setError(err.message);
    }
  }

  async function download() {
    if (!room) return;
    await downloadTranscript({
      id: room.id,
      studioName: room.studioName,
      studioSlug: room.studioSlug,
      userName: room.userName,
      handledBy: room.adminLabel || SUPPORT_LABEL,
      messages: room.messages || [],
      createdAt: room.createdAt,
    });
  }

  async function endChat() {
    if (!activeId || !room) return;
    setBusy(true);
    setError("");
    try {
      // Download BEFORE ending. After this the room has minutes to live, and a
      // failed request afterwards must not be what costs us the record.
      await download();
      await fetch(`/api/super/chat/rooms/${activeId}/end`, { method: "POST" });
      setActiveId("");
      setRoom(null);
      await loadLists();
    } catch {
      setError("Could not end that chat.");
    } finally {
      setBusy(false);
    }
  }

  const done = room?.status === ENDED || room?.status === GONE;
  const total = lists.waiting.length + lists.mine.length + lists.taken.length;

  return (
    <Card className="overflow-hidden">
      <div className="flex h-[calc(100vh-260px)] min-h-[520px]">
        {/* the queue */}
        <div className="hidden w-[320px] shrink-0 flex-col border-e md:flex" style={{ borderColor: "var(--ad-border)" }}>
          <div className="ad-scrollarea flex-1">
            <Section
              label="Waiting"
              count={lists.waiting.length}
              tone="danger"
              empty="No one is waiting."
            >
              {lists.waiting.map((r) => (
                <WaitingRow key={r.id} row={r} onAccept={() => accept(r.id)} />
              ))}
            </Section>

            <Section label="My chats" count={lists.mine.length} empty="You haven't accepted any chats.">
              {lists.mine.map((r) => (
                <OpenRow key={r.id} row={r} active={r.id === activeId} onOpen={() => setActiveId(r.id)} />
              ))}
            </Section>

            {lists.taken.length > 0 && (
              <Section label="With other admins" count={lists.taken.length}>
                {lists.taken.map((r) => (
                  <TakenRow key={r.id} row={r} />
                ))}
              </Section>
            )}
          </div>
        </div>

        {/* the conversation */}
        <div className="flex min-w-0 flex-1 flex-col">
          {!room ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--ad-muted)] text-[var(--ad-muted-foreground)]">
                <Icon name="chat" className="h-6 w-6" />
              </span>
              <h6 className="text-base font-semibold">
                {lists.waiting.length > 0 ? "Someone is waiting" : "No chat open"}
              </h6>
              <p className="mt-1 max-w-sm text-sm text-[var(--ad-muted-foreground)]">
                {lists.waiting.length > 0
                  ? "Accept a waiting chat to read it and reply."
                  : total > 0
                    ? "Pick one of your chats on the left."
                    : "Chats opened from a studio land here. Nothing is stored — accept one to read it."}
              </p>
              {error ? <p className="mt-4 text-sm" style={{ color: "var(--ad-destructive)" }}>{error}</p> : null}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b px-5 py-4" style={{ borderColor: "var(--ad-border)" }}>
                <Avatar name={room.studioName || "Studio"} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {room.studioName}
                    <span className="ms-2 font-normal text-[var(--ad-muted-foreground)]">{room.userName}</span>
                  </p>
                  <p className="truncate text-xs text-[var(--ad-muted-foreground)]">
                    {room.studioSlug ? `nompany.com/${room.studioSlug} · ` : ""}
                    <span className="font-mono">{room.id}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={download}
                  className="ad-btn ad-btn-outline ad-btn-sm shrink-0"
                  title="Download this conversation as a PDF"
                >
                  <Icon name="download" className="h-4 w-4" />
                  <span className="hidden sm:inline">Download</span>
                </button>
                {!done ? (
                  <button
                    type="button"
                    onClick={endChat}
                    disabled={busy}
                    className="ad-btn ad-btn-destructive ad-btn-sm shrink-0"
                  >
                    <Icon name="x" className="h-4 w-4" />
                    <span className="hidden sm:inline">End &amp; download</span>
                  </button>
                ) : null}
              </div>

              {error ? (
                <p className="px-5 pt-3 text-xs" style={{ color: "var(--ad-destructive)" }}>{error}</p>
              ) : null}

              <div ref={threadRef} className="ad-scrollarea flex-1 space-y-4 p-5">
                <div className="flex justify-center">
                  <Badge tone="muted">Opened {fmtTime(room.createdAt)} · not stored</Badge>
                </div>
                {(room.messages || []).map((m, i) => {
                  const mine = m.from === NOMPANY;
                  return (
                    <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-[75%]">
                        <div
                          className="rounded-2xl px-4 py-2.5 text-sm"
                          style={
                            mine
                              ? { backgroundColor: "var(--ad-primary)", color: "var(--ad-primary-foreground)" }
                              : { backgroundColor: "var(--ad-muted)" }
                          }
                        >
                          <p className="whitespace-pre-wrap break-words">{m.text}</p>
                        </div>
                        <p className={`mt-1 text-[11px] text-[var(--ad-muted-foreground)] ${mine ? "text-end" : ""}`}>
                          {mine ? "You" : room.userName} · {fmtTime(m.at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {(room.messages || []).length === 0 ? (
                  <p className="pt-4 text-center text-sm text-[var(--ad-muted-foreground)]">
                    Nothing said yet. Say hello.
                  </p>
                ) : null}
                {done ? (
                  <p className="pt-2 text-center text-xs text-[var(--ad-muted-foreground)]">
                    This chat has ended.
                  </p>
                ) : null}
              </div>

              {!done ? (
                <form
                  className="flex items-center gap-2 border-t p-4"
                  style={{ borderColor: "var(--ad-border)" }}
                  onSubmit={send}
                >
                  <input
                    className="ad-input"
                    placeholder="Write a message…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    aria-label="Message"
                  />
                  <button type="submit" className="ad-btn ad-btn-primary shrink-0" aria-label="Send" disabled={!draft.trim()}>
                    <Icon name="send" className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <div className="border-t p-4" style={{ borderColor: "var(--ad-border)" }}>
                  <button type="button" onClick={() => { setActiveId(""); setRoom(null); }} className="ad-btn ad-btn-outline w-full">
                    Close
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ---- queue pieces --------------------------------------------------------- */

function Section({ label, count = 0, tone = "muted", empty, children }) {
  return (
    <div className="border-b" style={{ borderColor: "var(--ad-border)" }}>
      <div className="flex items-center gap-2 px-4 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ad-muted-foreground)]">{label}</span>
        {count > 0 ? <Badge tone={tone} solid={tone !== "muted"}>{count}</Badge> : null}
      </div>
      {count === 0 && empty ? (
        <p className="px-4 pb-4 text-xs text-[var(--ad-muted-foreground)]">{empty}</p>
      ) : (
        <ul>{children}</ul>
      )}
    </div>
  );
}

// A NEW chat. Highlighted, and the only control on it is Accept — there is
// nothing to click through to, because the thread stays shut until it is taken.
function WaitingRow({ row, onAccept }) {
  return (
    <li
      className="flex items-start gap-3 px-4 py-3.5 ltr:border-l-2 rtl:border-r-2"
      style={{ backgroundColor: "rgba(70,128,255,.07)", borderColor: "var(--ad-primary)" }}
    >
      <Avatar name={row.studioName || "Studio"} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{row.studioName}</p>
        <p className="truncate text-xs text-[var(--ad-muted-foreground)]">{row.userName}</p>
        <p className="mt-0.5 truncate font-mono text-[10px] text-[var(--ad-muted-foreground)]">{row.id}</p>
        <button type="button" onClick={onAccept} className="ad-btn ad-btn-primary ad-btn-sm mt-2">
          <Icon name="check" className="h-3.5 w-3.5" />
          Accept
        </button>
      </div>
    </li>
  );
}

function OpenRow({ row, active, onOpen }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-start transition-colors hover:bg-[var(--ad-accent)]"
        style={{ backgroundColor: active ? "var(--ad-accent)" : undefined }}
      >
        <Avatar name={row.studioName || "Studio"} size={40} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium">{row.studioName}</span>
            <span className="shrink-0 text-[11px] text-[var(--ad-muted-foreground)]">{fmtTime(row.lastAt)}</span>
          </span>
          <span className="mt-0.5 block truncate text-xs text-[var(--ad-muted-foreground)]">
            {row.lastText ? `${row.lastFrom === NOMPANY ? "You: " : ""}${row.lastText}` : row.userName}
          </span>
        </span>
      </button>
    </li>
  );
}

function TakenRow({ row }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3 opacity-60">
      <Avatar name={row.studioName || "Studio"} size={32} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{row.studioName}</span>
        <span className="block truncate text-xs text-[var(--ad-muted-foreground)]">
          with {row.adminLabel || "another admin"}
        </span>
      </span>
    </li>
  );
}
