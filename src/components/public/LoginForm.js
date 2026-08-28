"use client";

import { useState } from "react";
import { useAccountLocale } from "@/components/public/locale";
import { accountDict } from "@/shared/account";
import Link from "next/link";
import OtpStep from "@/components/public/OtpStep";
import SocialButtons from "@/components/public/SocialButtons";
// The landing's floating-label field — label lifts on focus, an iris→cyan
// hairline draws under the active field, a mint tick confirms a valid one. It
// lives in components/landing because it draws on `motion/react`; importing the
// COMPONENT here is fine (the fence is on importing `motion/react` directly,
// which this file does not — its own panel transition is the CSS keyframe
// `.auth-panel` in globals.css, so the studio's motion rules are untouched).
import { FloatingField } from "@/components/landing/ui/FloatingField";

// The eye that reveals the password, sized to sit in the field's trailing
// gutter. tabIndex -1 so a keyboard user tabbing out of the password lands on
// the submit button, not on a visibility toggle.
function RevealEye({ shown, onToggle }) {
  const tr = accountDict(useAccountLocale());
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={onToggle}
      aria-label={shown ? tr.hidePassword : tr.showPassword}
      aria-pressed={shown}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-dim transition-colors hover:text-fg"
    >
      {shown ? (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3l18 18" />
          <path d="M10.6 10.6a2 2 0 002.8 2.8" />
          <path d="M9.4 5.2A9.5 9.5 0 0112 5c5 0 9 4.5 9 7a11 11 0 01-2.6 3.4M6.2 6.7C3.9 8.2 3 10.3 3 12c0 2.5 4 7 9 7a9.6 9.6 0 003.9-.8" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12s3.6-7 9-7 9 7 9 7-3.6 7-9 7-9-7-9-7z" />
          <circle cx="12" cy="12" r="2.6" />
        </svg>
      )}
    </button>
  );
}

// A refusal the reader meets at the worst moment, so it names what to do next.
// The rate-limit case is deliberately its own line and its own tone — "wait",
// not "you got it wrong" — because telling someone their password is wrong when
// the real problem is that they tried too often sends them resetting a password
// that was fine.
function Alert({ kind, children }) {
  const warn = kind === "wait";
  return (
    <div
      role="alert"
      className={`auth-panel flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${
        warn
          ? "border-gold/40 bg-gold/10 text-gold"
          : "border-rose-500/40 bg-rose-500/10 text-rose-300"
      }`}
    >
      <svg viewBox="0 0 20 20" className="mt-px h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="8" />
        {warn ? <path d="M10 6v4l2.5 1.5" /> : <><path d="M10 6.5v4.2" /><path d="M10 13.6h.01" /></>}
      </svg>
      <span>{children}</span>
    </div>
  );
}

// Risk-based sign-in: password first, then a one-time code ONLY when this
// browser isn't already trusted. A recognised device goes straight through.
export default function LoginForm({ locale, dict, providers = [] }) {
  const tr = accountDict(useAccountLocale());
  const t = dict?.auth || {};
  const [form, setForm] = useState({ email: "", password: "", remember: true });
  const [stage, setStage] = useState("credentials"); // credentials | otp
  const [error, setError] = useState(null);           // { kind, message } | null
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null); setNotice(""); setLoading(true);
    try {
      const res = await fetch("/api/identity/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password, remember: form.remember }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === "rate-email" || data.error === "rate-ip") {
          setError({ kind: "wait", message: tr.tooManyAttemptsWait });
        } else if (data.error === "suspended") {
          setError({ kind: "bad", message: tr.accountSuspendedOwner });
        } else {
          setError({ kind: "bad", message: t.errInvalid || "That email or password isn't right." });
        }
        setLoading(false);
        return;
      }
      if (data.otpRequired) {
        if (data.emailSent === false) setNotice(tr.couldnSendCodeEmail);
        setStage("otp");
        setLoading(false);
        return;
      }
      window.location.assign(`/${locale}/account`);   // trusted device — straight in
    } catch {
      setError({ kind: "bad", message: t.errGeneric || "Something went wrong. Try again." });
      setLoading(false);
    }
  }

  if (stage === "otp") {
    return (
      // `key` restarts the enter animation, so stepping to the code panel reads
      // as moving forward rather than the card's contents blinking over.
      <div key="otp" className="auth-panel space-y-4">
        {notice && <Alert kind="wait">{notice}</Alert>}
        <OtpStep
          email={form.email}
          submitLabel={tr.sign}
          onVerified={() => window.location.assign(`/${locale}/questionnaire`)}
        />
        <button
          type="button"
          onClick={() => { setStage("credentials"); setLoading(false); }}
          className="landing-link text-sm"
        >
          {tr.useDifferentAccount}
        </button>
      </div>
    );
  }

  return (
    <div key="credentials" className="auth-panel space-y-5">
      <SocialButtons providers={providers} mode="login" />
      <form onSubmit={onSubmit} className="space-y-4">
        <FloatingField
          label={t.emailLabel || "Work email"}
          type="email"
          value={form.email}
          onChange={(v) => setForm((f) => ({ ...f, email: v }))}
          autoComplete="email"
          required
        />
        <FloatingField
          label={t.passwordLabel || "Password"}
          type={showPw ? "text" : "password"}
          value={form.password}
          onChange={(v) => setForm((f) => ({ ...f, password: v }))}
          autoComplete="current-password"
          required
          trailing={<RevealEye shown={showPw} onToggle={() => setShowPw((s) => !s)} />}
        />

        <div className="flex items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-fg-muted">
            <input
              type="checkbox"
              checked={form.remember}
              onChange={(e) => setForm((f) => ({ ...f, remember: e.target.checked }))}
              className="h-4 w-4 cursor-pointer accent-iris"
            />
            {t.rememberMe || "Keep me signed in"}
          </label>
          <Link href={`/${locale}/forgot`} className="landing-link text-sm">
            {t.forgotLink || "Forgot password?"}
          </Link>
        </div>

        {error && <Alert kind={error.kind}>{error.message}</Alert>}

        <button type="submit" disabled={loading} className="landing-submit">
          {loading ? (t.loginLoading || "Signing in…") : (t.loginCta || "Sign in")}
        </button>

        <p className="pt-1 text-center text-sm text-fg-muted">
          {t.noAccount || "New to nompany?"}{" "}
          <Link href={`/${locale}/signup`} className="landing-link">
            {t.signupLink || "Create an account"}
          </Link>
        </p>
      </form>
    </div>
  );
}
