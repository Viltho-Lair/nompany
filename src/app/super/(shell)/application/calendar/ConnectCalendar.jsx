"use client";

// THE HONEST EMPTY STATE. No grid, no invented events — a screen that renders a
// month full of chips before anything is connected is indistinguishable from a
// working integration, which is exactly how this screen came to be mistaken for
// one (see docs/functionality/calendar.md).
//
// IT USED TO BE THREE SETUP STEPS: copy a service account address, share the
// calendar with it in Google Calendar, then paste the calendar's id back here.
// None of that survives OAuth — the console presses Connect, consents as a
// Google account, and picks from that account's own calendars. Pasting an id
// is gone too, and deliberately: it existed because a calendar shared with a
// service account routinely never appeared in that account's calendarList, so
// the dropdown could not be trusted to be complete. An account's grant over its
// own calendars has no such gap.

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHead, CardBody, Icon } from "../../../_components/ui";
import CopyableCode from "@/components/CopyableCode";

// What the OAuth callback appends to this screen's URL on its way back.
const OUTCOMES = {
  cancelled: "Connecting was cancelled — nothing was changed.",
  error: "Google didn't complete the connection. Try again.",
};

export default function ConnectCalendar({ configured, connected, accountEmail }) {
  const router = useRouter();
  const outcome = useSearchParams().get("calendar");

  const [calendars, setCalendars] = useState([]);
  const [calendarId, setCalendarId] = useState("");
  const [loading, setLoading] = useState(connected);
  const [problem, setProblem] = useState("");
  const [choosing, setChoosing] = useState(false);
  const [error, setError] = useState("");
  // THE EXACT STRING GOOGLE WILL COMPARE, byte for byte — computed by the
  // route (route.ts, consoleCalendarRedirectUri) from THIS request rather
  // than guessed at in this file, so it is right whether the console is
  // served on the bare domain or a `www` in front of it. Fetched below
  // unconditionally (not gated on `connected`) because it is needed BEFORE a
  // connection exists: it is what an operator registers to make one possible.
  const [redirectUri, setRedirectUri] = useState("");

  // NO setState BEFORE THE FIRST `await` — the effect below calls this
  // directly, and everything up to a function's first `await` runs
  // synchronously; a setState there is the cascading-render pattern the lint
  // rule warns about. The fetch is the first statement, so nothing runs
  // synchronously at all. (Same note as CalendarBoard's `load`.)
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/super/google-calendar", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      setCalendars(Array.isArray(body.calendars) ? body.calendars : []);
      setProblem(String(body.problem || ""));
      setRedirectUri(String(body.redirectUri || ""));
    } catch {
      setProblem("Couldn't reach the calendar service.");
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  async function choose(e) {
    e.preventDefault();
    if (!calendarId || choosing) return;
    setChoosing(true);
    setError("");
    try {
      const res = await fetch("/api/super/google-calendar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendarId }),
      });
      if (!res.ok) {
        // GOOGLE'S OWN MESSAGE, VERBATIM. "The API is not enabled", "that
        // calendar is gone" and "the grant was revoked" look identical from
        // this screen otherwise, and each has a different one-line fix. The
        // route reports every failure on the Google path with a `detail`, so
        // an empty body should not happen — the status fallback is a
        // diagnosable dead end if some future hole reopens it.
        const body = await res.json().catch(() => ({}));
        setError(String(body?.detail || body?.error || `Couldn't use that calendar (HTTP ${res.status}).`));
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't reach the calendar service.");
    } finally {
      setChoosing(false);
    }
  }

  async function disconnect() {
    setChoosing(true);
    await fetch("/api/super/google-calendar", { method: "DELETE" });
    setChoosing(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHead
        title={connected ? "Choose a calendar" : "Connect a Google calendar"}
        sub="Read-only. This console can show what's on the calendar — it never creates, edits or cancels anything on it."
      />
      <CardBody>
        {OUTCOMES[outcome] ? (
          <p className="mb-4 text-sm text-[var(--ad-muted-foreground)]">{OUTCOMES[outcome]}</p>
        ) : null}

        {!connected ? (
          <>
            {/* NOT CONFIGURED IS SAID, NOT HIDDEN. Without a client id and
                secret the button can only ever land on a Google error page,
                and a disabled control with no explanation reads as a broken
                console. */}
            {!configured ? (
              <p className="text-sm text-[var(--ad-muted-foreground)]">
                Google sign-in isn&apos;t configured on this deployment. Set <code className="font-mono text-xs">GOOGLE_CLIENT_ID</code>{" "}
                and <code className="font-mono text-xs">GOOGLE_CLIENT_SECRET</code>, and register the address below as a redirect URI
                on that OAuth client.
              </p>
            ) : (
              <p className="text-sm">
                Sign in with the Google account whose calendar this console should show. You&apos;ll be asked to grant
                read-only calendar access, and you can withdraw it here or from your Google account at any time.
              </p>
            )}

            {/* THE EXACT STRING TO REGISTER, shown whenever it is known — even
                before Google sign-in is configured, since it is what makes
                configuring it possible. Providers match this byte for byte:
                no trailing slash, and the host has to be the one the console
                actually serves on (see `redirectUri`'s own comment above)
                rather than whatever an operator typed from memory. */}
            {redirectUri ? (
              <div className="mt-3">
                <CopyableCode
                  value={redirectUri}
                  className="min-w-0"
                  codeClassName="rounded border border-[var(--ad-border)] px-2 py-1 text-xs text-[var(--ad-foreground)]"
                  buttonClassName="ad-btn ad-btn-outline ad-btn-sm"
                />
              </div>
            ) : null}

            {configured ? (
              // A PLAIN LINK, NOT A fetch. The start route answers with a 302
              // to Google's consent screen, which the browser has to follow as
              // a navigation — an XHR would follow it invisibly and hand back
              // Google's HTML.
              // AND NOT next/link EITHER, which is what the rule below asks
              // for: Link does a client-side transition and expects a React
              // page at the other end. This is an API route whose whole job is
              // to redirect the browser off-site, so a soft navigation to it
              // is not a slower version of the right thing — it is the wrong
              // thing. (The account surface's own Connect buttons are the same
              // `<a>`; the rule does not fire there only because their href is
              // a template literal it cannot resolve statically.)
              // eslint-disable-next-line @next/next/no-html-link-for-pages
              <a className="ad-btn ad-btn-primary mt-4" href="/api/super/google-calendar/start">
                <Icon name="calendar" className="h-3.5 w-3.5" /> Connect Google Calendar
              </a>
            ) : null}
          </>
        ) : (
          <>
            <p className="text-sm">
              Connected{accountEmail ? <> as <strong className="font-600">{accountEmail}</strong></> : null}. Pick which
              of that account&apos;s calendars this console should show.
            </p>

            {loading ? (
              <p className="mt-4 text-sm text-[var(--ad-muted-foreground)]">Loading calendars…</p>
            ) : problem ? (
              <p className="mt-4 text-sm text-[var(--ad-destructive)]">{problem}</p>
            ) : calendars.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--ad-muted-foreground)]">
                That account has no calendars this console can read.
              </p>
            ) : (
              <form onSubmit={choose} className="mt-4 flex flex-col gap-2 sm:flex-row">
                <select
                  className="ad-select flex-1"
                  value={calendarId}
                  onChange={(e) => setCalendarId(e.target.value)}
                >
                  <option value="" disabled>Pick a calendar…</option>
                  {calendars.map((c) => (
                    <option key={c.id} value={c.id}>{c.summary || c.id}</option>
                  ))}
                </select>
                <button type="submit" className="ad-btn ad-btn-primary shrink-0" disabled={choosing || !calendarId}>
                  {choosing ? "Saving…" : "Use this calendar"}
                </button>
              </form>
            )}
            {error ? <p className="mt-2 text-sm text-[var(--ad-destructive)]">{error}</p> : null}

            <button
              type="button"
              className="ad-btn ad-btn-outline ad-btn-sm mt-6"
              onClick={disconnect}
              disabled={choosing}
            >
              <Icon name="trash" className="h-3.5 w-3.5" /> Disconnect this account
            </button>
          </>
        )}
      </CardBody>
    </Card>
  );
}
