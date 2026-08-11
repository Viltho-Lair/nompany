"use client";

import { useState } from "react";
import Link from "next/link";
import OtpStep from "@/components/public/OtpStep";
import SocialButtons from "@/components/public/SocialButtons";

const input =
  "w-full rounded-xl border border-steel-200 bg-white px-4 py-3 text-sm text-brand-950 placeholder:text-steel-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-steel-800 dark:text-white";
const label = "mb-1.5 block text-xs font-600 uppercase tracking-wide text-steel-500 dark:text-slate-400";

// Risk-based sign-in: password first, then a one-time code ONLY when this
// browser isn't already trusted. A recognised device goes straight through.
export default function LoginForm({ locale, dict, providers = [] }) {
  const t = dict?.auth || {};
  const [form, setForm] = useState({ email: "", password: "", remember: true });
  const [stage, setStage] = useState("credentials"); // credentials | otp
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setError(""); setNotice(""); setLoading(true);
    try {
      const res = await fetch("/api/identity/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password, remember: form.remember }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data.error === "suspended" ? "This account is suspended."
          : data.error === "rate-email" || data.error === "rate-ip" ? "Too many attempts. Try again later."
          : (t.errInvalid || "That email or password isn't right.")
        );
        setLoading(false);
        return;
      }
      if (data.otpRequired) {
        if (data.emailSent === false) setNotice("We couldn't send the code by email — contact support if it doesn't arrive.");
        setStage("otp");
        setLoading(false);
        return;
      }
      window.location.assign(`/${locale}/account`);   // trusted device — straight in
    } catch {
      setError(t.errGeneric || "Something went wrong. Try again.");
      setLoading(false);
    }
  }

  if (stage === "otp") {
    return (
      <div className="space-y-4">
        {notice && <p className="text-sm text-amber-600 dark:text-amber-400">{notice}</p>}
        <OtpStep
          email={form.email}
          submitLabel="Sign in"
          onVerified={() => window.location.assign(`/${locale}/questionnaire`)}
        />
        <button type="button" onClick={() => { setStage("credentials"); setLoading(false); }} className="text-sm font-600 text-steel-500 hover:underline dark:text-slate-400">
          Use a different account
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SocialButtons providers={providers} mode="login" />
      <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className={label} htmlFor="email">{t.emailLabel || "Email"}</label>
        <input id="email" type="email" className={input} value={form.email} onChange={set("email")} autoComplete="email" required />
      </div>
      <div>
        <label className={label} htmlFor="password">{t.passwordLabel || "Password"}</label>
        <input id="password" type="password" className={input} value={form.password} onChange={set("password")} autoComplete="current-password" required />
      </div>
      <div className="flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-steel-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={form.remember}
            onChange={(e) => setForm((f) => ({ ...f, remember: e.target.checked }))}
            className="h-4 w-4 cursor-pointer accent-brand-600"
          />
          {t.rememberMe || "Keep me signed in"}
        </label>
        <Link href={`/${locale}/forgot`} className="text-sm font-600 text-brand-600 hover:underline dark:text-brand-400">
          {t.forgotLink || "Forgot password?"}
        </Link>
      </div>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-brand-600 px-6 py-3 font-display text-sm font-700 uppercase tracking-[0.12em] text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? (t.loginLoading || "Signing in…") : (t.loginCta || "Sign in")}
      </button>
      <p className="pt-2 text-center text-sm text-steel-500 dark:text-slate-400">
        {t.noAccount || "No account yet?"}{" "}
        <Link href={`/${locale}/signup`} className="font-600 text-brand-600 hover:underline dark:text-brand-400">
          {t.signupLink || "Create one"}
        </Link>
      </p>
      </form>
    </div>
  );
}
