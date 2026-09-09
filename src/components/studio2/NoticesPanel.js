"use client";

import { useState } from "react";
import { noticesDict } from "@/shared/studio/notices";

// WHAT THIS STUDIO'S NOTIFICATIONS SAY.
//
// Every notification was an English sentence written at the producer and
// stored finished, so an Arabic studio's bell was entirely English and no
// studio could change a word. This is the screen that changes the wording; the
// bell chooses the language.
//
// IT VALIDATES NOTHING ITSELF, the posture UnitsPanel and TaxonomyPanel take:
// the rules are `modules/administration/notices`, which the server refuses on,
// and the screen shows what came back rather than keeping a second copy free to
// disagree with the first.
//
// BOTH LANGUAGES SIDE BY SIDE, always, regardless of which one the reader is
// using. A studio editing only the language it happens to be in would leave the
// other half saying something different, and nothing on a one-language screen
// could tell them.
//
// AN UNTOUCHED ROW SHOWS THE SHIPPED WORDING as a placeholder rather than as a
// value, so saving without typing stores nothing — which is what keeps a later
// correction reaching the studios that never edited.
export default function NoticesPanel({ rows, canManage, locale = "en", onSave }) {
  const tr = noticesDict(locale);
  const [own, setOwn] = useState(() =>
    Object.fromEntries(rows.map((t) => [t.type, t.own])));
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [saved, setSaved] = useState(false);

  // AN OVERRIDE IS A COMPLETE PAIR, and this is why `shipped` is passed in.
  // Typing a title while the body stays untouched would otherwise store a title
  // and an EMPTY body — the studio would have blanked a sentence it never
  // looked at. Seeding the other half from the shipped wording means an
  // override always says everything the shipped one did.
  const set = (type, lang, field, value, shipped) => {
    setOwn((o) => {
      const forType = { ...(o[type] || {}) };
      const current = forType[lang] || { title: shipped.title, body: shipped.body };
      forType[lang] = { ...current, [field]: value };
      return { ...o, [type]: forType };
    });
    setSaved(false);
    setProblem("");
  };

  const reset = (type) => {
    setOwn((o) => { const next = { ...o }; delete next[type]; return next; });
    setSaved(false);
    setProblem("");
  };

  async function save() {
    setBusy(true);
    setProblem("");
    const res = await onSave({ noticeTemplates: own });
    setBusy(false);
    if (res?.error) { setProblem(res.detail || res.error); return; }
    setSaved(true);
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600 dark:text-slate-300">{tr.lead}</p>

      {problem && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          {problem}
        </p>
      )}

      {rows.map((row) => {
        const mine = own[row.type] || {};
        const edited = Object.keys(mine).length > 0;
        return (
          <section key={row.type} className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">
                {/* THE SHIPPED ENGLISH TITLE NAMES THE ROW, because it is the
                    only stable label a notification type has. Translating the
                    heading would need a seventeenth dictionary entry per type
                    that says the same thing the template already says. */}
                {row.shipped.en.title}
              </h3>
              <div className="flex items-center gap-2">
                {edited && (
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-600 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                    {tr.edited}
                  </span>
                )}
                {canManage && edited && (
                  <button className="text-xs font-600 text-slate-500 hover:text-rose-500 dark:text-slate-400"
                    onClick={() => reset(row.type)}>
                    {tr.reset}
                  </button>
                )}
              </div>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {row.fields.length
                ? `${tr.placeholders} ${row.fields.map((f) => `{${f}}`).join(" ")}`
                : tr.noPlaceholders}
            </p>

            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {["en", "ar"].map((lang) => (
                <div key={lang} className="space-y-2">
                  <p className="font-display text-xs font-700 uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {lang === "en" ? tr.english : tr.arabic}
                  </p>
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-60 dark:border-white/15 dark:bg-[#191921] dark:text-white"
                    dir={lang === "ar" ? "rtl" : "ltr"}
                    maxLength={120}
                    disabled={!canManage}
                    aria-label={`${row.shipped.en.title} — ${lang === "en" ? tr.english : tr.arabic} — ${tr.title}`}
                    placeholder={row.shipped[lang].title}
                    value={mine[lang]?.title ?? ""}
                    onChange={(e) => set(row.type, lang, "title", e.target.value, row.shipped[lang])}
                  />
                  <textarea
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-60 dark:border-white/15 dark:bg-[#191921] dark:text-white"
                    dir={lang === "ar" ? "rtl" : "ltr"}
                    rows={2}
                    maxLength={300}
                    disabled={!canManage}
                    aria-label={`${row.shipped.en.title} — ${lang === "en" ? tr.english : tr.arabic} — ${tr.body}`}
                    placeholder={row.shipped[lang].body}
                    value={mine[lang]?.body ?? ""}
                    onChange={(e) => set(row.type, lang, "body", e.target.value, row.shipped[lang])}
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {canManage && (
        <button
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50"
          onClick={save}
          disabled={busy}
        >
          {busy ? tr.saving : saved ? tr.saved : tr.save}
        </button>
      )}
    </div>
  );
}
