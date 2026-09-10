"use client";

import { useState } from "react";
import { financeDict } from "@/shared/studio/finance";
import { Field } from "@/components/fields/Field";

// FINANCE'S OWN SETTINGS — the cash categories an expense is filed under, and
// the withholding rules a document is taxed by.
//
// THIS SCREEN IS WHY `finance.settings` STOPPED BEING A RIGHT THAT ENFORCED
// NOTHING. The route has been complete since the module was written — it guards
// `finance.settings.edit`, validates, and writes to the section's settings
// object — and NOTHING IN THE PRODUCT CALLED IT. `StudioFinance` had no
// `finance-settings` branch, so the sub-section fell through to `FinanceCash`
// and the nav row marked "Settings" opened a page of invoices. A studio's
// expense categories were therefore whatever the shipped defaults said, and its
// withholding rules could not be set at all: the one screen that would have
// used the rules `withholding.ts` validates so carefully did not exist.
//
// Found by walking every studio API route and asking which component fetches
// it — the same sweep that found the plant-allocation and landed-cost registers
// with no screen either. A route with no caller fails no test: `tsc` is happy,
// the route answers correctly to anyone who asks, and the only symptom is a
// menu entry that quietly shows the wrong thing.
//
// IT VALIDATES NOTHING ITSELF, the posture UnitsPanel and NumberingPanel take:
// `withholdingProblems` is the authority and returns SENTENCES, so the refusal
// a studio reads is the server's own words about their own edit rather than a
// second copy of the rules here, free to disagree with the first.
export default function FinanceSettingsPanel({ categories = [], rules = [], hold = null, canManage, locale = "en", onSave }) {
  const tr = financeDict(locale);
  const [cats, setCats] = useState(() => [...categories]);
  const [rows, setRows] = useState(() => rules.map((r) => ({ ...r })));
  // THE PAYMENT HOLD, as the server stored it — off until somebody says otherwise.
  const [holdDraft, setHoldDraft] = useState(() => ({ mode: hold?.mode || "off", tolerancePct: hold?.tolerancePct ?? 0, toleranceAmount: hold?.toleranceAmount ?? 0 }));
  const [adding, setAdding] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [saved, setSaved] = useState(false);

  // Any edit clears both the refusal and the confirmation: a "Saved" left
  // standing over a changed draft says the change is stored when it is not.
  const touched = () => { setSaved(false); setProblem(""); };

  function addCategory() {
    const name = adding.trim();
    if (!name) return;
    setAdding("");
    if (cats.some((c) => c.toLowerCase() === name.toLowerCase())) return;
    setCats([...cats, name]);
    touched();
  }

  // A ROW IS ADDED EMPTY AND REFUSED EMPTY, deliberately. Requiring a name
  // before the row appears would put the validation here, where it would be a
  // second copy of `withholdingProblems`; an empty row that the server names as
  // "a rule needs a name" keeps one authority and still tells the studio what
  // is wrong, in the words of the rule that refused it.
  const addRule = () => { setRows([...rows, { label: "", rate: 0, threshold: 0 }]); touched(); };
  const patchRule = (i, patch) => {
    setRows(rows.map((r, n) => (n === i ? { ...r, ...patch } : r)));
    touched();
  };

  async function save() {
    setBusy(true);
    setProblem("");
    const res = await onSave({ cashCategories: cats, withholdingRules: rows, paymentHold: holdDraft });
    setBusy(false);
    if (res?.error) { setProblem(res.detail || res.error); return; }
    setSaved(true);
  }

  const input = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-[#191921] dark:text-white";

  return (
    <div className="space-y-8">
      <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">{tr.settingsLead}</p>

      {problem && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          {problem}
        </p>
      )}

      <section className="space-y-3">
        <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.cashCategories}</h3>
        <p className="max-w-2xl text-[13px] text-slate-500 dark:text-slate-400">{tr.cashCategoriesLead}</p>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <span key={c} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200">
              {c}
              {canManage && (
                <button className="text-slate-400 hover:text-rose-500" aria-label={`${tr.remove} ${c}`}
                  onClick={() => { setCats(cats.filter((x) => x !== c)); touched(); }}>×</button>
              )}
            </span>
          ))}
        </div>
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <input className={`w-52 ${input}`} value={adding} maxLength={80}
              aria-label={tr.addCategory} placeholder={tr.addCategory}
              onChange={(e) => setAdding(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCategory(); } }} />
            <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-600 text-slate-700 disabled:opacity-50 dark:border-white/15 dark:text-slate-200"
              onClick={addCategory} disabled={!adding.trim()}>{tr.add}</button>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.withholding}</h3>
        <p className="max-w-2xl text-[13px] text-slate-500 dark:text-slate-400">{tr.withholdingLead}</p>

        {rows.length === 0 && (
          <p className="text-[13px] text-slate-400 dark:text-slate-500">{tr.noWithholding}</p>
        )}

        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="text-start text-[12px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  <th className="py-2 text-start font-600">{tr.ruleName}</th>
                  <th className="py-2 text-start font-600">{tr.ruleRate}</th>
                  <th className="py-2 text-start font-600">{tr.ruleThreshold}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100 dark:border-white/10">
                    <td className="py-2 pe-3">
                      <input className={`w-full ${input}`} value={r.label} maxLength={80} disabled={!canManage}
                        aria-label={tr.ruleName}
                        onChange={(e) => patchRule(i, { label: e.target.value })} />
                    </td>
                    <td className="py-2 pe-3">
                      {/* `.num` is the shared tabular-figures utility — a column
                          of rates that shifts as you type is unreadable. */}
                      <input className={`num w-24 ${input}`} value={r.rate} inputMode="decimal" disabled={!canManage}
                        aria-label={tr.ruleRate}
                        onChange={(e) => patchRule(i, { rate: Number(e.target.value) || 0 })} />
                    </td>
                    <td className="py-2 pe-3">
                      <input className={`num w-32 ${input}`} value={r.threshold} inputMode="decimal" disabled={!canManage}
                        aria-label={tr.ruleThreshold} title={tr.ruleThresholdHint}
                        onChange={(e) => patchRule(i, { threshold: Number(e.target.value) || 0 })} />
                    </td>
                    <td className="py-2">
                      {canManage && (
                        <button className="text-slate-400 hover:text-rose-500" aria-label={`${tr.remove} ${r.label}`}
                          onClick={() => { setRows(rows.filter((_, n) => n !== i)); touched(); }}>×</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {canManage && (
          <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-600 text-slate-700 dark:border-white/15 dark:text-slate-200"
            onClick={addRule}>{tr.addRule}</button>
        )}
        <p className="text-[12px] text-slate-400 dark:text-slate-500">{tr.ruleThresholdHint}</p>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.holdSettingsHeading}</h3>
          <p className="max-w-2xl text-[13px] text-slate-500 dark:text-slate-400">{tr.holdSettingsLead}</p>
        </div>
        <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
          <Field label={tr.holdMode} as="select" required readOnly={!canManage} value={holdDraft.mode}
            options={[{ value: "off", label: tr.holdModeOff }, { value: "warn", label: tr.holdModeWarn }, { value: "block", label: tr.holdModeBlock }]}
            onChange={(v) => { setHoldDraft((h) => ({ ...h, mode: v })); touched(); }} />
          <Field label={tr.holdTolerancePct} type="number" readOnly={!canManage} value={String(holdDraft.tolerancePct)}
            onChange={(v) => { setHoldDraft((h) => ({ ...h, tolerancePct: v })); touched(); }} />
          <Field label={tr.holdToleranceAmount} type="number" readOnly={!canManage} value={String(holdDraft.toleranceAmount)}
            onChange={(v) => { setHoldDraft((h) => ({ ...h, toleranceAmount: v })); touched(); }} />
        </div>
        <p className="text-[12px] text-slate-400 dark:text-slate-500">{tr.holdToleranceHint}</p>
      </section>

      {canManage && (
        <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50"
          onClick={save} disabled={busy}>
          {busy ? tr.saving : saved ? tr.saved : tr.save}
        </button>
      )}
    </div>
  );
}
