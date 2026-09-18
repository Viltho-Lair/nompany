"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { securityDict } from "@/shared/security";

// THE LOCK, ON THE SCREEN — the button beside the profile, the idle timer, and
// the cover that asks for the PIN. `platform/auth/lock.ts` is the half that
// holds: a locked session is refused on every request, so what this draws is
// the consequence of the lock rather than the lock itself.
//
// EVERY TAB AGREES. Locking or unlocking in one tab tells the others over a
// BroadcastChannel, activity in any tab counts for all of them (the last-active
// time is shared through storage), and a request any tab makes that comes back
// 423 locks that tab too — which is how a tab asleep in the background finds out.
//
// THE COVER IS OPAQUE. A lock that blurred the page would still show what was
// on it to whoever walked up.

const CHANNEL = "nompany-session";
const LAST_ACTIVE = "nompany:lastActive";
const LAST_BEAT = "nompany:lastBeat";
const BEAT_MS = 60 * 1000;
const CHECK_MS = 15 * 1000;

const readNum = (key) => { try { return Number(window.localStorage.getItem(key)) || 0; } catch { return 0; } };
const writeNum = (key, v) => { try { window.localStorage.setItem(key, String(v)); } catch { /* private window */ } };

// ONE OBSERVER FOR THE WHOLE PAGE. Every screen fetches on its own, and none of
// them knows about the lock; watching responses here is what lets any of them
// trigger it without each learning a new status code.
function installLockObserver() {
  if (typeof window === "undefined" || window.__nompanyLockObserver) return;
  window.__nompanyLockObserver = true;
  const original = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const res = await original(...args);
    if (res.status === 423) window.dispatchEvent(new Event("nompany:locked"));
    return res;
  };
}

