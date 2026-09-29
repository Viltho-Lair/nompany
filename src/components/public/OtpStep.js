"use client";

import { useEffect, useRef, useState } from "react";
import { useAccountLocale } from "@/components/public/locale";
import { accountDict } from "@/shared/account";
import { deviceEventReady } from "@/components/public/deviceIntel";
import { CHECKBOX, CODE_BOX, ERROR, HINT, PRIMARY, STEP_TITLE, TEXT_BUTTON } from "@/components/landing/site/pages/auth/ui";

// Six-box one-time-code entry. Handles paste, arrow keys, backspace, and
// autofills from the OS (autocomplete="one-time-code" on the first box).
// Submits automatically once six digits are present, so the common case is
// "read code, type it, done" with no button press.
// The boxes, and the rest of this step, wear the public site's dark glass
// (27/09/2026) — `CODE_BOX` and friends are class strings, nothing more.
const box = CODE_BOX;

// `submitLabel` has NO default any more: it used to be "Verify", which is the
// one word on the screen that would have stayed English in an Arabic session.
// Both callers pass their own.
export default function OtpStep({ email, onVerified, onError, trustPrompt = true, submitLabel }) {
  const tr = accountDict(useAccountLocale());
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  // UNTICKED. It defaulted to ON, and nobody had chosen that: every person who
  // ever registered was silently trusted on that browser for thirty days, so
  // signing out and back in never asked for a code again and the second factor
  // was, in practice, off for everyone with an account. A pre-ticked box is not
  // consent to skip a security step — it is the step being skipped by default
  // and blamed on the person. Ticking it deliberately still works exactly as it
  // did; what changed is that somebody has to.
  const [trust, setTrust] = useState(false);
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
    invalid: tr.codeIsnRightCheck,
    expired: tr.codeExpiredSendNew,
    locked: tr.tooManyAttemptsSendNew,
    suspended: tr.accountSuspended,
    notfound: tr.accountNoLongerExists,
  };

  async function submit(value) {
    setBusy(true); setError(""); setNotice("");
    try {
      // Refreshed if the code took long to arrive: this is the request that
      // binds a trusted device to this browser (platform/auth/otp.ts).
      await deviceEventReady();
      const res = await fetch("/api/identity/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value, trustThisDevice: trustPrompt ? trust : false, remember: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const left = typeof data.attemptsLeft === "number" ? ` ${tr.nAttemptsLeft(data.attemptsLeft)}` : "";
        setError((MESSAGES[data.error] || tr.couldnVerifyCode) + (data.error === "invalid" ? left : ""));
        setDigits(["", "", "", "", "", ""]);
        refs.current[0]?.focus();
        onError?.(data.error);
        return;
      }
      onVerified?.(data);
    } catch {
      setError(tr.somethingWentWrongTry);
    } finally { setBusy(false); }
  }

  async function resend() {
    setBusy(true); setError(""); setNotice("");
    try {
      const res = await fetch("/api/identity/otp/resend", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429 && data.error === "cooldown") {
        setCooldown(Math.ceil((data.retryInMs || 60000) / 1000));
        setError(tr.pleaseWaitBeforeRequesting);
      } else if (!res.ok) {
        setError(data.error === "expired" ? tr.signAttemptExpiredStart : tr.couldnSendNewCode);
      } else {
        setDigits(["", "", "", "", "", ""]);
        refs.current[0]?.focus();
        setCooldown(60);
        setNotice(data.emailSent === false ? tr.codeRegeneratedButEmail : tr.newCodeOnWay);
      }
    } catch { setError(tr.somethingWentWrongTry); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className={STEP_TITLE}>{tr.enterCode}</h2>
        <p className={`mt-2 ${HINT}`}>
          We sent a 6-digit code to {email ? <span className="break-all font-medium text-[#ececf1]">{email}</span> : "your email"}. It expires in 10 minutes.
        </p>
      </div>

      <div className="grid grid-cols-6 gap-2" dir="ltr">
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
        <label className={`flex cursor-pointer items-center gap-2 ${HINT}`}>
          <input type="checkbox" checked={trust} onChange={(e) => setTrust(e.target.checked)} className={CHECKBOX} />
          {tr.trustDevice30}
        </label>
      )}

      {error && <p className={ERROR} role="alert">{error}</p>}
      {notice && <p className="text-[13px] leading-relaxed text-[#c9c2ff]">{notice}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => submit(code)}
          disabled={busy || code.length !== 6}
          className={PRIMARY}
        >
          {busy ? tr.checking : submitLabel}
        </button>
        <button
          type="button"
          onClick={resend}
          disabled={busy || cooldown > 0}
          className={`${TEXT_BUTTON} px-1 py-2 tabular-nums`}
        >
          {cooldown > 0 ? tr.resendIn(cooldown) : tr.sendNewCode}
        </button>
      </div>
    </div>
  );
}
