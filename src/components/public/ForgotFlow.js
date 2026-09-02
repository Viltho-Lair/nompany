"use client";

import { useEffect, useRef, useState } from "react";
import { useAccountLocale } from "@/components/public/locale";
import { accountDict, tooManyAttemptsIn } from "@/shared/account";
import Link from "next/link";
import { PASSWORD_RULES, checkPassword, describeFailures } from "@/platform/auth/passwordPolicy";

// Password recovery in two stages on one page: ask for the address, then enter
// the emailed code with a new password. Stage 2 keeps the email editable so the
// code can be redeemed on a different device from the one that requested it.

const input = "landing-field";
const label = "landing-label";
const primary =
  "w-full landing-submit w-auto";

export default function ForgotFlow({ locale, initialEmail = "" }) {
  const tr = accountDict(useAccountLocale());
  const [stage, setStage] = useState(initialEmail ? "reset" : "request");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const codeRef = useRef(null);

  useEffect(() => { if (stage === "reset") codeRef.current?.focus(); }, [stage]);

  const strength = checkPassword(password);
  const mismatch = confirm.length > 0 && password !== confirm;
  const canReset = code.trim().length >= 4 && strength.ok && password === confirm && confirm.length > 0;

  async function request(e) {
    e?.preventDefault();
    setBusy(true); setError("");
    try {
      // Always succeeds — the API never reveals whether an address is registered.
      await fetch("/api/identity/forgot", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStage("reset");
    } catch { setError(tr.somethingWentWrongTry); }
    finally { setBusy(false); }
  }

  async function reset(e) {
    e?.preventDefault();
    if (!canReset) return;
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/identity/reset", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code.trim(), newPassword: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // "rate-limited" IS THE ONE THAT MATTERS HERE. The credential gate
        // covers this door and the sign-in door together — deliberately, so
        // somebody stopped at one cannot walk round to the other — which means
        // a person who has just failed a few sign-ins arrives at the reset page
        // already locked out. Unnamed, that answered "we couldn't reset your
        // password", which describes a broken feature rather than a wait, and
        // the `retryAfter` that would have explained it was thrown away.
        setError(
          data.error === "rate-limited" ? tooManyAttemptsIn(tr, data.retryAfter)
          : data.error === "invalid" ? tr.codeIsnRightAddress
          : data.error === "expired" ? tr.codeExpiredRequestNew
          : data.error === "locked" ? tr.tooManyAttemptsRequest
          : data.error === "weak" ? describeFailures(data.failed)
          : tr.couldnResetPassword
        );
        setBusy(false);
        return;
      }
      setDone(true);
    } catch { setError(tr.somethingWentWrongTry); setBusy(false); }
  }

  if (done) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-2xl text-emerald-600 dark:text-emerald-400">✓</div>
        <div>
          <h2 className="font-display text-xl font-800 text-fg">{tr.passwordUpdated}</h2>
          <p className="mt-2 text-sm text-fg-muted">
            {tr.signedOutEverywhereSafety}
          </p>
        </div>
        <Link href={`/${locale}/login`} className={`${primary} inline-block`}>{tr.goSign}</Link>
      </div>
    );
  }

  if (stage === "request") {
    return (
      <form onSubmit={request} className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-800 text-fg">{tr.resetPassword}</h2>
          <p className="mt-2 text-sm text-fg-muted">
            {tr.enterEmailSendCode}
          </p>
        </div>
        <div>
          <label className={label} htmlFor="email">{tr.email}</label>
          <input id="email" type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
        <button type="submit" disabled={busy || !email} className={primary}>{busy ? tr.sending : tr.sendCode}</button>
        <p className="pt-1 text-center text-sm text-fg-muted">
          {tr.rememberedIt} <Link href={`/${locale}/login`} className="font-600 text-iris-bright hover:underline">{tr.sign}</Link>
        </p>
        <button type="button" onClick={() => setStage("reset")} className="w-full text-center text-sm font-600 text-fg-muted hover:underline">
          {tr.alreadyHaveCode}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={reset} className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-800 text-fg">{tr.enterCode}</h2>
        <p className="mt-2 text-sm text-fg-muted">
          {tr.ifAddress} <span className="font-600 break-all">{email || tr.thatAddress}</span> {tr.codeOnWayExpires}
        </p>
      </div>

      <div>
        <label className={label} htmlFor="r-email">{tr.email}</label>
        <input id="r-email" type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </div>
      <div>
        <label className={label} htmlFor="code">6-digit code</label>
        <input
          id="code" ref={codeRef} className={`${input} font-mono tracking-[0.3em]`} value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" required
        />
      </div>
      <div>
        <label className={label} htmlFor="new-password">{tr.newPassword}</label>
        <input id="new-password" type="password" className={input} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
        <ul className="mt-2 space-y-1">
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(password);
            return (
              <li key={rule.key} className={`flex items-center gap-2 text-xs ${met ? "text-emerald-600 dark:text-emerald-400" : "text-fg-muted"}`}>
                <span aria-hidden="true" className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-700 ${met ? "bg-emerald-500/15" : "bg-line"}`}>
                  {met ? "✓" : "•"}
                </span>
                {rule.label}
              </li>
            );
          })}
        </ul>
      </div>
      <div>
        <label className={label} htmlFor="confirm">{tr.confirmNewPassword}</label>
        <input
          id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
          className={`${input} ${mismatch ? "border-danger focus:border-danger focus:ring-danger/20" : ""}`}
          autoComplete="new-password" aria-invalid={mismatch || undefined} required
        />
        {mismatch && <p className="mt-1 text-xs text-danger">{tr.twoPasswordsMatch}</p>}
      </div>

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <button type="submit" disabled={busy || !canReset} className={primary}>{busy ? tr.updating : tr.setNewPassword}</button>
      <button type="button" onClick={() => { setStage("request"); setError(""); }} className="w-full text-center text-sm font-600 text-fg-muted hover:underline">
        {tr.sendCodeAgain}
      </button>
    </form>
  );
}