async function post(body) {
  const res = await fetch("/api/identity/session/lock", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

export default function SessionLock({ locale = "en", buttonClass = "" }) {
  const t = securityDict(locale);
  const [idleMs, setIdleMs] = useState(0);
  const [locked, setLocked] = useState(false);
  const [byIdle, setByIdle] = useState(false);
  const [needsPin, setNeedsPin] = useState(false);
  const channel = useRef(null);

  const showLocked = useCallback((idle = false) => { setByIdle(idle); setLocked(true); }, []);

  const lock = useCallback(async (idle = false) => {
    const { status, data } = await post({ action: "lock" });
    if (data?.error === "pin-required") { setNeedsPin(true); return; }
    if (status === 200 || status === 423) {
      showLocked(idle);
      channel.current?.postMessage("locked");
    }
  }, [showLocked]);

  // What this session is: is it locked already, and does it lock by itself.
  useEffect(() => {
    installLockObserver();
    let alive = true;
    fetch("/api/identity/session/lock", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive || !d?.signedIn) return;
        setIdleMs(Number(d.idleMs) || 0);
        if (d.locked) showLocked(false);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [showLocked]);

  // The other tabs, the fetch observer, and the button.
  useEffect(() => {
    const bc = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CHANNEL);
    channel.current = bc;
    if (bc) bc.onmessage = (m) => { if (m.data === "locked") showLocked(false); if (m.data === "unlocked") setLocked(false); };
    const onLocked = () => showLocked(false);
    const onButton = () => lock(false);
    window.addEventListener("nompany:locked", onLocked);
    window.addEventListener("nompany:lock", onButton);
    return () => {
      bc?.close();
      window.removeEventListener("nompany:locked", onLocked);
      window.removeEventListener("nompany:lock", onButton);
    };
  }, [lock, showLocked]);

  // THE IDLE TIMER AND THE HEARTBEAT, only for a person who chose a timeout.
  // Activity is noted at most every five seconds; the server hears of it at
  // most once a minute, from whichever tab gets there first.
  useEffect(() => {
    if (!idleMs || locked) return undefined;
    let noted = 0;
    const note = () => {
      const now = Date.now();
      if (now - noted < 5000) return;
      noted = now;
      writeNum(LAST_ACTIVE, now);
    };
    writeNum(LAST_ACTIVE, Math.max(readNum(LAST_ACTIVE), Date.now()));
    const events = ["pointerdown", "keydown", "wheel", "touchstart"];
    for (const e of events) window.addEventListener(e, note, { passive: true });
    const timer = setInterval(async () => {
      const now = Date.now();
      const last = readNum(LAST_ACTIVE);
      if (now - last > idleMs) { lock(true); return; }
      if (last > readNum(LAST_BEAT) && now - readNum(LAST_BEAT) >= BEAT_MS) {
        writeNum(LAST_BEAT, now);
        const { status } = await post({ action: "active" });
        if (status === 423) showLocked(true);
      }
    }, CHECK_MS);
    return () => {
      for (const e of events) window.removeEventListener(e, note);
      clearInterval(timer);
    };
  }, [idleMs, locked, lock, showLocked]);

  const onUnlocked = useCallback(() => {
    writeNum(LAST_ACTIVE, Date.now());
    setLocked(false);
    channel.current?.postMessage("unlocked");
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => lock(false)}
        title={t.lock}
        aria-label={t.lock}
        className={buttonClass || "inline-flex h-9 w-9 items-center justify-center rounded-full border border-current/20 text-slate-600 transition-colors hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 dark:text-slate-300 dark:hover:text-white"}
      >
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 118 0v3" />
        </svg>
      </button>
      {needsPin && <NeedsPin t={t} locale={locale} onClose={() => setNeedsPin(false)} />}
      {locked && <LockCover t={t} locale={locale} byIdle={byIdle} onUnlocked={onUnlocked} />}
    </>
  );
}

function NeedsPin({ t, locale, onClose }) {
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-[#20202c]">
        <p className="text-sm text-slate-700 dark:text-slate-200">{t.lockNeedsPin}</p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full px-3 py-1.5 text-sm font-600 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5">{t.dismiss}</button>
          <a href={`/${locale}/account?view=security`} className="rounded-full bg-brand-700 px-4 py-1.5 text-sm font-600 text-white hover:bg-brand-950">{t.openSecurity}</a>
        </div>
      </div>
    </div>
  );
}

// The cover itself. Also used by the sign-in page when a locked session
// reloads a page, which is why it takes its callbacks rather than knowing
// where it is.
export function LockCover({ t, locale, byIdle, onUnlocked, inline = false }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function unlock(e) {
    e?.preventDefault();
    if (!pin) return;
    setBusy(true); setError("");
    const { status, data } = await post({ action: "unlock", pin });
    setBusy(false);
    setPin("");
    if (status === 200 && data?.ok) { onUnlocked?.(); return; }
    if (data?.error === "pin-locked-out" || data?.error === "unauthorized") {
      setError(t.pinLockedOut);
      setTimeout(() => window.location.assign(`/${locale}/login`), 1500);
      return;
    }
    setError(data?.error === "pin-invalid" ? t.pinWrong(Number(data.attemptsLeft) || 1) : t.somethingWrong);
  }

  async function signOut() {
    await fetch("/api/identity/logout", { method: "POST" }).catch(() => {});
    window.location.assign(`/${locale}/login`);
  }

  const form = (
    <form onSubmit={unlock} className="w-full max-w-sm rounded-2xl bg-white p-6 text-start shadow-xl dark:bg-[#20202c]">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-300">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 118 0v3" />
        </svg>
      </div>
      <h2 className="font-display text-xl font-700 text-slate-900 dark:text-white">{t.lockTitle}</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{byIdle ? t.lockBodyIdle : t.lockBody}</p>
      <label className="mt-5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400" htmlFor="lock-pin">{t.pinLabel}</label>
      <input
        id="lock-pin"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        autoFocus
        maxLength={8}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        disabled={busy}
        dir="ltr"
        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-center font-display text-2xl tracking-[0.4em] text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white"
      />
      {error && <p role="alert" className="mt-2 text-sm text-rose-600 dark:text-rose-300">{error}</p>}
      <div className="mt-5 flex items-center justify-between gap-3">
        <button type="submit" disabled={busy || pin.length < 4}
          className="rounded-full bg-brand-700 px-5 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60">
          {busy ? t.unlocking : t.unlock}
        </button>
        <button type="button" onClick={signOut} className="text-sm font-600 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
          {t.signOutInstead}
        </button>
      </div>
    </form>
  );

  if (inline) return form;
  return (
    <div role="dialog" aria-modal="true" aria-label={t.lockTitle}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-100 p-4 dark:bg-[#0f0f14]">
      {form}
    </div>
  );
}
