"use client";

import { useState, useEffect } from "react";
import { useAccountLocale } from "@/components/public/locale";
import { securityDict } from "@/shared/security";
import { Icon } from "@/components/studio2/icons";
import { cn } from "@/lib/utils";
import { STACK, ROW, ROW_LABEL, ROW_VALUE, INPUT, LABEL, BTN, BTN_GHOST } from "@/components/public/accountKit";

// TWO-FACTOR SIGN-IN WITH AN AUTHENTICATOR APP (platform/auth/twoFactor.ts).
//
// Turning it on is the console's three steps: the server hands a secret and a
// QR and stores nothing; the person scans it and sends back one code the app
// produced, with their password; only then is it stored, and the ten recovery
// codes are shown — once. Turning it off needs a code too.
export default function SecurityTwoFactor({ hasPassword }) {
  const t = securityDict(useAccountLocale());
  const [info, setInfo] = useState(null);       // GET's answer
  const [mode, setMode] = useState("");         // "" | "enrol" | "disable"
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [codes, setCodes] = useState(null);     // recovery codes, shown once
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/identity/two-factor", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setInfo(data);
  }
  useEffect(() => {
    let alive = true;
    fetch("/api/identity/two-factor", { cache: "no-store" })
      .then((r) => r.json()).then((d) => { if (alive && d?.ok) setInfo(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  function close() { setMode(""); setCode(""); setPassword(""); setError(""); }

  async function enable(e) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await fetch("/api/identity/two-factor", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: info.secret, code: code.trim(), password }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(data.error === "invalid" ? t.passwordWrong : data.error === "code" ? t.codeWrong : t.somethingWrong); return; }
    close();
    setCodes(data.recoveryCodes || []);
  }

  async function disable(e) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await fetch("/api/identity/two-factor", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: code.trim() }),
    });
    setBusy(false);
    if (!res.ok) { setError(t.codeWrong); return; }
    close();
    await load();
  }

  if (!info) return null;

  return (
    <section className="mt-8">
      <h3 className="font-display text-lg font-500 text-slate-900 dark:text-white">{t.twoFactorTitle}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.twoFactorBlurb}</p>
      <div className={cn(STACK, "mt-4")}>
        <div className={ROW}>
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center">
            <Icon name="key" className="h-[18px] w-[18px] text-slate-400 dark:text-slate-500" />
          </span>
          <div className="flex min-w-0 flex-col justify-center">
            <span className={ROW_LABEL}>{t.twoFactorTitle}</span>
            <span className={ROW_VALUE}>{info.enabled ? t.twoFactorOn(info.recoveryLeft) : t.twoFactorOff}</span>
          </div>
          {!codes && (
            <button type="button" onClick={() => { close(); setMode(info.enabled ? "disable" : "enrol"); }}
              className={cn("ms-auto shrink-0 rounded-full px-3 py-1.5 text-xs font-600",
                info.enabled ? "text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10" : "text-brand-700 hover:bg-brand-500/10 dark:text-brand-300")}>
              {info.enabled ? t.turnOff : t.turnOn}
            </button>
          )}
        </div>
      </div>

      {mode === "enrol" && !info.enabled && (
        <form onSubmit={enable} className="mt-3 space-y-3 rounded-[20px] bg-white p-4 dark:bg-[#20202c]">
          <p className="text-sm text-slate-600 dark:text-slate-300">{t.scanQr}</p>
          {/* Drawn on the server as an SVG string — a QR of the secret must
              never be handed to a third party to draw. */}
          {info.qr ? <div className="mx-auto w-[200px] rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: info.qr }} /> : null}
          <div>
            <p className={LABEL}>{t.secretKey}</p>
            <code dir="ltr" className="block break-all rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-800 dark:bg-white/10 dark:text-slate-100">{info.secret}</code>
          </div>
          <div>
            <label className={LABEL} htmlFor="tf-code">{t.appCode}</label>
            <input id="tf-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} dir="ltr"
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className={INPUT} />
          </div>
          {hasPassword && (
            <div>
              <label className={LABEL} htmlFor="tf-password">{t.accountPassword}</label>
              <input id="tf-password" type="password" autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT} />
            </div>
          )}
          {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy || code.length !== 6} className={BTN}>{busy ? t.saving : t.turnOn}</button>
            <button type="button" onClick={close} className={BTN_GHOST}>{t.cancel}</button>
          </div>
        </form>
      )}

      {mode === "disable" && info.enabled && (
        <form onSubmit={disable} className="mt-3 space-y-3 rounded-[20px] bg-white p-4 dark:bg-[#20202c]">
          <p className="text-sm text-slate-600 dark:text-slate-300">{t.disableAsk}</p>
          <input aria-label={t.appCode} autoComplete="one-time-code" maxLength={14} dir="ltr"
            value={code} onChange={(e) => setCode(e.target.value)} className={INPUT} />
          {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy || !code.trim()} className={BTN}>{busy ? t.saving : t.turnOff}</button>
            <button type="button" onClick={close} className={BTN_GHOST}>{t.cancel}</button>
          </div>
        </form>
      )}

      {codes && (
        <div className="mt-3 space-y-3 rounded-[20px] bg-white p-4 dark:bg-[#20202c]">
          <p className="font-600 text-slate-900 dark:text-white">{t.recoveryTitle}</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">{t.recoveryBody}</p>
          <ul dir="ltr" className="grid grid-cols-2 gap-1.5 font-mono text-sm text-slate-800 dark:text-slate-100">
            {codes.map((c) => <li key={c} className="rounded bg-slate-100 px-2 py-1 dark:bg-white/10">{c}</li>)}
          </ul>
          <button type="button" className={BTN} onClick={async () => { setCodes(null); await load(); }}>{t.savedThem}</button>
        </div>
      )}
    </section>
  );
}
