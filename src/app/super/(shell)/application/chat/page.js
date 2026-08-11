"use client";

import { useState } from "react";
import { PageHeader, Card, Avatar, Badge, Icon } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";

const CONVERSATIONS = [
  { id: 1, name: "Lina Haddad", last: "The migration script is ready for review.", time: "12:41", unread: 2, online: true },
  { id: 2, name: "Platform Ops", last: "Omar: node-3 is back under 60% CPU.", time: "11:58", unread: 0, online: true, group: true },
  { id: 3, name: "Omar Nasser", last: "Sent over the reconciliation sheet 👍", time: "10:22", unread: 0, online: false },
  { id: 4, name: "Sara Al-Otaibi", last: "Can we push the Falcon demo to Thursday?", time: "Yesterday", unread: 1, online: true },
  { id: 5, name: "Release Crew", last: "Maya: RTL polish merged into main.", time: "Yesterday", unread: 0, online: false, group: true },
  { id: 6, name: "Yousef Khan", last: "Thanks — closing the ticket now.", time: "Mon", unread: 0, online: false },
];

const THREAD = [
  { from: "them", text: "Morning — the billing migration dry run finished overnight.", time: "09:12" },
  { from: "them", text: "No data loss, but two studios ended up with duplicate line items.", time: "09:12" },
  { from: "me", text: "Which studios?", time: "09:31" },
  { from: "them", text: "Falcon Contracting and Dar Almanar. Both had invoices mid-flight when the cutover ran.", time: "09:33" },
  { from: "me", text: "Makes sense. Let's add a guard that pauses issuance during the window, then re-run for just those two.", time: "09:40" },
  { from: "them", text: "Already drafted it. The migration script is ready for review.", time: "12:41" },
];

export default function ChatPage() {
  const [active, setActive] = useState(1);
  const [draft, setDraft] = useState("");
  const current = CONVERSATIONS.find((c) => c.id === active);

  return (
    <>
      <PageHeader
        title="Chat"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Application" }, { label: "Chat" }]}
      />

      <Card className="overflow-hidden">
        <div className="flex h-[calc(100vh-260px)] min-h-[520px]">
          {/* conversation list */}
          <div className="hidden w-[300px] shrink-0 flex-col border-e md:flex" style={{ borderColor: "var(--ad-border)" }}>
            <div className="border-b p-4" style={{ borderColor: "var(--ad-border)" }}>
              <div className="relative">
                <Icon name="search" className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ad-muted-foreground)] ltr:left-3 rtl:right-3" />
                <input className="ad-input ps-9" placeholder="Search conversations…" aria-label="Search conversations" />
              </div>
            </div>
            <ul className="ad-scrollarea flex-1">
              {CONVERSATIONS.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setActive(c.id)}
                    className="flex w-full items-center gap-3 border-b px-4 py-3.5 text-start transition-colors hover:bg-[var(--ad-accent)]"
                    style={{
                      borderColor: "var(--ad-border)",
                      backgroundColor: c.id === active ? "var(--ad-accent)" : undefined,
                    }}
                  >
                    <span className="relative shrink-0">
                      <Avatar name={c.name} size={40} />
                      {c.online ? (
                        <span
                          className="absolute bottom-0 h-3 w-3 rounded-full ring-2 ltr:right-0 rtl:left-0"
                          style={{ backgroundColor: "var(--ad-success)", boxShadow: "0 0 0 2px var(--ad-card)" }}
                        />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{c.name}</span>
                        <span className="shrink-0 text-[11px] text-[var(--ad-muted-foreground)]">{c.time}</span>
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-[var(--ad-muted-foreground)]">{c.last}</span>
                        {c.unread ? (
                          <span
                            className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                            style={{ backgroundColor: "var(--ad-primary)" }}
                          >
                            {c.unread}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* thread */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-3 border-b px-5 py-4" style={{ borderColor: "var(--ad-border)" }}>
              <Avatar name={current.name} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{current.name}</p>
                <p className="text-xs text-[var(--ad-muted-foreground)]">
                  {current.online ? "Online" : "Last seen 2 hours ago"}
                </p>
              </div>
              <button type="button" className="ad-icon-btn h-9 w-9" aria-label="Call"><Icon name="phone" className="h-4 w-4" /></button>
              <button type="button" className="ad-icon-btn h-9 w-9" aria-label="More"><Icon name="more" className="h-4 w-4" /></button>
            </div>

            <div className="ad-scrollarea flex-1 space-y-4 p-5">
              <div className="flex justify-center">
                <Badge tone="muted">Today</Badge>
              </div>
              {THREAD.map((m, i) => (
                <div key={i} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[75%]">
                    <div
                      className="rounded-2xl px-4 py-2.5 text-sm"
                      style={
                        m.from === "me"
                          ? { backgroundColor: "var(--ad-primary)", color: "var(--ad-primary-foreground)" }
                          : { backgroundColor: "var(--ad-muted)" }
                      }
                    >
                      {m.text}
                    </div>
                    <p className={`mt-1 text-[11px] text-[var(--ad-muted-foreground)] ${m.from === "me" ? "text-end" : ""}`}>
                      {m.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <form
              className="flex items-center gap-2 border-t p-4"
              style={{ borderColor: "var(--ad-border)" }}
              onSubmit={(e) => {
                e.preventDefault();
                setDraft("");
              }}
            >
              <button type="button" className="ad-icon-btn h-10 w-10 shrink-0" aria-label="Attach file">
                <Icon name="link" className="h-4 w-4" />
              </button>
              <input
                className="ad-input"
                placeholder="Write a message…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-label="Message"
              />
              <button type="submit" className="ad-btn ad-btn-primary shrink-0" aria-label="Send">
                <Icon name="send" className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </Card>
    </>
  );
}
