"use client";

// THE HONEST EMPTY STATE. No grid, no invented events — a screen that renders a
// month full of chips before anything is connected is indistinguishable from a
// working integration, which is exactly how this screen came to be mistaken for
// one (see docs/functionality/calendar.md). This shows the three things an
// operator actually needs: who to share the calendar with, and where to paste
// its id once they have.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHead, CardBody, Icon } from "../../../_components/ui";

function Step({ n, children }) {
  return (
    <li className="flex gap-3">
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-700 text-white"
        style={{ backgroundColor: "var(--ad-primary)" }}
      >
        {n}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">{children}</div>
    </li>
  );
}

export default function ConnectCalendar({ serviceAccount }) {
  const router = useRouter();
  const [calendarId, setCalendarId] = useState("");
  const [copied, setCopied] = useState(false);

  // DISCOVERY IS OPT-IN, matching the route: `?discover=1` costs a live round
  // trip through STS and IAM Credentials to Google, so it only runs when this
  // button is pressed, never on mount.
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState(false);
  const [calendars, setCalendars] = useState([]);
  const [discoverProblem, setDiscoverProblem] = useState("");

  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  async function copyServiceAccount() {
    try {
      await navigator.clipboard.writeText(serviceAccount);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied (permissions, insecure context); the
      // address is still selectable text right there, so nothing is lost.
    }
  }

  async function discover() {
    setDiscovering(true);
    setDiscoverProblem("");
    try {
      const res = await fetch("/api/super/google-calendar?discover=1", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      setCalendars(Array.isArray(body.calendars) ? body.calendars : []);
      setDiscoverProblem(String(body.problem || ""));
    } catch {
      setDiscoverProblem("Couldn't reach Google.");
    } finally {
      setDiscovering(false);
      setDiscovered(true);
    }
  }

  async function connect(e) {
    e.preventDefault();
    const id = calendarId.trim();
    if (!id || connecting) return;
    setConnecting(true);
    setError("");
    try {
      const res = await fetch("/api/super/google-calendar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendarId: id }),
      });
      if (!res.ok) {
        // GOOGLE'S OWN MESSAGE, VERBATIM. "The API is not enabled", "not
        // shared", "shared with too little access" look identical from this
        // screen otherwise, and each has a different one-line fix.
        const body = await res.json().catch(() => ({}));
        setError(String(body?.detail || body?.error || "Couldn't connect that calendar."));
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't reach the calendar service.");
    } finally {
      setConnecting(false);
    }
  }

  return (
    <Card>
      <CardHead
        title="Connect a Google calendar"
        sub="Read-only. This console can show what's on the calendar — it never creates, edits or cancels anything on it."
      />
      <CardBody>
        <ol className="space-y-6">
          <Step n={1}>
            <p className="text-sm">
              In Google Calendar, share the calendar with this service account, with{" "}
              <strong className="font-600">&ldquo;See all event details&rdquo;</strong> access.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code
                className="min-w-0 flex-1 truncate rounded-md border px-3 py-2 font-mono text-xs"
                style={{ borderColor: "var(--ad-border)", backgroundColor: "rgb(var(--ad-muted-rgb) / 0.6)" }}
              >
                {serviceAccount}
              </code>
              <button type="button" className="ad-icon-btn h-9 w-9 shrink-0" onClick={copyServiceAccount} aria-label="Copy service account address">
                <Icon name="copy" className="h-3.5 w-3.5" />
              </button>
            </div>
            {copied ? <p className="mt-1 text-xs text-[var(--ad-success)]">Copied.</p> : null}
          </Step>

          <Step n={2}>
            <p className="text-sm">
              Make sure the Google Calendar API is enabled on this project. If it isn&apos;t, connecting below will say so.
            </p>
          </Step>

          <Step n={3}>
            <p className="text-sm">Find the calendar&apos;s id (Settings and sharing → Integrate calendar) and connect it.</p>

            <button
              type="button"
              className="ad-btn ad-btn-outline ad-btn-sm mt-3"
              onClick={discover}
              disabled={discovering}
            >
              <Icon name="search" className="h-3.5 w-3.5" /> {discovering ? "Looking up your calendars…" : "Look up my calendars"}
            </button>

            {calendars.length > 0 ? (
              <select
                className="ad-select mt-3"
                defaultValue=""
                onChange={(e) => { if (e.target.value) setCalendarId(e.target.value); }}
              >
                <option value="" disabled>Pick a calendar…</option>
                {calendars.map((c) => (
                  <option key={c.id} value={c.id}>{c.summary || c.id}</option>
                ))}
              </select>
            ) : discovered && discoverProblem ? (
              <p className="mt-2 text-xs text-[var(--ad-muted-foreground)]">
                Couldn&apos;t look up calendars automatically ({discoverProblem}) — paste the id below instead.
              </p>
            ) : discovered ? (
              // AN EMPTY LIST IS NORMAL, not a failure — a calendar shared with a
              // service account routinely never appears in that account's own
              // calendarList, which is exactly why pasting an id is the primary
              // path rather than a fallback.
              <p className="mt-2 text-xs text-[var(--ad-muted-foreground)]">
                Nothing showed up — that&apos;s normal for a calendar shared with a service account. Paste its id below.
              </p>
            ) : null}

            <form onSubmit={connect} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                className="ad-input flex-1"
                placeholder="calendar id, e.g. team@group.calendar.google.com"
                value={calendarId}
                onChange={(e) => setCalendarId(e.target.value)}
              />
              <button type="submit" className="ad-btn ad-btn-primary shrink-0" disabled={connecting || !calendarId.trim()}>
                {connecting ? "Connecting…" : "Connect"}
              </button>
            </form>
            {error ? <p className="mt-2 text-sm text-[var(--ad-destructive)]">{error}</p> : null}
          </Step>
        </ol>
      </CardBody>
    </Card>
  );
}
