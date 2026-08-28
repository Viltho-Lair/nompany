"use client";

import { useState } from "react";
import { useAccountLocale } from "@/components/public/locale";
import { accountDict } from "@/shared/account";
import Link from "next/link";
import OtpStep from "@/components/public/OtpStep";
import SocialButtons from "@/components/public/SocialButtons";
import PasswordInput from "@/components/public/PasswordInput";
import { PASSWORD_RULES, checkPassword, describeFailures } from "@/platform/auth/passwordPolicy";

const input = "landing-field";
const label = "landing-label";

// Sign-up is OTP-first: the account is created, but no session exists until the
// emailed code is entered — so an unproven address can never be signed in.
export default function SignupForm({ locale, dict, providers = [] }) {
  const tr = accountDict(useAccountLocale());
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
    if (!strength.ok) { setError(tr.passwordDoesnMeetRequirements); return; }
    if (form.password !== form.confirm) { setError(tr.twoPasswordsMatch); return; }
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
          data.error === "exists" ? tr.emailAlreadyAccount
          : data.error === "weak" ? describeFailures(data.failed)
          : data.error === "email" ? tr.emailAddressDoesnLook
          : data.error === "rate-email" || data.error === "rate-ip" ? tr.tooManyAttemptsTry
          : tr.couldnCreateAccountTry
        );
        setLoading(false);
        return;
      }
      if (data.emailSent === false) setNotice(tr.couldnSendCodeEmail);
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
          submitLabel={tr.confirmEmail}
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
        <p className="mt-1 text-xs text-fg-muted">{tr.capitalsFineStoreMatch}</p>
      </div>
      <PasswordInput
        id="password"
        labelText={t.passwordLabel || "Password"}
        labelClassName={label}
        className={input}
        value={form.password}
        onChange={set("password")}
        autoComplete="new-password"
      >
        <ul className="mt-2 space-y-1">
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(form.password);
            const idle = form.password.length === 0;
            return (
              <li key={rule.key} className={`flex items-center gap-2 text-xs ${idle ? "text-fg-muted" : met ? "text-emerald-600 dark:text-emerald-400" : "text-fg-muted"}`}>
                <span aria-hidden="true" className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-700 ${met ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-line text-fg-dim"}`}>
                  {met ? "✓" : "•"}
                </span>
                {rule.label}
              </li>
            );
          })}
        </ul>
      </PasswordInput>
      <div>
        <PasswordInput
          id="confirm"
          labelText={tr.confirmPassword}
          labelClassName={label}
          className={`${input} ${mismatch ? "border-danger focus:border-danger focus:ring-danger/20" : ""}`}
          value={form.confirm}
          onChange={set("confirm")}
          autoComplete="new-password"
          ariaInvalid={mismatch}
        />
        {mismatch && <p className="mt-1 text-xs text-danger">{tr.twoPasswordsMatch}</p>}
      </div>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <button
        type="submit"
        disabled={loading || !canSubmit}
        className="landing-submit"
      >
        {loading ? tr.creating : (t.signupCta || "Create account")}
      </button>
      <p className="pt-2 text-center text-sm text-fg-muted">
        {t.haveAccount || "Already have an account?"}{" "}
        <Link href={`/${locale}/login`} className="font-600 text-iris-bright hover:underline">
          {t.loginLink || "Sign in"}
        </Link>
      </p>
      </form>
    </div>
  );
}
