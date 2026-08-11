"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PASSWORD_RULES, checkPassword, describeFailures } from "@/lib/passwordPolicy";

// Password recovery in two stages on one page: ask for the address, then enter
// the emailed code with a new password. Stage 2 keeps the email editable so the
// code can be redeemed on a different device from the one that requested it.

const input =
  "w-full rounded-xl border border-steel-200 bg-white px-4 py-3 text-sm text-brand-950 placeholder:text-steel-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-steel-800 dark:text-white";
const label = "mb-1.5 block text-xs font-600 uppercase tracking-wide text-steel-500 dark:text-slate-400";
const primary =
  "w-full rounded-full bg-brand-600 px-6 py-3 font-display text-sm font-700 uppercase tracking-[0.12em] text-white transition-colors hover:bg-brand-700 disabled:opacity-60";

export default function ForgotFlow({ locale, initialEmail = "" }) {
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
    } catch { setError("Something went wrong. Try again."); }
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
        setError(
          data.error === "invalid" ? "That code isn't right for this address."
          : data.error === "expired" ? "That code has expired — request a new one."
          : data.error === "locked" ? "Too many attempts. Request a new code."
          : data.error === "weak" ? describeFailures(data.failed)
          : "We couldn't reset your password."
        );
        setBusy(false);
        return;
      }
      setDone(true);
    } catch { setError("Something went wrong. Try again."); setBusy(false); }
  }

  if (done) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-2xl text-emerald-600 dark:text-emerald-400">✓</div>
        <div>
          <h2 className="font-display text-xl font-800 text-brand-950 dark:text-white">Password updated</h2>
          <p className="mt-2 text-sm text-steel-600 dark:text-slate-300">
            You've been signed out everywhere for safety. Sign in with your new password.
          </p>
        </div>
        <Link href={`/${locale}/login`} className={`${primary} inline-block`}>Go to sign in</Link>
      </div>
    );
  }

  if (stage === "request") {
    return (
      <form onSubmit={request} className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-800 text-brand-950 dark:text-white">Reset your password</h2>
          <p className="mt-2 text-sm text-steel-600 dark:text-slate-300">
            Enter your email and we'll send you a 6-digit code.
          </p>
        </div>
        <div>
          <label className={label} htmlFor="email">Email</label>
          <input id="email" type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
        <button type="submit" disabled={busy || !email} className={primary}>{busy ? "Sending…" : "Send code"}</button>
        <p className="pt-1 text-center text-sm text-steel-500 dark:text-slate-400">
          Remembered it? <Link href={`/${locale}/login`} className="font-600 text-brand-600 hover:underline dark:text-brand-400">Sign in</Link>
        </p>
        <button type="button" onClick={() => setStage("reset")} className="w-full text-center text-sm font-600 text-steel-500 hover:underline dark:text-slate-400">
          I already have a code
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={reset} className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-800 text-brand-950 dark:text-white">Enter your code</h2>
        <p className="mt-2 text-sm text-steel-600 dark:text-slate-300">
          If <span className="font-600 break-all">{email || "that address"}</span> has an account, a code is on its way. It expires in 1 hour.
        </p>
      </div>

      <div>
        <label className={label} htmlFor="r-email">Email</label>
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
        <label className={label} htmlFor="new-password">New password</label>
        <input id="new-password" type="password" className={input} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
        <ul className="mt-2 space-y-1">
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(password);
            return (
              <li key={rule.key} className={`flex items-center gap-2 text-xs ${met ? "text-emerald-600 dark:text-emerald-400" : "text-steel-500 dark:text-slate-400"}`}>
                <span aria-hidden="true" className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-700 ${met ? "bg-emerald-500/15" : "bg-steel-200/60 dark:bg-white/10"}`}>
                  {met ? "✓" : "•"}
                </span>
                {rule.label}
              </li>
            );
          })}
        </ul>
      </div>
      <div>
        <label className={label} htmlFor="confirm">Confirm new password</label>
        <input
          id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
          className={`${input} ${mismatch ? "border-danger focus:border-danger focus:ring-danger/20" : ""}`}
          autoComplete="new-password" aria-invalid={mismatch || undefined} required
        />
        {mismatch && <p className="mt-1 text-xs text-danger">The two passwords don't match.</p>}
      </div>

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <button type="submit" disabled={busy || !canReset} className={primary}>{busy ? "Updating…" : "Set new password"}</button>
      <button type="button" onClick={() => { setStage("request"); setError(""); }} className="w-full text-center text-sm font-600 text-steel-500 hover:underline dark:text-slate-400">
        Send the code again
      </button>
    </form>
  );
}
