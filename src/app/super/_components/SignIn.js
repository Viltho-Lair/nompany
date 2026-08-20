"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell, Field, PasswordInput } from "./auth";
import { BASE } from "./nav";
import Icon from "./Icon";
import { toneBg, toneInk } from "./ui";

// The real /super sign-in — the only page of the console that is reachable
// signed out.
//
// It carries EXACTLY three controls: email, password, Sign In. No "forgot
// password", no "remember me", no "create account", no social sign-in. None of
// those belong on an owner's console: accounts here are provisioned by seeding
// (src/lib/superAuth.js → seedSuperAdmin), never self-served, and a session is
// deliberately short-lived rather than remembered.
//
// The demo auth layouts under (full)/v1 and (full)/v2 still show the full
// template versions of those screens; they are design surfaces, not this door.

const MESSAGES = {
  invalid: "Incorrect email or password.",
  rate: "Too many attempts. Try again in a few minutes.",
  network: "Couldn't reach the server. Check your connection and try again.",
};

export default function SignIn() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (busy) return;
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/super/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") || "").trim(),
          password: String(form.get("password") || ""),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(MESSAGES[data.error] || MESSAGES.invalid);
        setBusy(false);
        return;
      }
      // The console is a server-rendered gate, so the cached signed-out tree has
      // to go before we navigate into it.
      router.replace(`${BASE}/dashboard`);
      router.refresh();
    } catch {
      setError(MESSAGES.network);
      setBusy(false);
    }
  }

  return (
    <AuthShell variant="v2" title="Sign in" sub="Super Admin console — authorised access only.">
      <form onSubmit={onSubmit} noValidate>
        <div className="flex flex-col gap-5">
          {error ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md px-3 py-2.5 text-sm"
              style={{ backgroundColor: toneBg("danger", 0.12), color: toneInk("danger") }}
            >
              <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
          <Field label="Email">
            <input
              name="email"
              type="email"
              required
              autoComplete="username"
              autoFocus
              className="ad-input"
              placeholder="you@example.com"
            />
          </Field>
          <Field label="Password">
            <PasswordInput name="password" required autoComplete="current-password" />
          </Field>
          <button type="submit" className="ad-btn ad-btn-primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign In"}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
