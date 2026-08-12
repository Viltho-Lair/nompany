"use client";

import { useEffect, useRef, useState } from "react";

// Six-box one-time-code entry. Handles paste, arrow keys, backspace, and
// autofills from the OS (autocomplete="one-time-code" on the first box).
// Submits automatically once six digits are present, so the common case is
// "read code, type it, done" with no button press.
const box =
  "h-14 w-11 rounded-xl border border-line bg-ink-soft/60 text-center font-display text-2xl font-700 text-fg transition-colors focus:border-iris focus:outline-none focus:ring-2 focus:ring-iris/25 disabled:opacity-60";

export default function OtpStep({ email, onVerified, onError, trustPrompt = true, submitLabel = "Verify" }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [trust, setTrust] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const refs = useRef([]);
  const code = digits.join("");

  useEffect(() => { refs.current[0]?.focus(); }, []);
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // Auto-submit on the sixth digit.
  useEffect(() => {
    if (code.length === 6 && !busy) submit(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  function setAt(i, value) {
    const v = value.replace(/\D/g, "");
    setDigits((prev) => {
      const next = [...prev];
      if (v.length > 1) {                       // pasted or autofilled
        for (let k = 0; k < 6 - i; k++) next[i + k] = v[k] || "";
        refs.current[Math.min(5, i + v.length)]?.focus();
      } else {
        next[i] = v;
        if (v) refs.current[i + 1]?.focus();
      }
      return next;
    });
  }
  function onKeyDown(e, i) {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowLeft") refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight") refs.current[i + 1]?.focus();
  }

  const MESSAGES = {
    invalid: "That code isn't right. Check it and try again.",
    expired: "That code has expired. Send a new one.",
    locked: "Too many attempts. Send a new code to continue.",
    suspended: "This account is suspended.",
    notfound: "This account no longer exists.",
  };

  async function submit(value) {
    setBusy(true); setError(""); setNotice("");
    try {
      const res = await fetch("/api/identity/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value, trustThisDevice: trustPrompt ? trust : false, remember: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const left = typeof data.attemptsLeft === "number" ? ` ${data.attemptsLeft} attempt${data.attemptsLeft === 1 ? "" : "s"} left.` : "";
        setError((MESSAGES[data.error] || "We couldn't verify that code.") + (data.error === "invalid" ? left : ""));
        setDigits(["", "", "", "", "", ""]);
        refs.current[0]?.focus();
        onError?.(data.error);
        return;
      }
      onVerified?.(data);
    } catch {
      setError("Something went wrong. Try again.");
    } finally { setBusy(false); }
  }

  async function resend() {
    setBusy(true); setError(""); setNotice("");
    try {
      const res = await fetch("/api/identity/otp/resend", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429 && data.error === "cooldown") {
        setCooldown(Math.ceil((data.retryInMs || 60000) / 1000));
        setError("Please wait before requesting another code.");
      } else if (!res.ok) {
        setError(data.error === "expired" ? "This sign-in attempt expired. Start again." : "We couldn't send a new code.");
      } else {
        setDigits(["", "", "", "", "", ""]);
        refs.current[0]?.focus();
        setCooldown(60);
        setNotice(data.emailSent === false ? "Code regenerated, but the email couldn't be sent." : "A new code is on its way.");
      }
    } catch { setError("Something went wrong. Try again."); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-700 text-fg">Enter your code</h2>
        <p className="mt-1 text-sm text-fg-muted">
          We sent a 6-digit code to {email ? <span className="font-600 break-all">{email}</span> : "your email"}. It expires in 10 minutes.
        </p>
      </div>

      <div className="flex justify-between gap-2" dir="ltr">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            value={d}
            onChange={(e) => setAt(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={6}
            disabled={busy}
            aria-label={`Digit ${i + 1}`}
            className={box}
          />
        ))}
      </div>

      {trustPrompt && (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-fg-muted">
          <input type="checkbox" checked={trust} onChange={(e) => setTrust(e.target.checked)} className="h-4 w-4 cursor-pointer accent-iris" />
          Trust this device for 30 days
        </label>
      )}

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      {notice && <p className="text-sm text-iris-bright">{notice}</p>}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => submit(code)}
          disabled={busy || code.length !== 6}
          className="landing-submit w-auto"
        >
          {busy ? "Checking…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={resend}
          disabled={busy || cooldown > 0}
          className="text-sm font-600 text-iris-bright hover:underline disabled:opacity-60 disabled:no-underline"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Send a new code"}
        </button>
      </div>
    </div>
  );
}
