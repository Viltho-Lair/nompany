"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardHead, CardBody, Badge, Icon, Skeleton, SkeletonText, toneBg, toneInk } from "../../../_components/ui";

// TWO-FACTOR ENROLMENT for the console.
//
// The flow is three states and the screen shows exactly one of them: not
// enrolled, enrolled, or "here are your recovery codes, this is the only time
// you will see them".
//
// THE SECRET IS NEVER PERSISTED UNTIL A CODE PROVES IT WORKS. The server hands
// back a secret and a QR and stores nothing; this holds it for the length of the
// enrolment and sends it back with the first code. Abandon the screen and there
// is nothing to clean up — and, more importantly, an account can never end up
// enrolled into a secret its owner's app never successfully read.

const MESSAGES = {
  invalid: "That code didn't match. Check your app and try again.",
  already: "Two-factor is already on for this account.",
  missing: "The enrolment expired. Reload and start again.",
  network: "Couldn't reach the server. Try again.",
};

export default function MfaCard() {
  const [state, setState] = useState({ loading: true });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Shown once, never fetched again — see the note where they are rendered.
  const [recoveryCodes, setRecoveryCodes] = useState(null);

  // `alive` rather than a bare fetch-then-setState. Enrolment is a screen people
  // open, scan from, and close — so a reply arriving after they navigated away
  // is the ordinary case here, not the exotic one, and setting state on an
  // unmounted component is how that becomes a console-wide warning nobody can
  // place.
  const load = useCallback(async (alive = { current: true }) => {
    try {
      const res = await fetch("/api/super/mfa", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (alive.current) setState({ loading: false, ...data });
    } catch {
      if (alive.current) setState({ loading: false, failed: true });
    }
  }, []);

  useEffect(() => {
    const alive = { current: true };
    // THE RULE IS WRONG ABOUT THIS ONE, and contorting the code to satisfy it
    // would be worse than saying so. It flags "setState synchronously within an
    // effect" because it cannot see through the async boundary: `load` is async
    // and suspends at `await fetch` before reaching any setState, so nothing
    // here runs synchronously and there is no cascading render to cause.
    //
    // Disabled narrowly, on the one line, rather than for the file — which would
    // also hide a real one later. The directive has to sit immediately above the
    // call: put a comment between them and it silences the comment instead,
    // which is what the first attempt did.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(alive);
    return () => { alive.current = false; };
  }, [load]);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/super/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: state.secret, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(MESSAGES[data.error] || MESSAGES.invalid);
        setBusy(false);
        return;
      }
      setRecoveryCodes(data.recoveryCodes || []);
      setCode("");
      setBusy(false);
      await load();
    } catch {
      setError(MESSAGES.network);
      setBusy(false);
    }
  }

  if (state.loading) {
    return (
      <Card>
        <CardHead title="Two-factor authentication" sub="Loading…" />
        <CardBody>
          <Skeleton className="h-40 w-40 rounded-md" />
          <SkeletonText lines={2} className="mt-4" />
        </CardBody>
      </Card>
    );
  }

  // ---- the one-time sheet --------------------------------------------------
  // RENDERED BEFORE THE "enabled" BRANCH, because after a successful enrolment
  // both are true and this is the one that matters. Reload and it is gone —
  // which is correct, and is why it says so out loud.
  if (recoveryCodes) {
    return (
      <Card>
        <CardHead title="Save your recovery codes" sub="This is the only time they are shown." />
        <CardBody>
          <div
            className="mb-4 flex items-start gap-2 rounded-md px-3 py-2.5 text-sm"
            style={{ backgroundColor: toneBg("warning", 0.12), color: toneInk("warning") }}
          >
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Each code works once. Keep them somewhere you can reach without this
              console — they are how you get back in if you lose your phone.
            </span>
          </div>
          <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
            {recoveryCodes.map((c) => (
              <li key={c} className="rounded-md border border-slate-200/70 px-3 py-2 dark:border-white/10">{c}</li>
            ))}
          </ul>
          <button
            type="button"
            className="ad-btn ad-btn-primary mt-5"
            onClick={() => setRecoveryCodes(null)}
          >
            I have saved them
          </button>
        </CardBody>
      </Card>
    );
  }

  if (state.enabled) {
    return (
      <Card>
        <CardHead
          title="Two-factor authentication"
          sub="Required at every console sign-in."
          action={<Badge tone="success">On</Badge>}
        />
        <CardBody>
          <p className="text-sm opacity-80">
            Enrolled {state.enrolledAt ? new Date(state.enrolledAt).toLocaleDateString("en-GB") : ""}.
            Your authenticator app produces a new code every 30 seconds.
          </p>
          {/* TURNING IT OFF IS NOT A BUTTON HERE. It needs a current code — a
              session alone must not disarm the console, because a session is
              exactly what somebody has if they got in. The endpoint takes one;
              the screen for it is deliberately not a single click. */}
          <p className="mt-3 text-xs opacity-60">
            To turn it off, use the API with a current code — a session on its own is not enough.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHead
        title="Two-factor authentication"
        sub="Add a code from an authenticator app to every console sign-in."
        action={<Badge tone="warning">Off</Badge>}
      />
      <CardBody>
        <ol className="flex flex-col gap-5">
          <li className="text-sm">
            <span className="font-600">1.</span> Scan this with Google Authenticator, 1Password, or any TOTP app.
            {/* The QR is an SVG string rendered on the server — see the note in
                the route. A QR of an otpauth:// URI IS the secret, so it is not
                sent to a chart service to be drawn. */}
            {state.qr ? (
              <div
                className="mt-3 inline-block rounded-md bg-white p-3"
                dangerouslySetInnerHTML={{ __html: state.qr }}
              />
            ) : null}
          </li>
          <li className="text-sm">
            <span className="font-600">2.</span> Or enter this key by hand:
            <code className="ms-2 select-all rounded bg-slate-100 px-2 py-1 font-mono text-xs dark:bg-white/10">
              {state.secret}
            </code>
          </li>
          <li className="text-sm">
            <span className="font-600">3.</span> Enter the six-digit code it shows.
            <form onSubmit={submit} className="mt-3 flex items-start gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                className="ad-input w-32 font-mono"
                placeholder="123456"
                aria-label="Six-digit code"
              />
              <button type="submit" className="ad-btn ad-btn-primary" disabled={busy || code.length < 6}>
                {busy ? "Checking…" : "Turn on"}
              </button>
            </form>
          </li>
        </ol>

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
      </CardBody>
    </Card>
  );
}
