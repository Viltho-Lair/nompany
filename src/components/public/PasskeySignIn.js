"use client";

import { useEffect, useState } from "react";
import { useAccountLocale } from "@/components/public/locale";
import { securityDict } from "@/shared/security";
// The public site's glass pill (27/09/2026): class strings only.
import { ERROR, GHOST } from "@/components/landing/site/pages/auth/ui";

// "SIGN IN WITH A PASSKEY" (platform/auth/passkeys.ts). Nothing is typed: the
// browser offers this site's passkeys, the person unlocks one, and the server
// checks the signature. The WebAuthn library is loaded only when the button is
// pressed, so the sign-in page pays nothing for it until then.
export default function PasskeySignIn({ onDone }) {
  const t = securityDict(useAccountLocale());
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Read after hydration: the server has no browser to ask.
    const ok = typeof window !== "undefined" && typeof window.PublicKeyCredential === "function";
    const id = setTimeout(() => setSupported(ok), 0);
    return () => clearTimeout(id);
  }, []);

  async function signIn() {
    setBusy(true); setError("");
    try {
      const begun = await fetch("/api/identity/passkey-signin", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "begin" }),
      }).then((r) => r.json());
      const { startAuthentication } = await import("@simplewebauthn/browser");
      const response = await startAuthentication({ optionsJSON: begun.options });
      const res = await fetch("/api/identity/passkey-signin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finish", ticketId: begun.ticketId, response }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "failed");
      onDone?.(data);
    } catch {
      setError(t.passkeyFailed);
      setBusy(false);
    }
  }

  if (!supported) return null;
  return (
    <div className="space-y-2">
      <button type="button" onClick={signIn} disabled={busy}
        className={`${GHOST} w-full px-4 text-[14px]`}>
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="9" cy="8" r="4" />
          <path d="M3 21v-1a6 6 0 0 1 9.5-4.9" />
          <circle cx="17.5" cy="15.5" r="2.5" />
          <path d="M17.5 18v3.5M17.5 20h1.5" />
        </svg>
        {t.passkeySignIn}
      </button>
      {error && <p role="alert" className={ERROR}>{error}</p>}
    </div>
  );
}
