"use client";

import { useEffect, useState } from "react";
import { useAccountLocale } from "@/components/public/locale";
import { securityDict } from "@/shared/security";
import { pinProblem, IDLE_CHOICES } from "@/shared/pin";
import { Icon } from "@/components/studio2/icons";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import SelectMenu from "@/components/fields/SelectMenu";
import { STACK, ROW, ROW_LABEL, ROW_VALUE, INPUT, LABEL, BTN, BTN_GHOST } from "@/components/public/accountKit";

// THE SCREEN LOCK'S SETTINGS: the personal PIN and the idle timeout
// (docs/functionality/sessions-and-devices.md). Setting or removing the PIN
// asks for the account password where the account has one; the timeout needs a
// PIN, because nothing else could unlock what it locks.
export default function SecurityLock() {
  const t = securityDict(useAccountLocale());
  const [info, setInfo] = useState(null);
  const [mode, setMode] = useState("");          // "" | "set" | "remove"
  const [pin, setPin] = useState("");
  const [again, setAgain] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/identity/security", { cache: "no-store" })
      .then((r) => r.json()).then((d) => { if (alive && d?.ok) setInfo(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const REFUSAL = {
    "pin-format": t.pinFormat, "pin-weak": t.pinWeak, "pin-is-password": t.pinIsPassword,
    invalid: t.passwordWrong, "pin-required": t.idleNeedsPin,
  };

  async function send(method, body) {
    setBusy(true); setError("");
    const res = await fetch("/api/identity/security", {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(REFUSAL[data.error] || t.somethingWrong); return false; }
    setInfo(data);
    return true;
  }

  async function savePin(e) {
    e.preventDefault();
    const problem = pinProblem(pin);
    if (problem) { setError(problem === "weak" ? t.pinWeak : t.pinFormat); return; }
    if (pin !== again) { setError(t.pinMismatch); return; }
    if (await send("PUT", { pin, password })) close();
  }
  async function dropPin(e) {
    e.preventDefault();
    if (await send("DELETE", { password })) close();
  }
  function close() { setMode(""); setPin(""); setAgain(""); setPassword(""); setError(""); }

  if (!info) return null;
  const askPassword = info.hasPassword;

  return (
    <section className="mt-8">
      <h3 className="font-display text-lg font-500 text-slate-900 dark:text-white">{t.lockSectionTitle}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.lockSectionBlurb}</p>
      <div className={cn(STACK, "mt-4")}>
        <div className={ROW}>
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center">
            <Icon name="lock" className="h-[18px] w-[18px] text-slate-400 dark:text-slate-500" />
          </span>
          <div className="flex min-w-0 flex-col justify-center">
            <span className={ROW_LABEL}>{t.pinLabel}</span>
            <span className={ROW_VALUE}>{info.hasPin ? t.pinSet(fmtDateTime(info.pinSetAt)) : t.pinNotSet}</span>
          </div>
          <span className="ms-auto flex shrink-0 gap-1">
            <button type="button" onClick={() => { close(); setMode("set"); }}
              className="rounded-full px-3 py-1.5 text-xs font-600 text-brand-700 hover:bg-brand-500/10 dark:text-brand-300">
              {info.hasPin ? t.changePin : t.setPin}
            </button>
            {info.hasPin && (
              <button type="button" onClick={() => { close(); setMode("remove"); }}
                className="rounded-full px-3 py-1.5 text-xs font-600 text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10">
                {t.removePin}
              </button>
            )}
          </span>
        </div>

        <div className={ROW}>
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center">
            <Icon name="clock" className="h-[18px] w-[18px] text-slate-400 dark:text-slate-500" />
          </span>
          <label className="flex min-w-0 flex-col justify-center" htmlFor="idle-minutes">
            <span className={ROW_LABEL}>{t.idleLabel}</span>
            {!info.hasPin && <span className={ROW_VALUE}>{t.idleNeedsPin}</span>}
          </label>
          <SelectMenu
            id="idle-minutes"
            aria-label={t.idleLabel}
            className="ms-auto w-40"
            value={String(info.idleMinutes)}
            disabled={!info.hasPin || busy}
            onChange={(v) => send("PATCH", { idleMinutes: Number(v) })}
            options={IDLE_CHOICES.map((m) => ({ value: String(m), label: m === 0 ? t.idleOff : t.idleMinutes(m) }))}
          />
        </div>
      </div>

      {mode && (
        <form onSubmit={mode === "set" ? savePin : dropPin}
          className="mt-3 space-y-3 rounded-[20px] bg-white p-4 dark:bg-[#20202c]">
          {mode === "set" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={LABEL} htmlFor="pin-new">{t.newPin}</label>
                <input id="pin-new" type="password" inputMode="numeric" autoComplete="off" maxLength={8} dir="ltr"
                  value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} className={INPUT} />
              </div>
              <div>
                <label className={LABEL} htmlFor="pin-again">{t.confirmPin}</label>
                <input id="pin-again" type="password" inputMode="numeric" autoComplete="off" maxLength={8} dir="ltr"
                  value={again} onChange={(e) => setAgain(e.target.value.replace(/\D/g, ""))} className={INPUT} />
              </div>
            </div>
          )}
          {askPassword && (
            <div>
              <label className={LABEL} htmlFor="pin-password">{t.accountPassword}</label>
              <input id="pin-password" type="password" autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT} />
            </div>
          )}
          {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={BTN}>{busy ? t.saving : mode === "set" ? t.save : t.removePin}</button>
            <button type="button" onClick={close} className={BTN_GHOST}>{t.cancel}</button>
          </div>
        </form>
      )}
      {!mode && error && <p role="alert" className="mt-2 text-sm text-rose-600 dark:text-rose-300">{error}</p>}
    </section>
  );
}
