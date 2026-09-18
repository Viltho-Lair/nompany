"use client";

import { useState } from "react";
import { useAccountLocale } from "@/components/public/locale";
import { securityDict } from "@/shared/security";

// THE AUTHENTICATOR STEP OF A SIGN-IN (platform/auth/twoFactor.ts): the app's
// six digits, or a recovery code. It finishes the paused sign-in the HttpOnly
// cookie names, and hands back whatever the finish answered — a session, or
// the session limit's question.
export default function TwoFactorStep({ onDone, onRestart }) {
  const t = securityDict(useAccountLocale());
  const [code, setCode] = useState("");
  const [trust, setTrust] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true); setError("");
    const res = await fetch("/api/identity/signin", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim(), trustThisDevice: trust }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setCode("");
    if (res.ok && data?.ok) { onDone?.(data); return; }
    if (data?.error === "invalid") { setError(t.codeAttemptsLeft(Number(data.attemptsLeft) || 1)); return; }
    setError(t.codeLockedStart);
    setTimeout(() => onRestart?.(), 1500);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-700 text-fg">{t.twoFactorStepTitle}</h2>
        <p className="mt-1 text-sm text-fg-muted">{t.twoFactorStepBody}</p>
      </div>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        inputMode="text"
        autoComplete="one-time-code"
        autoFocus
        maxLength={14}
        dir="ltr"
        aria-label={t.appCode}
        disabled={busy}
        className="h-14 w-full rounded-xl border border-line bg-ink-soft/60 text-center font-display text-2xl font-700 tracking-[0.3em] text-fg focus:border-iris focus:outline-none focus:ring-2 focus:ring-iris/25"
      />
      <label className="flex cursor-pointer items-center gap-2 text-sm text-fg-muted">
        <input type="checkbox" checked={trust} onChange={(e) => setTrust(e.target.checked)} className="h-4 w-4 cursor-pointer accent-iris" />
        {t.trustDevice}
      </label>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <div className="flex items-center justify-between gap-3">
        <button type="submit" disabled={busy || !code.trim()} className="landing-submit w-auto">{busy ? t.unlocking : t.verify}</button>
        <button type="button" onClick={onRestart} className="landing-link text-sm">{t.cancel}</button>
      </div>
    </form>
  );
}
