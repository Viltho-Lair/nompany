"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHead, CardBody, Badge, Icon, SkeletonText, toneBg, toneInk } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";

// WHERE THIS CONSOLE IS SIGNED IN.
//
// The Security tab on settings/profile has shown three sessions since it was
// built — "Chrome · Windows 11", "Safari · iPhone 16", "Firefox · macOS" — and
// all three are a hardcoded array in the page file. That is worse than showing
// nothing: a list of sessions that is not the sessions reads as reassurance, and
// the one thing somebody opens this screen to find out is whether there is a row
// they do not recognise.
//
// These are the real ones, from the digests superAuth has kept all along.

const fmt = (ms) => (ms ? new Date(ms).toLocaleString("en-GB", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
}) : "—");

export default function SessionsCard() {
  const router = useRouter();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [ending, setEnding] = useState("");

  const load = useCallback(async (alive = { current: true }) => {
    try {
      const res = await fetch("/api/super/sessions", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (alive.current) setRows(data.sessions || []);
    } catch {
      if (alive.current) { setRows([]); setError("Couldn't load sessions."); }
    }
  }, []);

  useEffect(() => {
    const alive = { current: true };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(alive);
    return () => { alive.current = false; };
  }, [load]);

  async function end(tokenHash) {
    if (ending) return;
    setEnding(tokenHash);
    setError("");
    try {
      const res = await fetch("/api/super/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenHash }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError("Couldn't end that session."); setEnding(""); return; }

      // ENDING THE ONE YOU ARE ON IS JUST SIGNING OUT, and leaving somebody on a
      // console they no longer have a session for would strand them on a screen
      // whose next request 401s.
      if (data.wasCurrent) { router.replace(BASE); router.refresh(); return; }

      setEnding("");
      await load();
    } catch {
      setError("Couldn't reach the server.");
      setEnding("");
    }
  }

  return (
    <Card>
      <CardHead
        title="Active sessions"
        sub="Every browser currently signed in to this console."
        action={rows ? <Badge tone="info">{rows.length}</Badge> : null}
      />
      <CardBody>
        {rows === null ? <SkeletonText lines={3} /> : null}

        {rows && rows.length === 0 ? (
          <p className="text-sm opacity-70">No active sessions.</p>
        ) : null}

        {rows && rows.length ? (
          <ul className="flex flex-col divide-y divide-slate-200/70 dark:divide-white/10">
            {rows.map((s) => (
              <li key={s.tokenHash} className="flex items-center gap-3 py-3">
                <Icon name="monitor" className="h-4 w-4 shrink-0 opacity-60" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="truncate font-600">{s.label}</span>
                    {s.current ? <Badge tone="success">This browser</Badge> : null}
                  </div>
                  <div className="mt-0.5 text-xs opacity-60">
                    {s.location ? `${s.location} · ` : ""}
                    Signed in {fmt(s.createdAt)} · expires {fmt(s.expiresAt)}
                  </div>
                </div>
                <button
                  type="button"
                  className="ad-btn ad-btn-ghost ad-btn-sm"
                  onClick={() => end(s.tokenHash)}
                  disabled={Boolean(ending)}
                >
                  {ending === s.tokenHash ? "Ending…" : s.current ? "Sign out" : "End"}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-md px-3 py-2.5 text-sm"
            style={{ backgroundColor: toneBg("danger", 0.12), color: toneInk("danger") }}
          >
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {/* A CONSOLE SESSION LASTS A WORKING DAY and is never "remembered" —
            said here because a list of expiry times invites the question, and
            the answer is a deliberate choice rather than a default. */}
        <p className="mt-4 text-xs opacity-60">
          Console sessions last 12 hours and are never remembered across days.
        </p>
      </CardBody>
    </Card>
  );
}
