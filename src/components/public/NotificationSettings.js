"use client";

import { useCallback, useState } from "react";
import { useAccountLocale } from "@/components/public/locale";
import { notificationSettingsDict } from "@/shared/notificationSettings";
import { NOTICE_CATEGORIES } from "@/shared/notificationKinds";
import { EMAIL_MODES, DEFAULT_PREFS } from "@/shared/notificationPrefs";
import { useReload } from "@/components/studio2/useReload";
import { cn } from "@/lib/utils";
import { STACK, ROW, ROW_LABEL, ROW_VALUE, BTN, INPUT, BANNER_GOOD, BANNER_BAD, H2, SUB } from "@/components/public/accountKit";
import PushDevices from "@/components/public/PushDevices";
import SelectMenu from "@/components/fields/SelectMenu";

// /account → Notifications. WHERE A PERSON'S NOTICES GO BEYOND THE BELL: email
// (off, every notice, or a daily summary), which kinds go by email and push,
// quiet hours, and the language email and push are written in. The rules are
// shared/notificationPrefs; this screen shows them and saves them.
//
// THE TIME ZONE IS THE BROWSER'S, sent with every save. Quiet hours are "my
// night", and the person's own device is the one thing that knows where they
// are — the studio's zone is the office's, which a travelling manager is not in.
export default function NotificationSettings() {
  const locale = useAccountLocale();
  const tr = notificationSettingsDict(locale);
  const [prefs, setPrefs] = useState(null);
  const [state, setState] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/account/notifications", { cache: "no-store" });
    if (!res.ok) return;
    const out = await res.json();
    // A PERSON WHO NEVER SAVED reads in the language of the page they are on,
    // rather than the stored default's English.
    setPrefs(out.prefs?.updatedAt ? out.prefs : { ...DEFAULT_PREFS, ...out.prefs, locale });
  }, [locale]);
  useReload(load);

  const set = (patch) => { setState(""); setPrefs((p) => ({ ...p, ...patch })); };
  const setChannel = (cat, key, value) => set({
    channels: { ...prefs.channels, [cat]: { ...prefs.channels[cat], [key]: value } },
  });

  async function save() {
    setState("saving");
    let timezone = prefs.timezone;
    try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || timezone; } catch { /* keep the stored one */ }
    const res = await fetch("/api/account/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefs: { ...prefs, timezone } }),
    }).catch(() => null);
    if (!res?.ok) { setState("failed"); return; }
    setPrefs((await res.json()).prefs);
    setState("saved");
  }

  if (!prefs) return <div className="mx-auto w-full max-w-[640px] py-6"><p className={SUB}>…</p></div>;

  const check = "h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500";

  return (
    <div className="mx-auto w-full max-w-[640px] space-y-8 py-6">
      <div>
        <h2 className="font-display text-[1.75rem] font-500 leading-[1.2857] text-slate-900 dark:text-white">{tr.title}</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{tr.lead}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.bellAlways}</p>
      </div>

      <section>
        <h3 className={H2}>{tr.emailTitle}</h3>
        <div className={cn(STACK, "mt-3")} role="radiogroup" aria-label={tr.emailTitle}>
          {EMAIL_MODES.map((mode) => (
            <label key={mode} className={cn(ROW, "cursor-pointer")}>
              <input type="radio" name="email-mode" value={mode} checked={prefs.email === mode}
                onChange={() => set({ email: mode })} className="h-4 w-4 text-brand-600 focus:ring-brand-500" />
              <span className="flex min-w-0 flex-col">
                <span className={ROW_LABEL}>{tr.emailModes[mode]}</span>
                <span className={cn(ROW_VALUE, "whitespace-normal")}>{tr.emailHints[mode]}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3 className={H2}>{tr.channelsTitle}</h3>
        <p className={SUB}>{tr.channelsLead}</p>
        <div className={cn(STACK, "mt-3")}>
          <div className={cn(ROW, "min-h-0 py-2")}>
            <span className="flex-1" />
            <span className="w-16 text-center text-xs font-600 uppercase text-slate-500">{tr.email}</span>
            <span className="w-16 text-center text-xs font-600 uppercase text-slate-500">{tr.push}</span>
          </div>
          {NOTICE_CATEGORIES.map((cat) => (
            <div key={cat} className={ROW}>
              <span className={cn(ROW_LABEL, "flex-1")}>{tr.categories[cat]}</span>
              <span className="flex w-16 justify-center">
                <input type="checkbox" className={check} aria-label={`${tr.categories[cat]} · ${tr.email}`}
                  disabled={prefs.email === "off"}
                  checked={prefs.email !== "off" && prefs.channels[cat]?.email !== false}
                  onChange={(e) => setChannel(cat, "email", e.target.checked)} />
              </span>
              <span className="flex w-16 justify-center">
                <input type="checkbox" className={check} aria-label={`${tr.categories[cat]} · ${tr.push}`}
                  checked={prefs.channels[cat]?.push !== false}
                  onChange={(e) => setChannel(cat, "push", e.target.checked)} />
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className={H2}>{tr.quietTitle}</h3>
        <p className={SUB}>{tr.quietLead}</p>
        <div className={cn(STACK, "mt-3")}>
          <label className={cn(ROW, "cursor-pointer")}>
            <input type="checkbox" className={check} checked={prefs.quiet.on}
              onChange={(e) => set({ quiet: { ...prefs.quiet, on: e.target.checked } })} />
            <span className={ROW_LABEL}>{tr.quietOn}</span>
          </label>
          {prefs.quiet.on && (
            <div className={cn(ROW, "flex-wrap gap-4")}>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                {tr.from}
                <input type="time" className={cn(INPUT, "w-32")} value={prefs.quiet.from}
                  onChange={(e) => set({ quiet: { ...prefs.quiet, from: e.target.value } })} />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                {tr.to}
                <input type="time" className={cn(INPUT, "w-32")} value={prefs.quiet.to}
                  onChange={(e) => set({ quiet: { ...prefs.quiet, to: e.target.value } })} />
              </label>
              <span className={ROW_VALUE}>{tr.timezone(prefs.timezone)}</span>
            </div>
          )}
        </div>
      </section>

      <section>
        <h3 className={H2}>{tr.languageTitle}</h3>
        <div className={cn(STACK, "mt-3")}>
          <div className={ROW}>
            <SelectMenu
              className={cn(INPUT, "w-48")}
              value={prefs.locale}
              onChange={(v) => set({ locale: v })}
              aria-label={tr.languageTitle}
              options={[{ value: "en", label: "English" }, { value: "ar", label: "العربية" }]}
            />
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button type="button" className={BTN} disabled={state === "saving"} onClick={save}>
          {state === "saving" ? tr.saving : tr.save}
        </button>
        {state === "saved" && <span className={BANNER_GOOD}>{tr.saved}</span>}
        {state === "failed" && <span className={BANNER_BAD}>{tr.failed}</span>}
      </div>

      <PushDevices />
    </div>
  );
}
