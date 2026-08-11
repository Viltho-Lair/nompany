"use client";

import { useState } from "react";
import Link from "next/link";
import OtpStep from "@/components/public/OtpStep";
import SocialButtons from "@/components/public/SocialButtons";
import { PASSWORD_RULES, checkPassword, describeFailures } from "@/lib/passwordPolicy";

const input =
  "w-full rounded-xl border border-steel-200 bg-white px-4 py-3 text-sm text-brand-950 placeholder:text-steel-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-steel-800 dark:text-white";
const label = "mb-1.5 block text-xs font-600 uppercase tracking-wide text-steel-500 dark:text-slate-400";

// Sign-up is OTP-first: the account is created, but no session exists until the
// emailed code is entered — so an unproven address can never be signed in.
export default function SignupForm({ locale, dict, providers = [] }) {
  const t = dict?.auth || {};
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirm: "" });
  const [stage, setStage] = useState("details"); // details | otp
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const strength = checkPassword(form.password);
  const mismatch = form.confirm.length > 0 && form.password !== form.confirm;
  const canSubmit = form.fullName && form.email && strength.ok && form.password === form.confirm && form.confirm.length > 0;

  async function onSubmit(e) {
    e.preventDefault();
    // The server enforces the same policy; this just avoids a pointless round-trip.
    if (!strength.ok) { setError("Your password doesn't meet the requirements yet."); return; }
    if (form.password !== form.confirm) { setError("The two passwords don't match."); return; }
    setError(""); setNotice(""); setLoading(true);
    try {
      const res = await fetch("/api/identity/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: form.fullName, email: form.email, password: form.password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data.error === "exists" ? "That email already has an account."
          : data.error === "weak" ? describeFailures(data.failed)
          : data.error === "email" ? "That email address doesn't look right."
          : data.error === "rate-email" || data.error === "rate-ip" ? "Too many attempts. Try again later."
          : "We couldn't create your account. Try again."
        );
        setLoading(false);
        return;
      }
      if (data.emailSent === false) setNotice("We couldn't send the code by email — contact support if it doesn't arrive.");
      setStage("otp");
    } catch {
      setError(t.errGeneric || "Something went wrong. Try again.");
    } finally { setLoading(false); }
  }

  if (stage === "otp") {
    return (
      <div className="space-y-4">
        {notice && <p className="text-sm text-amber-600 dark:text-amber-400">{notice}</p>}
        <OtpStep
          email={form.email}
          submitLabel="Confirm email"
          onVerified={() => window.location.assign(`/${locale}/questionnaire`)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SocialButtons providers={providers} mode="signup" />
      <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className={label} htmlFor="fullName">{t.nameLabel || "Full name"}</label>
        <input id="fullName" className={input} value={form.fullName} onChange={set("fullName")} autoComplete="name" required />
      </div>
      <div>
        <label className={label} htmlFor="email">{t.emailLabel || "Email"}</label>
        <input id="email" type="email" className={input} value={form.email} onChange={set("email")} autoComplete="email" required />
        <p className="mt-1 text-xs text-steel-500 dark:text-slate-400">Capitals are fine — we store and match your address in lowercase.</p>
      </div>
      <div>
        <label className={label} htmlFor="password">{t.passwordLabel || "Password"}</label>
        <input id="password" type="password" className={input} value={form.password} onChange={set("password")} autoComplete="new-password" required />
        <ul className="mt-2 space-y-1">
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(form.password);
            const idle = form.password.length === 0;
            return (
              <li key={rule.key} className={`flex items-center gap-2 text-xs ${idle ? "text-steel-500 dark:text-slate-400" : met ? "text-emerald-600 dark:text-emerald-400" : "text-steel-500 dark:text-slate-400"}`}>
                <span aria-hidden="true" className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-700 ${met ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-steel-200/60 text-steel-500 dark:bg-white/10 dark:text-slate-400"}`}>
                  {met ? "✓" : "•"}
                </span>
                {rule.label}
              </li>
            );
          })}
        </ul>
      </div>
      <div>
        <label className={label} htmlFor="confirm">Confirm password</label>
        <input
          id="confirm"
          type="password"
          className={`${input} ${mismatch ? "border-danger focus:border-danger focus:ring-danger/20" : ""}`}
          value={form.confirm}
          onChange={set("confirm")}
          autoComplete="new-password"
          aria-invalid={mismatch || undefined}
          required
        />
        {mismatch && <p className="mt-1 text-xs text-danger">The two passwords don't match.</p>}
      </div>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <button
        type="submit"
        disabled={loading || !canSubmit}
        className="w-full rounded-full bg-brand-600 px-6 py-3 font-display text-sm font-700 uppercase tracking-[0.12em] text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "Creating…" : (t.signupCta || "Create account")}
      </button>
      <p className="pt-2 text-center text-sm text-steel-500 dark:text-slate-400">
        {t.haveAccount || "Already have an account?"}{" "}
        <Link href={`/${locale}/login`} className="font-600 text-brand-600 hover:underline dark:text-brand-400">
          {t.loginLink || "Sign in"}
        </Link>
      </p>
      </form>
    </div>
  );
}
