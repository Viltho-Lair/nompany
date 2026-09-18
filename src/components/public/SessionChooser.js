"use client";

import { useState } from "react";
import { useAccountLocale } from "@/components/public/locale";
import { securityDict } from "@/shared/security";
import { fmtDateTime } from "@/lib/format";

// THE SESSION LIMIT, ASKED (docs/functionality/sessions-and-devices.md).
//
// The password and any code are already proven; this account is signed in on as
// many devices of this kind as it may be. The person picks which one to sign
// out — the oldest is chosen for them, because it is almost always the one they
// meant — and the sign-in finishes. Twenty people on one login meet this screen
// all day, which is the point.
export default function SessionChooser({ sessions: initial, onDone, onCancel }) {
  const t = securityDict(useAccountLocale());
  const [sessions, setSessions] = useState(initial || []);
  const [pick, setPick] = useState(initial?.[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/identity/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: pick }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error === "expired" ? t.chooseExpired : data.error || "error");
        setBusy(false);
        return;
      }
      // Somebody signed in again meanwhile: the list changed, ask again.
      if (data.chooseSession) {
        setSessions(data.sessions || []);
        setPick(data.sessions?.[0]?.id || "");
        setBusy(false);
        return;
      }
      onDone?.(data);
    } catch {
      setError(t.chooseExpired);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-700 text-fg">{t.chooseTitle}</h2>
        <p className="mt-1 text-sm text-fg-muted">{t.limitRule} {t.chooseBody}</p>
      </div>

      <div role="radiogroup" aria-label={t.chooseTitle} className="space-y-2">
        {sessions.map((s) => (
          <label
            key={s.id}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-sm transition-colors ${
              pick === s.id ? "border-iris bg-iris/10" : "border-line hover:border-fg-dim"
            }`}
          >
            <input
              type="radio"
              name="session"
              value={s.id}
              checked={pick === s.id}
              onChange={() => setPick(s.id)}
              className="mt-0.5 h-4 w-4 accent-iris"
            />
            <span className="min-w-0">
              <span className="block font-600 text-fg">
                {s.label || t.unknownDevice}
                {s.deviceType ? <span className="font-400 text-fg-muted"> · {t.deviceType[s.deviceType] || s.deviceType}</span> : null}
              </span>
              <span className="block text-fg-muted">
                {[s.location, s.createdAt ? t.signedInOn(fmtDateTime(s.createdAt)) : ""].filter(Boolean).join(" · ")}
              </span>
            </span>
          </label>
        ))}
      </div>

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}

      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={submit} disabled={busy || !pick} className="landing-submit w-auto">
          {t.chooseOne}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="landing-link text-sm">
          {t.chooseCancel}
        </button>
      </div>
    </div>
  );
}
