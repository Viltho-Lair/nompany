"use client";

import { useState } from "react";
import { useAccountLocale } from "@/components/public/locale";
import { securityDict } from "@/shared/security";
// The public site's dark glass (27/09/2026): class strings only.
import { CHECKBOX, CODE_BOX, ERROR, HINT, PRIMARY, STEP_TITLE, TEXT_BUTTON } from "@/components/landing/site/pages/auth/ui";

// THE AUTHENTICATOR STEP OF A SIGN-IN (platform/auth/twoFactor.ts): the app's
// six digits, or a recovery code. It finishes the paused sign-in the HttpOnly
// cookie names.
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
        <h2 className={STEP_TITLE}>{t.twoFactorStepTitle}</h2>
        <p className={`mt-2 ${HINT}`}>{t.twoFactorStepBody}</p>
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
        className={`${CODE_BOX} tracking-[0.3em]`}
      />
      <label className={`flex cursor-pointer items-center gap-2 ${HINT}`}>
        <input type="checkbox" checked={trust} onChange={(e) => setTrust(e.target.checked)} className={CHECKBOX} />
        {t.trustDevice}
      </label>
      {error && <p className={ERROR} role="alert">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="submit" disabled={busy || !code.trim()} className={PRIMARY}>{busy ? t.unlocking : t.verify}</button>
        <button type="button" onClick={onRestart} className={`${TEXT_BUTTON} px-1 py-2`}>{t.cancel}</button>
      </div>
    </form>
  );
}
