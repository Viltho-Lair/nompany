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
// It carries EXACTLY three controls: email, password, Sign In — and a fourth
// that appears only when the account asks for it. No "forgot password", no
// "remember me", no "create account", no social sign-in. None of those belong on
// an owner's console: accounts here are provisioned by seeding
// (src/lib/superAuth.js → seedSuperAdmin), never self-served, and a session is
// deliberately short-lived rather than remembered.
//
// THE CODE FIELD APPEARS IN PLACE rather than on a second screen, and the email
// and password inputs stay mounted underneath it. That is deliberate: the server
// re-checks all three on the second submit — the first request minted nothing —
// so the form has to send them again, and keeping the inputs alive is what lets
// it do that without copying a password into React state.
//
// The demo auth layouts under (full)/v1 and (full)/v2 still show the full
// template versions of those screens; they are design surfaces, not this door.

const MESSAGES = {
  // ONE MESSAGE FOR THREE FAILURES — wrong email, wrong password, wrong code.
  // The server answers them identically and so does this; saying "the code was
  // wrong" would confirm that the email and password were right.
  invalid: "Incorrect email, password, or code.",
  rate: "Too many attempts. Try again in a few minutes.",
  network: "Couldn't reach the server. Check your connection and try again.",
};

export default function SignIn() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [needsCode, setNeedsCode] = useState(false);

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
          code: String(form.get("code") || "").trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));

      // THE PASSWORD WAS RIGHT AND THE SECOND FACTOR IS STILL OWED. Not an
      // error, so it does not read as one: the field appears and the person
      // carries on, rather than being told something went wrong.
      if (res.status === 401 && data.error === "mfa-required") {
        setNeedsCode(true);
        setError("");
        setBusy(false);
        return;
      }

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

          {needsCode ? (
            <Field label="Authentication code">
              {/* NOT inputMode="numeric". A six-digit code is numeric and a
                  recovery code is not, and this one field takes either — a
                  number pad would make the way back in the harder path to type.
                  autoComplete="one-time-code" still lets a phone offer it. */}
              <input
                name="code"
                type="text"
                required
                autoFocus
                autoComplete="one-time-code"
                className="ad-input"
                placeholder="123456 or a recovery code"
                aria-describedby="code-hint"
              />
              <p id="code-hint" className="mt-1.5 text-xs opacity-70">
                From your authenticator app. Lost your phone? Use one of your recovery codes.
              </p>
            </Field>
          ) : null}

          <button type="submit" className="ad-btn ad-btn-primary" disabled={busy}>
            {busy ? "Signing in…" : needsCode ? "Verify" : "Sign In"}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
