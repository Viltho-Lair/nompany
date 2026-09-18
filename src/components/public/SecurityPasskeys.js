"use client";

import { useEffect, useState } from "react";
import { useAccountLocale } from "@/components/public/locale";
import { securityDict } from "@/shared/security";
import { Icon } from "@/components/studio2/icons";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { STACK, ROW, ROW_LABEL, ROW_VALUE, INPUT, LABEL, BTN, BTN_GHOST } from "@/components/public/accountKit";

// THIS PERSON'S PASSKEYS (platform/auth/passkeys.ts): the list, adding one, and
// removing one. Adding and removing ask for the account password where there
// is one. The WebAuthn library is loaded only when a passkey is being made.
export default function SecurityPasskeys({ hasPassword }) {
  const t = securityDict(useAccountLocale());
  const [keys, setKeys] = useState(null);
  const [mode, setMode] = useState("");        // "" | "add" | <id being removed>
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/identity/passkeys", { cache: "no-store" })
      .then((r) => r.json()).then((d) => { if (alive && d?.ok) setKeys(d.passkeys || []); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  function close() { setMode(""); setName(""); setPassword(""); setError(""); }

  const fail = (code) => setError(code === "invalid" ? t.passwordWrong : t.somethingWrong);

  async function add(e) {
    e.preventDefault();
    if (typeof window.PublicKeyCredential !== "function") { setError(t.passkeyUnsupported); return; }
    setBusy(true); setError("");
    try {
      const begun = await fetch("/api/identity/passkeys", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "begin" }),
      }).then((r) => r.json());
      if (!begun?.ok) { fail(begun?.error); return; }
      const { startRegistration } = await import("@simplewebauthn/browser");
      let response;
      try { response = await startRegistration({ optionsJSON: begun.options }); } catch { setError(t.passkeyCancelled); return; }
      const res = await fetch("/api/identity/passkeys", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finish", response, name, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { fail(data.error); return; }
      setKeys(data.passkeys || []);
      close();
    } finally { setBusy(false); }
  }

  async function remove(e) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await fetch("/api/identity/passkeys", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: mode, password }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { fail(data.error); return; }
    setKeys(data.passkeys || []);
    close();
  }

  if (!keys) return null;

  return (
    <section className="mt-8">
      <h3 className="font-display text-lg font-500 text-slate-900 dark:text-white">{t.passkeysTitle}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.passkeysBlurb}</p>
      <div className={cn(STACK, "mt-4")}>
        {keys.length === 0 && (
          <div className={ROW}>
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center">
              <Icon name="key" className="h-[18px] w-[18px] text-slate-400 dark:text-slate-500" />
            </span>
            <span className={ROW_VALUE}>{t.passkeyNone}</span>
          </div>
        )}
        {keys.map((k) => (
          <div key={k.id} className={ROW}>
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center">
              <Icon name="key" className="h-[18px] w-[18px] text-slate-400 dark:text-slate-500" />
            </span>
            <div className="flex min-w-0 flex-col justify-center">
              <span className="flex flex-wrap items-center gap-2">
                <span className={ROW_LABEL}>{k.name}</span>
                {k.synced && <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[11px] font-600 text-slate-600 dark:text-slate-300">{t.passkeySynced}</span>}
              </span>
              <span className={ROW_VALUE}>
                {[t.passkeyAdded(fmtDateTime(k.createdAt)), k.lastUsedAt ? t.passkeyUsed(fmtDateTime(k.lastUsedAt)) : ""].filter(Boolean).join(" · ")}
              </span>
            </div>
            <button type="button" onClick={() => { close(); setMode(k.id); }}
              className="ms-auto shrink-0 rounded-full px-3 py-1.5 text-xs font-600 text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10">
              {t.passkeyRemove}
            </button>
          </div>
        ))}
      </div>

      {!mode && (
        <button type="button" className={cn(BTN_GHOST, "mt-3")} onClick={() => { close(); setMode("add"); }}>{t.passkeyAdd}</button>
      )}

      {mode && (
        <form onSubmit={mode === "add" ? add : remove} className="mt-3 space-y-3 rounded-[20px] bg-white p-4 dark:bg-[#20202c]">
          {mode === "add" && (
            <div>
              <label className={LABEL} htmlFor="pk-name">{t.passkeyName}</label>
              <input id="pk-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} className={INPUT} />
            </div>
          )}
          {hasPassword && (
            <div>
              <label className={LABEL} htmlFor="pk-password">{t.accountPassword}</label>
              <input id="pk-password" type="password" autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT} />
            </div>
          )}
          {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={BTN}>{busy ? t.saving : mode === "add" ? t.passkeyAdd : t.passkeyRemove}</button>
            <button type="button" onClick={close} className={BTN_GHOST}>{t.cancel}</button>
          </div>
        </form>
      )}
    </section>
  );
}
