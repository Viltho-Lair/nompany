"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccountLocale } from "@/components/public/locale";
import { securityDict } from "@/shared/security";
import { Icon } from "@/components/studio2/icons";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { STACK, ROW, ROW_LABEL, ROW_VALUE } from "@/components/public/accountKit";

// WHERE THIS PERSON IS SIGNED IN, on the account's Security page.
//
// A SESSION IS NOT A DEVICE. The device list below this says which browsers
// this account has used and which may skip the emailed code; this says which of
// them is signed in RIGHT NOW, which is what the limit counts. Somebody at the
// limit comes here to choose which to sign out before they are asked to.
export default function SecuritySessions() {
  const t = securityDict(useAccountLocale());
  const [sessions, setSessions] = useState(null);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/identity/sessions", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    setSessions(res.ok ? data.sessions || [] : []);
  }, []);
  useEffect(() => {
    let alive = true;
    fetch("/api/identity/sessions", { cache: "no-store" })
      .then((r) => r.json()).then((d) => { if (alive) setSessions(d?.sessions || []); })
      .catch(() => { if (alive) setSessions([]); });
    return () => { alive = false; };
  }, []);

  async function end(id) {
    setBusy(id);
    await fetch("/api/identity/sessions", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    });
    setBusy("");
    load();
  }

  return (
    <section className="mt-8">
      <h3 className="font-display text-lg font-500 text-slate-900 dark:text-white">{t.sessionsTitle}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.limitRule}</p>
      <div className={cn(STACK, "mt-4")}>
        {(sessions || []).map((s) => (
          <div key={s.id} className={ROW}>
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center">
              <Icon name={s.deviceType === "Phone" ? "call" : s.deviceType === "Portable Device" ? "gallery" : "shield"}
                className="h-[18px] w-[18px] text-slate-400 dark:text-slate-500" />
            </span>
            <div className="flex min-w-0 flex-col justify-center">
              <span className="flex flex-wrap items-center gap-2">
                <span className={ROW_LABEL}>{s.label || t.unknownDevice}</span>
                {s.current && (
                  <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-600 text-brand-700 dark:text-brand-300">{t.thisSession}</span>
                )}
                {s.till && (
                  <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[11px] font-600 text-slate-600 dark:text-slate-300">{t.tillSession}</span>
                )}
              </span>
              <span className={ROW_VALUE}>
                {[t.deviceType[s.deviceType] || "", s.location, s.lastActiveAt ? t.lastActive(fmtDateTime(s.lastActiveAt)) : ""]
                  .filter(Boolean).join(" · ")}
              </span>
            </div>
            {!s.current && (
              <button type="button" onClick={() => end(s.id)} disabled={Boolean(busy)}
                className="ms-auto shrink-0 rounded-full px-3 py-1.5 text-xs font-600 text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:text-rose-300 dark:hover:bg-rose-500/10">
                {busy === s.id ? t.signingOut : t.signOutSession}
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
