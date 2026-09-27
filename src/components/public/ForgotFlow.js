"use client";

import { useEffect, useRef, useState } from "react";
import { useAccountLocale } from "@/components/public/locale";
import { accountDict, tooManyAttemptsIn } from "@/shared/account";
import Link from "next/link";
import { PASSWORD_RULES, checkPassword, describeFailures } from "@/platform/auth/passwordPolicy";
import { ERROR, FIELD, HINT, LABEL, LINK, PRIMARY, STEP, STEP_TITLE, TEXT_BUTTON, ruleClass, ruleDotClass } from "@/components/landing/site/pages/auth/ui";

// Password recovery in two stages on one page: ask for the address, then enter
// the emailed code with a new password. Stage 2 keeps the email editable so the
// code can be redeemed on a different device from the one that requested it.

// The public site's dark-glass controls (27/09/2026): class strings only, so
// every attribute below is this flow's own. Each stage is KEYED so moving
// between them crossfades rather than reusing the form in place.
const input = FIELD;
const label = LABEL;
const primary = `${PRIMARY} w-full`;

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
      <div key="done" className={`${STEP} space-y-6 text-center`}>
        <div className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-emerald-400/10 text-2xl text-emerald-300 ring-1 ring-inset ring-emerald-300/25">✓</div>
        <div>
          <h2 className={STEP_TITLE}>{tr.passwordUpdated}</h2>
          <p className={`mt-2 ${HINT}`}>
            {tr.signedOutEverywhereSafety}
          </p>
        </div>
        <Link href={`/${locale}/login`} className={primary}>{tr.goSign}</Link>
      </div>
    );
  }

  if (stage === "request") {
    return (
      <form key="request" onSubmit={request} className={`${STEP} space-y-5`}>
        <div>
          <h2 className={STEP_TITLE}>{tr.resetPassword}</h2>
          <p className={`mt-2 ${HINT}`}>
            {tr.enterEmailSendCode}
          </p>
        </div>
        <div>
          <label className={label} htmlFor="email">{tr.email}</label>
          <input id="email" type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        {error && <p className={ERROR} role="alert">{error}</p>}
        <button type="submit" disabled={busy || !email} className={primary}>{busy ? tr.sending : tr.sendCode}</button>
        <p className={`pt-1 text-center ${HINT}`}>
          {tr.rememberedIt} <Link href={`/${locale}/login`} className={LINK}>{tr.sign}</Link>
        </p>
        <button type="button" onClick={() => setStage("reset")} className={`${TEXT_BUTTON} w-full text-center`}>
          {tr.alreadyHaveCode}
        </button>
      </form>
    );
  }

  return (
    <form key="reset" onSubmit={reset} className={`${STEP} space-y-5`}>
      <div>
        <h2 className={STEP_TITLE}>{tr.enterCode}</h2>
        <p className={`mt-2 ${HINT}`}>
          {tr.ifAddress} <span className="break-all font-medium text-[#ececf1]">{email || tr.thatAddress}</span> {tr.codeOnWayExpires}
        </p>
      </div>

      <div>
        <label className={label} htmlFor="r-email">{tr.email}</label>
        <input id="r-email" type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </div>
      <div>
        <label className={label} htmlFor="code">6-digit code</label>
        <input
          id="code" ref={codeRef} dir="ltr" className={`${input} text-center font-mono tracking-[0.3em]`} value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" required
        />
      </div>
      <div>
        <label className={label} htmlFor="new-password">{tr.newPassword}</label>
        <input id="new-password" type="password" className={input} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
        <ul className="mt-2.5 space-y-1.5">
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(password);
            return (
              <li key={rule.key} className={ruleClass(met)}>
                <span aria-hidden="true" className={ruleDotClass(met)}>
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
          className={input}
          autoComplete="new-password" aria-invalid={mismatch || undefined} required
        />
        {mismatch && <p className={`mt-2 ${ERROR}`}>{tr.twoPasswordsMatch}</p>}
      </div>

      {error && <p className={ERROR} role="alert">{error}</p>}
      <button type="submit" disabled={busy || !canReset} className={primary}>{busy ? tr.updating : tr.setNewPassword}</button>
      <button type="button" onClick={() => { setStage("request"); setError(""); }} className={`${TEXT_BUTTON} w-full text-center`}>
        {tr.sendCodeAgain}
      </button>
    </form>
  );
}
