"use client";

import { useEffect, useState } from "react";
import { securityDict } from "@/shared/security";

// A CASHIER TAKES OVER A PAIRED TILL: pick a name, type the PIN. Shown on the
// sign-in page of a paired device, and behind "Switch cashier" on the till
// itself. Reads the till from the device's own cookie
// (`/api/identity/till`), so it draws nothing at all anywhere else.
//
// AND IT CAN UNPAIR THE DEVICE (26/09/2026): "Unpair this browser" asks once
// and makes this browser stop being a till. No PIN — the route says why. A
// computer paired once, often somebody's own, otherwise opened on this screen
// for a year.
export default function TillCashierSwitch({ locale = "en", onDone, onCancel, cancelLabel, onTill, onUnpaired }) {
  const t = securityDict(locale);
  const [till, setTill] = useState(undefined);
  const [who, setWho] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [unpairing, setUnpairing] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/identity/till", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (alive) { setTill(d?.till || null); onTill?.(d?.till || null); } })
      .catch(() => { if (alive) setTill(null); });
    return () => { alive = false; };
  }, [onTill]);

  async function submit(e) {
    e.preventDefault();
    if (!who || !pin) return;
    setBusy(true); setError("");
    const res = await fetch("/api/identity/till", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collaboratorId: who, pin }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setPin("");
    if (res.ok && data?.ok) { onDone?.(data.slug); return; }
    setError(
      data?.error === "pin-invalid" ? t.pinWrong(Number(data.attemptsLeft) || 1)
        : data?.error === "pin-locked" ? t.pinLockedFor
          : data?.error === "pin-not-set" ? t.pinNotSetTill
            : t.somethingWrong,
    );
  }

  async function unpair() {
    setBusy(true); setError("");
    const res = await fetch("/api/identity/till", { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !data?.ok) { setError(t.somethingWrong); return; }
    if (onUnpaired) onUnpaired(); else window.location.reload();
  }

  if (!till) return null;
  const tillName = [till.terminal.code, till.terminal.name].filter(Boolean).join(" · ");
  const link = "text-sm font-600 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white";

  if (unpairing) {
    return (
      <div className="w-full space-y-4 text-start">
        <div>
          <h2 className="font-display text-lg font-700 text-slate-900 dark:text-white">{t.unpairTitle(till.studio.name)}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.unpairBody}</p>
        </div>
        {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={unpair} disabled={busy}
            className="rounded-full bg-rose-600 px-5 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-rose-700 disabled:opacity-60">
            {t.unpair}
          </button>
          <button type="button" onClick={() => { setUnpairing(false); setError(""); }} className={link}>{t.cancel}</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="w-full space-y-4 text-start">
      <div>
        <h2 className="font-display text-lg font-700 text-slate-900 dark:text-white">{t.tillSignInTitle(tillName)}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{till.studio.name}</p>
      </div>
      {till.cashiers.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t.noCashiers}</p>
      ) : (
        <div role="radiogroup" aria-label={t.whoIsSelling} className="grid grid-cols-2 gap-2">
          {till.cashiers.map((c) => (
            <button key={c.id} type="button" role="radio" aria-checked={who === c.id} onClick={() => setWho(c.id)}
              className={`truncate rounded-xl border px-3 py-2.5 text-sm font-600 transition-colors ${
                who === c.id
                  ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                  : "border-slate-200 text-slate-700 hover:border-slate-400 dark:border-white/15 dark:text-slate-200"
              }`}>
              {c.name}
            </button>
          ))}
        </div>
      )}
      {who && (
        <div>
          <label htmlFor="till-pin" className="block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{t.pinLabel}</label>
          <input id="till-pin" type="password" inputMode="numeric" autoComplete="off" autoFocus maxLength={8} dir="ltr"
            value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} disabled={busy}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-center font-display text-2xl tracking-[0.4em] text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white" />
        </div>
      )}
      {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}
      <div className="flex items-center justify-between gap-3">
        <button type="submit" disabled={busy || !who || pin.length < 4}
          className="rounded-full bg-brand-700 px-5 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60">
          {busy ? t.unlocking : t.takeOver}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={link}>{cancelLabel || t.cancel}</button>
        )}
      </div>
      <button type="button" onClick={() => { setUnpairing(true); setError(""); }}
        className="text-xs font-600 text-slate-400 hover:text-rose-600 dark:hover:text-rose-300">
        {t.unpairBrowser}
      </button>
    </form>
  );
}
