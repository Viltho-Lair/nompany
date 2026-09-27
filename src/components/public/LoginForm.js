"use client";

import { useEffect, useState } from "react";
import { useAccountLocale } from "@/components/public/locale";
import { accountDict, tooManyAttemptsIn } from "@/shared/account";
import Link from "next/link";
import OtpStep from "@/components/public/OtpStep";
import SocialButtons from "@/components/public/SocialButtons";
import { useDeviceHints } from "@/components/public/deviceHints";
import { deviceEventReady } from "@/components/public/deviceIntel";
import { LockCover } from "@/components/security/SessionLock";
import TillCashierSwitch from "@/components/security/TillCashierSwitch";
import TwoFactorStep from "@/components/public/TwoFactorStep";
import PasskeySignIn from "@/components/public/PasskeySignIn";
import { securityDict, endedMessage } from "@/shared/security";
// The public site's dark-glass controls (27/09/2026). Class strings only — this
// form keeps every attribute and handler of its own. The step crossfade is the
// CSS keyframe `auth-step`, armed by the frame (site/pages/auth/AuthScene), so
// nothing here imports `motion/react` and the studio's motion fence holds.
import { CHECKBOX, ERROR, FIELD, GHOST, HINT, LABEL, LINK, PRIMARY, STEP, STEP_TITLE, TEXT_BUTTON } from "@/components/landing/site/pages/auth/ui";

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
      className="flex h-10 w-10 items-center justify-center rounded-xl text-white/50 transition-colors duration-200 hover:text-white"
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
      className={`${STEP} flex items-start gap-2.5 rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed ring-1 ring-inset ${
        warn
          ? "bg-amber-400/[0.08] text-amber-200 ring-amber-300/25"
          : "bg-rose-500/[0.08] text-rose-200 ring-rose-400/30"
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
  // The device's touch points and screen size, read by whichever route opens
  // the session — this form's, the code step's, or a provider's callback.
  useDeviceHints();
  const [form, setForm] = useState({ email: "", password: "", remember: true });
  const sec = securityDict(useAccountLocale());
  const [stage, setStage] = useState("credentials"); // credentials | otp | totp | locked
  // A PAIRED TILL: the email sign-in comes FIRST and the till is a button under
  // it (26/09/2026). It was the other way round from 18/09/2026, and a browser
  // paired once — somebody's own computer, used to set a till up — then opened
  // on "who is selling?" for a year. That screen asks for the same name and PIN
  // a person thinks of as signing in, so they typed them, took over a
  // collaborator's till, and every studio they opened sent them back to it. A
  // real counter pays one click for it.
  const [tillMode, setTillMode] = useState(false);
  const [pairedStudio, setPairedStudio] = useState("");
  useEffect(() => {
    let alive = true;
    fetch("/api/identity/till", { cache: "no-store" })
      .then((r) => r.json()).then((d) => { if (alive && d?.till) setPairedStudio(String(d.till.studio?.name || "")); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  const [error, setError] = useState(null);           // { kind, message } | null
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // TWO THINGS THIS PAGE MAY HAVE TO SAY BEFORE ANYBODY TYPES.
  //
  // Why this browser was signed out, when it was ended rather than expired —
  // from another of the person's devices, say. And a sign-in paused for the
  // authenticator code by a Google or Microsoft callback, which can only
  // redirect here and cannot carry the question itself (`?continue=1`).
  // AND A LOCKED SESSION that reloaded a page lands here too — the PIN, not the
  // password, is what it needs, and it goes back to where it was.
  useEffect(() => {
    let alive = true;
    fetch("/api/identity/session/lock", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (alive && d?.signedIn && d.locked) setStage("locked"); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/identity/session/ended", { cache: "no-store" })
      .then((r) => r.json()).then((d) => { if (alive && d?.ended) setNotice(endedMessage(sec, d.ended)); })
      .catch(() => {});
    if (new URLSearchParams(window.location.search).get("continue") === "1") {
      fetch("/api/identity/signin", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (alive && d?.ok && d.stage === "totp") setStage("totp");
        })
        .catch(() => {});
    }
    return () => { alive = false; };
  }, [sec]);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null); setNotice(""); setLoading(true);
    try {
      // The server reads Fingerprint's event off a cookie (deviceIntel.js).
      await deviceEventReady();
      const res = await fetch("/api/identity/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password, remember: form.remember }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // EVERY REFUSAL NAMED, and the catch-all left for the ones nobody
        // has named yet.
        //
        // "rate-limited" — the credential gate, which refuses BEFORE the
        // password is verified — used to fall through to the else and answer
        // "that email or password isn't right", about a password the server
        // never looked at. Somebody locked out for five wrong tries was told
        // their sixth was wrong too, so they tried a seventh. The two codes
        // below it are the OTP SEND limits, a different limiter entirely, and
        // covering those two was what made the gap look covered.
        if (data.error === "rate-limited") {
          setError({ kind: "wait", message: tooManyAttemptsIn(tr, data.retryAfter) });
        } else if (data.error === "rate-email" || data.error === "rate-ip") {
          setError({ kind: "wait", message: tr.tooManyAttemptsWait });
        } else if (data.error === "automated") {
          setError({ kind: "bad", message: tr.automatedRefused });
        } else if (data.error === "suspended") {
          setError({ kind: "bad", message: tr.accountSuspendedOwner });
        } else if (data.error === "invalid") {
          setError({ kind: "bad", message: t.errInvalid || "That email or password isn't right." });
        } else {
          setError({ kind: "bad", message: t.errGeneric || "Something went wrong. Try again." });
        }
        setLoading(false);
        return;
      }
      // An authenticator is switched on: its code replaces the emailed one.
      if (data.totpRequired) {
        setStage("totp");
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

  if (stage === "locked") {
    const next = new URLSearchParams(window.location.search).get("next") || "";
    const safe = next.startsWith("/") && !next.startsWith("//") ? next : `/${locale}/account`;
    return (
      <div key="locked" className={`${STEP} flex justify-center`}>
        {/* IN THE SCENE'S OWN GLASS, not the studio's white card: the card
            around it is already there, so the form draws none of its own. */}
        <LockCover t={sec} locale={locale} inline onUnlocked={() => window.location.assign(safe)} look={{
          form: "w-full text-start",
          badge: "bg-white/[0.06] text-[#c9c2ff] ring-1 ring-inset ring-white/10",
          title: STEP_TITLE,
          body: `mt-1 ${HINT}`,
          label: `mt-5 ${LABEL}`,
          input: `${FIELD} text-center text-2xl tracking-[0.4em] sm:text-2xl`,
          error: `mt-2 ${ERROR}`,
          submit: PRIMARY,
          signOut: TEXT_BUTTON,
        }} />
      </div>
    );
  }

  if (stage === "totp") {
    return (
      <div key="totp" className={`${STEP} space-y-4`}>
        <TwoFactorStep
          onDone={() => window.location.assign(`/${locale}/questionnaire`)}
          onRestart={() => { setStage("credentials"); setLoading(false); }}
        />
      </div>
    );
  }

  if (stage === "otp") {
    return (
      // `key` restarts the enter animation, so stepping to the code panel reads
      // as moving forward rather than the card's contents blinking over.
      <div key="otp" className={`${STEP} space-y-5`}>
        {notice && <Alert kind="wait">{notice}</Alert>}
        <OtpStep
          email={form.email}
          submitLabel={tr.sign}
          onVerified={() => window.location.assign(`/${locale}/questionnaire`)}
        />
        <button
          type="button"
          onClick={() => { setStage("credentials"); setLoading(false); }}
          className={TEXT_BUTTON}
        >
          {tr.useDifferentAccount}
        </button>
      </div>
    );
  }

  if (tillMode) {
    return (
      <div key="till" className={`${STEP} space-y-5`}>
        <TillCashierSwitch locale={locale}
          onDone={(slug) => window.location.assign(slug ? `/${slug}/pos-till` : `/${locale}/account`)}
          onCancel={() => setTillMode(false)} cancelLabel={sec.signInWithEmail}
          onUnpaired={() => { setTillMode(false); setPairedStudio(""); }} />
      </div>
    );
  }

  return (
    <div key="credentials" className={`${STEP} space-y-5`}>
      <SocialButtons providers={providers} mode="login" />
      {/* A passkey is a whole sign-in: no password, no code. */}
      <PasskeySignIn onDone={() => window.location.assign(`/${locale}/questionnaire`)} />
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Labels above their fields (they floated inside them until
            27/09/2026). The ids only tie a label to its input; the request is
            built from state, exactly as before. */}
        <div>
          <label className={LABEL} htmlFor="login-email">{t.emailLabel || "Work email"}</label>
          <input
            id="login-email"
            type="email"
            className={FIELD}
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            autoComplete="email"
            required
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="login-password">{t.passwordLabel || "Password"}</label>
          <div className="relative">
            <input
              id="login-password"
              type={showPw ? "text" : "password"}
              className={`${FIELD} pe-12`}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              autoComplete="current-password"
              required
            />
            <div className="absolute inset-y-0 end-1 flex items-center">
              <RevealEye shown={showPw} onToggle={() => setShowPw((s) => !s)} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <label className={`flex cursor-pointer items-center gap-2 ${HINT}`}>
            <input
              type="checkbox"
              checked={form.remember}
              onChange={(e) => setForm((f) => ({ ...f, remember: e.target.checked }))}
              className={CHECKBOX}
            />
            {t.rememberMe || "Keep me signed in"}
          </label>
          <Link href={`/${locale}/forgot`} className={`${LINK} text-[13px]`}>
            {t.forgotLink || "Forgot password?"}
          </Link>
        </div>

        {error && <Alert kind={error.kind}>{error.message}</Alert>}
        {!error && notice && <Alert kind="wait">{notice}</Alert>}

        <button type="submit" disabled={loading} className={`${PRIMARY} w-full`}>
          {loading ? (t.loginLoading || "Signing in…") : (t.loginCta || "Sign in")}
        </button>

        <p className={`pt-1 text-center ${HINT}`}>
          {t.noAccount || "New to nompany?"}{" "}
          <Link href={`/${locale}/signup`} className={LINK}>
            {t.signupLink || "Create an account"}
          </Link>
        </p>
      </form>
      {pairedStudio && (
        <button type="button" onClick={() => setTillMode(true)}
          className={`${GHOST} w-full`}>
          {sec.useAsTill(pairedStudio)}
        </button>
      )}
    </div>
  );
}
